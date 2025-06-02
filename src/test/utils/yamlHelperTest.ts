import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { parseYamlFile } from '../../utils/yamlHelper';

describe('YamlHelper Bug Fix', () => {
    let testFilePath: string;
    
    beforeEach(() => {
        // 创建临时测试文件
        testFilePath = path.join(__dirname, 'test-bug-fix.yaml');
    });
    
    afterEach(() => {
        // 清理测试文件
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });
    
    it('应该正确区分相同键名在不同父级下的定位', () => {
        const yamlContent = `right:
  a: right-content
wrong:
  a: wrong-content`;
        
        // 写入测试文件
        fs.writeFileSync(testFilePath, yamlContent, 'utf8');
        
        // 解析YAML文件
        const configItems = parseYamlFile(testFilePath);
        
        // 查找配置项
        const rightA = configItems.find(item => item.key === 'right.a');
        const wrongA = configItems.find(item => item.key === 'wrong.a');
        
        // 验证配置项存在
        assert.ok(rightA, 'right.a 应该存在');
        assert.ok(wrongA, 'wrong.a 应该存在');
        
        // 验证值正确
        assert.strictEqual(rightA!.value, 'right-content');
        assert.strictEqual(wrongA!.value, 'wrong-content');
        
        // 验证行号不同（这是修复的关键）
        assert.notStrictEqual(rightA!.line, wrongA!.line, 'right.a 和 wrong.a 应该有不同的行号');
        
        // 验证具体行号正确
        assert.strictEqual(rightA!.line, 1, 'right.a 应该在第2行（0-based）');
        assert.strictEqual(wrongA!.line, 3, 'wrong.a 应该在第4行（0-based）');
    });
    
    it('应该正确处理多层嵌套的相同键名', () => {
        const yamlContent = `database:
  primary:
    host: primary-host
    port: 5432
  secondary:
    host: secondary-host
    port: 5433`;
        
        // 写入测试文件
        fs.writeFileSync(testFilePath, yamlContent, 'utf8');
        
        // 解析YAML文件
        const configItems = parseYamlFile(testFilePath);
        
        // 查找配置项
        const primaryHost = configItems.find(item => item.key === 'database.primary.host');
        const secondaryHost = configItems.find(item => item.key === 'database.secondary.host');
        const primaryPort = configItems.find(item => item.key === 'database.primary.port');
        const secondaryPort = configItems.find(item => item.key === 'database.secondary.port');
        
        // 验证配置项存在
        assert.ok(primaryHost, 'database.primary.host 应该存在');
        assert.ok(secondaryHost, 'database.secondary.host 应该存在');
        assert.ok(primaryPort, 'database.primary.port 应该存在');
        assert.ok(secondaryPort, 'database.secondary.port 应该存在');
        
        // 验证值正确
        assert.strictEqual(primaryHost!.value, 'primary-host');
        assert.strictEqual(secondaryHost!.value, 'secondary-host');
        assert.strictEqual(primaryPort!.value, 5432);
        assert.strictEqual(secondaryPort!.value, 5433);
        
        // 验证行号都不同
        const lines = [primaryHost!.line, secondaryHost!.line, primaryPort!.line, secondaryPort!.line];
        const uniqueLines = new Set(lines);
        assert.strictEqual(uniqueLines.size, 4, '所有行号都应该不同');
    });
    
    it('应该正确处理复杂的YAML结构', () => {
        const yamlContent = `spring:
  profiles:
    active: dev
  datasource:
    url: jdbc:mysql://localhost:3306/testdb
    username: testuser
    password: testpass
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true

server:
  port: 8080
  servlet:
    context-path: /api

logging:
  level:
    root: INFO
    com.example: DEBUG`;
        
        // 写入测试文件
        fs.writeFileSync(testFilePath, yamlContent, 'utf8');
        
        // 解析YAML文件
        const configItems = parseYamlFile(testFilePath);
        
        // 验证一些关键配置项
        const springProfilesActive = configItems.find(item => item.key === 'spring.profiles.active');
        const serverPort = configItems.find(item => item.key === 'server.port');
        const loggingLevelRoot = configItems.find(item => item.key === 'logging.level.root');
        
        assert.ok(springProfilesActive, 'spring.profiles.active 应该存在');
        assert.ok(serverPort, 'server.port 应该存在');
        assert.ok(loggingLevelRoot, 'logging.level.root 应该存在');
        
        assert.strictEqual(springProfilesActive!.value, 'dev');
        assert.strictEqual(serverPort!.value, 8080);
        assert.strictEqual(loggingLevelRoot!.value, 'INFO');
        
        // 验证所有配置项的行号都是唯一的（除了对象节点）
        const leafItems = configItems.filter(item => item.value !== '[Object]');
        const lineNumbers = leafItems.map(item => item.line);
        const uniqueLineNumbers = new Set(lineNumbers);
        
        // 每个叶子节点都应该有唯一的行号
        assert.ok(uniqueLineNumbers.size > 0, '应该有唯一的行号');
    });
}); 