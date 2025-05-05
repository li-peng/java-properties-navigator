const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

// 测试文件路径
const yamlFilePath = path.join(__dirname, 'src/test/resources/test.yaml');

// 读取YAML文件
try {
    const content = fs.readFileSync(yamlFilePath, 'utf8');
    console.log('YAML文件内容:');
    console.log(content);
    
    // 解析YAML内容
    const doc = YAML.parseDocument(content, { keepSourceTokens: true });
    
    // 输出解析结果
    console.log('\n解析结果:');
    console.log(JSON.stringify(doc.toJSON(), null, 2));
    
    // 测试访问特定节点
    console.log('\n访问特定节点:');
    const serverNode = doc.get('server');
    if (serverNode) {
        console.log('server.port:', doc.getIn(['server', 'port']));
        console.log('server.context-path:', doc.getIn(['server', 'context-path']));
    } else {
        console.log('找不到server节点');
    }
    
    // 输出所有键路径
    console.log('\n所有键路径:');
    const allKeys = [];
    
    YAML.visit(doc, {
        Pair: (key, node, path) => {
            if (node.key && typeof node.key.value !== 'undefined') {
                const keyParts = [];
                // 构建路径
                const parentPath = path.slice(1);
                for (const p of parentPath) {
                    if (p && p.key && typeof p.key.value !== 'undefined') {
                        keyParts.push(String(p.key.value));
                    }
                }
                keyParts.push(String(node.key.value));
                const fullPath = keyParts.join('.');
                allKeys.push(fullPath);
                
                console.log(`键: ${fullPath}, 值: ${node.value ? node.value.value : 'undefined'}`);
                
                // 检查范围信息
                if (node.key.range) {
                    console.log(`  位置: range=${JSON.stringify(node.key.range)}`);
                }
            }
        }
    });
    
    console.log('\n总键数:', allKeys.length);
    console.log('所有键:', allKeys);
    
} catch (error) {
    console.error('测试YAML解析时出错:', error);
} 