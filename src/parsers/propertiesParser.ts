import * as path from 'path';
import { PropertyLocation } from '../configIndex';
import { IConfigFileParser } from './parserRegistry';

/**
 * Properties文件解析器
 */
export class PropertiesParser implements IConfigFileParser {
    /**
     * 检查是否支持解析指定文件
     */
    public canParse(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return ext === '.properties';
    }
    
    /**
     * 解析Properties文件内容
     */
    public async parse(filePath: string, content: string): Promise<PropertyLocation[]> {
        const locations: PropertyLocation[] = [];
        const lines = content.split(/\r?\n/);
        const filename = path.basename(filePath);
        
        // 尝试从文件名提取环境信息，例如 application-dev.properties
        let environment: string | undefined = undefined;
        const match = filename.match(/.*-([^.]+)\.properties/);
        if (match && match[1]) {
            environment = match[1];
        }
        
        // 处理每一行
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 跳过注释和空行
            if (line.startsWith('#') || line.startsWith('!') || line === '') {
                continue;
            }
            
            // 尝试匹配键值对
            // 考虑等号、冒号和空格作为分隔符
            const separatorMatch = line.match(/([^=:]+)[=:](.*)/);
            if (separatorMatch) {
                const key = separatorMatch[1].trim();
                
                // 忽略空键
                if (key.length === 0) {
                    continue;
                }
                
                // 查找键在原始行中的位置
                const keyColumn = lines[i].indexOf(key);
                
                const location: PropertyLocation = {
                    key,
                    filePath,
                    line: i + 1, // 1-based line number
                    column: keyColumn,
                    length: key.length,
                    environment
                };
                
                locations.push(location);
            }
        }
        
        return locations;
    }
    
    /**
     * 解析文件内容，返回解析结果
     */
    public parseContent(content: string): any {
        const result: { [key: string]: string } = {};
        const lines = content.split(/\r?\n/);
        
        let continuedLine = '';
        let continuedKey = '';
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            
            // 跳过注释和空行
            if (line.startsWith('#') || line.startsWith('!') || line === '') {
                continue;
            }
            
            // 处理行尾反斜杠（多行属性）
            if (line.endsWith('\\')) {
                if (continuedLine === '') {
                    // 这是一个新的多行属性的开始
                    const separatorMatch = line.match(/([^=:]+)[=:](.*)/);
                    if (separatorMatch) {
                        continuedKey = separatorMatch[1].trim();
                        // 移除反斜杠并保存当前值
                        continuedLine = separatorMatch[2].trimLeft().replace(/\\$/, '');
                    }
                } else {
                    // 继续之前的多行属性
                    continuedLine += line.replace(/\\$/, '');
                }
                continue;
            }
            
            // 如果我们在处理多行属性
            if (continuedLine !== '') {
                continuedLine += line;
                result[continuedKey] = continuedLine;
                continuedLine = '';
                continuedKey = '';
                continue;
            }
            
            // 处理普通的键值对
            const separatorMatch = line.match(/([^=:]+)[=:](.*)/);
            if (separatorMatch) {
                const key = separatorMatch[1].trim();
                const value = separatorMatch[2].trimLeft();
                
                if (key.length > 0) {
                    result[key] = value;
                }
            }
        }
        
        return result;
    }
} 