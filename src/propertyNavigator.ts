import * as vscode from 'vscode';
import { ConfigurationIndexManager, PropertyLocation } from './configIndex';
import { JavaStringAnalyzer } from './javaStringAnalyzer';
import { Logger } from './utils/logger';

/**
 * 属性导航器
 * 处理从Java代码跳转到属性定义的功能
 */
export class PropertyNavigator {
    private indexManager: ConfigurationIndexManager;
    private logger: Logger;
    
    constructor(indexManager: ConfigurationIndexManager) {
        this.indexManager = indexManager;
        this.logger = Logger.getInstance();
        this.logger.debug('PropertyNavigator 构造函数被调用');
    }
    
    /**
     * 注册命令和上下文菜单
     */
    public registerCommands(context: vscode.ExtensionContext): void {
        this.logger.info('开始注册PropertyNavigator命令');
        
        // 注册跳转命令
        context.subscriptions.push(
            vscode.commands.registerCommand('java-properties-navigator.jumpToProperty', async () => {
                await this.jumpToPropertyDefinition();
            })
        );
        
        // 注册一个专门用于键盘快捷键的命令
        context.subscriptions.push(
            vscode.commands.registerTextEditorCommand('java-properties-navigator.jumpToPropertyShortcut', async (editor) => {
                // 如果有选中文本，直接使用选中的文本作为配置键
                if (editor.selection && !editor.selection.isEmpty) {
                    const key = editor.document.getText(editor.selection);
                    if (key) {
                        const locations = this.indexManager.findPropertyLocations(key);
                        if (locations.length === 0) {
                            this.logger.warn('未找到配置键定义', { key });
                            vscode.window.showWarningMessage(`未找到配置键 "${key}" 的定义。`);
                            return;
                        }
                        
                        // 如果只有一个位置，直接跳转
                        if (locations.length === 1) {
                            this.logger.info('快捷键跳转到配置键定义', { key, location: locations[0].filePath });
                            await this.openPropertyLocation(locations[0]);
                        } else {
                            // 如果有多个位置，显示选择对话框
                            this.logger.info('快捷键显示多个配置键位置选择', { key, locationCount: locations.length });
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
                
                // 处理双击选择事件
                if (this.isDoubleClickSelection(event)) {
                    await this.handleDoubleClickSelection(event.textEditor);
                }
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
    }
    
    /**
     * 判断是否是双击选择事件
     * 双击选择事件的特征是：选择范围不为空，且在同一行，且选择的是一个单词
     */
    private isDoubleClickSelection(event: vscode.TextEditorSelectionChangeEvent): boolean {
        // 首先确保有选择
        if (event.selections.length === 0 || event.selections[0].isEmpty) {
            return false;
        }
        
        const selection = event.selections[0];
        
        // 确保选择在同一行
        if (selection.start.line !== selection.end.line) {
            return false;
        }
        
        // 尝试检测是否是双击选择的单词
        // 通常双击选择的特征是选择一个完整的标识符/单词
        const selectedText = event.textEditor.document.getText(selection);
        
        // 检查选择的文本是否是一个合法的标识符（字母、数字、下划线或点号组成）
        return /^[a-zA-Z0-9_\.]+$/.test(selectedText);
    }
    
    /**
     * 处理双击选择事件
     */
    private async handleDoubleClickSelection(editor: vscode.TextEditor): Promise<void> {
        if (!editor || editor.document.languageId !== 'java') {
            return;
        }
        
        const selection = editor.selection;
        if (selection.isEmpty) {
            return;
        }
        
        // 获取选中的文本
        const selectedText = editor.document.getText(selection);
        if (!selectedText) {
            return;
        }
        
        // 分析选中的文本，检查是否是配置键
        const position = selection.active;
        const key = await JavaStringAnalyzer.analyzeStringAtPosition(editor.document, position);
        
        if (key && this.indexManager.hasProperty(key)) {
            // 如果是配置键，则显示上下文菜单
            await vscode.commands.executeCommand(
                'setContext', 
                'java-properties-navigator.canJump',
                true
            );
            
            // 获取用户配置：是否启用双击跳转
            const config = vscode.workspace.getConfiguration('java-properties-navigator');
            const enableDoubleClickJump = config.get<boolean>('enableDoubleClickJump', true);
            
            // 如果启用了双击跳转，直接跳转到定义
            if (enableDoubleClickJump) {
                // 查找配置键的位置
                const locations = this.indexManager.findPropertyLocations(key);
                
                if (locations.length > 0) {
                    // 如果只有一个位置，直接跳转
                    if (locations.length === 1) {
                        await this.openPropertyLocation(locations[0]);
                    } else {
                        // 如果有多个位置，显示选择对话框
                        await this.showLocationPicker(locations);
                    }
                }
            }
        }
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
            'java-properties-navigator.canJump',
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
            this.logger.debug('未找到配置键，光标不在有效字符串上');
            // vscode.window.showInformationMessage('No configuration key found. Please ensure the cursor is positioned on a valid string.');
            return;
        }
        
        this.logger.info('开始跳转到配置键定义', { key });
        
        // 查找配置键的位置
        const locations = this.indexManager.findPropertyLocations(key);
        
        if (locations.length === 0) {
            this.logger.warn('未找到配置键定义', { key });
            vscode.window.showWarningMessage(`未找到配置键 "${key}" 的定义。`);
            return;
        }
        
        // 如果只有一个位置，直接跳转
        if (locations.length === 1) {
            this.logger.info('跳转到配置键定义', { key, location: locations[0].filePath });
            await this.openPropertyLocation(locations[0]);
        } else {
            // 如果有多个位置，显示选择对话框
            this.logger.info('显示多个配置键位置选择', { key, locationCount: locations.length });
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
            this.logger.error('打开属性位置时出错', error);
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
            const content = require('fs').readFileSync(location.filePath, 'utf8');
            const lines = content.split(/\r?\n/);
            if (location.line > 0 && location.line <= lines.length) {
                return lines[location.line - 1].trim(); // 行号从1开始，数组索引从0开始
            }
        } catch (error) {
            this.logger.error('获取行预览时出错', error);
        }
        
        return '';
    }
    
    /**
     * 查找配置键的使用位置
     */
    public async findUsages(key: string): Promise<void> {
        // 这个方法会在后续版本实现，用于实现"Find Usages"功能
        // vscode.window.showInformationMessage(`Find usages for "${key}" feature will be available in future versions.`);
        this.logger.info(`Find usages for "${key}" feature will be available in future versions.`);
    }
} 