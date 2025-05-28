import * as vscode from 'vscode';
import * as path from 'path';
import { PropertyLocation } from '../configIndex';

/**
 * 用于记录Java中配置键使用的位置信息
 */
export interface PropertyUsageLocation {
    // 配置键
    key: string;
    
    // 文件路径
    filePath: string;
    
    // 行号 (1-indexed)
    line: number;
    
    // 所在行的文本内容
    lineText: string;
}

/**
 * 反向属性导航器
 * 从配置文件跳转到Java代码
 */
export class ReversePropertyNavigator {
    // 保存配置键到使用位置的映射
    private propertyUsages: Map<string, PropertyUsageLocation[]> = new Map();
    
    /**
     * 注册反向导航命令
     */
    public registerCommands(context: vscode.ExtensionContext): void {
        // 注册查找使用命令
        context.subscriptions.push(
            vscode.commands.registerCommand('java-properties-navigator.findUsages', async () => {
                await this.findPropertyUsages();
            })
        );
        
        // 添加编辑器选择变更事件
        context.subscriptions.push(
            vscode.window.onDidChangeTextEditorSelection(async event => {
                await this.updateConfigFileContextMenu(event.textEditor);
            })
        );
        
        // 添加编辑器活跃变更事件
        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(async editor => {
                if (editor) {
                    await this.updateConfigFileContextMenu(editor);
                }
            })
        );
    }
    
    /**
     * 添加配置键使用位置
     */
    public addPropertyUsage(usage: PropertyUsageLocation): void {
        if (!this.propertyUsages.has(usage.key)) {
            this.propertyUsages.set(usage.key, []);
        }
        
        this.propertyUsages.get(usage.key)?.push(usage);
    }
    
    /**
     * 批量添加配置键使用位置
     */
    public addPropertyUsages(usages: PropertyUsageLocation[]): void {
        for (const usage of usages) {
            this.addPropertyUsage(usage);
        }
    }
    
    /**
     * 从文档中移除所有使用位置
     */
    public removeUsagesFromFile(filePath: string): void {
        for (const [key, usages] of this.propertyUsages.entries()) {
            const filteredUsages = usages.filter(usage => usage.filePath !== filePath);
            
            if (filteredUsages.length === 0) {
                this.propertyUsages.delete(key);
            } else if (filteredUsages.length !== usages.length) {
                this.propertyUsages.set(key, filteredUsages);
            }
        }
    }
    
    /**
     * 查找配置键的所有使用位置
     */
    public findUsagesForKey(key: string): PropertyUsageLocation[] {
        return this.propertyUsages.get(key) || [];
    }
    
    /**
     * 更新配置文件的上下文菜单
     * 当光标位于配置键时显示"查找使用位置"选项
     */
    private async updateConfigFileContextMenu(editor: vscode.TextEditor): Promise<void> {
        // 检查是否是配置文件
        const ext = path.extname(editor.document.fileName).toLowerCase();
        if (ext !== '.properties' && ext !== '.yml' && ext !== '.yaml') {
            return;
        }
        
        // 获取当前位置
        const position = editor.selection.active;
        
        // 检查当前行是否包含配置键
        const propertyKey = this.getPropertyKeyAtPosition(editor.document, position);
        
        if (propertyKey) {
            // 检查是否有使用位置
            const hasUsages = this.propertyUsages.has(propertyKey) && 
                             (this.propertyUsages.get(propertyKey)?.length || 0) > 0;
            
            // 设置上下文变量，控制菜单项的显示
            await vscode.commands.executeCommand(
                'setContext',
                'java-properties-navigator.canFindUsages',
                hasUsages
            );
        } else {
            // 不在配置键上，隐藏菜单项
            await vscode.commands.executeCommand(
                'setContext',
                'java-properties-navigator.canFindUsages',
                false
            );
        }
    }
    
    /**
     * 从配置文件中获取当前位置的配置键
     */
    private getPropertyKeyAtPosition(document: vscode.TextDocument, position: vscode.Position): string | undefined {
        const ext = path.extname(document.fileName).toLowerCase();
        
        if (ext === '.properties') {
            return this.getPropertyKeyFromPropertiesFile(document, position);
        } else if (ext === '.yml' || ext === '.yaml') {
            return this.getPropertyKeyFromYamlFile(document, position);
        }
        
        return undefined;
    }
    
    /**
     * 从Properties文件中提取配置键
     */
    private getPropertyKeyFromPropertiesFile(document: vscode.TextDocument, position: vscode.Position): string | undefined {
        const line = document.lineAt(position.line).text;
        
        // 跳过注释和空行
        if (line.trim().startsWith('#') || line.trim().startsWith('!') || line.trim() === '') {
            return undefined;
        }
        
        // 查找等号或冒号分隔符
        const separatorMatch = line.match(/([^=:]+)[=:](.*)/);
        if (separatorMatch) {
            const key = separatorMatch[1].trim();
            
            // 检查光标是否在键的范围内
            const keyStartIndex = line.indexOf(key);
            const keyEndIndex = keyStartIndex + key.length;
            
            if (position.character >= keyStartIndex && position.character <= keyEndIndex) {
                return key;
            }
        }
        
        return undefined;
    }
    
    /**
     * 从YAML文件中提取配置键
     * 这是一个简化实现，实际使用中可能需要更复杂的逻辑处理嵌套键
     */
    private getPropertyKeyFromYamlFile(document: vscode.TextDocument, position: vscode.Position): string | undefined {
        const line = document.lineAt(position.line).text;
        
        // 跳过注释和空行
        if (line.trim().startsWith('#') || line.trim() === '') {
            return undefined;
        }
        
        // 查找冒号分隔符
        const colonMatch = line.match(/^(\s*)([^:]+):(.*)/);
        if (colonMatch) {
            const indentation = colonMatch[1].length;
            const key = colonMatch[2].trim();
            
            // 检查光标是否在键的范围内
            const keyStartIndex = indentation;
            const keyEndIndex = keyStartIndex + key.length;
            
            if (position.character >= keyStartIndex && position.character <= keyEndIndex) {
                // 尝试构建完整的键路径
                return this.buildYamlKeyPath(document, position.line, indentation, key);
            }
        }
        
        return undefined;
    }
    
    /**
     * 构建YAML键的完整路径
     */
    private buildYamlKeyPath(document: vscode.TextDocument, lineIndex: number, currentIndent: number, currentKey: string): string {
        // 收集上层键
        const keyParts: string[] = [currentKey];
        
        // 向上查找父级键
        for (let i = lineIndex - 1; i >= 0; i--) {
            const previousLine = document.lineAt(i).text;
            const colonMatch = previousLine.match(/^(\s*)([^:]+):(.*)/);
            
            if (colonMatch) {
                const indent = colonMatch[1].length;
                const key = colonMatch[2].trim();
                
                // 如果缩进小于当前缩进，则是父级键
                if (indent < currentIndent) {
                    keyParts.unshift(key);
                    currentIndent = indent;
                    
                    // 如果已到最外层（无缩进），则结束查找
                    if (indent === 0) {
                        break;
                    }
                }
            }
        }
        
        // 组合完整键路径
        return keyParts.join('.');
    }
    
    /**
     * 查找配置键的使用位置
     */
    private async findPropertyUsages(): Promise<void> {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }
            
            // 获取当前位置的配置键
            const position = editor.selection.active;
            const propertyKey = this.getPropertyKeyAtPosition(editor.document, position);
            
            if (!propertyKey) {
                vscode.window.showInformationMessage('请将光标放在配置键上以查找使用位置。');
                return;
            }
            
            // 查找使用位置
            const usages = this.findUsagesForKey(propertyKey);
            
            if (usages.length === 0) {
                vscode.window.showInformationMessage(`未找到配置键 "${propertyKey}" 的使用位置。`);
                return;
            }
            
            // 显示使用位置列表
            await this.showUsagesPicker(usages);
        } catch (error) {
            console.error('查找配置键使用位置时出错:', error);
            vscode.window.showErrorMessage('查找使用位置时发生错误。');
        }
    }
    
    /**
     * 显示使用位置选择器
     */
    private async showUsagesPicker(usages: PropertyUsageLocation[]): Promise<void> {
        // 为每个使用位置创建快速选择项
        const items = usages.map(usage => {
            const fileName = path.basename(usage.filePath);
            
            return {
                label: `${fileName}:${usage.line}`,
                description: usage.key,
                detail: usage.lineText.trim(),
                usage
            };
        });
        
        // 显示快速选择对话框
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: '选择使用位置',
            matchOnDescription: true,
            matchOnDetail: true
        });
        
        if (selected) {
            await this.navigateToUsage(selected.usage);
        }
    }
    
    /**
     * 跳转到使用位置
     */
    private async navigateToUsage(usage: PropertyUsageLocation): Promise<void> {
        try {
            // 打开文件
            const document = await vscode.workspace.openTextDocument(usage.filePath);
            
            // 创建选择范围
            const line = Math.max(0, usage.line - 1); // 转换为0基的行号
            const range = new vscode.Range(
                new vscode.Position(line, 0),
                new vscode.Position(line, document.lineAt(line).text.length)
            );
            
            // 打开文档并显示行
            await vscode.window.showTextDocument(document, {
                selection: range,
                preserveFocus: false,
                preview: false
            });
            
            // 添加装饰效果
            const decorationType = vscode.window.createTextEditorDecorationType({
                backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
                isWholeLine: true
            });
            
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                editor.setDecorations(decorationType, [range]);
                
                // 几秒后清除装饰
                setTimeout(() => {
                    decorationType.dispose();
                }, 3000);
            }
        } catch (error) {
            console.error('导航到使用位置时出错:', error);
            vscode.window.showErrorMessage(`无法打开文件 ${usage.filePath}`);
        }
    }
    
    /**
     * 从工作区搜索配置键的使用位置
     */
    public async buildUsageIndex(): Promise<void> {
        try {
            // 获取已索引的所有配置键
            const allKeys = Array.from(this.propertyUsages.keys());
            
            // 针对每个键执行工作区搜索
            for (const key of allKeys) {
                await this.searchWorkspaceForKey(key);
            }
            
            console.log(`已构建使用索引，共 ${this.propertyUsages.size} 个键有使用位置`);
        } catch (error) {
            console.error('构建使用索引时出错:', error);
        }
    }
    
    /**
     * 在工作区中搜索配置键的使用位置
     */
    private async searchWorkspaceForKey(key: string): Promise<void> {
        // 1. @Value、@ConfigurationProperties等注解
        // 2. @Value("${key}")
        // 3. "key" 作为字符串字面量
        const searchPattern = `"${key}"|"\\$\\{${key}\\}"`;
        
        // 获取配置的排除模式
        const config = vscode.workspace.getConfiguration('java-properties-navigator');
        const excludePatterns = config.get<string[]>('excludePatterns', ['**/target/**', '**/build/**', '**/node_modules/**']);
        const excludePattern = excludePatterns.join(',');
        
        // 搜索Java文件
        const javaFiles = await vscode.workspace.findFiles(
            '**/*.java', 
            excludePattern
        );
        
        for (const fileUri of javaFiles) {
            try {
                const document = await vscode.workspace.openTextDocument(fileUri);
                const content = document.getText();
                
                // 手动搜索模式
                const regex = new RegExp(searchPattern, 'g');
                let match;
                
                while ((match = regex.exec(content)) !== null) {
                    // 找到匹配位置的行信息
                    const pos = document.positionAt(match.index);
                    const line = document.lineAt(pos.line);
                    
                    // 添加到使用位置映射
                    const usage: PropertyUsageLocation = {
                        key,
                        filePath: fileUri.fsPath,
                        line: pos.line + 1, // 转换为1基的行号
                        lineText: line.text
                    };
                    
                    this.addPropertyUsage(usage);
                }
            } catch (error) {
                console.error(`搜索文件 ${fileUri.fsPath} 时出错:`, error);
            }
        }
    }
} 