import * as vscode from 'vscode';

/**
 * Spring表达式语言(SpEL)分析器
 * 用于解析和提取Spring表达式中的属性引用
 */
export class SpelExpressionAnalyzer {
    /**
     * 检查当前位置是否在SpEL表达式内
     * @param document 文档
     * @param position 位置
     * @returns 是否在SpEL表达式内
     */
    public static isPositionInSpelExpression(document: vscode.TextDocument, position: vscode.Position): boolean {
        const lineText = document.lineAt(position.line).text;
        const spelExpressions = this.findSpelExpressionsInLine(lineText);
        
        return spelExpressions.some(expr => {
            const start = expr.index;
            const end = expr.index + expr[0].length;
            return position.character >= start && position.character <= end;
        });
    }
    
    /**
     * 获取指定位置的SpEL键
     * @param document 文档
     * @param position 位置
     * @returns SpEL键
     */
    public static getSpelKeyAtPosition(document: vscode.TextDocument, position: vscode.Position): string | null {
        const lineText = document.lineAt(position.line).text;
        const spelExpressions = this.findSpelExpressionsInLine(lineText);
        
        for (const expr of spelExpressions) {
            const start = expr.index;
            const end = expr.index + expr[0].length;
            
            if (position.character >= start && position.character <= end) {
                // 提取表达式内的键
                const exprContent = expr[1] || '';
                return this.extractKeyFromExpression(exprContent, position.character - start - 2);
            }
        }
        
        return null;
    }
    
    /**
     * 检查文本是否包含SpEL表达式
     * @param text 要检查的文本
     * @returns 是否包含SpEL表达式
     */
    public static containsSpelExpression(text: string): boolean {
        const spelRegex = /\$\{([^}]+)\}/g;
        return spelRegex.test(text);
    }
    
    /**
     * 从SpEL表达式中提取所有属性键
     * @param text 包含SpEL表达式的文本
     * @returns 提取的属性键数组
     */
    public static extractKeysFromSpelExpression(text: string): string[] {
        const keys: string[] = [];
        const spelRegex = /\$\{([^}]+)\}/g;
        let match;
        
        while ((match = spelRegex.exec(text)) !== null) {
            const exprContent = match[1];
            // 解析表达式并提取键
            const extractedKeys = this.parseExpressionKeys(exprContent);
            keys.push(...extractedKeys);
        }
        
        return keys;
    }

    /**
     * 提取文本中的所有SpEL表达式
     * @param text 文本内容
     * @returns 提取的表达式数组
     */
    public static extractAllSpelExpressions(document: vscode.TextDocument): { expression: string, key: string, line: number, column: number, length: number, range: vscode.Range }[] {
        const result: { expression: string, key: string, line: number, column: number, length: number, range: vscode.Range }[] = [];
        
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i).text;
            const expressions = this.findSpelExpressionsInLine(line);
            
            for (const expr of expressions) {
                const exprContent = expr[1] || '';
                const startPos = new vscode.Position(i, expr.index);
                const endPos = new vscode.Position(i, expr.index + expr[0].length);
                const range = new vscode.Range(startPos, endPos);
                
                const key = this.parseExpressionKeys(exprContent)[0] || exprContent;
                
                result.push({
                    expression: exprContent,
                    key: key,
                    line: i,
                    column: expr.index,
                    length: expr[0].length,
                    range
                });
            }
        }
        
        return result;
    }
    
    /**
     * 查找文档中的所有SpEL注解
     * @param document 文档
     * @returns SpEL注解信息数组
     */
    public static findSpelAnnotationsInDocument(document: vscode.TextDocument): Map<vscode.Position, string[]> {
        const annotationsMap = new Map<vscode.Position, string[]>();
        
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i).text;
            
            // 查找@Value注解
            const valueAnnotationRegex = /@Value\s*\(\s*"(.*?)"\s*\)/g;
            let match;
            
            while ((match = valueAnnotationRegex.exec(line)) !== null) {
                const annotationText = match[1];
                const position = new vscode.Position(i, match.index);
                
                // 提取表达式中的键
                if (this.containsSpelExpression(annotationText)) {
                    const keys = this.extractKeysFromSpelExpression(annotationText);
                    if (keys.length > 0) {
                        annotationsMap.set(position, keys);
                    }
                }
            }
        }
        
        return annotationsMap;
    }
    
    /**
     * 在一行文本中查找所有SpEL表达式
     * @param lineText 行文本
     * @returns 正则表达式匹配结果数组
     */
    private static findSpelExpressionsInLine(lineText: string): RegExpExecArray[] {
        const spelRegex = /\$\{([^}]+)\}/g;
        const expressions: RegExpExecArray[] = [];
        let match;
        
        while ((match = spelRegex.exec(lineText)) !== null) {
            expressions.push(match);
        }
        
        return expressions;
    }
    
    /**
     * 从表达式中提取键（位置敏感）
     * @param expression 表达式内容
     * @param position 光标在表达式内的位置
     * @returns 提取的键
     */
    private static extractKeyFromExpression(expression: string, position: number): string | null {
        // 简单实现：假设表达式是直接引用属性，如${some.property}
        // 在实际场景中，这里需要更复杂的解析逻辑来处理SpEL表达式
        
        // 如果表达式简单，直接返回
        if (!/[+*\/\(\):]/.test(expression)) {
            return expression.trim();
        }
        
        // 否则尝试找到光标附近的属性引用
        const parts = expression.split(/[+*\/\(\),:]/);
        for (const part of parts) {
            const trimmed = part.trim();
            if (trimmed && expression.indexOf(part) <= position && 
                expression.indexOf(part) + part.length >= position) {
                return trimmed;
            }
        }
        
        return null;
    }
    
    /**
     * 解析表达式中的所有属性键
     * @param expression 表达式内容
     * @returns 提取的键数组
     */
    private static parseExpressionKeys(expression: string): string[] {
        // 简单实现：假设表达式是直接引用属性，如${some.property}
        // 在实际场景中，这里需要更复杂的解析逻辑来处理复杂的SpEL表达式
        
        // 如果表达式简单，直接返回
        if (!/[+*\/\(\):]/.test(expression)) {
            return [expression.trim()];
        }
        
        // 否则尝试提取所有可能的属性引用
        const parts = expression.split(/[+*\/\(\),:]/);
        return parts
            .map(part => part.trim())
            .filter(part => part && /^[a-zA-Z0-9._-]+$/.test(part));
    }
} 