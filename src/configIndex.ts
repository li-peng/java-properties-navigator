import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigReader, ConfigItem } from './reader/configReader';
import { parseYaml } from './yamlParser';
import { parseYamlFile } from './utils/yamlHelper';

/**
 * 用于存储属性键位置的结构
 */
export interface PropertyLocation {
    key: string;
    filePath: string;
    line: number;
    column: number;  // 添加列位置
    length: number;  // 添加长度属性
    environment?: string; // 例如 dev, prod 等环境标识
}

/**
 * 索引重建事件类型
 */
export type IndexRebuiltHandler = () => void;

/**
 * 配置索引构建和管理器
 */
export class ConfigurationIndexManager {
    private propertyLocations: Map<string, PropertyLocation[]> = new Map();
    private watcher: vscode.FileSystemWatcher | undefined;
    private indexRebuiltHandlers: IndexRebuiltHandler[] = [];
    
    constructor() {
        // 监听配置修改
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('java-properties-definition')) {
                this.rebuildIndex();
            }
        });
    }

    /**
     * 初始化并构建索引
     */
    public async initialize(): Promise<void> {
        await this.rebuildIndex();
        this.setupFileWatcher();
    }

    /**
     * 添加索引重建事件监听器
     */
    public onIndexRebuilt(handler: IndexRebuiltHandler): vscode.Disposable {
        this.indexRebuiltHandlers.push(handler);
        
        // 返回一个可释放对象，用于取消监听
        return {
            dispose: () => {
                const index = this.indexRebuiltHandlers.indexOf(handler);
                if (index !== -1) {
                    this.indexRebuiltHandlers.splice(index, 1);
                }
            }
        };
    }
    
    /**
     * 触发索引重建事件
     */
    private fireIndexRebuilt(): void {
        this.indexRebuiltHandlers.forEach(handler => handler());
    }

    /**
     * 重建索引
     */
    public async rebuildIndex(): Promise<void> {
        this.propertyLocations.clear();
        
        const config = vscode.workspace.getConfiguration('java-properties-definition');
        const scanDirs = config.get<string[]>('scanDirectories', ['src/main/resources', 'src/test/resources']);
        const excludePatterns = config.get<string[]>('excludePatterns', []);
        const fileExtensions = config.get<string[]>('fileExtensions', ['.properties', '.yml', '.yaml']);
        
        if (!vscode.workspace.workspaceFolders) {
            return;
        }
        
        for (const folder of vscode.workspace.workspaceFolders) {
            for (const scanDir of scanDirs) {
                const dirPath = path.join(folder.uri.fsPath, scanDir);
                
                if (fs.existsSync(dirPath)) {
                    await this.scanDirectory(dirPath, fileExtensions, excludePatterns);
                }
            }
        }
        
        console.log(`索引构建完成，共找到 ${this.propertyLocations.size} 个属性键`);
        
        // 触发索引重建事件
        this.fireIndexRebuilt();
    }
    
    /**
     * 设置文件观察器以监听配置文件变更
     */
    private setupFileWatcher(): void {
        const config = vscode.workspace.getConfiguration('java-properties-definition');
        const fileExtensions = config.get<string[]>('fileExtensions', ['.properties', '.yml', '.yaml']);
        
        // 创建文件扩展名的glob模式
        const pattern = `**/*{${fileExtensions.join(',')}}`;
        
        this.watcher = vscode.workspace.createFileSystemWatcher(pattern);
        
        this.watcher.onDidChange(uri => this.handleFileChange(uri));
        this.watcher.onDidCreate(uri => this.handleFileChange(uri));
        this.watcher.onDidDelete(uri => this.handleFileDelete(uri));
    }
    
    /**
     * 处理文件变更
     */
    private async handleFileChange(uri: vscode.Uri): Promise<void> {
        const filePath = uri.fsPath;
        const config = vscode.workspace.getConfiguration('java-properties-definition');
        const fileExtensions = config.get<string[]>('fileExtensions', ['.properties', '.yml', '.yaml']);
        
        const ext = path.extname(filePath);
        if (fileExtensions.includes(ext)) {
            // 移除该文件的所有属性，然后重新添加
            this.removeFileFromIndex(filePath);
            await this.scanFile(filePath);
            
            // 触发索引重建事件
            this.fireIndexRebuilt();
        }
    }
    
    /**
     * 处理文件删除
     */
    private handleFileDelete(uri: vscode.Uri): void {
        const filePath = uri.fsPath;
        const wasRemoved = this.removeFileFromIndex(filePath);
        
        if (wasRemoved) {
            // 只有在确实从索引中移除了内容时才触发事件
            this.fireIndexRebuilt();
        }
    }
    
    /**
     * 从索引中移除文件
     * @returns 是否实际移除了任何内容
     */
    private removeFileFromIndex(filePath: string): boolean {
        let anyRemoved = false;
        
        for (const [key, locations] of this.propertyLocations.entries()) {
            const filteredLocations = locations.filter(loc => loc.filePath !== filePath);
            
            if (filteredLocations.length === 0) {
                this.propertyLocations.delete(key);
                anyRemoved = true;
            } else if (filteredLocations.length !== locations.length) {
                this.propertyLocations.set(key, filteredLocations);
                anyRemoved = true;
            }
        }
        
        return anyRemoved;
    }
    
    /**
     * 扫描目录中的配置文件
     */
    private async scanDirectory(dirPath: string, extensions: string[], excludePatterns: string[]): Promise<void> {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const entryPath = path.join(dirPath, entry.name);
            
            // 检查是否匹配排除模式
            if (excludePatterns.some(pattern => entryPath.includes(pattern))) {
                continue;
            }
            
            if (entry.isDirectory()) {
                await this.scanDirectory(entryPath, extensions, excludePatterns);
            } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
                await this.scanFile(entryPath);
            }
        }
    }
    
    /**
     * 扫描单个配置文件
     */
    private async scanFile(filePath: string): Promise<void> {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const fileUri = vscode.Uri.file(filePath);
            const filename = path.basename(filePath);
            const fileExtension = path.extname(filePath);
            
            console.log(`正在扫描文件: ${filePath}, 扩展名: ${fileExtension}`);
            
            // 尝试从文件名提取环境信息
            let environment: string | undefined = undefined;
            const match = filename.match(/.*-([^.]+)\.(properties|ya?ml)/);
            if (match && match[1]) {
                environment = match[1];
            }

            let configItems: ConfigItem[] = [];

            // 根据文件类型选择解析器
            if (fileExtension === '.properties') {
                configItems = ConfigReader.parseConfig(content, filePath);
                console.log(`解析properties文件 ${filePath}, 找到 ${configItems.length} 个配置项`);
            } else if (fileExtension === '.yml' || fileExtension === '.yaml') {
                // 使用简化的YAML解析函数，避免复杂的库依赖问题
                configItems = parseYamlFile(filePath);
                console.log(`解析YAML文件 ${filePath}, 找到 ${configItems.length} 个配置项`);
                
                // 输出解析到的前5个YAML配置项
                configItems.slice(0, 5).forEach((item, index) => {
                    console.log(`  YAML配置项 #${index + 1}: 键=${item.key}, 值=${item.value}, 行=${item.line}`);
                });
            }
            
            if (configItems.length === 0) {
                console.warn(`文件 ${filePath} 未找到配置项`);
                return;
            }
            
            // 添加解析到的配置项到索引
            for (const item of configItems) {
                const location: PropertyLocation = {
                    key: item.key,
                    filePath: item.filePath,
                    line: item.line + 1, // 转换为1-based行号
                    column: item.column,
                    length: item.length,
                    environment
                };
                
                this.addPropertyLocation(item.key, location);
            }
            
            console.log(`文件 ${filePath} 成功添加到索引，包含 ${configItems.length} 个配置项`);
        } catch (error) {
            console.error(`扫描文件 ${filePath} 时出错:`, error);
        }
    }
    
    /**
     * 添加属性位置到索引
     */
    private addPropertyLocation(key: string, location: PropertyLocation): void {
        if (!this.propertyLocations.has(key)) {
            this.propertyLocations.set(key, []);
        }
        
        this.propertyLocations.get(key)?.push(location);
    }
    
    /**
     * 查找属性键的位置
     */
    public findPropertyLocations(key: string): PropertyLocation[] {
        return this.propertyLocations.get(key) || [];
    }
    
    /**
     * 获取所有属性键
     */
    public getAllPropertyKeys(): string[] {
        return Array.from(this.propertyLocations.keys());
    }
    
    /**
     * 属性键是否存在
     */
    public hasProperty(key: string): boolean {
        return this.propertyLocations.has(key);
    }
    
    /**
     * 销毁资源
     */
    public dispose(): void {
        this.watcher?.dispose();
    }
} 