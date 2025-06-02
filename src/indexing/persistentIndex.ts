import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { TrieIndex } from './trieIndex';

/**
 * 持久化索引的元数据
 */
export interface IndexMetadata {
    // 索引版本
    version: string;
    
    // 创建时间
    createdAt: number;
    
    // 工作区文件夹名称 (用于验证索引是否匹配当前工作区)
    workspaceFolderName: string;
    
    // 已索引文件列表及其哈希值
    fileHashes: { [filePath: string]: string };
}

/**
 * 持久化索引实现
 * 将索引保存到文件系统，以便下次扩展激活时重用
 */
export class PersistentIndex {
    // 索引文件名
    private static readonly INDEX_FILE_NAME = 'java-properties-index.json';
    
    // 索引元数据文件名
    private static readonly METADATA_FILE_NAME = 'java-properties-index-meta.json';
    
    // 索引版本，当索引结构发生变化时需要更新
    private static readonly CURRENT_VERSION = '1.0.1';
    
    // Trie索引实例
    private trieIndex: TrieIndex;
    
    // 索引元数据
    private metadata: IndexMetadata;
    
    // 存储索引文件的路径
    private indexFilePath: string | undefined;
    
    // 存储元数据文件的路径
    private metadataFilePath: string | undefined;
    
    constructor() {
        this.trieIndex = new TrieIndex();
        this.metadata = this.createEmptyMetadata();
    }
    
    /**
     * 创建空的索引元数据
     */
    private createEmptyMetadata(): IndexMetadata {
        return {
            version: PersistentIndex.CURRENT_VERSION,
            createdAt: Date.now(),
            workspaceFolderName: '',
            fileHashes: {}
        };
    }
    
    /**
     * 初始化持久化索引
     */
    public initialize(context: vscode.ExtensionContext): void {
        // 设置索引文件路径
        this.setupFilePaths(context);
        
        // 尝试加载现有索引
        this.loadFromDisk();
    }
    
    /**
     * 设置索引文件路径
     */
    private setupFilePaths(context: vscode.ExtensionContext): void {
        // 使用扩展的全局存储路径
        this.indexFilePath = path.join(context.globalStorageUri.fsPath, PersistentIndex.INDEX_FILE_NAME);
        this.metadataFilePath = path.join(context.globalStorageUri.fsPath, PersistentIndex.METADATA_FILE_NAME);
        
        // 确保目录存在
        const dir = path.dirname(this.indexFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    
    /**
     * 从磁盘加载索引
     * @returns 是否成功加载
     */
    public loadFromDisk(): boolean {
        try {
            if (!this.indexFilePath || !this.metadataFilePath) {
                console.error('索引文件路径未设置');
                return false;
            }
            
            // 检查索引文件是否存在
            if (!fs.existsSync(this.indexFilePath) || !fs.existsSync(this.metadataFilePath)) {
                console.log('索引文件不存在，将创建新索引');
                return false;
            }
            
            // 读取元数据
            const metadataContent = fs.readFileSync(this.metadataFilePath, 'utf8');
            const loadedMetadata = JSON.parse(metadataContent) as IndexMetadata;
            
            // 验证索引版本
            if (loadedMetadata.version !== PersistentIndex.CURRENT_VERSION) {
                console.log(`索引版本不匹配: ${loadedMetadata.version} vs ${PersistentIndex.CURRENT_VERSION}`);
                return false;
            }
            
            // 验证工作区
            if (!this.isCurrentWorkspace(loadedMetadata)) {
                console.log('工作区已更改，需要重建索引');
                return false;
            }
            
            // 读取索引数据
            const indexContent = fs.readFileSync(this.indexFilePath, 'utf8');
            const indexData = JSON.parse(indexContent);
            
            // 反序列化Trie索引
            this.trieIndex = TrieIndex.deserialize(indexData);
            this.metadata = loadedMetadata;
            
            console.log(`成功加载索引，包含 ${this.trieIndex.getAllKeys().length} 个键`);
            return true;
        } catch (error) {
            console.error('加载索引时出错:', error);
            
            // 重置为新索引
            this.trieIndex = new TrieIndex();
            this.metadata = this.createEmptyMetadata();
            
            return false;
        }
    }
    
    /**
     * 保存索引到磁盘
     */
    public saveToDisk(): void {
        try {
            if (!this.indexFilePath || !this.metadataFilePath) {
                console.error('索引文件路径未设置');
                return;
            }
            
            // 更新元数据
            this.metadata.createdAt = Date.now();
            
            // 序列化索引数据
            const indexData = this.trieIndex.serialize();
            const indexContent = JSON.stringify(indexData);
            
            // 序列化元数据
            const metadataContent = JSON.stringify(this.metadata);
            
            // 写入文件
            fs.writeFileSync(this.indexFilePath, indexContent, 'utf8');
            fs.writeFileSync(this.metadataFilePath, metadataContent, 'utf8');
            
            console.log(`索引已保存到磁盘，包含 ${this.trieIndex.getAllKeys().length} 个键`);
        } catch (error) {
            console.error('保存索引时出错:', error);
        }
    }
    
    /**
     * 判断是否为当前工作区
     */
    private isCurrentWorkspace(metadata: IndexMetadata): boolean {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            return false;
        }
        
        // 检查工作区名称是否匹配
        const currentWorkspaceName = vscode.workspace.workspaceFolders[0].name;
        return metadata.workspaceFolderName === currentWorkspaceName;
    }
    
    /**
     * 更新当前工作区信息
     */
    public updateWorkspaceInfo(): void {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            this.metadata.workspaceFolderName = '';
            return;
        }
        
        this.metadata.workspaceFolderName = vscode.workspace.workspaceFolders[0].name;
    }
    
    /**
     * 计算文件哈希值
     */
    public static calculateFileHash(filePath: string): string {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return crypto.createHash('md5').update(content).digest('hex');
        } catch (error) {
            console.error(`计算文件哈希值出错: ${filePath}`, error);
            return '';
        }
    }
    
    /**
     * 添加或更新文件哈希值
     */
    public updateFileHash(filePath: string): void {
        const hash = PersistentIndex.calculateFileHash(filePath);
        if (hash) {
            this.metadata.fileHashes[filePath] = hash;
        }
    }
    
    /**
     * 移除文件哈希值
     */
    public removeFileHash(filePath: string): void {
        delete this.metadata.fileHashes[filePath];
    }
    
    /**
     * 检查文件是否已更改
     */
    public isFileChanged(filePath: string): boolean {
        // 如果没有记录哈希值，则认为文件已更改
        if (!this.metadata.fileHashes[filePath]) {
            return true;
        }
        
        // 计算当前哈希值并比较
        const currentHash = PersistentIndex.calculateFileHash(filePath);
        return currentHash !== this.metadata.fileHashes[filePath];
    }
    
    /**
     * 获取Trie索引实例
     */
    public getTrieIndex(): TrieIndex {
        return this.trieIndex;
    }
    
    /**
     * 获取所有已索引文件的路径
     */
    public getIndexedFiles(): string[] {
        return Object.keys(this.metadata.fileHashes);
    }
    
    /**
     * 清空索引
     */
    public clear(): void {
        this.trieIndex.clear();
        this.metadata = this.createEmptyMetadata();
        this.updateWorkspaceInfo();
    }
} 