import * as vscode from 'vscode';
import * as fs from 'fs';
import * as yaml from 'yaml';
import { ConfigItem } from '../reader/configReader';
import { PropertyValueParser } from '../reader/propertyValueParser';

/**
 * 解析YAML文件并返回配置项
 * @param filePath 文件路径
 * @returns 配置项数组
 */
export function parseYamlFile(filePath: string): ConfigItem[] {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const fileUri = vscode.Uri.file(filePath);
        console.log(`解析YAML文件: ${filePath}`);
        
        // 解析YAML文档
        const doc = yaml.parse(content);
        if (!doc || typeof doc !== 'object') {
            console.warn(`无法解析YAML文件: ${filePath}`);
            return [];
        }
        
        // 将文本内容按行分割，用于确定行号
        const lines = content.split('\n');
        
        // 保存每个键的行号
        // 这不是100%准确，但足以满足大多数情况
        const keyLineMap = new Map<string, number>();
        
        // 寻找键的位置
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith('#')) continue;
            
            // 简单匹配形如 "key:"的模式
            const match = line.match(/^([^:]+):/);
            if (match) {
                const key = match[1].trim();
                keyLineMap.set(key, i);
            }
        }
        
        // 递归提取所有配置项
        const items: ConfigItem[] = [];
        extractConfigItems(doc, '', keyLineMap, filePath, items);
        
        console.log(`从 ${filePath} 中解析出 ${items.length} 个配置项`);
        return items;
        
    } catch (error) {
        console.error(`解析YAML文件 ${filePath} 时出错:`, error);
        return [];
    }
}

/**
 * 递归提取配置项
 */
function extractConfigItems(
    obj: any,
    parentPath: string,
    keyLineMap: Map<string, number>,
    filePath: string,
    items: ConfigItem[]
): void {
    if (!obj || typeof obj !== 'object') return;
    
    // 处理数组
    if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
            const currentPath = parentPath ? `${parentPath}[${index}]` : `[${index}]`;
            
            if (typeof item === 'object' && item !== null) {
                // 如果是复杂对象，继续递归
                extractConfigItems(item, currentPath, keyLineMap, filePath, items);
            } else {
                // 简单值，添加为配置项
                const line = keyLineMap.get(parentPath) || 0;
                items.push({
                    key: currentPath,
                    value: item,
                    line,
                    column: 0,
                    length: String(parentPath).length,
                    filePath,
                    fileType: 'yaml',
                    hasPlaceholders: false
                });
            }
        });
        return;
    }
    
    // 处理对象
    for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
        
        const value = obj[key];
        const currentPath = parentPath ? `${parentPath}.${key}` : key;
        
        // 查找当前键的行号
        let line = keyLineMap.get(key) || 0;
        
        if (typeof value === 'object' && value !== null) {
            // 添加当前节点
            items.push({
                key: currentPath,
                value: '[Object]',
                line,
                column: 0,
                length: key.length,
                filePath,
                fileType: 'yaml',
                hasPlaceholders: false
            });
            
            // 递归处理子级
            extractConfigItems(value, currentPath, keyLineMap, filePath, items);
        } else {
            // 检查是否包含占位符
            let hasPlaceholders = false;
            let placeholderKeys: string[] | undefined = undefined;
            
            if (typeof value === 'string') {
                hasPlaceholders = PropertyValueParser.containsPlaceholders(value);
                if (hasPlaceholders) {
                    placeholderKeys = PropertyValueParser.getPlaceholderKeys(value);
                }
            }
            
            // 添加叶子节点配置项
            items.push({
                key: currentPath,
                value,
                line,
                column: 0,
                length: key.length,
                filePath,
                fileType: 'yaml',
                hasPlaceholders,
                placeholderKeys
            });
        }
    }
} 