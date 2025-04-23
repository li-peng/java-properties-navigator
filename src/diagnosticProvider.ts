import * as vscode from 'vscode';
import { ConfigurationIndexManager } from './configIndex';
import { JavaStringAnalyzer } from './javaStringAnalyzer';

/**
 * 诊断提供程序
 * 为未定义的配置键提供警告
 */
export class PropertyDiagnosticProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private indexManager: ConfigurationIndexManager;
    
    constructor(indexManager: ConfigurationIndexManager) {
        this.indexManager = indexManager;
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('java-properties-definition');
    }
    
    /**
     * 注册诊断功能
     */
    public register(context: vscode.ExtensionContext): void {
        // 将诊断集合添加到上下文中，以便适当释放
        context.subscriptions.push(this.diagnosticCollection);
        
        // 监听文档保存事件
        context.subscriptions.push(
            vscode.workspace.onDidSaveTextDocument(document => {
                if (document.languageId === 'java') {
                    this.updateDiagnostics(document);
                }
            })
        );
        
        // 监听文档打开事件
        context.subscriptions.push(
            vscode.workspace.onDidOpenTextDocument(document => {
                if (document.languageId === 'java') {
                    this.updateDiagnostics(document);
                }
            })
        );
        
        // 监听配置变更事件
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(event => {
                if (event.affectsConfiguration('java-properties-definition')) {
                    // 重新检查所有打开的Java文件
                    vscode.workspace.textDocuments.forEach(document => {
                        if (document.languageId === 'java') {
                            this.updateDiagnostics(document);
                        }
                    });
                }
            })
        );
        
        // 监听索引重建事件
        this.indexManager.onIndexRebuilt(() => {
            // 重新检查所有打开的Java文件
            vscode.workspace.textDocuments.forEach(document => {
                if (document.languageId === 'java') {
                    this.updateDiagnostics(document);
                }
            });
        });
    }
    
    /**
     * 更新文档的诊断信息
     */
    private async updateDiagnostics(document: vscode.TextDocument): Promise<void> {
        if (document.languageId !== 'java') {
            return;
        }
        
        const diagnostics: vscode.Diagnostic[] = [];
        
        // 遍历文档中的每一行
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text;
            
            // 查找行中的所有字符串字面量
            const regex = /"([^"]*)"/g;
            let match;
            
            while ((match = regex.exec(text)) !== null) {
                const key = match[1];
                const position = new vscode.Position(i, match.index + 1); // +1 跳过开始引号
                
                // 检查是否是配置键
                const isConfigKey = await this.isConfigKeyInContext(document, position, key);
                
                if (isConfigKey && !this.indexManager.hasProperty(key)) {
                    // 创建诊断信息
                    const range = new vscode.Range(
                        i, match.index + 1, // 开始位置（跳过引号）
                        i, match.index + key.length + 1 // 结束位置
                    );
                    
                    const diagnostic = new vscode.Diagnostic(
                        range,
                        `未定义的配置键: "${key}"`,
                        vscode.DiagnosticSeverity.Warning
                    );
                    
                    diagnostic.source = 'java-properties-definition';
                    diagnostic.code = 'undefined-key';
                    
                    diagnostics.push(diagnostic);
                }
            }
        }
        
        // 更新诊断集合
        this.diagnosticCollection.set(document.uri, diagnostics);
    }
    
    /**
     * 判断字符串是否在配置键的上下文中
     */
    private async isConfigKeyInContext(document: vscode.TextDocument, position: vscode.Position, key: string): Promise<boolean> {
        // 使用JavaStringAnalyzer判断是否是配置键
        const configKey = await JavaStringAnalyzer.analyzeStringAtPosition(document, position);
        return configKey !== undefined;
    }
    
    /**
     * 清除诊断
     */
    public clearDiagnostics(): void {
        this.diagnosticCollection.clear();
    }
    
    /**
     * 释放资源
     */
    public dispose(): void {
        this.diagnosticCollection.dispose();
    }
} 