import * as assert from 'assert';
import { PropertyValueParser, PropertyPlaceholder } from '../../reader/propertyValueParser';

describe('PropertyValueParser', () => {
    describe('占位符解析', () => {
        it('应该正确解析简单占位符', () => {
            const value = 'jdbc:mysql://${db.host}:${db.port}/mydb';
            const placeholders = PropertyValueParser.parsePlaceholders(value);
            
            assert.strictEqual(placeholders.length, 2);
            assert.strictEqual(placeholders[0].key, 'db.host');
            assert.strictEqual(placeholders[1].key, 'db.port');
        });
        
        it('应该解析带有默认值的占位符', () => {
            const value = '${db.host:localhost}:${db.port:3306}';
            const placeholders = PropertyValueParser.parsePlaceholders(value);
            
            assert.strictEqual(placeholders.length, 2);
            assert.strictEqual(placeholders[0].key, 'db.host');
            assert.strictEqual(placeholders[0].defaultValue, 'localhost');
            assert.strictEqual(placeholders[1].key, 'db.port');
            assert.strictEqual(placeholders[1].defaultValue, '3306');
        });
        
        it('应该正确处理没有默认值的占位符', () => {
            const value = '${db.username}:${db.password}';
            const placeholders = PropertyValueParser.parsePlaceholders(value);
            
            assert.strictEqual(placeholders.length, 2);
            assert.strictEqual(placeholders[0].defaultValue, undefined);
            assert.strictEqual(placeholders[1].defaultValue, undefined);
        });
        
        it('应该正确处理位置信息', () => {
            const value = 'Host: ${db.host}';
            const placeholders = PropertyValueParser.parsePlaceholders(value);
            
            assert.strictEqual(placeholders.length, 1);
            assert.strictEqual(placeholders[0].start, 6);
            assert.strictEqual(placeholders[0].end, 16);
            assert.strictEqual(placeholders[0].original, '${db.host}');
        });
        
        it('应该返回空数组当没有占位符时', () => {
            const value = 'Host: localhost';
            const placeholders = PropertyValueParser.parsePlaceholders(value);
            
            assert.strictEqual(placeholders.length, 0);
        });
        
        it('应该处理嵌套的情况', () => {
            const value = '${${prefix}.value}';
            const placeholders = PropertyValueParser.parsePlaceholders(value);
            
            // 注意：这里我们期望解析器只提取最外层的占位符
            assert.strictEqual(placeholders.length, 1);
            assert.strictEqual(placeholders[0].key, '${prefix}.value');
        });
    });
    
    describe('占位符替换', () => {
        it('应该用实际值替换占位符', () => {
            const value = 'jdbc:mysql://${db.host}:${db.port}/mydb';
            const resolver = (key: string): string | undefined => {
                if (key === 'db.host') return 'localhost';
                if (key === 'db.port') return '3306';
                return undefined;
            };
            
            const result = PropertyValueParser.resolvePlaceholders(value, resolver);
            assert.strictEqual(result, 'jdbc:mysql://localhost:3306/mydb');
        });
        
        it('应该使用默认值当解析器返回undefined时', () => {
            const value = '${db.host:localhost}:${db.port:3306}';
            const resolver = (key: string): string | undefined => undefined;
            
            const result = PropertyValueParser.resolvePlaceholders(value, resolver);
            assert.strictEqual(result, 'localhost:3306');
        });
        
        it('应该使用空字符串当没有默认值且解析器返回undefined时', () => {
            const value = '${db.host}:${db.port}';
            const resolver = (key: string): string | undefined => undefined;
            
            const result = PropertyValueParser.resolvePlaceholders(value, resolver);
            assert.strictEqual(result, ':');
        });
        
        it('应该保持原值当没有占位符时', () => {
            const value = 'localhost:3306';
            const resolver = (key: string): string | undefined => 'value';
            
            const result = PropertyValueParser.resolvePlaceholders(value, resolver);
            assert.strictEqual(result, 'localhost:3306');
        });
    });
    
    describe('转义序列处理', () => {
        it('应该正确处理换行符', () => {
            const value = 'line1\\nline2';
            const result = PropertyValueParser.processEscapeSequences(value);
            assert.strictEqual(result, 'line1\nline2');
        });
        
        it('应该正确处理制表符', () => {
            const value = 'col1\\tcol2';
            const result = PropertyValueParser.processEscapeSequences(value);
            assert.strictEqual(result, 'col1\tcol2');
        });
        
        it('应该正确处理引号', () => {
            const value = 'Say \\"hello\\"';
            const result = PropertyValueParser.processEscapeSequences(value);
            assert.strictEqual(result, 'Say "hello"');
        });
        
        it('应该正确处理反斜杠', () => {
            const value = 'C:\\\\Program Files\\\\App';
            const result = PropertyValueParser.processEscapeSequences(value);
            assert.strictEqual(result, 'C:\\Program Files\\App');
        });
    });
    
    describe('Unicode解码', () => {
        it('应该正确解码Unicode转义序列', () => {
            const value = '\\u4F60\\u597D\\u4E16\\u754C'; // "你好世界" 的Unicode表示
            const result = PropertyValueParser.decodeUnicode(value);
            assert.strictEqual(result, '你好世界');
        });
        
        it('应该处理混合的Unicode和普通文本', () => {
            const value = 'Hello, \\u4E16\\u754C!'; // "Hello, 世界!"
            const result = PropertyValueParser.decodeUnicode(value);
            assert.strictEqual(result, 'Hello, 世界!');
        });
    });
    
    describe('格式化值', () => {
        it('应该综合处理转义、Unicode和占位符', () => {
            const value = '\\u4F60\\u597D, ${name}!\\nWelcome to ${place:Earth}';
            const resolver = (key: string): string | undefined => {
                if (key === 'name') return 'Alice';
                return undefined;
            };
            
            const result = PropertyValueParser.formatValue(value, resolver);
            assert.strictEqual(result, '你好, Alice!\nWelcome to Earth');
        });
        
        it('应该在没有解析器的情况下正确处理', () => {
            const value = '\\u4F60\\u597D\\nWorld';
            const result = PropertyValueParser.formatValue(value);
            assert.strictEqual(result, '你好\nWorld');
        });
    });
    
    describe('检测占位符', () => {
        it('应该正确检测是否包含占位符', () => {
            assert.strictEqual(PropertyValueParser.containsPlaceholders('${key}'), true);
            assert.strictEqual(PropertyValueParser.containsPlaceholders('No placeholder'), false);
            assert.strictEqual(PropertyValueParser.containsPlaceholders('${key1} and ${key2}'), true);
        });
    });
}); 