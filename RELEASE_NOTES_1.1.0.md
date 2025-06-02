# Java Properties Navigator v1.1.0 Release Notes

🎉 **We're excited to announce the release of Java Properties Navigator v1.1.0!**

This release brings enhanced support for Spring @Value annotations, making it an even more powerful tool for Spring Boot developers.

## 🎯 What's New in v1.1.0

### Enhanced Spring @Value Annotation Support

The biggest highlight of this release is the comprehensive support for Spring @Value annotations:

```java
@Component
public class ApplicationConfig {
    
    // ✅ Navigate from @Value annotations to property definitions
    @Value("${spring.application.name}")
    private String applicationName;
    
    // ✅ Support for default values
    @Value("${server.port:8080}")
    private int serverPort;
    
    // ✅ Boolean properties with defaults
    @Value("${app.feature.enabled:false}")
    private boolean featureEnabled;
    
    // ✅ Complex property expressions
    @Value("${app.database.url}")
    private String databaseUrl;
}
```

### Key Improvements

#### 🔍 Advanced Property Detection
- **Better Parsing**: Enhanced regex patterns for detecting @Value expressions
- **Complex Expressions**: Support for `${property.name:defaultValue}` syntax
- **Nested References**: Improved handling of nested property expressions
- **Error Handling**: Better error handling for malformed property expressions

#### ⚡ Performance Enhancements
- **Optimized Indexing**: Faster property indexing for large Spring projects
- **Smart Caching**: Improved caching mechanisms for @Value annotations
- **Reduced Memory Usage**: More efficient memory management for complex projects

#### 🎮 Enhanced User Experience
- **Smoother Navigation**: Instant navigation from @Value annotations to definitions
- **Better Hover Info**: Enhanced hover information for @Value annotated properties
- **Spring Boot Integration**: Improved support for Spring Boot configuration patterns

## 📊 Technical Details

### Improved Detection Patterns

The extension now recognizes various @Value annotation patterns:

```java
// Basic property reference
@Value("${spring.application.name}")

// Property with default value
@Value("${server.port:8080}")

// Nested property expressions
@Value("${app.config.${environment}.database.url}")

// SpEL expressions (limited support)
@Value("#{systemProperties['user.home']}")
```

### Enhanced Configuration File Support

Better support for Spring Boot configuration patterns:

```yaml
# application.yml
spring:
  application:
    name: my-spring-app
  datasource:
    url: jdbc:mysql://localhost:3306/mydb
    
server:
  port: 8080
  
app:
  feature:
    enabled: true
  database:
    url: ${spring.datasource.url}
```

```properties
# application.properties
spring.application.name=my-spring-app
spring.datasource.url=jdbc:mysql://localhost:3306/mydb
server.port=8080
app.feature.enabled=true
app.database.url=${spring.datasource.url}
```

## 🚀 How to Use the New Features

### 1. Basic @Value Navigation

1. Place your cursor on any @Value annotation
2. Right-click and select "Jump to Property" or use `Alt+Shift+P`
3. Navigate instantly to the property definition

### 2. Hover Information

Simply hover over @Value annotations to see:
- Property key
- Current value (if available)
- Source file location
- Default value (if specified)

### 3. Multi-Environment Support

The extension now better handles Spring profiles and environment-specific configurations:

```java
@Value("${app.config.${spring.profiles.active}.endpoint}")
private String endpoint;
```

## 🔧 Configuration Updates

No configuration changes are required for existing users. The new @Value support works out of the box with your current settings.

### Recommended Settings for Spring Projects

For optimal performance with Spring Boot projects, consider these settings:

```json
{
  "java-properties-navigator.scanDirectories": [
    "src/main/resources",
    "src/main/resources/config",
    "**/src/main/resources"
  ],
  "java-properties-navigator.excludePatterns": [
    "**/target/**",
    "**/build/**",
    "**/node_modules/**",
    "**/.git/**"
  ],
  "java-properties-navigator.fileExtensions": [
    ".properties",
    ".yml",
    ".yaml"
  ]
}
```

## 🐛 Bug Fixes and Improvements

- Fixed edge cases in YAML property parsing
- Improved error handling for malformed configuration files
- Better support for multi-module Maven projects
- Enhanced performance for large Spring Boot applications
- Fixed issues with properties containing special characters

## 🔮 Coming Next

We're already working on exciting features for future releases:

- **v1.1.1**: Bug fixes for complex SpEL expressions
- **v1.2.0**: Reverse navigation (find all usages of a property)
- **v1.3.0**: Spring Profile-aware property resolution
- **v2.0.0**: Multi-language support and advanced Spring features

## 📝 Migration Guide

### From v1.0.x to v1.1.0

No migration steps are required! Simply update the extension and enjoy the new features.

### Compatibility

- **VS Code**: Requires version 1.60.0 or higher
- **Java Projects**: Works with any Java project structure
- **Spring Boot**: Enhanced support for Spring Boot 2.x and 3.x
- **Maven/Gradle**: Compatible with both build systems

## 🙏 Acknowledgments

Special thanks to our community for their feedback and feature requests that made this release possible:

- Enhanced @Value support was the #1 requested feature
- Performance improvements based on user feedback from large projects
- UI/UX improvements suggested by the developer community

## 📞 Support

If you encounter any issues or have questions about the new features:

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/li-peng/java-properties-navigator/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/li-peng/java-properties-navigator/discussions)
- 📧 **Direct Support**: Via VS Code Marketplace Q&A

## 🌟 Show Your Support

If you find Java Properties Navigator helpful:

- ⭐ Rate us on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=pengge.java-properties-navigator)
- 🗣️ Share with your fellow developers
- 🐙 Star our [GitHub repository](https://github.com/li-peng/java-properties-navigator)

---

**Happy coding with enhanced Spring @Value support!** 🚀

*The Java Properties Navigator Team* 