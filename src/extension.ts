import * as vscode from 'vscode';
import { ConfigurationIndexManager } from './configIndex';
import { PropertyNavigator } from './propertyNavigator';
import { PropertyDiagnosticProvider } from './diagnosticProvider';

/**
 * 激活扩展
 */
export async function activate(context: vscode.ExtensionContext) {
    // 创建日志输出通道
    const outputChannel = vscode.window.createOutputChannel('Java Properties Definition');
    outputChannel.appendLine('Java Properties Definition extension is now active');
    
    try {
        // 创建配置索引管理器
        const indexManager = new ConfigurationIndexManager();
        
        // 初始化并构建索引
        outputChannel.appendLine('正在构建配置文件索引...');
        await indexManager.initialize();
        outputChannel.appendLine('配置文件索引构建完成');
        
        // 创建属性导航器
        const propertyNavigator = new PropertyNavigator(indexManager);
        propertyNavigator.registerCommands(context);
        
        // 创建诊断提供程序
        const diagnosticProvider = new PropertyDiagnosticProvider(indexManager);
        diagnosticProvider.register(context);
        
        // 注册相关命令
        context.subscriptions.push(
            vscode.commands.registerCommand('java-properties-definition.rebuildIndex', async () => {
                outputChannel.appendLine('正在重建配置文件索引...');
                await indexManager.rebuildIndex();
                outputChannel.appendLine('配置文件索引重建完成');
                
                vscode.window.showInformationMessage('配置文件索引已重建');
            })
        );
        
        // 注册资源释放
        context.subscriptions.push({
            dispose: () => {
                indexManager.dispose();
                diagnosticProvider.dispose();
                outputChannel.dispose();
            }
        });
        
        // 设置状态栏提示
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        statusBarItem.text = '$(link) Java Properties';
        statusBarItem.tooltip = 'Java Properties Definition';
        statusBarItem.command = 'java-properties-definition.rebuildIndex';
        statusBarItem.show();
        
        context.subscriptions.push(statusBarItem);
        
        // 注册配置变更事件，以显示/隐藏状态栏项
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('java-properties-definition')) {
                    const config = vscode.workspace.getConfiguration('java-properties-definition');
                    const showStatusBar = config.get<boolean>('showStatusBar', true);
                    
                    if (showStatusBar) {
                        statusBarItem.show();
                    } else {
                        statusBarItem.hide();
                    }
                }
            })
        );
        
        outputChannel.appendLine('所有功能已初始化完成');
    } catch (error) {
        outputChannel.appendLine(`初始化时发生错误: ${error}`);
        console.error('初始化扩展时出错:', error);
    }
}

/**
 * 停用扩展
 */
export function deactivate() {
    // 在扩展停用时会自动销毁上下文中的订阅资源
} 