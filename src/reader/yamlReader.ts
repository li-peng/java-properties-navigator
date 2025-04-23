import * as yaml from 'js-yaml';
import { PropertyValueParser } from './propertyValueParser';

/**
 * 表示YAML文件中的一个属性项
 */
export interface YamlPropertyItem {
    /**
     * 完整的属性路径（以点分隔的多级属性）
     */
    path: string;
    
    /**
     * 属性值
     */
    value: any;
    
    /**
     * 属性在文件中的行号（0-based）
     */
    line: number;
    
    /**
     * 属性键在行中的起始列位置
     */
    column: number;
    
    /**
     * 属性键的长度
     */
    length: number;
    
    /**
     * 属性值是否包含占位符（如果是字符串类型）
     */
    hasPlaceholders?: boolean;
}

/**
 * YAML文件读取器
 * 用于解析和提取.yml/.yaml文件中的属性定义
 */
export class YamlReader {
    /**
     * 解析YAML文件内容
     * @param content 文件内容
     * @param filePath 文件路径（用于错误报告）
     * @returns 解析后的属性项数组
     */
    public static parse(content: string, filePath: string): YamlPropertyItem[] {
        try {
            // 解析YAML内容
            const yamlObj = yaml.load(content);
            if (!yamlObj || typeof yamlObj !== 'object') {
                return [];
            }
            
            // 提取文件中每行内容，用于确定行号
            const lines = content.split('\n');
            const lineMap = new Map<string, number>();
            
            // 扫描文件找到键的位置
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line || line.startsWith('#')) continue;
                
                const match = line.match(/^([^:]+):/);
                if (match) {
                    const key = match[1].trim();
                    lineMap.set(key, i);
                }
            }
            
            // 递归提取所有属性
            return this.extractProperties(yamlObj, '', lineMap);
        } catch (error) {
            console.error(`解析YAML文件 ${filePath} 出错:`, error);
            return [];
        }
    }
    
    /**
     * 递归提取YAML对象中的所有属性
     * @param obj YAML对象
     * @param parentPath 父级路径
     * @param lineMap 键到行号的映射
     * @returns 提取的属性项数组
     */
    private static extractProperties(
        obj: any, 
        parentPath: string, 
        lineMap: Map<string, number>
    ): YamlPropertyItem[] {
        const properties: YamlPropertyItem[] = [];
        
        if (!obj || typeof obj !== 'object') {
            return properties;
        }
        
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = obj[key];
                const currentPath = parentPath ? `${parentPath}.${key}` : key;
                
                // 找到最接近的行号
                let bestMatchLine = -1;
                let bestMatchKey = '';
                
                // 尝试找完全匹配
                if (lineMap.has(key)) {
                    bestMatchLine = lineMap.get(key)!;
                    bestMatchKey = key;
                } else {
                    // 寻找最佳部分匹配
                    for (const [mapKey, lineNum] of lineMap.entries()) {
                        if (currentPath.includes(mapKey) && 
                            mapKey.length > bestMatchKey.length) {
                            bestMatchLine = lineNum;
                            bestMatchKey = mapKey;
                        }
                    }
                }
                
                // 检查字符串类型值中是否包含占位符
                let hasPlaceholders = false;
                if (typeof value === 'string') {
                    hasPlaceholders = PropertyValueParser.containsPlaceholders(value);
                }
                
                if (value === null || typeof value !== 'object') {
                    // 如果值是简单类型，则添加属性
                    properties.push({
                        path: currentPath,
                        value: value,
                        line: bestMatchLine,
                        column: 0,
                        length: 0,
                        hasPlaceholders
                    });
                } else if (Array.isArray(value)) {
                    // 如果值是数组，添加数组属性
                    properties.push({
                        path: currentPath,
                        value: value,
                        line: bestMatchLine,
                        column: 0,
                        length: 0
                    });
                    
                    // 同时添加数组中的每个元素
                    for (let i = 0; i < value.length; i++) {
                        const itemValue = value[i];
                        
                        // 检查数组元素是否包含占位符
                        let itemHasPlaceholders = false;
                        if (typeof itemValue === 'string') {
                            itemHasPlaceholders = PropertyValueParser.containsPlaceholders(itemValue);
                        }
                        
                        if (typeof itemValue === 'object' && itemValue !== null) {
                            // 如果数组元素是对象，递归提取其属性
                            properties.push(...this.extractProperties(
                                itemValue, 
                                `${currentPath}[${i}]`, 
                                lineMap
                            ));
                        } else {
                            // 简单类型的数组元素
                            properties.push({
                                path: `${currentPath}[${i}]`,
                                value: itemValue,
                                line: bestMatchLine,
                                column: 0,
                                length: 0,
                                hasPlaceholders: itemHasPlaceholders
                            });
                        }
                    }
                } else {
                    // 对象类型，添加当前对象属性
                    properties.push({
                        path: currentPath,
                        value: value,
                        line: bestMatchLine,
                        column: 0,
                        length: 0
                    });
                    
                    // 递归提取子属性
                    properties.push(...this.extractProperties(value, currentPath, lineMap));
                }
            }
        }
        
        return properties;
    }
    
    /**
     * 从YAML文件内容中获取指定路径的属性
     * @param content 文件内容
     * @param path 属性路径（点分隔）
     * @returns 找到的属性项，如果未找到返回undefined
     */
    public static getProperty(content: string, path: string): YamlPropertyItem | undefined {
        const properties = this.parse(content, '');
        return properties.find(prop => prop.path === path);
    }
    
    /**
     * 根据路径获取YAML对象中的值
     * @param obj YAML对象
     * @param path 属性路径（点分隔）
     * @returns 找到的值，如果未找到返回undefined
     */
    public static getValueByPath(obj: any, path: string): any {
        if (!obj || !path) return undefined;
        
        const parts = path.split('.');
        let current = obj;
        
        for (const part of parts) {
            // 处理数组索引，例如 items[0]
            const arrayMatch = part.match(/^([^\[]+)\[(\d+)\]$/);
            if (arrayMatch) {
                const arrayName = arrayMatch[1];
                const arrayIndex = parseInt(arrayMatch[2], 10);
                
                if (!current[arrayName] || !Array.isArray(current[arrayName])) {
                    return undefined;
                }
                
                current = current[arrayName][arrayIndex];
            } else {
                // 普通对象属性
                if (current[part] === undefined) {
                    return undefined;
                }
                current = current[part];
            }
        }
        
        return current;
    }
    
    /**
     * 格式化YAML属性值，处理其中的占位符
     * @param value 属性值
     * @param resolver 占位符解析函数
     * @returns 格式化后的值
     */
    public static formatValue(
        value: any, 
        resolver?: (key: string) => string | undefined
    ): any {
        if (typeof value !== 'string') {
            return value;
        }
        
        return PropertyValueParser.formatValue(value, resolver);
    }
    
    /**
     * 解析属性值中的占位符
     * @param value 属性值
     * @returns 找到的占位符数组
     */
    public static getPlaceholders(value: string): string[] {
        if (typeof value !== 'string') {
            return [];
        }
        
        const placeholders = PropertyValueParser.parsePlaceholders(value);
        return placeholders.map(p => p.key);
    }
} 