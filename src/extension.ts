import * as vscode from 'vscode';
import { ConfigurationIndexManager } from './configIndex';
import { PropertyNavigator } from './propertyNavigator';
import { PropertyDiagnosticProvider } from './diagnosticProvider';
import { PropertyHoverProvider } from './navigation/propertyHoverProvider';
import { Logger } from './utils/logger';

/**
 * 激活扩展
 */
export async function activate(context: vscode.ExtensionContext) {
    // 初始化日志管理器
    const logger = Logger.getInstance();
    logger.initialize();
    
    logger.info('Java Properties Navigator 扩展开始激活');
    const activationStartTime = logger.startPerformance();
    
    try {
        // 创建配置索引管理器
        logger.info('正在创建配置索引管理器');
        const indexManager = new ConfigurationIndexManager();
        
        // 初始化并构建索引
        logger.info('开始初始化配置索引管理器');
        const indexInitStartTime = logger.startPerformance();
        await indexManager.initialize();
        logger.performance('配置索引初始化', indexInitStartTime);
        logger.info('配置索引管理器初始化完成');
        
        // 创建属性导航器
        logger.info('正在创建属性导航器');
        const propertyNavigator = new PropertyNavigator(indexManager);
        propertyNavigator.registerCommands(context);
        logger.info('属性导航器创建完成');
        
        // 创建诊断提供程序
        // const diagnosticProvider = new PropertyDiagnosticProvider(indexManager);
        // diagnosticProvider.register(context);
        
        // 创建属性悬停提供者
        logger.info('正在创建属性悬停提供者');
        const hoverProvider = new PropertyHoverProvider(indexManager);
        logger.info('属性悬停提供者创建完成');
        
        // 注册属性悬停提供者
        logger.info('正在注册属性悬停提供者');
        context.subscriptions.push(
            vscode.languages.registerHoverProvider('java', hoverProvider)
        );
        logger.info('属性悬停提供者注册完成');
        
        // 注册打开位置命令
        context.subscriptions.push(
            vscode.commands.registerCommand('java-properties-navigator.openLocation', async (args) => {
                try {
                    if (!args) return;
                    
                    let params: { filePath: string; line: number };
                    
                    if (typeof args === 'string') {
                        params = JSON.parse(args);
                    } else {
                        params = args;
                    }
                    
                    const { filePath, line } = params;
                    
                    // 打开文件并跳转到指定行
                    const document = await vscode.workspace.openTextDocument(filePath);
                    const lineToShow = Math.max(0, line - 1); // 转换为0基的行号
                    
                    // 创建一个范围，定位到整行
                    const range = new vscode.Range(
                        new vscode.Position(lineToShow, 0),
                        new vscode.Position(lineToShow, document.lineAt(lineToShow).text.length)
                    );
                    
                    // 打开文档并显示对应行
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
                    logger.error('打开配置键位置时出错', error);
                    vscode.window.showErrorMessage('无法打开配置键位置');
                }
            })
        );
        
        // 注册重建索引命令
        context.subscriptions.push(
            vscode.commands.registerCommand('java-properties-navigator.rebuildIndex', async () => {
                logger.info('用户手动触发索引重建');
                const rebuildStartTime = logger.startPerformance();
                try {
                    await indexManager.rebuildIndex();
                    logger.performance('手动索引重建', rebuildStartTime);
                    logger.info('手动索引重建完成');
                    vscode.window.showInformationMessage('Configuration file index has been rebuilt');
                } catch (error) {
                    logger.error('手动索引重建失败', error);
                    vscode.window.showErrorMessage('Failed to rebuild the configuration file index. Please check the output panel for details.');
                }
            })
        );
        
        // 注册测试YAML解析命令（用于开发调试）
        context.subscriptions.push(
            vscode.commands.registerCommand('java-properties-navigator.testYamlParsing', async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor || !editor.document) {
                    vscode.window.showWarningMessage('请打开一个YAML文件');
                    return;
                }
                
                const document = editor.document;
                if (document.languageId !== 'yaml' && !document.fileName.endsWith('.yml') && !document.fileName.endsWith('.yaml')) {
                    vscode.window.showWarningMessage('当前文件不是YAML文件');
                    return;
                }
                
                const content = document.getText();
                const fileUri = document.uri;
                
                // 导入parseYaml函数
                const { parseYaml } = require('./yamlParser');
                
                try {
                    const items = parseYaml(content, fileUri);
                    
                    // 显示解析结果
                    logger.info('YAML解析测试完成', {
                        文件: fileUri.fsPath,
                        属性数量: items.length,
                        前5个属性: items.slice(0, 5).map((item: any) => ({
                            键: item.key,
                            值: item.value,
                            行: item.line + 1,
                            列: item.column
                        }))
                    });
                    
                    const testOutputChannel = vscode.window.createOutputChannel('YAML Parse Test');
                    testOutputChannel.clear();
                    testOutputChannel.appendLine(`解析 ${fileUri.fsPath} 完成，找到 ${items.length} 个属性`);
                    testOutputChannel.appendLine('----------------------------');
                    
                    items.forEach((item: any) => {
                        testOutputChannel.appendLine(`键: ${item.key}`);
                        testOutputChannel.appendLine(`值: ${item.value}`);
                        testOutputChannel.appendLine(`位置: 行 ${item.line+1}, 列 ${item.column}`);
                        testOutputChannel.appendLine(`占位符: ${item.hasPlaceholders ? '是' : '否'}`);
                        if (item.placeholderKeys && item.placeholderKeys.length > 0) {
                            testOutputChannel.appendLine(`占位符键: ${item.placeholderKeys.join(', ')}`);
                        }
                        testOutputChannel.appendLine('----------------------------');
                    });
                    
                    testOutputChannel.show();
                    
                    // vscode.window.showInformationMessage(`YAML parsing completed, found ${items.length} properties`);
                    logger.info(`YAML parsing completed, found ${items.length} properties`);
                } catch (error) {
                    logger.error('YAML解析测试失败', error);
                    vscode.window.showErrorMessage(`YAML解析失败: ${error}`);
                }
            })
        );
        
        // 注册资源释放
        context.subscriptions.push({
            dispose: () => {
                logger.info('开始释放扩展资源');
                indexManager.dispose();
                // diagnosticProvider.dispose();
                logger.dispose();
            }
        });
        
        // 设置状态栏提示
        logger.info('正在创建状态栏项');
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        statusBarItem.text = '$(link) Java Properties';
        statusBarItem.tooltip = 'Java Properties Navigator';
        statusBarItem.command = 'java-properties-navigator.rebuildIndex';
        statusBarItem.show();
        logger.info('状态栏项创建完成');
        
        context.subscriptions.push(statusBarItem);
        
        // 注册配置变更事件，以显示/隐藏状态栏项
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('java-properties-navigator')) {
                    logger.info('检测到配置变更');
                    const config = vscode.workspace.getConfiguration('java-properties-navigator');
                    
                    // 更新日志配置
                    logger.updateConfiguration();
                    
                    // 处理状态栏显示配置
                    const showStatusBar = config.get<boolean>('showStatusBar', true);
                    logger.debug('状态栏显示配置变更', { showStatusBar });
                    
                    if (showStatusBar) {
                        statusBarItem.show();
                    } else {
                        statusBarItem.hide();
                    }
                    
                    // 处理自动重建配置
                    const autoRebuild = config.get<boolean>('autoRebuildOnConfigChange', true);
                    if (autoRebuild) {
                        logger.info('配置变更触发自动重建索引');
                        indexManager.rebuildIndex().catch(error => {
                            logger.error('配置变更触发的自动重建失败', error);
                        });
                    }
                }
            })
        );
        
        logger.performance('扩展激活', activationStartTime);
        logger.info('Java Properties Navigator 扩展激活完成');
        vscode.window.showInformationMessage('Java Properties Navigator extension activated successfully');
    } catch (error) {
        logger.error('扩展激活失败', error);
        vscode.window.showErrorMessage('Java Properties Navigator 扩展激活失败，请查看输出面板了解详情');
    }
}

/**
 * 停用扩展
 */
export function deactivate() {
    const logger = Logger.getInstance();
    logger.info('Java Properties Navigator 扩展开始停用');
    // 在扩展停用时会自动销毁上下文中的订阅资源
    logger.info('Java Properties Navigator 扩展停用完成');
} 