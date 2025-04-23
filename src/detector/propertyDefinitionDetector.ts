import * as vscode from 'vscode';
import * as path from 'path';
import { YamlReader } from '../reader/yamlReader';
import { PropertiesReader } from '../reader/propertiesReader';

/**
 * 属性定义类型，用于区分不同的属性文件类型
 */
export enum PropertyType {
    PROPERTIES = 'properties',
    YAML = 'yaml',
    UNKNOWN = 'unknown'
}

/**
 * 表示一个属性定义
 */
export interface PropertyDefinition {
    /**
     * 属性键名
     */
    key: string;
    
    /**
     * 属性值
     */
    value: string;
    
    /**
     * 属性文件路径
     */
    filePath: string;
    
    /**
     * 属性在文件中的行号
     */
    line: number;
    
    /**
     * 属性类型
     */
    type: PropertyType;
    
    /**
     * 属性注释（如果有）
     */
    comment?: string;
}

/**
 * 属性定义检测器
 * 用于扫描和识别项目中的Java属性定义
 */
export class PropertyDefinitionDetector {
    /**
     * 支持的属性文件扩展名
     */
    private static readonly SUPPORTED_EXTENSIONS = ['.properties', '.yml', '.yaml'];
    
    /**
     * 读取器映射表，按文件扩展名映射到对应的读取器
     */
    private static readonly READERS: { [ext: string]: any } = {
        '.properties': PropertiesReader,
        '.yml': YamlReader,
        '.yaml': YamlReader
    };
    
    /**
     * 获取属性文件类型
     * @param filePath 文件路径
     */
    public static getPropertyType(filePath: string): PropertyType {
        const ext = path.extname(filePath).toLowerCase();
        
        if (ext === '.properties') {
            return PropertyType.PROPERTIES;
        } else if (ext === '.yml' || ext === '.yaml') {
            return PropertyType.YAML;
        }
        
        return PropertyType.UNKNOWN;
    }
    
    /**
     * 判断文件是否为属性文件
     * @param filePath 文件路径
     */
    public static isPropertyFile(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return this.SUPPORTED_EXTENSIONS.includes(ext);
    }
    
    /**
     * 从文件中提取属性定义
     * @param document 文档对象
     * @returns 属性定义数组
     */
    public static extractProperties(document: vscode.TextDocument): PropertyDefinition[] {
        const filePath = document.uri.fsPath;
        const fileType = this.getPropertyType(filePath);
        
        if (fileType === PropertyType.UNKNOWN) {
            return [];
        }
        
        const ext = path.extname(filePath).toLowerCase();
        const reader = this.READERS[ext];
        
        if (!reader) {
            return [];
        }
        
        const content = document.getText();
        const properties = reader.parse(content, filePath);
        
        return properties.map((prop: any) => ({
            key: prop.key,
            value: prop.value,
            filePath,
            line: prop.line,
            type: fileType,
            comment: prop.comment
        }));
    }
    
    /**
     * 查找工作区中所有属性文件
     * @param includePattern 包含模式（glob格式）
     * @param excludePattern 排除模式（glob格式）
     */
    public static async findPropertyFiles(
        includePattern: string = '**/*.{properties,yml,yaml}',
        excludePattern: string = '**/node_modules/**,**/target/**,**/build/**'
    ): Promise<vscode.Uri[]> {
        return await vscode.workspace.findFiles(includePattern, excludePattern);
    }
    
    /**
     * 从属性文件中查找指定键对应的定义
     * @param key 要查找的键
     * @param document 文档
     */
    public static findPropertyDefinition(key: string, document: vscode.TextDocument): PropertyDefinition | undefined {
        const properties = this.extractProperties(document);
        return properties.find(prop => prop.key === key);
    }
    
    /**
     * 在工作区中查找所有匹配给定键的属性定义
     * @param key 属性键
     */
    public static async findPropertyDefinitionsInWorkspace(key: string): Promise<PropertyDefinition[]> {
        const propertyFiles = await this.findPropertyFiles();
        const results: PropertyDefinition[] = [];
        
        for (const file of propertyFiles) {
            try {
                const document = await vscode.workspace.openTextDocument(file);
                const properties = this.extractProperties(document);
                
                const matchingProps = properties.filter(prop => prop.key === key);
                results.push(...matchingProps);
            } catch (error) {
                console.error(`Error processing file ${file.fsPath}:`, error);
            }
        }
        
        return results;
    }
    
    /**
     * 检查给定位置是否在属性键内
     * @param document 文档
     * @param position 位置
     */
    public static isPositionInPropertyKey(document: vscode.TextDocument, position: vscode.Position): boolean {
        const line = document.lineAt(position.line).text;
        const fileType = this.getPropertyType(document.uri.fsPath);
        
        if (fileType === PropertyType.PROPERTIES) {
            // 处理.properties文件
            const separatorIndex = line.indexOf('=');
            if (separatorIndex === -1) return false;
            
            // 检查位置是否在属性键部分
            return position.character < separatorIndex;
        } else if (fileType === PropertyType.YAML) {
            // 处理YAML文件
            const keyMatch = /^(\s*)([^:]+):\s/.exec(line);
            if (!keyMatch) return false;
            
            const keyStart = keyMatch[1].length;
            const keyEnd = keyStart + keyMatch[2].length;
            
            return position.character >= keyStart && position.character <= keyEnd;
        }
        
        return false;
    }
    
    /**
     * 获取光标所在位置的属性键
     * @param document 文档
     * @param position 位置
     */
    public static getPropertyKeyAtPosition(document: vscode.TextDocument, position: vscode.Position): string | undefined {
        const line = document.lineAt(position.line).text;
        const fileType = this.getPropertyType(document.uri.fsPath);
        
        if (fileType === PropertyType.PROPERTIES) {
            // 处理.properties文件
            const separatorIndex = line.indexOf('=');
            if (separatorIndex === -1) return undefined;
            
            // 仅当光标在键部分时才返回键
            if (position.character < separatorIndex) {
                return line.substring(0, separatorIndex).trim();
            }
        } else if (fileType === PropertyType.YAML) {
            // 处理YAML文件
            const keyMatch = /^(\s*)([^:]+):\s/.exec(line);
            if (!keyMatch) return undefined;
            
            const keyStart = keyMatch[1].length;
            const keyEnd = keyStart + keyMatch[2].length;
            
            // 仅当光标在键部分时才返回键
            if (position.character >= keyStart && position.character <= keyEnd) {
                return keyMatch[2].trim();
            }
            
            // 考虑嵌套属性的情况
            const yamlReader = this.READERS['.yml'];
            if (yamlReader && yamlReader.getFullKeyAtLine) {
                return yamlReader.getFullKeyAtLine(document.getText(), position.line);
            }
        }
        
        return undefined;
    }
} 