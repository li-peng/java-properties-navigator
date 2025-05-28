import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigurationIndexManager, PropertyLocation } from '../configIndex';
import { JavaStringAnalyzer } from '../analyzer/javaStringAnalyzer';

/**
 * 属性悬停提供者
 * 在配置键上悬停时显示配置值
 */
export class PropertyHoverProvider implements vscode.HoverProvider {
    private indexManager: ConfigurationIndexManager;
    
    constructor(indexManager: ConfigurationIndexManager) {
        this.indexManager = indexManager;
    }
    
    /**
     * 提供悬停内容
     */
    public async provideHover(
        document: vscode.TextDocument, 
        position: vscode.Position, 
        token: vscode.CancellationToken
    ): Promise<vscode.Hover | undefined> {
        try {
            // 只处理Java文件中的悬停
            if (document.languageId !== 'java') {
                return undefined;
            }
            
            let propertyKey: string | undefined;
            
            // 先检查是否有选中文本
            const editor = vscode.window.activeTextEditor;
            const selection = editor?.selection;
            
            if (editor && selection && !selection.isEmpty && 
                editor.document.uri.toString() === document.uri.toString() && 
                selection.contains(position)) {
                // 获取选中的文本
                const selectedText = document.getText(selection);
                
                // 验证选中文本是否是有效的Java字符串
                if (await this.isValidJavaString(document, selection, selectedText)) {
                    propertyKey = selectedText;
                } else {
                    // 如果不是有效的Java字符串，返回undefined
                    return undefined;
                }
            } else {
                // 否则使用高级版本的字符串分析
                propertyKey = await JavaStringAnalyzer.analyzeStringAtPosition(document, position);
            }
            
            if (!propertyKey || !this.indexManager.hasProperty(propertyKey)) {
                return undefined;
            }
            
            // 查找配置键的位置信息
            const locations = this.indexManager.findPropertyLocations(propertyKey);
            
            if (locations.length === 0) {
                return undefined;
            }
            
            // 读取配置键的值
            const propertyValues = await Promise.all(
                locations.map(async location => {
                    const value = await this.getPropertyValue(location);
                    return {
                        location,
                        value
                    };
                })
            );
            
            // 构建悬停内容
            return this.buildHoverContent(propertyKey, propertyValues);
        } catch (error) {
            console.error('提供配置键悬停时出错:', error);
            return undefined;
        }
    }
    
    /**
     * 验证选中文本是否是有效的Java字符串
     * 检查1：确保选中的文本是完整的Java字符串
     * 检查2：确保选中的文本不在注释中
     * 检查3：确保选中的文本不是变量名
     */
    private async isValidJavaString(
        document: vscode.TextDocument, 
        selection: vscode.Selection, 
        selectedText: string
    ): Promise<boolean> {
        try {
            // 计算选区中间点位置
            const midLine = Math.floor((selection.start.line + selection.end.line) / 2);
            const midChar = selection.start.line === selection.end.line ? 
                Math.floor((selection.start.character + selection.end.character) / 2) : 
                Math.floor(document.lineAt(midLine).text.length / 2);
            const midPosition = new vscode.Position(midLine, midChar);
            
            // 使用JavaStringAnalyzer检查中间点位置的字符串
            const detectedString = await JavaStringAnalyzer.analyzeStringAtPosition(document, midPosition);
            
            // 如果没有检测到字符串，则选中的文本不是有效的Java字符串
            if (!detectedString) {
                return false;
            }
            
            // 检查选中的文本是否与检测到的字符串完全匹配
            return detectedString === selectedText;
        } catch (error) {
            console.error('验证Java字符串时出错:', error);
            return false;
        }
    }
    
    /**
     * 读取配置键在指定位置的值
     */
    private async getPropertyValue(location: PropertyLocation): Promise<string> {
        try {
            const content = fs.readFileSync(location.filePath, 'utf8');
            const lines = content.split(/\r?\n/);
            
            if (location.line <= 0 || location.line > lines.length) {
                return '无法读取值';
            }
            
            const line = lines[location.line - 1]; // 1-based 转 0-based
            
            // 提取配置值
            if (location.filePath.endsWith('.properties')) {
                // 对于properties文件，提取键后面的值
                const match = line.match(/^[^=:#]+[=:]\s*(.*)/);
                return match ? match[1].trim() : '无法解析值';
            } else if (location.filePath.endsWith('.yml') || location.filePath.endsWith('.yaml')) {
                // 对于YAML文件，提取冒号后面的值
                const match = line.match(/^[^:]+:\s*(.*)/);
                return match ? match[1].trim() : '无法解析值';
            }
            
            return '不支持的文件格式';
        } catch (error) {
            console.error(`读取配置值时出错: ${location.filePath}:${location.line}`, error);
            return '读取值时出错';
        }
    }
    
    /**
     * 构建悬停内容
     */
    private buildHoverContent(
        propertyKey: string, 
        propertyValues: Array<{ location: PropertyLocation; value: string }>
    ): vscode.Hover {
        // 构建markdown内容
        const markdownContent = new vscode.MarkdownString();
        markdownContent.isTrusted = true;
        
        // 如果只有一个配置值
        if (propertyValues.length === 1) {
            const { location, value } = propertyValues[0];
            
            // 添加命令链接，使用户可以点击跳转到文件
            const encodedArgs = encodeURIComponent(JSON.stringify({
                filePath: location.filePath,
                line: location.line
            }));
            
            // 直接显示值，不添加额外标签，整个值可点击跳转
                            markdownContent.appendMarkdown(`[${value}](command:java-properties-navigator.openLocation?${encodedArgs})`);
        } else {
            // 有多个配置值，创建简洁的列表
            
            // 统计文件名出现的次数
            const fileNameCounts = new Map<string, number>();
            propertyValues.forEach(item => {
                const fileName = path.basename(item.location.filePath);
                fileNameCounts.set(fileName, (fileNameCounts.get(fileName) || 0) + 1);
            });
            
            propertyValues.forEach((item, index) => {
                const { location, value } = item;
                const fileName = path.basename(location.filePath);
                
                // 添加命令链接，整行可点击
                const encodedArgs = encodeURIComponent(JSON.stringify({
                    filePath: location.filePath,
                    line: location.line
                }));
                
                // 使用简洁的"value filename"格式，整行可点击
                markdownContent.appendMarkdown(`[${value} ${fileName}](command:java-properties-navigator.openLocation?${encodedArgs})`);
                
                // 只有当前文件名在列表中出现多次时，才显示完整路径
                if (fileNameCounts.get(fileName)! > 1) {
                    markdownContent.appendMarkdown(`\n*${location.filePath}*`);
                }
                
                // 除了最后一项，每项后添加分隔线
                if (index < propertyValues.length - 1) {
                    markdownContent.appendMarkdown('\n\n---\n\n');
                }
            });
        }
        
        return new vscode.Hover(markdownContent);
    }
} 