import * as assert from 'assert';
import { ConfigReader, ConfigItem } from '../../reader/configReader';

// 模拟properties文件内容，包含占位符
const propertiesContent = `
# 数据库配置
db.url=jdbc:mysql://\${db.host:\localhost}:\${db.port:3306}/mydb
db.username=root
db.password=secret

# 应用设置
app.name = My Application
app.version = \${app.major.version}.0.0
`;

// 模拟YAML文件内容，包含占位符
const yamlContent = `
# 数据库配置
database:
  url: jdbc:mysql://\${db.host:localhost}:\${db.port:3306}/mydb
  username: root
  password: secret

# 应用设置
application:
  name: My Application
  version: \${app.version}
  profiles:
    - dev
    - \${active.profile:prod}
`;

describe('ConfigReader', () => {
    describe('Properties文件解析', () => {
        let configItems: ConfigItem[];
        
        before(() => {
            configItems = ConfigReader.parseConfig(propertiesContent, 'test.properties');
        });
        
        it('应该正确解析Properties文件', () => {
            assert.strictEqual(configItems.length, 6);
            
            const dbUrl = configItems.find(item => item.key === 'db.url');
            assert.ok(dbUrl);
            assert.strictEqual(dbUrl?.value, 'jdbc:mysql://${db.host:localhost}:${db.port:3306}/mydb');
            assert.strictEqual(dbUrl?.fileType, 'properties');
            
            const appName = configItems.find(item => item.key === 'app.name');
            assert.ok(appName);
            assert.strictEqual(appName?.value, 'My Application');
        });
        
        it('应该能通过键查找Properties配置项', () => {
            const dbUsername = ConfigReader.findConfigItemByKey(
                propertiesContent, 
                'db.username', 
                'test.properties'
            );
            
            assert.ok(dbUsername);
            assert.strictEqual(dbUsername?.key, 'db.username');
            assert.strictEqual(dbUsername?.value, 'root');
            assert.strictEqual(dbUsername?.fileType, 'properties');
        });
        
        it('应该识别和提取占位符', () => {
            const dbUrl = configItems.find(item => item.key === 'db.url');
            assert.ok(dbUrl?.hasPlaceholders);
            assert.ok(dbUrl?.placeholderKeys?.includes('db.host'));
            assert.ok(dbUrl?.placeholderKeys?.includes('db.port'));
            
            const appVersion = configItems.find(item => item.key === 'app.version');
            assert.ok(appVersion?.hasPlaceholders);
            assert.ok(appVersion?.placeholderKeys?.includes('app.major.version'));
        });
        
        it('应该能格式化Properties值并解析占位符', () => {
            const dbUrl = configItems.find(item => item.key === 'db.url');
            if (!dbUrl) {
                assert.fail('未找到db.url');
                return;
            }
            
            // 解析器函数，提供占位符的实际值
            const resolver = (key: string): string | undefined => {
                if (key === 'db.host') return '127.0.0.1';
                if (key === 'db.port') return '5432';
                return undefined;
            };
            
            const formattedValue = ConfigReader.formatConfigValue(dbUrl, resolver);
            assert.strictEqual(formattedValue, 'jdbc:mysql://127.0.0.1:5432/mydb');
        });
    });
    
    describe('YAML文件解析', () => {
        let configItems: ConfigItem[];
        
        before(() => {
            configItems = ConfigReader.parseConfig(yamlContent, 'test.yml');
        });
        
        it('应该正确解析YAML文件', () => {
            const dbUrl = configItems.find(item => item.key === 'database.url');
            assert.ok(dbUrl);
            assert.strictEqual(dbUrl?.value, 'jdbc:mysql://${db.host:localhost}:${db.port:3306}/mydb');
            assert.strictEqual(dbUrl?.fileType, 'yaml');
            
            const appName = configItems.find(item => item.key === 'application.name');
            assert.ok(appName);
            assert.strictEqual(appName?.value, 'My Application');
        });
        
        it('应该能通过键查找YAML配置项', () => {
            const dbUsername = ConfigReader.findConfigItemByKey(
                yamlContent, 
                'database.username', 
                'test.yml'
            );
            
            assert.ok(dbUsername);
            assert.strictEqual(dbUsername?.key, 'database.username');
            assert.strictEqual(dbUsername?.value, 'root');
            assert.strictEqual(dbUsername?.fileType, 'yaml');
        });
        
        it('应该识别和提取YAML中的占位符', () => {
            const dbUrl = configItems.find(item => item.key === 'database.url');
            assert.ok(dbUrl?.hasPlaceholders);
            assert.ok(dbUrl?.placeholderKeys?.includes('db.host'));
            assert.ok(dbUrl?.placeholderKeys?.includes('db.port'));
            
            const appVersion = configItems.find(item => item.key === 'application.version');
            assert.ok(appVersion?.hasPlaceholders);
            assert.ok(appVersion?.placeholderKeys?.includes('app.version'));
            
            // 检查数组元素中的占位符
            const activeProfile = configItems.find(item => item.key === 'application.profiles[1]');
            assert.ok(activeProfile?.hasPlaceholders);
            assert.ok(activeProfile?.placeholderKeys?.includes('active.profile'));
        });
        
        it('应该能格式化YAML值并解析占位符', () => {
            const dbUrl = configItems.find(item => item.key === 'database.url');
            if (!dbUrl) {
                assert.fail('未找到database.url');
                return;
            }
            
            // 解析器函数，提供占位符的实际值
            const resolver = (key: string): string | undefined => {
                if (key === 'db.host') return 'db.example.com';
                if (key === 'db.port') return '3306';
                return undefined;
            };
            
            const formattedValue = ConfigReader.formatConfigValue(dbUrl, resolver);
            assert.strictEqual(formattedValue, 'jdbc:mysql://db.example.com:3306/mydb');
        });
    });
    
    it('应该能够识别不支持的文件类型', () => {
        const items = ConfigReader.parseConfig('content', 'test.json');
        assert.strictEqual(items.length, 0);
        
        const item = ConfigReader.findConfigItemByKey('content', 'key', 'test.json');
        assert.strictEqual(item, undefined);
    });
    
    describe('依赖关系处理', () => {
        it('应该正确构建依赖图', () => {
            const configItems = [
                ...ConfigReader.parseConfig(propertiesContent, 'test.properties'),
                ...ConfigReader.parseConfig(yamlContent, 'test.yml')
            ];
            
            const dependencyGraph = ConfigReader.buildDependencyGraph(configItems);
            
            // 检查依赖关系
            assert.ok(dependencyGraph.has('db.url'));
            assert.deepStrictEqual(dependencyGraph.get('db.url')?.sort(), ['db.host', 'db.port'].sort());
            
            assert.ok(dependencyGraph.has('database.url'));
            assert.deepStrictEqual(dependencyGraph.get('database.url')?.sort(), ['db.host', 'db.port'].sort());
            
            assert.ok(dependencyGraph.has('app.version'));
            assert.deepStrictEqual(dependencyGraph.get('app.version'), ['app.major.version']);
            
            assert.ok(dependencyGraph.has('application.version'));
            assert.deepStrictEqual(dependencyGraph.get('application.version'), ['app.version']);
        });
    });
}); 