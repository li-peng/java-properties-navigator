import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PropertyLocation } from '../configIndex';
import { PersistentIndex } from './persistentIndex';
import { ParserRegistry } from '../parsers/parserRegistry';

/**
 * 增量索引更新器
 * 支持基于文件变更进行增量更新，而不是每次都完全重建索引
 */
export class IncrementalIndexer {
    private persistentIndex: PersistentIndex;
    private parserRegistry: ParserRegistry;
    
    constructor(persistentIndex: PersistentIndex, parserRegistry: ParserRegistry) {
        this.persistentIndex = persistentIndex;
        this.parserRegistry = parserRegistry;
    }
    
    /**
     * 初始化索引
     * 如果持久化索引加载失败，则构建新索引
     */
    public async initialize(context: vscode.ExtensionContext): Promise<void> {
        this.persistentIndex.initialize(context);
        this.persistentIndex.updateWorkspaceInfo();
        
        // 检查是否需要全量重建索引
        const config = vscode.workspace.getConfiguration('java-properties-definition');
        const forceRebuild = config.get<boolean>('forceRebuildIndex', false);
        
        if (forceRebuild) {
            await this.rebuildIndex();
        } else {
            // 检查已索引文件是否有变更
            await this.updateChangedFiles();
        }
    }
    
    /**
     * 重建索引
     */
    public async rebuildIndex(): Promise<void> {
        try {
            // 清空索引
            this.persistentIndex.clear();
            
            // 获取配置的扫描目录和过滤条件
            const config = vscode.workspace.getConfiguration('java-properties-definition');
            const scanDirs = config.get<string[]>('scanDirectories', ['src/main/resources', 'src/test/resources']);
            const excludePatterns = config.get<string[]>('excludePatterns', []);
            const fileExtensions = config.get<string[]>('fileExtensions', ['.properties', '.yml', '.yaml']);
            
            if (!vscode.workspace.workspaceFolders) {
                return;
            }
            
            // 扫描所有配置的目录
            for (const folder of vscode.workspace.workspaceFolders) {
                for (const scanDir of scanDirs) {
                    const dirPath = path.join(folder.uri.fsPath, scanDir);
                    
                    if (fs.existsSync(dirPath)) {
                        await this.scanDirectory(dirPath, fileExtensions, excludePatterns);
                    }
                }
            }
            
            // 保存索引到磁盘
            this.persistentIndex.saveToDisk();
            
            console.log(`索引重建完成，共找到 ${this.persistentIndex.getTrieIndex().getAllKeys().length} 个键`);
        } catch (error) {
            console.error('构建索引时出错:', error);
        }
    }
    
    /**
     * 更新已变更的文件
     */
    private async updateChangedFiles(): Promise<void> {
        try {
            const indexedFiles = this.persistentIndex.getIndexedFiles();
            let anyUpdated = false;
            
            // 检查所有索引文件是否存在且是否有变更
            for (const filePath of indexedFiles) {
                if (!fs.existsSync(filePath)) {
                    // 文件已删除，从索引中移除
                    this.removeFileFromIndex(filePath);
                    anyUpdated = true;
                } else if (this.persistentIndex.isFileChanged(filePath)) {
                    // 文件已变更，更新索引
                    await this.updateFile(filePath);
                    anyUpdated = true;
                }
            }
            
            // 如果有更新，保存索引
            if (anyUpdated) {
                this.persistentIndex.saveToDisk();
            }
            
            console.log(`增量更新完成，当前索引包含 ${this.persistentIndex.getTrieIndex().getAllKeys().length} 个键`);
        } catch (error) {
            console.error('更新索引时出错:', error);
        }
    }
    
    /**
     * 扫描目录
     */
    private async scanDirectory(dirPath: string, extensions: string[], excludePatterns: string[]): Promise<void> {
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const entryPath = path.join(dirPath, entry.name);
                
                // 检查是否匹配排除模式
                if (excludePatterns.some(pattern => entryPath.includes(pattern))) {
                    continue;
                }
                
                if (entry.isDirectory()) {
                    // 递归扫描子目录
                    await this.scanDirectory(entryPath, extensions, excludePatterns);
                } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
                    // 解析文件并添加到索引
                    await this.parseFile(entryPath);
                }
            }
        } catch (error) {
            console.error(`扫描目录 ${dirPath} 时出错:`, error);
        }
    }
    
    /**
     * 解析文件并添加到索引
     */
    private async parseFile(filePath: string): Promise<void> {
        try {
            // 获取合适的解析器
            const parser = this.parserRegistry.getParser(filePath);
            if (!parser) {
                console.log(`没有找到适合文件 ${filePath} 的解析器`);
                return;
            }
            
            // 解析文件
            const content = fs.readFileSync(filePath, 'utf8');
            const propertyLocations = await parser.parse(filePath, content);
            
            // 添加到索引
            for (const location of propertyLocations) {
                this.persistentIndex.getTrieIndex().insert(location.key, location);
            }
            
            // 更新文件哈希值
            this.persistentIndex.updateFileHash(filePath);
            
            console.log(`已解析文件 ${filePath}，找到 ${propertyLocations.length} 个键`);
        } catch (error) {
            console.error(`解析文件 ${filePath} 时出错:`, error);
        }
    }
    
    /**
     * 更新单个文件的索引
     */
    public async updateFile(filePath: string): Promise<void> {
        try {
            // 从索引中移除文件
            this.removeFileFromIndex(filePath);
            
            // 重新解析文件
            await this.parseFile(filePath);
            
            // 保存索引到磁盘
            this.persistentIndex.saveToDisk();
            
            console.log(`已更新文件 ${filePath} 的索引`);
        } catch (error) {
            console.error(`更新文件索引时出错: ${filePath}`, error);
        }
    }
    
    /**
     * 从索引中移除文件
     */
    public removeFileFromIndex(filePath: string): void {
        try {
            // 从Trie索引中移除
            this.persistentIndex.getTrieIndex().removeKeysFromFile(filePath);
            
            // 从元数据中移除
            this.persistentIndex.removeFileHash(filePath);
            
            console.log(`已从索引中移除文件 ${filePath}`);
        } catch (error) {
            console.error(`从索引中移除文件时出错: ${filePath}`, error);
        }
    }
    
    /**
     * 处理文件变更事件
     */
    public async handleFileChange(uri: vscode.Uri): Promise<void> {
        const filePath = uri.fsPath;
        const config = vscode.workspace.getConfiguration('java-properties-definition');
        const fileExtensions = config.get<string[]>('fileExtensions', ['.properties', '.yml', '.yaml']);
        
        const ext = path.extname(filePath);
        if (fileExtensions.includes(ext)) {
            await this.updateFile(filePath);
        }
    }
    
    /**
     * 处理文件删除事件
     */
    public handleFileDelete(uri: vscode.Uri): void {
        this.removeFileFromIndex(uri.fsPath);
        this.persistentIndex.saveToDisk();
    }
    
    /**
     * 查找配置键的位置
     */
    public findPropertyLocations(key: string): PropertyLocation[] {
        return this.persistentIndex.getTrieIndex().find(key);
    }
    
    /**
     * 检查配置键是否存在
     */
    public hasProperty(key: string): boolean {
        return this.persistentIndex.getTrieIndex().has(key);
    }
    
    /**
     * 获取所有配置键
     */
    public getAllPropertyKeys(): string[] {
        return this.persistentIndex.getTrieIndex().getAllKeys();
    }
    
    /**
     * 根据前缀查找配置键
     */
    public findKeysByPrefix(prefix: string): string[] {
        return this.persistentIndex.getTrieIndex().findByPrefix(prefix);
    }
    
    /**
     * 销毁资源
     */
    public dispose(): void {
        // 保存索引到磁盘
        this.persistentIndex.saveToDisk();
    }
} 