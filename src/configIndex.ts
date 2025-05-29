import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigReader, ConfigItem } from './reader/configReader';
import { parseYaml } from './yamlParser';
import { parseYamlFile } from './utils/yamlHelper';
import { Logger } from './utils/logger';

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
    private logger: Logger;
    
    constructor() {
        this.logger = Logger.getInstance();
        this.logger.debug('ConfigurationIndexManager 构造函数被调用');
        
        // 监听配置修改
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('java-properties-navigator')) {
                this.logger.info('检测到java-properties-navigator配置变更，准备重建索引');
                this.rebuildIndex().catch(error => {
                    this.logger.error('配置变更触发的索引重建失败', error);
                });
            }
        });
    }

    /**
     * 初始化并构建索引
     */
    public async initialize(): Promise<void> {
        this.logger.info('开始初始化ConfigurationIndexManager');
        const initStartTime = this.logger.startPerformance();
        
        try {
            await this.rebuildIndex();
            this.setupFileWatcher();
            
            this.logger.performance('ConfigurationIndexManager初始化', initStartTime);
            this.logger.info('ConfigurationIndexManager初始化完成');
        } catch (error) {
            this.logger.error('ConfigurationIndexManager初始化失败', error);
            throw error;
        }
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
        this.logger.info('开始重建配置索引');
        const rebuildStartTime = this.logger.startPerformance();
        
        this.propertyLocations.clear();
        
        const config = vscode.workspace.getConfiguration('java-properties-navigator');
        const scanDirs = config.get<string[]>('scanDirectories', ['src/main/resources', 'src/test/resources']);
        const excludePatterns = config.get<string[]>('excludePatterns', []);
        const fileExtensions = config.get<string[]>('fileExtensions', ['.properties', '.yml', '.yaml']);
        
        this.logger.debug('索引重建配置', {
            scanDirs,
            excludePatterns,
            fileExtensions
        });
        
        if (!vscode.workspace.workspaceFolders) {
            this.logger.warn('没有打开的工作区文件夹，跳过索引构建');
            return;
        }
        
        let totalFilesScanned = 0;
        
        for (const folder of vscode.workspace.workspaceFolders) {
            this.logger.debug('扫描工作区文件夹', { folderPath: folder.uri.fsPath });
            
            for (const scanDir of scanDirs) {
                // 处理通配符模式
                if (scanDir.startsWith('**/')) {
                    const pattern = scanDir.slice(3); // 移除 **/
                    const scannedCount = await this.scanWithWildcard(folder.uri.fsPath, pattern, fileExtensions, excludePatterns);
                    totalFilesScanned += scannedCount;
                } else {
                    // 处理直接路径
                    const dirPath = path.join(folder.uri.fsPath, scanDir);
                    if (fs.existsSync(dirPath)) {
                        const scannedCount = await this.scanDirectory(dirPath, fileExtensions, excludePatterns);
                        totalFilesScanned += scannedCount;
                    } else {
                        this.logger.debug('扫描目录不存在', { dirPath });
                    }
                }
            }
        }
        
        this.logger.performance('索引重建', rebuildStartTime);
        this.logger.info('索引重建完成', {
            属性键数量: this.propertyLocations.size,
            扫描文件数: totalFilesScanned
        });
        
        // 触发索引重建事件
        this.fireIndexRebuilt();
    }
    
    /**
     * 使用通配符模式扫描目录
     */
    private async scanWithWildcard(rootPath: string, pattern: string, extensions: string[], excludePatterns: string[]): Promise<number> {
        const findMatchingDirectories = (currentPath: string, remainingPattern: string): string[] => {
            const results: string[] = [];
            
            try {
                const entries = fs.readdirSync(currentPath, { withFileTypes: true });
                
                for (const entry of entries) {
                    if (!entry.isDirectory()) {
                        continue;
                    }
                    
                    const entryPath = path.join(currentPath, entry.name);
                    
                    // 检查是否应该被排除
                    if (this.shouldExcludePath(entryPath, excludePatterns)) {
                        continue;
                    }
                    
                    // 检查当前目录是否匹配模式
                    if (entryPath.endsWith(remainingPattern.replace(/\//g, path.sep))) {
                        results.push(entryPath);
                    }
                    
                    // 递归搜索子目录
                    results.push(...findMatchingDirectories(entryPath, remainingPattern));
                }
            } catch (error: any) {
                // 忽略无法访问的目录
            }
            
            return results;
        };
        
        const matchingDirs = findMatchingDirectories(rootPath, pattern);
        
        let totalScanned = 0;
        for (const dir of matchingDirs) {
            const scannedCount = await this.scanDirectory(dir, extensions, excludePatterns);
            totalScanned += scannedCount;
        }
        
        return totalScanned;
    }
    
    /**
     * 设置文件观察器以监听配置文件变更
     */
    private setupFileWatcher(): void {
        const config = vscode.workspace.getConfiguration('java-properties-navigator');
        const fileExtensions = config.get<string[]>('fileExtensions', ['.properties', '.yml', '.yaml']);
        const scanDirectories = config.get<string[]>('scanDirectories', ['src/main/resources', '**/src/main/resources']);
        const excludePatterns = config.get<string[]>('excludePatterns', ['**/target/**', '**/build/**', '**/node_modules/**']);
        
        // 构建基于扫描目录的监听模式
        const patterns: string[] = [];
        for (const scanDir of scanDirectories) {
            const normalizedScanDir = scanDir.replace(/\\/g, '/');
            for (const ext of fileExtensions) {
                patterns.push(`${normalizedScanDir}/**/*${ext}`);
            }
        }
        
        // 创建排除模式字符串
        const excludePattern = excludePatterns.join(',');
        
        // 为每个模式创建监听器
        for (const pattern of patterns) {
            const watcher = vscode.workspace.createFileSystemWatcher(pattern, false, false, false);
            
            watcher.onDidChange(uri => this.handleFileChange(uri));
            watcher.onDidCreate(uri => this.handleFileChange(uri));
            watcher.onDidDelete(uri => this.handleFileDelete(uri));
            
            // 存储监听器以便后续清理
            if (!this.watcher) {
                this.watcher = watcher;
            }
        }
    }
    
    /**
     * 处理文件变更
     */
    private async handleFileChange(uri: vscode.Uri): Promise<void> {
        const filePath = uri.fsPath;
        const config = vscode.workspace.getConfiguration('java-properties-navigator');
        const fileExtensions = config.get<string[]>('fileExtensions', ['.properties', '.yml', '.yaml']);
        const scanDirectories = config.get<string[]>('scanDirectories', ['src/main/resources', '**/src/main/resources']);
        const excludePatterns = config.get<string[]>('excludePatterns', ['**/target/**', '**/build/**', '**/node_modules/**']);
        
        const ext = path.extname(filePath);
        if (fileExtensions.includes(ext)) {
            // 验证文件是否在扫描目录内
            if (!this.isPathInScanDirectories(filePath, scanDirectories)) {
                this.logger.debug('文件不在扫描目录内，跳过处理', { filePath });
                return;
            }
            
            // 验证文件是否应该被排除
            if (this.shouldExcludePath(filePath, excludePatterns)) {
                this.logger.debug('文件匹配排除模式，跳过处理', { filePath });
                return;
            }
            
            this.logger.info('检测到配置文件变更', { filePath });
            
            // 移除该文件的所有属性，然后重新添加
            this.removeFileFromIndex(filePath);
            await this.scanFile(filePath);
            
            this.logger.debug('文件索引更新完成', { filePath });
            
            // 触发索引重建事件
            this.fireIndexRebuilt();
        }
    }
    
    /**
     * 处理文件删除
     */
    private handleFileDelete(uri: vscode.Uri): void {
        const filePath = uri.fsPath;
        this.logger.info('检测到配置文件删除', { filePath });
        
        const wasRemoved = this.removeFileFromIndex(filePath);
        
        if (wasRemoved) {
            this.logger.debug('文件已从索引中移除', { filePath });
            // 只有在确实从索引中移除了内容时才触发事件
            this.fireIndexRebuilt();
        } else {
            this.logger.debug('文件不在索引中，无需移除', { filePath });
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
    private async scanDirectory(dirPath: string, extensions: string[], excludePatterns: string[]): Promise<number> {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        let filesScanned = 0;
        
        for (const entry of entries) {
            const entryPath = path.join(dirPath, entry.name);
            
            // 检查是否匹配排除模式
            if (this.shouldExcludePath(entryPath, excludePatterns)) {
                continue;
            }
            
            if (entry.isDirectory()) {
                const subDirScanned = await this.scanDirectory(entryPath, extensions, excludePatterns);
                filesScanned += subDirScanned;
            } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
                await this.scanFile(entryPath);
                filesScanned++;
            }
        }
        
        return filesScanned;
    }
    
    /**
     * 检查路径是否应该被排除
     */
    private shouldExcludePath(filePath: string, excludePatterns: string[]): boolean {
        if (!excludePatterns || excludePatterns.length === 0) {
            return false;
        }

        // 获取工作区根路径，用于计算相对路径
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            return false;
        }

        // 计算相对于工作区的路径
        const relativePath = path.relative(workspaceRoot, filePath);
        const normalizedRelativePath = relativePath.replace(/\\/g, '/'); // 统一使用正斜杠
        const fileName = path.basename(filePath);

        for (const pattern of excludePatterns) {
            const normalizedPattern = pattern.replace(/\\/g, '/'); // 统一使用正斜杠
            
            // 1. 检查是否是简单的字符串包含匹配（原有逻辑）
            if (filePath.includes(pattern)) {
                return true;
            }
            
            // 2. 检查相对路径是否匹配
            if (normalizedRelativePath === normalizedPattern) {
                return true;
            }
            
            // 3. 检查文件名是否匹配
            if (fileName === normalizedPattern) {
                return true;
            }
            
            // 4. 检查相对路径是否包含模式
            if (normalizedRelativePath.includes(normalizedPattern)) {
                return true;
            }
            
            // 5. 支持简单的通配符匹配 (**/pattern/**)
            if (normalizedPattern.startsWith('**/') && normalizedPattern.endsWith('/**')) {
                const middlePart = normalizedPattern.slice(3, -3); // 移除 **/ 和 /**
                if (normalizedRelativePath.includes(middlePart)) {
                    return true;
                }
            }
            
            // 6. 支持文件扩展名匹配 (*.ext)
            if (normalizedPattern.startsWith('*.')) {
                const extension = normalizedPattern.slice(1); // 移除 *
                if (fileName.endsWith(extension)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * 检查文件路径是否在配置的扫描目录内
     */
    private isPathInScanDirectories(filePath: string, scanDirectories: string[]): boolean {
        if (!vscode.workspace.workspaceFolders) {
            return false;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const relativePath = path.relative(workspaceRoot, filePath);
        const normalizedRelativePath = relativePath.replace(/\\/g, '/');

        for (const scanDir of scanDirectories) {
            const normalizedScanDir = scanDir.replace(/\\/g, '/');
            
            // 处理通配符模式 **/src/main/resources
            if (normalizedScanDir.startsWith('**/')) {
                const pattern = normalizedScanDir.slice(3); // 移除 **/
                if (normalizedRelativePath.includes(pattern)) {
                    return true;
                }
            }
            // 处理直接路径匹配
            else if (normalizedRelativePath.startsWith(normalizedScanDir)) {
                return true;
            }
        }

        return false;
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
            
            let environment: string | undefined = undefined;
            const match = filename.match(/.*-([^.]+)\.(properties|ya?ml)/);
            if (match && match[1]) {
                environment = match[1];
            }

            let configItems: ConfigItem[] = [];

            // 根据文件类型选择解析器
            if (fileExtension === '.properties') {
                configItems = ConfigReader.parseConfig(content, filePath);
            } else if (fileExtension === '.yml' || fileExtension === '.yaml') {
                // 使用简化的YAML解析函数，避免复杂的库依赖问题
                configItems = parseYamlFile(filePath);
                
                // 输出解析到的前5个YAML配置项
                configItems.slice(0, 5).forEach((item, index) => {
                });
            }
            
            if (configItems.length === 0) {
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
        } catch (error) {
            this.logger.error(`扫描文件 ${filePath} 时出错`, error);
        }
    }
    
    /**
     * 添加属性位置到索引
     */
    private addPropertyLocation(key: string, location: PropertyLocation): void {
        if (!this.propertyLocations.has(key)) {
            this.propertyLocations.set(key, [location]);
        } else {
            const existingLocations = this.propertyLocations.get(key)!;
            const alreadyExists = existingLocations.some(existingLocation =>
                existingLocation.filePath === location.filePath &&
                existingLocation.line === location.line &&
                existingLocation.column === location.column &&
                existingLocation.environment === location.environment
            );

            if (!alreadyExists) {
                existingLocations.push(location);
            }
        }
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