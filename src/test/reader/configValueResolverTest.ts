import * as assert from 'assert';
import { ConfigReader } from '../../reader/configReader';
import { ConfigValueResolver } from '../../reader/configValueResolver';

describe('ConfigValueResolver', () => {
    it('应该能正确解析简单的属性值', () => {
        const propertiesContent = `
            app.name=My Application
            app.version=1.0.0
        `;
        
        const configItems = ConfigReader.parseConfig(propertiesContent, 'test.properties');
        const resolver = new ConfigValueResolver(configItems);
        
        assert.strictEqual(resolver.getValue('app.name'), 'My Application');
        assert.strictEqual(resolver.getValue('app.version'), '1.0.0');
    });
    
    it('应该能解析包含单层占位符的属性值', () => {
        const propertiesContent = `
            db.host=localhost
            db.port=3306
            db.url=jdbc:mysql://\${db.host}:\${db.port}/mydb
        `;
        
        const configItems = ConfigReader.parseConfig(propertiesContent, 'test.properties');
        const resolver = new ConfigValueResolver(configItems);
        
        assert.strictEqual(resolver.getValue('db.url'), 'jdbc:mysql://localhost:3306/mydb');
    });
    
    it('应该能解析包含默认值的占位符', () => {
        const propertiesContent = `
            db.url=jdbc:mysql://\${db.host:localhost}:\${db.port:3306}/mydb
        `;
        
        const configItems = ConfigReader.parseConfig(propertiesContent, 'test.properties');
        const resolver = new ConfigValueResolver(configItems);
        
        assert.strictEqual(resolver.getValue('db.url'), 'jdbc:mysql://localhost:3306/mydb');
    });
    
    it('应该能解析多层嵌套的占位符', () => {
        const propertiesContent = `
            app.major.version=2
            app.minor.version=1
            app.patch.version=0
            app.version=\${app.major.version}.\${app.minor.version}.\${app.patch.version}
            app.name=My App v\${app.version}
        `;
        
        const configItems = ConfigReader.parseConfig(propertiesContent, 'test.properties');
        const resolver = new ConfigValueResolver(configItems);
        
        assert.strictEqual(resolver.getValue('app.version'), '2.1.0');
        assert.strictEqual(resolver.getValue('app.name'), 'My App v2.1.0');
    });
    
    it('应该能正确处理占位符和特殊字符', () => {
        const propertiesContent = `
            message.welcome=欢迎使用\\n\${app.name}
            app.name=测试应用
        `;
        
        const configItems = ConfigReader.parseConfig(propertiesContent, 'test.properties');
        const resolver = new ConfigValueResolver(configItems);
        
        assert.strictEqual(resolver.getValue('message.welcome'), '欢迎使用\n测试应用');
    });
    
    it('应该能处理YAML文件中的占位符', () => {
        const yamlContent = `
            database:
              host: db.example.com
              port: 5432
              url: jdbc:postgresql://\${database.host}:\${database.port}/mydb
              
            application:
              profiles:
                - dev
                - \${active.profile:prod}
        `;
        
        const configItems = ConfigReader.parseConfig(yamlContent, 'test.yml');
        const resolver = new ConfigValueResolver(configItems);
        
        assert.strictEqual(resolver.getValue('database.url'), 'jdbc:postgresql://db.example.com:5432/mydb');
        assert.strictEqual(resolver.getValue('application.profiles[1]'), 'prod');
    });
    
    it('应该能检测循环依赖', () => {
        const propertiesContent = `
            app.name=\${app.title}
            app.title=\${app.label}
            app.label=\${app.name}
        `;
        
        const configItems = ConfigReader.parseConfig(propertiesContent, 'test.properties');
        const resolver = new ConfigValueResolver(configItems);
        
        assert.strictEqual(resolver.hasCircularDependencies(), true);
    });
    
    it('应该能解析所有配置项', () => {
        const propertiesContent = `
            db.host=localhost
            db.port=3306
            db.url=jdbc:mysql://\${db.host}:\${db.port}/mydb
            app.name=My Application
            app.version=1.0
        `;
        
        const configItems = ConfigReader.parseConfig(propertiesContent, 'test.properties');
        const resolver = new ConfigValueResolver(configItems);
        
        const allResolved = resolver.resolveAll();
        assert.strictEqual(allResolved.size, 5);
        assert.strictEqual(allResolved.get('db.url'), 'jdbc:mysql://localhost:3306/mydb');
    });
    
    it('应该能获取依赖关系', () => {
        const propertiesContent = `
            db.host=localhost
            db.port=3306
            db.url=jdbc:mysql://\${db.host}:\${db.port}/mydb
            app.label=\${app.name} \${app.version}
            app.name=My App
            app.version=1.0
        `;
        
        const configItems = ConfigReader.parseConfig(propertiesContent, 'test.properties');
        const resolver = new ConfigValueResolver(configItems);
        
        // db.url 依赖于 db.host 和 db.port
        const dependencies = resolver.getDependencies('db.url');
        assert.strictEqual(dependencies.length, 2);
        assert.ok(dependencies.includes('db.host'));
        assert.ok(dependencies.includes('db.port'));
        
        // app.name 被 app.label 依赖
        const dependents = resolver.getDependentKeys('app.name');
        assert.strictEqual(dependents.length, 1);
        assert.strictEqual(dependents[0], 'app.label');
    });
    
    it('应该能拓扑排序配置项', () => {
        const propertiesContent = `
            app.name=My App
            app.version=1.0
            app.fullname=\${app.name} v\${app.version}
            app.display=\${app.fullname}
        `;
        
        const configItems = ConfigReader.parseConfig(propertiesContent, 'test.properties');
        const resolver = new ConfigValueResolver(configItems);
        
        // 使用resolveAll()间接测试拓扑排序
        const allResolved = resolver.resolveAll();
        assert.strictEqual(allResolved.get('app.fullname'), 'My App v1.0');
        assert.strictEqual(allResolved.get('app.display'), 'My App v1.0');
    });
    
    it('应该能处理混合配置文件中的依赖', () => {
        // Properties文件
        const propertiesContent = `
            db.host=localhost
            db.port=5432
        `;
        
        // YAML文件
        const yamlContent = `
            database:
              url: jdbc:postgresql://\${db.host}:\${db.port}/mydb
        `;
        
        // 合并配置项
        const configItems = [
            ...ConfigReader.parseConfig(propertiesContent, 'test.properties'),
            ...ConfigReader.parseConfig(yamlContent, 'test.yml')
        ];
        
        const resolver = new ConfigValueResolver(configItems);
        
        // 跨文件类型解析占位符
        assert.strictEqual(
            resolver.getValue('database.url'), 
            'jdbc:postgresql://localhost:5432/mydb'
        );
    });
}); 