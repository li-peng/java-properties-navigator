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

        // 构建完整的键路径到行号的映射
        const keyLineMap = buildKeyLineMap(content);
        
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
 * 构建完整键路径到行号的映射
 * 解决相同键名在不同父级下的定位问题
 * @param content YAML文件内容
 * @returns 键路径到行号的映射
 */
function buildKeyLineMap(content: string): Map<string, number> {
    const keyLineMap = new Map<string, number>();
    const lines = content.split('\n');
    const pathStack: string[] = [];
    let lastIndentLevel = -1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // 跳过空行和注释
        if (!trimmedLine || trimmedLine.startsWith('#')) {
            continue;
        }

        // 计算当前行的缩进级别
        const indentLevel = line.search(/\S/);
        
        // 检查是否是键值对
        const match = trimmedLine.match(/^([^:]+):\s*(.*)?$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2]?.trim() || '';
            
            // 根据缩进级别调整路径栈
            if (indentLevel > lastIndentLevel) {
                // 缩进增加，保持当前路径
            } else {
                // 缩进减少或相等，需要调整路径栈
                // 计算应该保留的层级数
                let targetLevel = 0;
                for (let j = i - 1; j >= 0; j--) {
                    const prevLine = lines[j];
                    const prevTrimmed = prevLine.trim();
                    if (!prevTrimmed || prevTrimmed.startsWith('#')) continue;
                    
                    const prevIndent = prevLine.search(/\S/);
                    if (prevIndent < indentLevel && prevLine.includes(':')) {
                        targetLevel = Math.floor(prevIndent / 2) + 1; // 假设每级缩进2个空格
                        break;
                    }
                }
                
                // 调整路径栈到正确的层级
                pathStack.splice(targetLevel);
            }
            
            // 添加当前键到路径栈
            pathStack.push(key);
            
            // 构建完整路径
            const fullPath = pathStack.join('.');
            
            // 记录路径到行号的映射（使用0-based行号）
            keyLineMap.set(fullPath, i);
            
            // 更新最后的缩进级别
            lastIndentLevel = indentLevel;
            
            // 如果是叶子节点（有值），则移除最后一个键
            if (value && !value.startsWith('|') && !value.startsWith('>')) {
                pathStack.pop();
            }
        }
    }
    
    return keyLineMap;
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
                const line = keyLineMap.get(currentPath) || 0;
                items.push({
                    key: currentPath,
                    value: item,
                    line,
                    column: 0,
                    length: String(currentPath).length,
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
        
        // 查找当前完整路径的行号
        let line = keyLineMap.get(currentPath) || 0;
        
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