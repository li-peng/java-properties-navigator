import * as vscode from 'vscode';
import * as fs from 'fs';
import { ConfigurationIndexManager, PropertyLocation } from './configIndex';
import { JavaStringAnalyzer } from './javaStringAnalyzer';

/**
 * 属性导航器
 * 处理从Java代码跳转到属性定义的功能
 */
export class PropertyNavigator {
    private indexManager: ConfigurationIndexManager;
    private currentHoverKey: string | undefined;
    
    constructor(indexManager: ConfigurationIndexManager) {
        this.indexManager = indexManager;
    }
    
    /**
     * 注册命令和上下文菜单
     */
    public registerCommands(context: vscode.ExtensionContext): void {
        // 注册跳转命令
        context.subscriptions.push(
            vscode.commands.registerCommand('java-properties-definition.jumpToProperty', async () => {
                await this.jumpToPropertyDefinition();
            })
        );
        
        // 注册一个专门用于键盘快捷键的命令
        context.subscriptions.push(
            vscode.commands.registerTextEditorCommand('java-properties-definition.jumpToPropertyShortcut', async (editor) => {
                // 如果有选中文本，直接使用选中的文本作为配置键
                if (editor.selection && !editor.selection.isEmpty) {
                    const key = editor.document.getText(editor.selection);
                    if (key) {
                        const locations = this.indexManager.findPropertyLocations(key);
                        if (locations.length === 0) {
                            vscode.window.showWarningMessage(`未找到配置键 "${key}" 的定义。`);
                            return;
                        }
                        
                        // 如果只有一个位置，直接跳转
                        if (locations.length === 1) {
                            await this.openPropertyLocation(locations[0]);
                        } else {
                            // 如果有多个位置，显示选择对话框
                            await this.showLocationPicker(locations);
                        }
                        return;
                    }
                }
                
                // 如果没有选中文本，则调用标准的跳转方法
                await this.jumpToPropertyDefinition();
            })
        );
        
        // 添加编辑器选择变更事件，用于在选中配置键时显示上下文菜单
        context.subscriptions.push(
            vscode.window.onDidChangeTextEditorSelection(async event => {
                await this.updateContextMenu(event.textEditor);
            })
        );
        
        // 添加编辑器活跃变更事件
        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(async editor => {
                if (editor) {
                    await this.updateContextMenu(editor);
                }
            })
        );
        
        // 注册悬停提供器，显示属性值
        context.subscriptions.push(
            vscode.languages.registerHoverProvider('java', {
                provideHover: async (document, position, token) => {
                    return await this.provideHover(document, position, token);
                }
            })
        );
    }
    
    /**
     * 提供悬停信息
     */
    private async provideHover(
        document: vscode.TextDocument, 
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Hover | undefined> {
        // 获取当前位置的字符串
        const key = await JavaStringAnalyzer.analyzeStringAtPosition(document, position);
        if (!key || !this.indexManager.hasProperty(key)) {
            return undefined;
        }
        
        // 查找配置键的位置
        const locations = this.indexManager.findPropertyLocations(key);
        if (locations.length === 0) {
            return undefined;
        }
        
        this.currentHoverKey = key;
        
        // 创建悬停内容
        const contents: vscode.MarkdownString[] = [];
        
        // 如果有多个位置
        if (locations.length > 1) {
            const valuesMd = new vscode.MarkdownString();
            valuesMd.isTrusted = true;
            valuesMd.supportHtml = true;
            
            for (const location of locations) {
                const environmentText = location.environment ? `[${location.environment}] ` : '';
                const linePreview = this.getLinePreview(location);
                
                // 添加链接，点击可以跳转到对应的文件
                const encodedFilePath = encodeURIComponent(location.filePath);
                const encodedLine = encodeURIComponent(location.line);
                
                valuesMd.appendMarkdown(`* ${environmentText}[${linePreview}](command:java-properties-definition.openFile?${encodeURIComponent(JSON.stringify([encodedFilePath, encodedLine]))})\n\n`);
            }
            
            contents.push(valuesMd);
        } else {
            // 只有一个位置时，只显示值
            const location = locations[0];
            const linePreview = this.getLinePreview(location);
            
            const valueMd = new vscode.MarkdownString();
            valueMd.isTrusted = true;
            valueMd.supportHtml = true;
            
            // 添加链接，点击可以跳转到对应的文件
            const encodedFilePath = encodeURIComponent(location.filePath);
            const encodedLine = encodeURIComponent(location.line);
            
            valueMd.appendMarkdown(`[${linePreview}](command:java-properties-definition.openFile?${encodeURIComponent(JSON.stringify([encodedFilePath, encodedLine]))})`);
            
            contents.push(valueMd);
        }
        
        return new vscode.Hover(contents);
    }
    
    /**
     * 更新上下文菜单，当选中或光标位于配置键时显示"Jump to Property"选项
     */
    private async updateContextMenu(editor: vscode.TextEditor): Promise<void> {
        if (editor.document.languageId !== 'java') {
            return;
        }
        
        // 获取当前位置
        const position = editor.selection.active;
        
        // 尝试分析当前位置的字符串
        const key = await JavaStringAnalyzer.analyzeStringAtPosition(editor.document, position);
        
        // 设置上下文变量，控制菜单项的显示
        await vscode.commands.executeCommand(
            'setContext', 
            'java-properties-definition.canJump',
            key !== undefined && this.indexManager.hasProperty(key)
        );
    }
    
    /**
     * 跳转到属性定义
     */
    public async jumpToPropertyDefinition(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        
        // 获取当前位置和选择区域
        const position = editor.selection.active;
        const selection = editor.selection;
        
        // 尝试分析当前位置的字符串
        const key = await JavaStringAnalyzer.analyzeStringAtPosition(editor.document, position);
        
        if (!key) {
            vscode.window.showInformationMessage('未找到配置键，请确保光标位于一个有效的字符串上。');
            return;
        }
        
        // 查找配置键的位置
        const locations = this.indexManager.findPropertyLocations(key);
        
        if (locations.length === 0) {
            vscode.window.showWarningMessage(`未找到配置键 "${key}" 的定义。`);
            return;
        }
        
        // 如果只有一个位置，直接跳转
        if (locations.length === 1) {
            await this.openPropertyLocation(locations[0]);
        } else {
            // 如果有多个位置，显示选择对话框
            await this.showLocationPicker(locations);
        }
    }
    
    /**
     * 打开属性位置
     */
    private async openPropertyLocation(location: PropertyLocation): Promise<void> {
        try {
            // 创建一个位置范围，聚焦到特定行
            const uri = vscode.Uri.file(location.filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            const line = Math.max(0, location.line - 1); // 转换为0基的行号
            
            // 创建一个范围，高亮整行
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
            
            // 添加装饰效果突出显示
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
            console.error('打开属性位置时出错:', error);
            vscode.window.showErrorMessage(`无法打开文件 ${location.filePath}`);
        }
    }
    
    /**
     * 显示位置选择器
     */
    private async showLocationPicker(locations: PropertyLocation[]): Promise<void> {
        // 为每个位置创建快速选择项
        const items = locations.map(loc => {
            const fileName = loc.filePath.split(/[\\/]/).pop() || loc.filePath;
            const environmentText = loc.environment ? `[${loc.environment}]` : '';
            
            return {
                label: `${loc.key} ${environmentText}`,
                description: fileName,
                detail: `行 ${loc.line}: ${this.getLinePreview(loc)}`,
                location: loc
            };
        });
        
        // 显示快速选择对话框
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: '选择配置键位置',
            matchOnDescription: true,
            matchOnDetail: true
        });
        
        if (selected) {
            await this.openPropertyLocation(selected.location);
        }
    }
    
    /**
     * 获取行预览
     */
    private getLinePreview(location: PropertyLocation): string {
        try {
            const content = fs.readFileSync(location.filePath, 'utf8');
            const lines = content.split(/\r?\n/);
            if (location.line > 0 && location.line <= lines.length) {
                return lines[location.line - 1].trim(); // 行号从1开始，数组索引从0开始
            }
        } catch (error) {
            console.error('获取行预览时出错:', error);
        }
        
        return '';
    }
    
    /**
     * 查找配置键的使用位置
     */
    public async findUsages(key: string): Promise<void> {
        // 这个方法会在后续版本实现，用于实现"Find Usages"功能
        vscode.window.showInformationMessage(`查找 "${key}" 的使用位置功能将在未来版本提供。`);
    }
} 