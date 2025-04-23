import * as path from 'path';
import { PropertyLocation } from '../configIndex';
import { IConfigFileParser } from './parserRegistry';
import * as yaml from 'js-yaml';

/**
 * YAML文件解析器
 * 使用js-yaml库进行专业解析
 */
export class YamlParser implements IConfigFileParser {
    /**
     * 检查是否支持解析指定文件
     */
    public canParse(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return ext === '.yml' || ext === '.yaml';
    }
    
    /**
     * 解析YAML文件内容
     */
    public async parse(filePath: string, content: string): Promise<PropertyLocation[]> {
        try {
            const locations: PropertyLocation[] = [];
            const filename = path.basename(filePath);
            
            // 尝试从文件名提取环境信息，例如 application-dev.yml
            let environment: string | undefined = undefined;
            const match = filename.match(/.*-([^.]+)\.(yml|yaml)/);
            if (match && match[1]) {
                environment = match[1];
            }
            
            // 解析YAML文档
            // 处理多文档YAML (以 --- 分隔的多个文档)
            const documents = this.splitYamlDocuments(content);
            
            for (let docIndex = 0; docIndex < documents.length; docIndex++) {
                const docContent = documents[docIndex];
                
                try {
                    // 使用js-yaml解析文档
                    const doc = yaml.load(docContent) as any;
                    
                    if (doc && typeof doc === 'object') {
                        // 构造位置映射，将YAML对象的路径映射到行号
                        const lineMap = this.buildLineMap(docContent);
                        
                        // 提取所有键值对
                        this.extractKeys(doc, '', filePath, lineMap, environment, locations);
                    }
                } catch (docError) {
                    console.error(`解析YAML文档 #${docIndex + 1} 时出错: ${filePath}`, docError);
                }
            }
            
            return locations;
        } catch (error) {
            console.error(`解析YAML文件时出错: ${filePath}`, error);
            return [];
        }
    }
    
    /**
     * 拆分多文档YAML
     */
    private splitYamlDocuments(content: string): string[] {
        // 以 "---" 分隔符拆分多文档YAML
        const docSeparator = /^---$/m;
        const parts = content.split(docSeparator);
        
        // 过滤空文档
        return parts.filter(part => part.trim().length > 0);
    }
    
    /**
     * 构建YAML对象路径到行号的映射
     */
    private buildLineMap(content: string): Map<string, number> {
        const lineMap = new Map<string, number>();
        const lines = content.split(/\r?\n/);
        
        let currentPath: string[] = [];
        let currentIndent = -1;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // 跳过注释和空行
            if (trimmedLine.startsWith('#') || trimmedLine === '') {
                continue;
            }
            
            // 计算当前行的缩进级别
            const indent = line.search(/\S|$/);
            
            // 检查是否是键值对
            const match = trimmedLine.match(/^([^:]+):(.*)/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim();
                
                // 根据缩进调整路径
                if (indent > currentIndent) {
                    // 缩进增加，保持当前路径
                } else if (indent < currentIndent) {
                    // 缩进减少，回到适当的级别
                    const levelDiff = Math.floor((currentIndent - indent) / 2); // 假设每级缩进为2个空格
                    currentPath = currentPath.slice(0, -levelDiff);
                } else {
                    // 相同缩进，替换最后一个路径节点
                    currentPath = currentPath.slice(0, -1);
                }
                
                // 添加当前键到路径
                currentPath.push(key);
                currentIndent = indent;
                
                // 记录路径到行号的映射
                const fullPath = currentPath.join('.');
                lineMap.set(fullPath, i + 1); // 1-based line number
                
                // 如果没有值或者是对象开始，则维持路径
                // 否则移除最后一个路径节点
                if (value !== '' && !value.startsWith('{')) {
                    currentPath = currentPath.slice(0, -1);
                }
            }
        }
        
        return lineMap;
    }
    
    /**
     * 递归提取YAML对象中的所有键
     */
    private extractKeys(
        obj: any,
        prefix: string,
        filePath: string,
        lineMap: Map<string, number>,
        environment: string | undefined,
        locations: PropertyLocation[]
    ): void {
        if (!obj || typeof obj !== 'object') {
            return;
        }
        
        for (const key of Object.keys(obj)) {
            const value = obj[key];
            const fullKey = prefix ? `${prefix}.${key}` : key;
            const line = lineMap.get(fullKey) || 0;
            
            if (
                value === null ||
                typeof value !== 'object' ||
                Array.isArray(value)
            ) {
                // 这是一个叶节点，添加到位置列表
                locations.push({
                    key: fullKey,
                    filePath,
                    line,
                    column: 0, // 由于YAML解析的限制，这里使用默认值0
                    length: fullKey.length, // 使用键的长度作为默认值
                    environment
                });
            }
            
            // 递归处理嵌套对象
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                this.extractKeys(value, fullKey, filePath, lineMap, environment, locations);
            }
        }
    }
    
    /**
     * 解析文件内容，返回解析结果
     */
    public parseContent(content: string): any {
        try {
            // 对于多文档YAML，只返回第一个文档的解析结果
            const documents = this.splitYamlDocuments(content);
            if (documents.length > 0) {
                return yaml.load(documents[0]);
            }
            return null;
        } catch (error) {
            console.error('解析YAML内容时出错:', error);
            return null;
        }
    }
} 