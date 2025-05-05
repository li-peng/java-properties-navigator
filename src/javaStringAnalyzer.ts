import * as vscode from 'vscode';

/**
 * Java字符串分析器
 * 负责识别Java代码中的字符串常量，并判断是否可能是配置键
 */
export class JavaStringAnalyzer {
    
    /**
     * 尝试从当前光标位置提取字符串
     */
    public static getStringAtCursor(document: vscode.TextDocument, position: vscode.Position): string | undefined {
        // 获取当前行内容
        const line = document.lineAt(position.line).text;
        const lineUpToPosition = line.substring(0, position.character);
        const lineAfterPosition = line.substring(position.character);
        
        // 查找光标前后的引号位置
        let startQuotePos = lineUpToPosition.lastIndexOf('"');
        let endQuotePos = lineAfterPosition.indexOf('"');
        
        // 如果没有找到引号，则返回undefined
        if (startQuotePos === -1 || endQuotePos === -1) {
            return undefined;
        }
        
        // 计算字符串内容
        const startPos = startQuotePos + 1; // 跳过开始引号
        const endPos = position.character + endQuotePos; // 包括结束引号的位置
        
        if (startPos < endPos) {
            return line.substring(startPos, endPos);
        }
        
        return undefined;
    }
    
    /**
     * 从选中的文本中提取字符串
     */
    public static getStringFromSelection(document: vscode.TextDocument, selection: vscode.Selection): string | undefined {
        const text = document.getText(selection);
        
        // 如果文本为空，则返回undefined
        if (!text || text.trim().length === 0) {
            return undefined;
        }
        
        // 如果选中的文本被引号包围，则去掉引号
        if (text.startsWith('"') && text.endsWith('"')) {
            return text.substring(1, text.length - 1);
        }
        
        // 如果选中的文本没有被引号包围（通常是双击选中的情况）
        // 检查该选中文本是否可能在代码中是被引号包围的
        const line = document.lineAt(selection.start.line).text;
        const selectedStartIdx = selection.start.character;
        const selectedEndIdx = selection.end.character;
        
        // 检查选中文本前后是否有引号
        const hasLeadingQuote = selectedStartIdx > 0 && line.charAt(selectedStartIdx - 1) === '"';
        const hasTrailingQuote = selectedEndIdx < line.length && line.charAt(selectedEndIdx) === '"';
        
        // 如果选中文本前后都有引号，很可能是双击选中了引号内的文本
        if (hasLeadingQuote && hasTrailingQuote) {
            return text;
        }
        
        return text;
    }
    
    /**
     * 尝试识别当前位置的字符串，判断是否是配置键
     */
    public static async analyzeStringAtPosition(document: vscode.TextDocument, position: vscode.Position): Promise<string | undefined> {
        // 获取当前选择区域
        const selection = vscode.window.activeTextEditor?.selection;
        let propertyKey: string | undefined;
        
        // 如果有选中文本，则从选中文本提取
        if (selection && !selection.isEmpty) {
            propertyKey = this.getStringFromSelection(document, selection);
            
            // 双击选中文本的情况
            if (propertyKey && selection.start.line === selection.end.line) {
                const line = document.lineAt(selection.start.line).text;
                
                // 检查所选文本是否位于引号内
                let leftText = line.substring(0, selection.start.character);
                let rightText = line.substring(selection.end.character);
                let leftQuoteIdx = leftText.lastIndexOf('"');
                let rightQuoteIdx = rightText.indexOf('"');
                
                // 如果选中文本位于引号内，我们认为它可能是一个配置键
                if (leftQuoteIdx !== -1 && rightQuoteIdx !== -1) {
                    return propertyKey;
                }
            }
        } else {
            // 否则从光标位置提取
            propertyKey = this.getStringAtCursor(document, position);
        }
        
        if (!propertyKey) {
            return undefined;
        }
        
        // 检查字符串上下文，判断是否可能是配置键
        // 对于直接通过命令/快捷键触发的跳转，我们应该尽量信任用户的选择
        const isCommandTriggered = vscode.window.activeTextEditor && selection && !selection.isEmpty;
        
        if (isCommandTriggered) {
            // 如果是通过命令或快捷键触发，且有文本选中，则直接认为是配置键
            return propertyKey;
        } else {
            // 否则进行上下文分析
            const isConfigKey = await this.isPossibleConfigKey(document, position, propertyKey);
            return isConfigKey ? propertyKey : undefined;
        }
    }
    
    /**
     * 分析字符串上下文，判断是否可能是配置键
     */
    private static async isPossibleConfigKey(document: vscode.TextDocument, position: vscode.Position, key: string): Promise<boolean> {
        // 获取当前行内容
        const line = document.lineAt(position.line).text;
        
        // 常见的配置读取方法调用模式
        const configMethodPatterns = [
            /getProperty\s*\(\s*"[^"]*"\s*\)/,
            /getValue\s*\(\s*"[^"]*"\s*\)/,
            /get\s*\(\s*"[^"]*"\s*\)/,
            /getString\s*\(\s*"[^"]*"\s*\)/,
            /getInt\s*\(\s*"[^"]*"\s*\)/,
            /getDouble\s*\(\s*"[^"]*"\s*\)/,
            /getBoolean\s*\(\s*"[^"]*"\s*\)/,
            /config\.get\s*\(\s*"[^"]*"\s*\)/,
            /props\.[a-zA-Z]+\s*\(\s*"[^"]*"\s*\)/,
            /environment\.[a-zA-Z]+\s*\(\s*"[^"]*"\s*\)/,
            /@Value\s*\(\s*"\$\{[^}]*\}"\s*\)/,
            /@Value\s*\(\s*"[^"]*"\s*\)/,
            /@PropertySource\s*\(\s*"[^"]*"\s*\)/,
            /bundle\.[a-zA-Z]+\s*\(\s*"[^"]*"\s*\)/,
            /getMessage\s*\(\s*"[^"]*"\s*\)/
        ];
        
        // 检查当前行是否包含配置方法调用
        for (const pattern of configMethodPatterns) {
            if (pattern.test(line)) {
                return true;
            }
        }
        
        // 检查是否是字符串变量定义，键名通常包含如下特征
        if (/\b(key|property|config|props|setting|param|arg)\b/i.test(line)) {
            return true;
        }
        
        // 检查是否是注解中的字符串
        if (/@[A-Za-z]+\s*\(.*"[^"]*".*\)/.test(line)) {
            return true;
        }
        
        // 检查当前行上下文，获取前后几行的内容
        const startLine = Math.max(0, position.line - 2);
        const endLine = Math.min(document.lineCount - 1, position.line + 2);
        let context = '';
        
        for (let i = startLine; i <= endLine; i++) {
            context += document.lineAt(i).text + '\n';
        }
        
        // 检查上下文中是否有配置相关字符串
        const contextKeywords = [
            'Configuration', 'Properties', 'Property', 'config', 'properties', 
            'application.properties', 'application.yml', 'settings', 'environment',
            'ResourceBundle', 'PropertySource', 'application-', '.properties', '.yml'
        ];
        
        for (const keyword of contextKeywords) {
            if (context.includes(keyword)) {
                return true;
            }
        }
        
        // 如果当前字符串看起来像配置键（包含点号分隔符或是单个合法标识符），认为是可能的配置键
        if (/^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*$/.test(key)) {
            return true;
        }
        
        // 默认返回false，表示不太可能是配置键
        return false;
    }
} 