import * as assert from 'assert';
import { YamlPropertyItem, YamlReader } from '../../reader/yamlReader';

// 模拟的YAML文件内容
const sampleYamlContent = `
# 这是一个示例YAML配置文件

# 数据库配置
database:
  url: jdbc:mysql://localhost:3306/mydb
  username: root
  password: secret
  poolConfig:
    maxActive: 10
    minIdle: 2
    maxWait: 1000

# 应用设置
application:
  name: My Application
  version: 1.0.0
  description: 这是一个示例应用
  features:
    - 用户管理
    - 权限控制
    - 数据分析
    - 报表生成
  environments:
    dev:
      url: http://localhost:8080
      debug: true
    prod:
      url: https://example.com
      debug: false
  logging:
    level: INFO
    path: /var/log
    format: JSON

# 空对象
emptyObject: {}

# 空数组
emptyArray: []

# 布尔和数字类型
flags:
  enabled: true
  count: 42
  ratio: 0.75
`;

describe('YamlReader', () => {
    let yamlProperties: YamlPropertyItem[];
    
    before(() => {
        // 在所有测试前解析YAML文件
        yamlProperties = YamlReader.parse(sampleYamlContent, 'test.yml');
    });
    
    it('应该解析简单的属性', () => {
        const dbUrl = yamlProperties.find(p => p.path === 'database.url');
        assert.strictEqual(dbUrl?.value, 'jdbc:mysql://localhost:3306/mydb');
        
        const appName = yamlProperties.find(p => p.path === 'application.name');
        assert.strictEqual(appName?.value, 'My Application');
    });
    
    it('应该解析嵌套对象属性', () => {
        const maxActive = yamlProperties.find(p => p.path === 'database.poolConfig.maxActive');
        assert.strictEqual(maxActive?.value, 10);
    });
    
    it('应该解析数组属性', () => {
        const features = yamlProperties.find(p => p.path === 'application.features');
        assert.ok(Array.isArray(features?.value));
        assert.strictEqual(features?.value.length, 4);
        assert.strictEqual(features?.value[0], '用户管理');
    });
    
    it('应该解析数组中的单个元素', () => {
        const firstFeature = yamlProperties.find(p => p.path === 'application.features[0]');
        assert.strictEqual(firstFeature?.value, '用户管理');
    });
    
    it('应该解析多层嵌套对象', () => {
        const devUrl = yamlProperties.find(p => p.path === 'application.environments.dev.url');
        assert.strictEqual(devUrl?.value, 'http://localhost:8080');
        
        const prodDebug = yamlProperties.find(p => p.path === 'application.environments.prod.debug');
        assert.strictEqual(prodDebug?.value, false);
    });
    
    it('应该解析不同类型的属性值', () => {
        const enabled = yamlProperties.find(p => p.path === 'flags.enabled');
        assert.strictEqual(enabled?.value, true);
        
        const count = yamlProperties.find(p => p.path === 'flags.count');
        assert.strictEqual(count?.value, 42);
        
        const ratio = yamlProperties.find(p => p.path === 'flags.ratio');
        assert.strictEqual(ratio?.value, 0.75);
    });
    
    it('应该能通过路径获取属性', () => {
        const property = YamlReader.getProperty(sampleYamlContent, 'database.username');
        assert.strictEqual(property?.value, 'root');
    });
}); 