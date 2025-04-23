import { PropertyItem, PropertiesReader } from './propertiesReader';
import { YamlPropertyItem, YamlReader } from './yamlReader';
import { PropertyValueParser } from './propertyValueParser';
import * as path from 'path';

/**
 * 通用配置项接口，可以表示任何类型的配置项
 */
export interface ConfigItem {
    /**
     * 配置项键/路径
     */
    key: string;
    
    /**
     * 配置项值
     */
    value: any;
    
    /**
     * 所在行号
     */
    line: number;
    
    /**
     * 列位置
     */
    column: number;
    
    /**
     * 键的长度
     */
    length: number;
    
    /**
     * 可选的注释
     */
    comment?: string;
    
    /**
     * 配置文件路径
     */
    filePath: string;
    
    /**
     * 配置文件类型
     */
    fileType: 'properties' | 'yaml';
    
    /**
     * 值是否包含占位符引用
     */
    hasPlaceholders?: boolean;
    
    /**
     * 值中包含的占位符键列表
     */
    placeholderKeys?: string[];
}

/**
 * 通用配置读取器
 * 用于解析不同类型的配置文件
 */
export class ConfigReader {
    /**
     * 解析配置文件
     * @param content 文件内容
     * @param filePath 文件路径
     * @returns 解析后的配置项数组
     */
    public static parseConfig(content: string, filePath: string): ConfigItem[] {
        const ext = path.extname(filePath).toLowerCase();
        
        // 根据文件扩展名选择不同的解析器
        switch (ext) {
            case '.properties':
                return this.parsePropertiesFile(content, filePath);
            case '.yml':
            case '.yaml':
                return this.parseYamlFile(content, filePath);
            default:
                console.warn(`不支持的文件类型: ${ext}, 文件: ${filePath}`);
                return [];
        }
    }
    
    /**
     * 解析Properties文件
     * @param content 文件内容
     * @param filePath 文件路径
     * @returns 解析后的配置项数组
     */
    private static parsePropertiesFile(content: string, filePath: string): ConfigItem[] {
        const properties = PropertiesReader.parse(content, filePath);
        
        return properties.map(item => {
            // 提取属性值中的占位符键
            const placeholderKeys = item.hasPlaceholders ? 
                PropertiesReader.getPlaceholders(item.value) : 
                undefined;
                
            return {
                key: item.key,
                value: item.value,
                line: item.line,
                column: item.column,
                length: item.length,
                comment: item.comment,
                filePath: filePath,
                fileType: 'properties',
                hasPlaceholders: item.hasPlaceholders,
                placeholderKeys
            };
        });
    }
    
    /**
     * 解析YAML文件
     * @param content 文件内容
     * @param filePath 文件路径
     * @returns 解析后的配置项数组
     */
    private static parseYamlFile(content: string, filePath: string): ConfigItem[] {
        const yamlProperties = YamlReader.parse(content, filePath);
        
        return yamlProperties.map(item => {
            // 提取属性值中的占位符键（如果是字符串且包含占位符）
            let placeholderKeys: string[] | undefined = undefined;
            if (item.hasPlaceholders && typeof item.value === 'string') {
                placeholderKeys = YamlReader.getPlaceholders(item.value);
            }
            
            return {
                key: item.path,
                value: item.value,
                line: item.line,
                column: item.column,
                length: item.length,
                comment: undefined, // YAML解析器当前不提取注释
                filePath: filePath,
                fileType: 'yaml',
                hasPlaceholders: item.hasPlaceholders,
                placeholderKeys
            };
        });
    }
    
    /**
     * 将PropertyItem转换为ConfigItem
     * @param item PropertyItem对象
     * @param filePath 文件路径
     * @returns 转换后的ConfigItem
     */
    private static propertyItemToConfigItem(item: PropertyItem, filePath: string): ConfigItem {
        // 提取属性值中的占位符键
        const placeholderKeys = item.hasPlaceholders ? 
            PropertiesReader.getPlaceholders(item.value) : 
            undefined;
            
        return {
            key: item.key,
            value: item.value,
            line: item.line,
            column: item.column,
            length: item.length,
            comment: item.comment,
            filePath: filePath,
            fileType: 'properties',
            hasPlaceholders: item.hasPlaceholders,
            placeholderKeys
        };
    }
    
    /**
     * 将YamlPropertyItem转换为ConfigItem
     * @param item YamlPropertyItem对象
     * @param filePath 文件路径
     * @returns 转换后的ConfigItem
     */
    private static yamlPropertyItemToConfigItem(item: YamlPropertyItem, filePath: string): ConfigItem {
        // 提取属性值中的占位符键（如果是字符串且包含占位符）
        let placeholderKeys: string[] | undefined = undefined;
        if (item.hasPlaceholders && typeof item.value === 'string') {
            placeholderKeys = YamlReader.getPlaceholders(item.value);
        }
        
        return {
            key: item.path,
            value: item.value,
            line: item.line,
            column: item.column,
            length: item.length,
            comment: undefined, // YAML解析器当前不提取注释
            filePath: filePath,
            fileType: 'yaml',
            hasPlaceholders: item.hasPlaceholders,
            placeholderKeys
        };
    }
    
    /**
     * 从配置文件内容中查找指定键的配置项
     * @param content 文件内容
     * @param key 配置项键
     * @param filePath 文件路径
     * @returns 找到的配置项，如果未找到返回undefined
     */
    public static findConfigItemByKey(content: string, key: string, filePath: string): ConfigItem | undefined {
        const ext = path.extname(filePath).toLowerCase();
        
        switch (ext) {
            case '.properties':
                const properties = PropertiesReader.parse(content, filePath);
                const propItem = PropertiesReader.getProperty(properties, key);
                return propItem ? this.propertyItemToConfigItem(propItem, filePath) : undefined;
                
            case '.yml':
            case '.yaml':
                const yamlItem = YamlReader.getProperty(content, key);
                return yamlItem ? this.yamlPropertyItemToConfigItem(yamlItem, filePath) : undefined;
                
            default:
                console.warn(`不支持的文件类型: ${ext}, 文件: ${filePath}`);
                return undefined;
        }
    }
    
    /**
     * 格式化配置项值，处理特殊字符和占位符
     * @param item 配置项
     * @param resolver 可选的占位符解析函数
     * @returns 格式化后的值
     */
    public static formatConfigValue(
        item: ConfigItem, 
        resolver?: (key: string) => string | undefined
    ): any {
        if (item.fileType === 'properties') {
            return PropertiesReader.formatValue(item.value, resolver);
        } else if (item.fileType === 'yaml') {
            return YamlReader.formatValue(item.value, resolver);
        }
        
        return item.value;
    }
    
    /**
     * 解析配置值中的占位符
     * @param value 配置值
     * @returns 找到的占位符键数组
     */
    public static parsePlaceholders(value: string | any): string[] {
        if (typeof value !== 'string') {
            return [];
        }
        
        const placeholders = PropertyValueParser.parsePlaceholders(value);
        return placeholders.map(p => p.key);
    }
    
    /**
     * 解析配置项之间的依赖关系，构建依赖图
     * @param items 配置项数组
     * @returns 配置项依赖关系 [key, [依赖的键...]]
     */
    public static buildDependencyGraph(items: ConfigItem[]): Map<string, string[]> {
        const dependencyGraph = new Map<string, string[]>();
        
        for (const item of items) {
            if (item.hasPlaceholders && item.placeholderKeys && item.placeholderKeys.length > 0) {
                dependencyGraph.set(item.key, item.placeholderKeys);
            }
        }
        
        return dependencyGraph;
    }
} 