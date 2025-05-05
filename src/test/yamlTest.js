const fs = require('fs');
const path = require('path');

// 模拟vscode.Uri
class MockUri {
    constructor(fsPath) {
        this.fsPath = fsPath;
    }
}

// 模拟vscode.Position和vscode.Range
class Position {
    constructor(line, character) {
        this.line = line;
        this.character = character;
    }
}

class Range {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
}

// 模拟vscode命名空间
global.vscode = {
    Uri: MockUri,
    Position: Position,
    Range: Range
};

// 导入插件的YAML解析函数
const yamlParserPath = path.join(__dirname, '../../out/yamlParser.js');
let parseYaml;
try {
    const yamlParser = require(yamlParserPath);
    parseYaml = yamlParser.parseYaml;
    console.log('成功导入parseYaml函数');
} catch (err) {
    console.error('导入parseYaml失败:', err);
    process.exit(1);
}

// 测试文件路径
const yamlFilePath = path.join(__dirname, 'resources/test.yaml');

// 读取YAML文件
try {
    console.log('YAML文件路径:', yamlFilePath);
    const content = fs.readFileSync(yamlFilePath, 'utf8');
    console.log('YAML文件内容:');
    console.log(content);
    
    // 创建模拟的Uri对象
    const mockUri = new MockUri(yamlFilePath);
    
    // 调用插件的parseYaml函数
    console.log('\n使用插件的parseYaml函数解析:');
    const items = parseYaml(content, mockUri);
    
    console.log(`解析到 ${items.length} 个配置项`);
    
    // 输出每个配置项
    items.forEach((item, index) => {
        console.log(`\n配置项 #${index + 1}:`);
        console.log(`  键: ${item.key}`);
        console.log(`  值: ${item.value}`);
        console.log(`  位置: 第${item.line+1}行, 第${item.column}列`);
        console.log(`  长度: ${item.length}`);
        console.log(`  类型: ${item.fileType}`);
        console.log(`  占位符: ${item.hasPlaceholders ? '是' : '否'}`);
        if (item.placeholderKeys && item.placeholderKeys.length > 0) {
            console.log(`  占位符键: ${item.placeholderKeys.join(', ')}`);
        }
    });
    
} catch (error) {
    console.error('测试YAML解析时出错:', error);
} 