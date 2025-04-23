import * as assert from 'assert';
import { PropertyItem, PropertiesReader } from '../../reader/propertiesReader';

// 模拟的properties文件内容
const samplePropertiesContent = `
# 这是一个示例配置文件
# 包含多种格式的属性

# 数据库配置
db.url=jdbc:mysql://localhost:3306/mydb
db.username=root
db.password=secret

# 应用设置
app.name = My Application
app.version = 1.0.0
app.description = 这是一个示例应用

# 带有Unicode转义
welcome.message = \\u4F60\\u597D\\u4E16\\u754C

# 多行属性
long.text = 这是一个很长的文本，\
            需要分成多行显示，\
            但是在属性中是一个连续的值。

# 特殊字符
special.chars = 换行符：\\n，制表符：\\t，反斜杠：\\\\

# 空值属性
empty.value = 

# 使用冒号分隔符
colon.separator: 这是使用冒号作为分隔符的属性
`;

describe('PropertiesReader', () => {
    let properties: PropertyItem[];
    
    before(() => {
        // 在所有测试前解析属性文件
        properties = PropertiesReader.parse(samplePropertiesContent, 'test.properties');
    });
    
    it('应该正确解析所有属性', () => {
        assert.strictEqual(properties.length, 11, '应该解析出11个属性');
    });
    
    it('应该正确解析基本属性', () => {
        const dbUrl = PropertiesReader.getProperty(properties, 'db.url');
        assert.strictEqual(dbUrl?.value, 'jdbc:mysql://localhost:3306/mydb');
        
        const appName = PropertiesReader.getProperty(properties, 'app.name');
        assert.strictEqual(appName?.value, 'My Application');
    });
    
    it('应该解析注释', () => {
        const dbUrl = PropertiesReader.getProperty(properties, 'db.url');
        assert.strictEqual(dbUrl?.comment, '数据库配置');
        
        const appName = PropertiesReader.getProperty(properties, 'app.name');
        assert.strictEqual(appName?.comment, '应用设置');
    });
    
    it('应该解析Unicode转义序列', () => {
        const welcomeMsg = PropertiesReader.getProperty(properties, 'welcome.message');
        assert.strictEqual(welcomeMsg?.value, '你好世界');
    });
    
    it('应该正确处理多行属性', () => {
        const longText = PropertiesReader.getProperty(properties, 'long.text');
        assert.strictEqual(longText?.value, '这是一个很长的文本，需要分成多行显示，但是在属性中是一个连续的值。');
    });
    
    it('应该格式化特殊字符', () => {
        const specialChars = PropertiesReader.getProperty(properties, 'special.chars');
        const formatted = PropertiesReader.formatValue(specialChars?.value || '');
        assert.strictEqual(formatted, '换行符：\n，制表符：\t，反斜杠：\\');
    });
    
    it('应该处理空值属性', () => {
        const emptyValue = PropertiesReader.getProperty(properties, 'empty.value');
        assert.strictEqual(emptyValue?.value, '');
    });
    
    it('应该处理使用冒号作为分隔符的属性', () => {
        const colonSeparator = PropertiesReader.getProperty(properties, 'colon.separator');
        assert.strictEqual(colonSeparator?.value, '这是使用冒号作为分隔符的属性');
    });
}); 