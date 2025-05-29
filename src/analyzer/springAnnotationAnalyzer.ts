import * as vscode from 'vscode';
import { SpelExpressionAnalyzer } from './spelExpressionAnalyzer';

/**
 * Spring注解分析器
 * 专门处理Spring注解中的配置键识别
 */
export class SpringAnnotationAnalyzer {
    
    /**
     * 判断光标是否在Spring注解内
     * @param document 文档
     * @param position 光标位置
     * @returns 是否在Spring注解内
     */
    public static isPositionInSpringAnnotation(document: vscode.TextDocument, position: vscode.Position): boolean {
        const line = document.lineAt(position.line).text;
        console.log(`[SpringAnnotationAnalyzer] 检查位置 ${position.line}:${position.character} 是否在Spring注解内`);
        console.log(`[SpringAnnotationAnalyzer] 行内容: "${line}"`);
        
        // 检查是否在@Value注解内
        const valueAnnotationRegex = /@Value\s*\(\s*"([^"]*)"\s*\)/g;
        let match;
        
        while ((match = valueAnnotationRegex.exec(line)) !== null) {
            const start = match.index;
            const end = match.index + match[0].length;
            
            if (position.character >= start && position.character <= end) {
                console.log(`[SpringAnnotationAnalyzer] 位置在@Value注解内: ${match[0]}`);
                return true;
            }
        }
        
        // 检查是否在@ConfigurationProperties注解内
        const configPropsRegex = /@ConfigurationProperties\s*\([^)]*prefix\s*=\s*"([^"]*)"/g;
        while ((match = configPropsRegex.exec(line)) !== null) {
            const start = match.index;
            const end = match.index + match[0].length;
            
            if (position.character >= start && position.character <= end) {
                console.log(`[SpringAnnotationAnalyzer] 位置在@ConfigurationProperties注解内: ${match[0]}`);
                return true;
            }
        }
        
        console.log(`[SpringAnnotationAnalyzer] 位置不在Spring注解内`);
        return false;
    }
    
    /**
     * 从注解中提取配置键
     * @param document 文档
     * @param position 光标位置
     * @returns 提取的配置键，如果没有则返回null
     */
    public static extractConfigKeyFromAnnotation(document: vscode.TextDocument, position: vscode.Position): string | null {
        const line = document.lineAt(position.line).text;
        console.log(`[SpringAnnotationAnalyzer] 开始提取配置键，位置: ${position.line}:${position.character}`);
        
        // 尝试从@Value注解中提取
        const valueKey = this.parseValueAnnotation(line, position.character);
        if (valueKey) {
            console.log(`[SpringAnnotationAnalyzer] 从@Value注解提取到配置键: "${valueKey}"`);
            return valueKey;
        }
        
        // 尝试从@ConfigurationProperties注解中提取
        const configPropsKey = this.parseConfigurationPropertiesAnnotation(line, position.character);
        if (configPropsKey) {
            console.log(`[SpringAnnotationAnalyzer] 从@ConfigurationProperties注解提取到配置键: "${configPropsKey}"`);
            return configPropsKey;
        }
        
        console.log(`[SpringAnnotationAnalyzer] 未能从注解中提取到配置键`);
        return null;
    }
    
    /**
     * 解析@Value注解
     * @param line 行文本
     * @param position 光标在行中的位置
     * @returns 提取的配置键
     */
    public static parseValueAnnotation(line: string, position: number): string | null {
        const valueAnnotationRegex = /@Value\s*\(\s*"([^"]*)"\s*\)/g;
        let match;
        
        while ((match = valueAnnotationRegex.exec(line)) !== null) {
            const start = match.index;
            const end = match.index + match[0].length;
            
            // 检查光标是否在此注解内
            if (position >= start && position <= end) {
                const annotationValue = match[1];
                
                // 如果是SpEL表达式，提取其中的配置键
                if (SpelExpressionAnalyzer.containsSpelExpression(annotationValue)) {
                    const keys = SpelExpressionAnalyzer.extractKeysFromSpelExpression(annotationValue);
                    return keys.length > 0 ? keys[0] : null;
                }
                
                // 如果是直接的字符串值，检查是否像配置键
                if (this.isLikelyConfigKey(annotationValue)) {
                    return annotationValue;
                }
            }
        }
        
        return null;
    }
    
    /**
     * 解析@ConfigurationProperties注解
     * @param line 行文本
     * @param position 光标在行中的位置
     * @returns 提取的配置前缀
     */
    public static parseConfigurationPropertiesAnnotation(line: string, position: number): string | null {
        const configPropsRegex = /@ConfigurationProperties\s*\([^)]*prefix\s*=\s*"([^"]*)"/g;
        let match;
        
        while ((match = configPropsRegex.exec(line)) !== null) {
            const start = match.index;
            const end = match.index + match[0].length;
            
            // 检查光标是否在此注解内
            if (position >= start && position <= end) {
                return match[1];
            }
        }
        
        return null;
    }
    
    /**
     * 查找文档中的所有Spring注解
     * @param document 文档
     * @returns Spring注解信息映射
     */
    public static findSpringAnnotationsInDocument(document: vscode.TextDocument): Map<vscode.Position, string[]> {
        const annotationsMap = new Map<vscode.Position, string[]>();
        
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i).text;
            
            // 查找@Value注解
            const valueAnnotationRegex = /@Value\s*\(\s*"([^"]*)"\s*\)/g;
            let match;
            
            while ((match = valueAnnotationRegex.exec(line)) !== null) {
                const annotationValue = match[1];
                const position = new vscode.Position(i, match.index);
                
                let keys: string[] = [];
                
                // 如果是SpEL表达式，提取其中的配置键
                if (SpelExpressionAnalyzer.containsSpelExpression(annotationValue)) {
                    keys = SpelExpressionAnalyzer.extractKeysFromSpelExpression(annotationValue);
                } else if (this.isLikelyConfigKey(annotationValue)) {
                    // 如果是直接的字符串值且像配置键
                    keys = [annotationValue];
                }
                
                if (keys.length > 0) {
                    annotationsMap.set(position, keys);
                }
            }
            
            // 查找@ConfigurationProperties注解
            const configPropsRegex = /@ConfigurationProperties\s*\([^)]*prefix\s*=\s*"([^"]*)"/g;
            while ((match = configPropsRegex.exec(line)) !== null) {
                const prefix = match[1];
                const position = new vscode.Position(i, match.index);
                
                if (prefix) {
                    annotationsMap.set(position, [prefix]);
                }
            }
        }
        
        return annotationsMap;
    }
    
    /**
     * 判断字符串是否像配置键
     * @param str 字符串
     * @returns 是否像配置键
     */
    private static isLikelyConfigKey(str: string): boolean {
        if (!str || str.length === 0) {
            return false;
        }
        
        // 配置键通常包含点号分隔的层级结构
        if (str.includes('.')) {
            // 检查是否符合配置键的命名模式
            const configKeyPattern = /^[a-zA-Z][a-zA-Z0-9._-]*[a-zA-Z0-9]$/;
            return configKeyPattern.test(str);
        }
        
        // 单层配置键也可能存在
        const singleKeyPattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
        return singleKeyPattern.test(str);
    }
} 