import * as vscode from 'vscode';
import { PropertyLocation } from '../configIndex';

/**
 * Trie树节点
 */
export interface TrieNode {
    // 键部分 (例如 "spring" 在 "spring.datasource.url")
    key: string;
    
    // 是否是完整的键
    isCompleteKey: boolean;
    
    // 如果是完整的键，存储对应的位置信息
    locations?: PropertyLocation[];
    
    // 子节点
    children: Map<string, TrieNode>;
}

/**
 * 使用Trie树结构存储和检索配置键的索引
 * 针对多层级配置键（如spring.datasource.url）进行了优化
 */
export class TrieIndex {
    // 根节点
    private root: TrieNode;
    
    // 存储所有键的列表，用于快速访问
    private allKeys: Set<string>;
    
    constructor() {
        this.root = this.createNode('');
        this.allKeys = new Set<string>();
    }
    
    /**
     * 创建一个新的Trie节点
     */
    private createNode(key: string): TrieNode {
        return {
            key,
            isCompleteKey: false,
            children: new Map<string, TrieNode>()
        };
    }
    
    /**
     * 插入一个配置键及其位置信息
     */
    public insert(key: string, location: PropertyLocation): void {
        const parts = key.split('.');
        let current = this.root;
        
        // 遍历键的每个部分，构建Trie路径
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            
            if (!current.children.has(part)) {
                current.children.set(part, this.createNode(part));
            }
            
            current = current.children.get(part)!;
            
            // 如果是最后一个部分，标记为完整键并存储位置信息
            if (i === parts.length - 1) {
                current.isCompleteKey = true;
                
                if (!current.locations) {
                    current.locations = [];
                }
                
                current.locations.push(location);
            }
        }
        
        // 添加到所有键的集合
        this.allKeys.add(key);
    }
    
    /**
     * 查找一个配置键的所有位置信息
     */
    public find(key: string): PropertyLocation[] {
        const parts = key.split('.');
        let current = this.root;
        
        // 遍历键的每个部分
        for (const part of parts) {
            if (!current.children.has(part)) {
                return []; // 找不到该部分，返回空数组
            }
            
            current = current.children.get(part)!;
        }
        
        // 找到节点但不是完整键
        if (!current.isCompleteKey) {
            return [];
        }
        
        return current.locations || [];
    }
    
    /**
     * 查找一个配置键的所有位置信息（别名方法，与find功能相同）
     * 为了兼容definitionProvider中的调用
     */
    public findKey(key: string): PropertyLocation[] {
        return this.find(key);
    }
    
    /**
     * 检查键是否存在
     */
    public has(key: string): boolean {
        return this.find(key).length > 0;
    }
    
    /**
     * 获取所有配置键
     */
    public getAllKeys(): string[] {
        const results: string[] = [];
        
        // 遍历根节点的所有子节点
        for (const [key, node] of this.root.children) {
            this.collectKeys(node, key, results);
        }
        
        return results;
    }
    
    /**
     * 从指定文件中移除所有键
     */
    public removeKeysFromFile(filePath: string): boolean {
        let anyRemoved = false;
        
        // 遍历所有键，检查是否需要从指定文件移除
        this.allKeys.forEach(key => {
            const node = this.findNode(key);
            
            if (node && node.locations) {
                const originalLength = node.locations.length;
                node.locations = node.locations.filter(loc => loc.filePath !== filePath);
                
                // 如果所有位置都被移除，将节点标记为非完整键
                if (node.locations.length === 0) {
                    node.isCompleteKey = false;
                    this.allKeys.delete(key);
                    anyRemoved = true;
                } else if (node.locations.length !== originalLength) {
                    anyRemoved = true;
                }
            }
        });
        
        return anyRemoved;
    }
    
    /**
     * 查找键对应的节点
     */
    private findNode(key: string): TrieNode | undefined {
        const parts = key.split('.');
        let current = this.root;
        
        for (const part of parts) {
            if (!current.children.has(part)) {
                return undefined;
            }
            
            current = current.children.get(part)!;
        }
        
        return current;
    }
    
    /**
     * 查找以指定前缀开头的所有键
     * 用于自动完成功能
     */
    public findByPrefix(prefix: string): string[] {
        // 如果前缀为空，返回所有键
        if (!prefix) {
            return this.getAllKeys();
        }
        
        const parts = prefix.split('.');
        let current = this.root;
        
        // 遍历前缀的每个部分
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            
            if (!current.children.has(part)) {
                return []; // 找不到该部分，返回空数组
            }
            
            current = current.children.get(part)!;
        }
        
        // 获取最后一部分作为前缀
        const lastPart = parts[parts.length - 1];
        
        // 收集匹配的键
        const results: string[] = [];
        const parentPrefix = parts.slice(0, parts.length - 1).join('.');
        
        // 查找匹配最后部分前缀的所有子节点
        for (const [childKey, childNode] of current.children) {
            if (childKey.startsWith(lastPart)) {
                // 收集当前节点的所有完整键
                this.collectKeys(childNode, parentPrefix ? `${parentPrefix}.${childKey}` : childKey, results);
            }
        }
        
        return results;
    }
    
    /**
     * 递归收集节点及其子节点的所有完整键
     */
    private collectKeys(node: TrieNode, currentKey: string, results: string[]): void {
        if (node.isCompleteKey) {
            results.push(currentKey);
        }
        
        // 递归遍历所有子节点
        for (const [childKey, childNode] of node.children) {
            this.collectKeys(childNode, `${currentKey}.${childKey}`, results);
        }
    }
    
    /**
     * 清空索引
     */
    public clear(): void {
        this.root = this.createNode('');
        this.allKeys.clear();
    }
    
    /**
     * 获取索引信息
     */
    public getStats(): { nodeCount: number; keyCount: number; depth: number } {
        const stats = {
            nodeCount: 0,
            keyCount: this.allKeys.size,
            depth: 0
        };
        
        // 计算节点数和最大深度
        this.calculateStats(this.root, 0, stats);
        
        return stats;
    }
    
    /**
     * 递归计算索引统计信息
     */
    private calculateStats(node: TrieNode, depth: number, stats: { nodeCount: number; depth: number }): void {
        stats.nodeCount++;
        stats.depth = Math.max(stats.depth, depth);
        
        node.children.forEach(child => {
            this.calculateStats(child, depth + 1, stats);
        });
    }
    
    /**
     * 序列化Trie树为JSON对象
     * 用于持久化存储
     */
    public serialize(): any {
        return {
            root: this.serializeNode(this.root),
            keys: Array.from(this.allKeys)
        };
    }
    
    /**
     * 序列化Trie节点
     */
    private serializeNode(node: TrieNode): any {
        const serialized: any = {
            key: node.key,
            isCompleteKey: node.isCompleteKey,
            children: []
        };
        
        if (node.locations) {
            serialized.locations = node.locations;
        }
        
        node.children.forEach((child, key) => {
            serialized.children.push(this.serializeNode(child));
        });
        
        return serialized;
    }
    
    /**
     * 从JSON对象反序列化Trie树
     */
    public static deserialize(data: any): TrieIndex {
        const trie = new TrieIndex();
        trie.clear();
        
        if (data.root) {
            trie.root = TrieIndex.deserializeNode(data.root);
        }
        
        if (data.keys && Array.isArray(data.keys)) {
            trie.allKeys = new Set<string>(data.keys);
        }
        
        return trie;
    }
    
    /**
     * 反序列化Trie节点
     */
    private static deserializeNode(data: any): TrieNode {
        const node: TrieNode = {
            key: data.key || '',
            isCompleteKey: data.isCompleteKey || false,
            children: new Map<string, TrieNode>()
        };
        
        if (data.locations) {
            node.locations = data.locations;
        }
        
        if (data.children && Array.isArray(data.children)) {
            data.children.forEach((childData: any) => {
                const child = TrieIndex.deserializeNode(childData);
                node.children.set(child.key, child);
            });
        }
        
        return node;
    }
} 