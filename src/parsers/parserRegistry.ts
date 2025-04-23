import * as path from 'path';
import { PropertyLocation } from '../configIndex';
import { PropertiesParser } from './propertiesParser';
import { YamlParser } from './yamlParser';

/**
 * 配置文件解析器接口
 */
export interface IConfigFileParser {
    /**
     * 检查是否支持解析指定文件
     */
    canParse(filePath: string): boolean;
    
    /**
     * 解析文件内容，提取配置键和位置信息
     */
    parse(filePath: string, content: string): Promise<PropertyLocation[]>;
    
    /**
     * 解析文件内容，返回解析结果
     */
    parseContent(content: string): any;
}

/**
 * 解析器注册表
 * 管理不同类型配置文件的解析器
 */
export class ParserRegistry {
    private parsers: IConfigFileParser[] = [];
    
    constructor() {
        // 注册默认解析器
        this.registerDefaultParsers();
    }
    
    /**
     * 注册默认解析器
     */
    private registerDefaultParsers(): void {
        // 注册Properties文件解析器
        this.registerParser(new PropertiesParser());
        
        // 注册YAML文件解析器
        this.registerParser(new YamlParser());
    }
    
    /**
     * 注册解析器
     */
    public registerParser(parser: IConfigFileParser): void {
        this.parsers.push(parser);
    }
    
    /**
     * 获取适合解析指定文件的解析器
     */
    public getParser(filePath: string): IConfigFileParser | undefined {
        return this.parsers.find(parser => parser.canParse(filePath));
    }
    
    /**
     * 获取适合解析指定文件的解析器（getParser的别名）
     */
    public getParserForFile(filePath: string): IConfigFileParser | undefined {
        return this.getParser(filePath);
    }
    
    /**
     * 解析文件
     */
    public async parseFile(filePath: string, content: string): Promise<PropertyLocation[]> {
        const parser = this.getParser(filePath);
        
        if (!parser) {
            console.log(`未找到适合解析文件 ${filePath} 的解析器`);
            return [];
        }
        
        return parser.parse(filePath, content);
    }
} 