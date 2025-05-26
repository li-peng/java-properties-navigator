import * as vscode from 'vscode';
import * as path from 'path';
import { JavaStringAnalyzer } from '../analyzer/javaStringAnalyzer';
import { SpelExpressionAnalyzer } from '../analyzer/spelExpressionAnalyzer';
import { TrieIndex } from '../indexing/trieIndex';
import { PersistentIndex } from '../indexing/persistentIndex';
import { ParserRegistry } from '../parsers/parserRegistry';

/**
 * 配置定义提供器
 * 负责在Java代码中处理对配置键的引用，能够跳转到对应的配置文件中的定义
 */
export class ConfigDefinitionProvider implements vscode.DefinitionProvider {
    private configIndex: TrieIndex;
    private persistentIndex: PersistentIndex;
    private parserRegistry: ParserRegistry;
    
    constructor(configIndex: TrieIndex, persistentIndex: PersistentIndex, parserRegistry: ParserRegistry) {
        this.configIndex = configIndex;
        this.persistentIndex = persistentIndex;
        this.parserRegistry = parserRegistry;
    }
    
    /**
     * 提供定义位置
     * 当用户在Java文件中使用Go to Definition功能时被调用
     */
    public async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Definition | undefined> {
        try {
            // 首先检查当前文档是Java文件
            if (!this.isJavaFile(document.fileName) && 
                !this.isKotlinFile(document.fileName) && 
                !this.isScalaFile(document.fileName)) {
                return undefined;
            }
            
            // 检查是否在SpEL表达式中
            if (this.isJavaScalaKotlinFile(document) && SpelExpressionAnalyzer.isPositionInSpelExpression(document, position)) {
                const configKey = SpelExpressionAnalyzer.getSpelKeyAtPosition(document, position);
                if (configKey) {
                    return await this.findDefinitionForKey(configKey, token);
                }
            }
            
            // 原有逻辑保持不变
            const line = document.lineAt(position.line);
            const lineText = line.text;
            
            // 处理properties文件
            if (document.fileName.endsWith('.properties')) {
                const keyMatch = lineText.match(/^([^=:#]+)[ \t]*[=:]/);
                if (keyMatch) {
                    const key = keyMatch[1].trim();
                    // 检查光标是否在键的范围内
                    const keyStartPos = lineText.indexOf(key);
                    const keyEndPos = keyStartPos + key.length;
                    
                    if (position.character >= keyStartPos && position.character <= keyEndPos) {
                        return this.findDefinitionForKey(key, token);
                    }
                }
            }
            // 处理YAML文件
            else if (document.fileName.endsWith('.yml') || document.fileName.endsWith('.yaml')) {
                // 从当前行向上查找，构建完整的键路径
                let currentLine = position.line;
                let currentIndentation = this.getIndentation(lineText);
                let currentKey = lineText.match(/^[ \t]*([^:]+):/)?.[1].trim();
                
                if (!currentKey) {
                    return undefined;
                }
                
                let keys = [currentKey];
                
                // 向上查找父键
                while (currentLine > 0) {
                    currentLine--;
                    const previousLine = document.lineAt(currentLine).text;
                    const indentation = this.getIndentation(previousLine);
                    
                    // 如果找到了一个缩进更小的行，它可能是父键
                    if (indentation < currentIndentation && previousLine.includes(':')) {
                        const keyMatch = previousLine.match(/^[ \t]*([^:]+):/);
                        if (keyMatch) {
                            currentIndentation = indentation;
                            keys.unshift(keyMatch[1].trim());
                        }
                    }
                }
                
                return this.findDefinitionForKey(keys.join('.'), token);
            }
            
            return undefined;
        } catch (error) {
            console.error('提供定义时出错:', error);
            return undefined;
        }
    }
    
    /**
     * 根据配置键查找其定义位置
     */
    private async findDefinitionForKey(configKey: string, token: vscode.CancellationToken): Promise<vscode.Location[] | undefined> {
        // 从索引中查找配置键
        const keyDefinitions = this.configIndex.findKey(configKey);
        
        if (!keyDefinitions || keyDefinitions.length === 0) {
            // 如果没有找到，返回undefined
            return undefined;
        }
        
        const locations: vscode.Location[] = [];
        
        // 处理每个定义位置
        for (const def of keyDefinitions) {
            // 检查令牌是否已取消
            if (token.isCancellationRequested) {
                break;
            }
            
            try {
                // 创建VSCode位置对象
                const uri = vscode.Uri.file(def.filePath);
                const range = new vscode.Range(
                    new vscode.Position(def.line, def.column),
                    new vscode.Position(def.line, def.column + def.length)
                );
                
                locations.push(new vscode.Location(uri, range));
            } catch (error) {
                console.error(`处理配置键 ${configKey} 定义位置时出错:`, error);
            }
        }
        
        return locations.length > 0 ? locations : undefined;
    }
    
    /**
     * 检查文件是否是Java文件
     */
    private isJavaFile(filePath: string): boolean {
        return filePath.toLowerCase().endsWith('.java');
    }
    
    /**
     * 检查文件是否是Kotlin文件
     */
    private isKotlinFile(filePath: string): boolean {
        return filePath.toLowerCase().endsWith('.kt');
    }
    
    /**
     * 检查文件是否是Scala文件
     */
    private isScalaFile(filePath: string): boolean {
        return filePath.toLowerCase().endsWith('.scala');
    }
    
    /**
     * 检查文件是否是Java、Kotlin或Scala文件
     */
    private isJavaScalaKotlinFile(document: vscode.TextDocument): boolean {
        return this.isJavaFile(document.fileName) || this.isKotlinFile(document.fileName) || this.isScalaFile(document.fileName);
    }
    
    /**
     * 获取行的缩进级别
     */
    private getIndentation(line: string): number {
        const match = line.match(/^[ \t]*/);
        return match ? match[0].length : 0;
    }
}

/**
 * 配置键引用提供者
 * 负责在配置文件中找到所有对特定配置键的引用
 */
export class ConfigReferenceProvider implements vscode.ReferenceProvider {
    private configIndex: TrieIndex;
    private parserRegistry: ParserRegistry;
    
    constructor(configIndex: TrieIndex, parserRegistry: ParserRegistry) {
        this.configIndex = configIndex;
        this.parserRegistry = parserRegistry;
    }
    
    /**
     * 获取配置的排除模式
     */
    private getExcludePatterns(): string {
        const config = vscode.workspace.getConfiguration('java-properties-definition');
        const excludePatterns = config.get<string[]>('excludePatterns', ['**/target/**', '**/build/**', '**/node_modules/**']);
        return excludePatterns.join(',');
    }
    
    /**
     * 提供引用位置
     * 当用户在配置文件中使用Find All References功能时被调用
     */
    public async provideReferences(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.ReferenceContext,
        token: vscode.CancellationToken
    ): Promise<vscode.Location[] | undefined> {
        const results: vscode.Location[] = [];
        
        // 获取配置键
        const configKey = this.getConfigKeyAtPosition(document, position);
        if (!configKey) {
            return undefined;
        }
        
        // 从所有配置文件中查找引用
        const configFiles = await vscode.workspace.findFiles('**/*.{properties,yml,yaml}', this.getExcludePatterns());
        
        // 查找配置文件中的引用
        for (const file of configFiles) {
            // 检查令牌是否已取消
            if (token.isCancellationRequested) {
                return undefined;
            }
            
            const codeDocument = await vscode.workspace.openTextDocument(file);
            const codeText = codeDocument.getText();
            
            // 使用SpEL分析器查找所有表达式
            const expressions = SpelExpressionAnalyzer.extractAllSpelExpressions(codeDocument);
            
            for (const expr of expressions) {
                // 检查键是否匹配
                if (expr.key === configKey || configKey.startsWith(expr.key + '.')) {
                    results.push(new vscode.Location(
                        file,
                        new vscode.Range(
                            new vscode.Position(expr.line, expr.column),
                            new vscode.Position(expr.line, expr.column + expr.length)
                        )
                    ));
                }
            }
        }
        
        // 查找Java、Kotlin、Scala代码中对配置的引用
        if (context.includeDeclaration) {
            const codeFiles = await vscode.workspace.findFiles('**/*.{java,kt,scala}', this.getExcludePatterns());
            
            for (const file of codeFiles) {
                if (token.isCancellationRequested) {
                    return undefined;
                }
                
                const codeDocument = await vscode.workspace.openTextDocument(file);
                const codeText = codeDocument.getText();
                
                // 使用SpEL分析器查找所有表达式
                const expressions = SpelExpressionAnalyzer.extractAllSpelExpressions(codeDocument);
                
                for (const expr of expressions) {
                    // 检查键是否匹配
                    if (expr.key === configKey || configKey.startsWith(expr.key + '.')) {
                        results.push(new vscode.Location(
                            file,
                            new vscode.Range(
                                new vscode.Position(expr.line, expr.column),
                                new vscode.Position(expr.line, expr.column + expr.length)
                            )
                        ));
                    }
                }
            }
        }
        
        return results;
    }
    
    /**
     * 获取配置文件中光标位置的配置键
     */
    private getConfigKeyAtPosition(document: vscode.TextDocument, position: vscode.Position): string | undefined {
        const parser = this.parserRegistry.getParserForFile(document.fileName);
        if (!parser) {
            return undefined;
        }
        
        // 从配置文件解析内容并查找键
        const content = document.getText();
        const parsedConfig = parser.parseContent(content);
        
        // 获取当前行
        const line = document.lineAt(position.line).text;
        
        // 尝试提取配置键
        // 这里的实现会根据不同的配置文件格式有所不同
        // 下面是一个简单的实现，实际上需要针对properties和yaml等格式进行特殊处理
        
        // 处理properties文件
        if (document.fileName.endsWith('.properties')) {
            const keyMatch = line.match(/^([^=:#]+)[ \t]*[=:]/);
            if (keyMatch) {
                const key = keyMatch[1].trim();
                // 检查光标是否在键的范围内
                const keyStartPos = line.indexOf(key);
                const keyEndPos = keyStartPos + key.length;
                
                if (position.character >= keyStartPos && position.character <= keyEndPos) {
                    return key;
                }
            }
        }
        // 处理YAML文件
        else if (document.fileName.endsWith('.yml') || document.fileName.endsWith('.yaml')) {
            // 从当前行向上查找，构建完整的键路径
            let currentLine = position.line;
            let currentIndentation = this.getIndentation(line);
            let currentKey = line.match(/^[ \t]*([^:]+):/)?.[1].trim();
            
            if (!currentKey) {
                return undefined;
            }
            
            let keys = [currentKey];
            
            // 向上查找父键
            while (currentLine > 0) {
                currentLine--;
                const previousLine = document.lineAt(currentLine).text;
                const indentation = this.getIndentation(previousLine);
                
                // 如果找到了一个缩进更小的行，它可能是父键
                if (indentation < currentIndentation && previousLine.includes(':')) {
                    const keyMatch = previousLine.match(/^[ \t]*([^:]+):/);
                    if (keyMatch) {
                        currentIndentation = indentation;
                        keys.unshift(keyMatch[1].trim());
                    }
                }
            }
            
            return keys.join('.');
        }
        
        return undefined;
    }
    
    /**
     * 获取行的缩进级别
     */
    private getIndentation(line: string): number {
        const match = line.match(/^[ \t]*/);
        return match ? match[0].length : 0;
    }
} 