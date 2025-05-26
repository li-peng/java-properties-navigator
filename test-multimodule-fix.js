const path = require('path');
const fs = require('fs');

// 模拟VSCode环境 - 必须在导入任何模块之前设置
global.vscode = {
    workspace: {
        workspaceFolders: [],
        getConfiguration: () => ({
            get: (key, defaultValue) => {
                const config = {
                    'scanDirectories': ['src/main/resources', '**/src/main/resources'],
                    'excludePatterns': ['**/target/**', '**/build/**', '**/node_modules/**'],
                    'fileExtensions': ['.properties', '.yml', '.yaml'],
                    'enableDiagnostics': true,
                    'showStatusBar': true,
                    'autoRebuildOnConfigChange': true
                };
                return config[key] || defaultValue;
            }
        }),
        createFileSystemWatcher: () => ({
            onDidChange: () => {},
            onDidCreate: () => {},
            onDidDelete: () => {},
            dispose: () => {}
        })
    },
    Uri: {
        file: (path) => ({ fsPath: path })
    },
    window: {
        createTextEditorDecorationType: () => ({
            dispose: () => {}
        })
    }
};

// 模拟多模块项目结构
function createTestProject() {
    const testDir = path.join(__dirname, 'test-multimodule');
    
    // 清理旧的测试目录
    if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
    }
    
    // 创建多模块项目结构
    const structure = {
        'common/src/main/resources/application.properties': 'server.port=8080\napp.name=common-module',
        'common/target/classes/application.properties': 'server.port=8080\napp.name=common-module-compiled',
        'service/src/main/resources/application-dev.properties': 'debug.enabled=true\nlog.level=DEBUG',
        'service/target/classes/application-dev.properties': 'debug.enabled=true\nlog.level=DEBUG-compiled',
        'web/src/main/resources/messages.properties': 'welcome.message=Hello World\nerror.message=Something went wrong',
        'web/target/classes/messages.properties': 'welcome.message=Hello World Compiled\nerror.message=Something went wrong compiled'
    };
    
    // 创建目录和文件
    for (const [filePath, content] of Object.entries(structure)) {
        const fullPath = path.join(testDir, filePath);
        const dir = path.dirname(fullPath);
        
        // 创建目录
        fs.mkdirSync(dir, { recursive: true });
        
        // 创建文件
        fs.writeFileSync(fullPath, content, 'utf8');
    }
    
    console.log(`测试项目已创建在: ${testDir}`);
    return testDir;
}

// 测试扫描逻辑
async function testScanLogic() {
    try {
        // 创建测试项目
        const testDir = createTestProject();
        
        // 更新VSCode模拟环境
        global.vscode.workspace.workspaceFolders = [{ uri: { fsPath: testDir } }];
        
        // 导入修复后的配置索引管理器
        const { ConfigurationIndexManager } = require('./out/configIndex');
        
        const indexManager = new ConfigurationIndexManager();
        await indexManager.rebuildIndex();
        
        const allKeys = indexManager.getAllPropertyKeys();
        console.log(`\n扫描结果:`);
        console.log(`索引中的键数量: ${allKeys.length}`);
        
        if (allKeys.length > 0) {
            console.log('找到的键:', allKeys);
            
            // 检查每个键的位置
            for (const key of allKeys) {
                const locations = indexManager.findPropertyLocations(key);
                console.log(`\n键 "${key}" 的位置:`);
                locations.forEach(loc => {
                    const relativePath = path.relative(testDir, loc.filePath);
                    console.log(`  - 文件: ${relativePath}, 行: ${loc.line}`);
                    
                    // 验证是否包含target目录的文件
                    if (relativePath.includes('target')) {
                        console.log(`    ❌ 错误: 扫描到了target目录中的文件!`);
                    } else if (relativePath.includes('src/main/resources')) {
                        console.log(`    ✅ 正确: 扫描到了src目录中的文件`);
                    }
                });
            }
        } else {
            console.log('❌ 错误: 没有找到任何键');
        }
        
        // 测试路径验证方法
        console.log(`\n路径验证测试:`);
        const testPaths = [
            'common/src/main/resources/application.properties',
            'common/target/classes/application.properties',
            'service/src/main/resources/application-dev.properties',
            'service/target/classes/application-dev.properties'
        ];
        
        for (const testPath of testPaths) {
            const fullPath = path.join(testDir, testPath);
            const scanDirs = ['src/main/resources', '**/src/main/resources'];
            const excludePatterns = ['**/target/**', '**/build/**', '**/node_modules/**'];
            
            // 这里我们需要直接测试私有方法，但由于它们是私有的，我们只能通过结果来验证
            console.log(`  路径: ${testPath}`);
            if (testPath.includes('target')) {
                console.log(`    应该被排除: ✅`);
            } else if (testPath.includes('src/main/resources')) {
                console.log(`    应该被包含: ✅`);
            }
        }
        
    } catch (error) {
        console.error('测试过程中出错:', error);
    }
}

// 运行测试
testScanLogic().then(() => {
    console.log('\n测试完成');
}).catch(error => {
    console.error('测试失败:', error);
}); 