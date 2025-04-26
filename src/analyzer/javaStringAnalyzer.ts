import * as vscode from 'vscode';
import { SpelExpressionAnalyzer } from './spelExpressionAnalyzer';

/**
 * Java字符串分析器
 * 负责识别Java代码中的字符串常量，并判断是否可能是配置键
 */
export class JavaStringAnalyzer {
    /**
     * 尝试从当前光标位置提取字符串
     */
    public static getStringAtCursor(document: vscode.TextDocument, position: vscode.Position): string | undefined {
        // 检查是否在SpEL表达式中
        if (SpelExpressionAnalyzer.isPositionInSpelExpression(document, position)) {
            return SpelExpressionAnalyzer.getSpelKeyAtPosition(document, position) || undefined;
        }
        
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
            const extractedString = line.substring(startPos, endPos);
            
            // 检查是否是SpEL表达式
            if (SpelExpressionAnalyzer.containsSpelExpression(extractedString)) {
                const keys = SpelExpressionAnalyzer.extractKeysFromSpelExpression(extractedString);
                return keys.length > 0 ? keys[0] : undefined;
            }
            
            return extractedString;
        }
        
        return undefined;
    }
    
    /**
     * 从选中的文本中提取字符串
     */
    public static getStringFromSelection(document: vscode.TextDocument, selection: vscode.Selection): string | undefined {
        const text = document.getText(selection);
        
        // 如果选中的文本被引号包围，则去掉引号
        if (text.startsWith('"') && text.endsWith('"')) {
            const content = text.substring(1, text.length - 1);
            
            // 检查是否是SpEL表达式
            if (SpelExpressionAnalyzer.containsSpelExpression(content)) {
                const keys = SpelExpressionAnalyzer.extractKeysFromSpelExpression(content);
                return keys.length > 0 ? keys[0] : undefined;
            }
            
            return content;
        }
        
        return text;
    }
    
    /**
     * 尝试识别当前位置的字符串，判断是否是配置键
     */
    public static async analyzeStringAtPosition(document: vscode.TextDocument, position: vscode.Position): Promise<string | undefined> {
        // 获取当前行文本
        const line = document.lineAt(position.line).text;
        
        // 判断光标是否在字符串内
        if (!this.isInString(line, position.character)) {
            return undefined;
        }
        
        // 提取字符串内容
        const stringContent = this.extractStringAtPosition(line, position.character);
        if (!stringContent) {
            return undefined;
        }
        
        // 检查是否是配置键引用 (比如 application.name, app.config.timeout等)
        if (this.isLikelyConfigKey(stringContent)) {
            return stringContent;
        }
        
        return undefined;
    }
    
    /**
     * 判断光标是否在字符串内
     * @param line 行文本
     * @param column 光标列位置
     */
    private static isInString(line: string, column: number): boolean {
        let inString = false;
        let escaping = false;
        let currentQuote = '';
        
        for (let i = 0; i < column; i++) {
            const char = line.charAt(i);
            
            // 处理转义字符
            if (char === '\\' && !escaping) {
                escaping = true;
                continue;
            }
            
            // 如果当前是引号且不是被转义的引号
            if ((char === '"' || char === "'") && !escaping) {
                // 如果尚未在字符串中，记录引号类型并进入字符串
                if (!inString) {
                    inString = true;
                    currentQuote = char;
                } 
                // 如果已经在字符串中且当前引号与开始的引号匹配，退出字符串
                else if (char === currentQuote) {
                    inString = false;
                    currentQuote = '';
                }
            }
            
            // 重置转义状态
            if (escaping) {
                escaping = false;
            }
        }
        
        return inString;
    }
    
    /**
     * 提取光标位置的字符串内容
     * @param line 行文本
     * @param column 光标列位置
     */
    private static extractStringAtPosition(line: string, column: number): string | undefined {
        // 查找双引号和单引号
        let startQuotePos = -1;
        let endQuotePos = -1;
        let currentQuote = '';
        let escaping = false;
        
        // 首先确定字符串的开始位置
        for (let i = 0; i < line.length; i++) {
            const char = line.charAt(i);
            
            // 处理转义字符
            if (char === '\\' && !escaping) {
                escaping = true;
                continue;
            }
            
            if ((char === '"' || char === "'") && !escaping) {
                if (startQuotePos === -1) {
                    // 找到开始引号
                    if (i < column) {
                        startQuotePos = i;
                        currentQuote = char;
                    } else {
                        // 光标在开始引号之前，不在字符串内
                        return undefined;
                    }
                } else if (char === currentQuote) {
                    // 找到结束引号
                    endQuotePos = i;
                    
                    // 检查光标是否在此字符串区间内
                    if (column > startQuotePos && column <= endQuotePos) {
                        // 提取字符串内容（不包含引号）
                        return line.substring(startQuotePos + 1, endQuotePos);
                    }
                    
                    // 重置以寻找下一个字符串
                    startQuotePos = -1;
                    endQuotePos = -1;
                    currentQuote = '';
                }
            }
            
            // 重置转义状态
            if (escaping) {
                escaping = false;
            }
        }
        
        // 如果找到了开始引号但没有找到结束引号（可能是多行字符串）
        if (startQuotePos !== -1 && column > startQuotePos) {
            return line.substring(startQuotePos + 1);
        }
        
        return undefined;
    }
    
    /**
     * 判断字符串是否像配置键
     * 配置键通常是用点分隔的小写字母、数字和连字符
     */
    private static isLikelyConfigKey(str: string): boolean {
        // 单个单词也可以是配置键，不再要求必须包含点
        // 如果包含点，按点分隔的模式判断
        if (str.includes('.')) {
            // 常见的配置键模式：小写字母、数字、连字符，用点分隔
            const configKeyPattern = /^[a-z0-9]+([-.]?[a-z0-9]+)*(\.[a-z0-9]+([-.]?[a-z0-9]+)*)*$/;
            return configKeyPattern.test(str);
        }
        
        // 对于单个单词，检查是否符合标识符格式（字母、数字、下划线，不能以数字开头）
        const singleWordPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
        return singleWordPattern.test(str);
    }
    
    /**
     * 分析字符串上下文，判断是否可能是配置键
     */
    private static async isPossibleConfigKey(document: vscode.TextDocument, position: vscode.Position, key: string): Promise<boolean> {
        // 检查是否在SpEL表达式中
        if (SpelExpressionAnalyzer.isPositionInSpelExpression(document, position)) {
            return true;
        }
        
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
        
        // 如果当前字符串看起来像配置键（包含点号分隔符），也认为是可能的配置键
        if (/^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)+$/.test(key)) {
            return true;
        }
        
        // 默认返回false，表示不太可能是配置键
        return false;
    }
    
    /**
     * 扫描Java文档中所有可能的配置键
     */
    public static async scanDocumentForConfigKeys(document: vscode.TextDocument): Promise<Map<vscode.Position, string>> {
        const configKeys = new Map<vscode.Position, string>();
        
        try {
            // 1. 扫描所有SpEL注解
            const spelAnnotations = await SpelExpressionAnalyzer.findSpelAnnotationsInDocument(document);
            
            // 将SpEL注解中的配置键添加到结果中
            for (const [position, keys] of spelAnnotations.entries()) {
                if (keys.length > 0) {
                    configKeys.set(position, keys[0]);
                }
            }
            
            // 2. 扫描所有字符串字面量
            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                const text = line.text;
                
                // 查找所有字符串字面量
                const stringLiteralRegex = /"([^"]*)"/g;
                let match;
                
                while ((match = stringLiteralRegex.exec(text)) !== null) {
                    const stringContent = match[1];
                    const startPos = match.index + 1; // +1 跳过开始引号
                    const position = new vscode.Position(i, startPos);
                    
                    // 检查是否已经作为SpEL表达式处理过
                    if (SpelExpressionAnalyzer.containsSpelExpression(stringContent)) {
                        continue;
                    }
                    
                    // 创建临时位置以检查上下文
                    const tempPosition = new vscode.Position(i, startPos);
                    
                    // 检查是否可能是配置键
                    const isConfigKey = await this.isPossibleConfigKey(document, tempPosition, stringContent);
                    
                    if (isConfigKey) {
                        configKeys.set(position, stringContent);
                    }
                }
            }
        } catch (error) {
            console.error('扫描文档配置键时出错:', error);
        }
        
        return configKeys;
    }
} 