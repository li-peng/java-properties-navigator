import { ConfigItem, ConfigReader } from './configReader';

/**
 * 配置值解析器
 * 用于处理配置文件中的占位符依赖关系和实际值的解析
 */
export class ConfigValueResolver {
    /**
     * 配置项映射表，键为配置项键（如 'db.url'）
     */
    private configMap: Map<string, ConfigItem> = new Map();
    
    /**
     * 依赖关系图，键为配置项键，值为该配置项依赖的其他配置项键数组
     */
    private dependencyGraph: Map<string, string[]> = new Map();
    
    /**
     * 解析结果缓存，避免重复解析
     */
    private resolveCache: Map<string, any> = new Map();
    
    /**
     * 当前正在解析的键路径，用于检测循环依赖
     */
    private resolvingKeys: Set<string> = new Set();
    
    /**
     * 构造函数
     * @param configItems 配置项数组
     */
    constructor(configItems: ConfigItem[]) {
        // 初始化配置项映射表
        for (const item of configItems) {
            this.configMap.set(item.key, item);
        }
        
        // 构建依赖关系图
        this.dependencyGraph = ConfigReader.buildDependencyGraph(configItems);
    }
    
    /**
     * 通过键获取解析后的配置值
     * @param key 配置键
     * @returns 解析后的配置值
     */
    public getValue(key: string): any {
        // 如果缓存中有结果，直接返回
        if (this.resolveCache.has(key)) {
            return this.resolveCache.get(key);
        }
        
        // 获取配置项
        const configItem = this.configMap.get(key);
        if (!configItem) {
            return undefined;
        }
        
        // 检查循环依赖
        if (this.resolvingKeys.has(key)) {
            console.warn(`检测到循环依赖: ${Array.from(this.resolvingKeys).join(' -> ')} -> ${key}`);
            return configItem.value;
        }
        
        // 标记当前键为正在解析
        this.resolvingKeys.add(key);
        
        try {
            // 如果不包含占位符，返回原始值
            if (!configItem.hasPlaceholders) {
                return configItem.value;
            }
            
            // 解析器函数，用于解析占位符
            const resolver = (placeholderKey: string): string | undefined => {
                const resolvedValue = this.getValue(placeholderKey);
                
                // 只有字符串值可以直接替换占位符
                if (typeof resolvedValue === 'string' || 
                    typeof resolvedValue === 'number' || 
                    typeof resolvedValue === 'boolean') {
                    return String(resolvedValue);
                }
                
                return undefined;
            };
            
            // 解析配置值
            const resolvedValue = ConfigReader.formatConfigValue(configItem, resolver);
            
            // 缓存解析结果
            this.resolveCache.set(key, resolvedValue);
            
            return resolvedValue;
        } finally {
            // 解析完成，从正在解析的键集合中移除
            this.resolvingKeys.delete(key);
        }
    }
    
    /**
     * 解析所有配置值
     * @returns 解析后的配置项，键为配置键，值为解析后的配置值
     */
    public resolveAll(): Map<string, any> {
        const resolvedValues = new Map<string, any>();
        
        // 清空缓存
        this.resolveCache.clear();
        
        // 按照拓扑排序解析（先解析没有依赖的配置项）
        const sorted = this.topologicalSort();
        
        for (const key of sorted) {
            const value = this.getValue(key);
            resolvedValues.set(key, value);
        }
        
        return resolvedValues;
    }
    
    /**
     * 对配置项进行拓扑排序，确保依赖项先于被依赖项处理
     * @returns 排序后的配置键数组
     */
    private topologicalSort(): string[] {
        const result: string[] = [];
        const visited = new Set<string>();
        const temp = new Set<string>();
        
        // 所有配置键
        const allKeys = Array.from(this.configMap.keys());
        
        // 深度优先搜索
        const visit = (key: string) => {
            // 已经访问过，跳过
            if (visited.has(key)) {
                return;
            }
            
            // 检测到循环依赖
            if (temp.has(key)) {
                console.warn(`拓扑排序时检测到循环依赖，涉及到键: ${key}`);
                return;
            }
            
            // 标记为正在访问
            temp.add(key);
            
            // 先访问所有依赖
            const dependencies = this.dependencyGraph.get(key) || [];
            for (const dep of dependencies) {
                visit(dep);
            }
            
            // 标记为已访问
            temp.delete(key);
            visited.add(key);
            
            // 添加到结果
            result.push(key);
        };
        
        // 对所有键进行拓扑排序
        for (const key of allKeys) {
            if (!visited.has(key)) {
                visit(key);
            }
        }
        
        return result;
    }
    
    /**
     * 检查是否存在循环依赖
     * @returns 如果存在循环依赖返回true，否则返回false
     */
    public hasCircularDependencies(): boolean {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();
        
        // 所有配置键
        const allKeys = Array.from(this.configMap.keys());
        
        // 检测循环依赖的辅助函数
        const hasCycle = (key: string): boolean => {
            // 如果已经确认不在循环中，则跳过
            if (visited.has(key)) {
                return false;
            }
            
            // 如果在当前递归栈中，检测到循环
            if (recursionStack.has(key)) {
                return true;
            }
            
            // 标记为正在访问
            recursionStack.add(key);
            
            // 检查所有依赖
            const dependencies = this.dependencyGraph.get(key) || [];
            for (const dep of dependencies) {
                if (hasCycle(dep)) {
                    return true;
                }
            }
            
            // 移除递归栈标记，并标记为已访问
            recursionStack.delete(key);
            visited.add(key);
            
            return false;
        };
        
        // 检查所有配置键
        for (const key of allKeys) {
            if (hasCycle(key)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 获取指定键的所有依赖键
     * @param key 配置键
     * @returns 依赖键数组
     */
    public getDependencies(key: string): string[] {
        return this.dependencyGraph.get(key) || [];
    }
    
    /**
     * 获取所有依赖指定键的配置键
     * @param key 被依赖的配置键
     * @returns 依赖于指定键的配置键数组
     */
    public getDependentKeys(key: string): string[] {
        const dependentKeys: string[] = [];
        
        for (const [configKey, dependencies] of this.dependencyGraph.entries()) {
            if (dependencies.includes(key)) {
                dependentKeys.push(configKey);
            }
        }
        
        return dependentKeys;
    }
} 