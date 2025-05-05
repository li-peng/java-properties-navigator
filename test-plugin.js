const fs = require('fs');
const path = require('path');
const vscode = require('./out/test-mock/vscode-mock.js');

// 测试过程
async function testYamlParsing() {
    try {
        // 1. 创建测试YAML文件
        console.log('准备测试环境...');
        const testDir = path.join(__dirname, 'test-resources');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        
        const yamlContent = `
server:
  port: 8080
  context-path: /api

spring:
  application:
    name: test-service
  datasource:
    url: jdbc:mysql://localhost:3306/testdb
    username: \${DB_USER:root}
    password: \${DB_PASS:password}

logging:
  level:
    root: INFO
    com.example: DEBUG
`;
        
        const yamlFilePath = path.join(testDir, 'test.yaml');
        fs.writeFileSync(yamlFilePath, yamlContent, 'utf8');
        
        // 2. 导入并测试parseYaml函数
        console.log('尝试导入YAML解析函数...');
        const { parseYaml } = require('./out/yamlParser.js');
        
        // 3. 解析YAML文件
        console.log('解析YAML文件:', yamlFilePath);
        const fileUri = { fsPath: yamlFilePath };
        const parsedItems = parseYaml(yamlContent, fileUri);
        
        console.log(`解析结果: 找到 ${parsedItems.length} 个配置项`);
        parsedItems.forEach(item => {
            console.log(`- ${item.key} = ${item.value} (行: ${item.line+1})`);
        });
        
        // 4. 测试ConfigIndex
        console.log('\n测试ConfigIndex...');
        const { ConfigurationIndexManager } = require('./out/configIndex.js');
        
        global.vscode = {
            workspace: {
                workspaceFolders: [{ uri: { fsPath: __dirname } }],
                getConfiguration: () => ({
                    get: (key, defaultValue) => {
                        const config = {
                            'scanDirectories': ['test-resources'],
                            'excludePatterns': [],
                            'fileExtensions': ['.properties', '.yml', '.yaml'],
                            'enableDiagnostics': true,
                            'showStatusBar': true,
                            'autoRebuildOnConfigChange': true
                        };
                        return config[key] || defaultValue;
                    }
                })
            },
            Uri: {
                file: (path) => ({ fsPath: path })
            }
        };
        
        const indexManager = new ConfigurationIndexManager();
        await indexManager.rebuildIndex();
        
        const allKeys = indexManager.getAllPropertyKeys();
        console.log(`索引中的键数量: ${allKeys.length}`);
        if (allKeys.length > 0) {
            console.log('前5个键:', allKeys.slice(0, 5));
            
            // 检查特定键是否存在
            const keyToCheck = 'server.port';
            const exists = indexManager.hasProperty(keyToCheck);
            console.log(`键 "${keyToCheck}" ${exists ? '存在' : '不存在'} 于索引中`);
            
            if (exists) {
                const locations = indexManager.findPropertyLocations(keyToCheck);
                console.log(`键 "${keyToCheck}" 在 ${locations.length} 个地方被定义:`);
                locations.forEach(loc => {
                    console.log(`- 文件: ${path.basename(loc.filePath)}, 行: ${loc.line}`);
                });
            }
        } else {
            console.log('索引为空，没有找到任何键');
        }
        
    } catch (error) {
        console.error('测试过程中出错:', error);
    }
}

// 运行测试
testYamlParsing(); 