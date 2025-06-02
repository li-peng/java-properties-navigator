# Java Properties Navigator

English | [中文](README_zh.md)

[![Version](https://img.shields.io/visual-studio-marketplace/v/pengge.java-properties-navigator)](https://marketplace.visualstudio.com/items?itemName=pengge.java-properties-navigator)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/pengge.java-properties-navigator)](https://marketplace.visualstudio.com/items?itemName=pengge.java-properties-navigator)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/pengge.java-properties-navigator)](https://marketplace.visualstudio.com/items?itemName=pengge.java-properties-navigator)

**Intelligent navigation between Java code and configuration files**

Java Properties Navigator is a powerful VS Code extension that provides seamless navigation between Java source code and configuration files. Jump instantly from property keys in your Java code to their definitions in `.properties`, `.yml`, and `.yaml` files.

## ✨ Features

### 🎯 Smart Property Detection
- **Automatic Recognition**: Intelligently detects property keys in Java strings
- **Context-Aware**: Works with variables, method parameters, and annotations
- **Multi-Format Support**: Supports `.properties`, `.yml`, and `.yaml` files

### 🚀 Instant Navigation
- **One-Click Jump**: Right-click on any property key to jump to its definition
- **Keyboard Shortcuts**: Quick navigation with `Alt+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
- **Multi-Location Support**: Choose from multiple definitions when properties exist in different files

### 💡 Enhanced Developer Experience
- **Hover Information**: See property values on hover without leaving your Java code
- **Status Bar Integration**: Quick access to rebuild index and extension status
- **Real-time Updates**: Automatically refreshes when configuration files change

### 🔧 Advanced Configuration
- **Flexible Scanning**: Customize which directories and file types to include
- **Smart Exclusions**: Exclude build directories, node_modules, and other irrelevant paths
- **Environment Support**: Handle multiple environment configurations (dev, prod, test)

## 📦 Installation

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Search for "Java Properties Navigator"
4. Click **Install**

Alternatively, install from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=pengge.java-properties-navigator).

## 🚀 Quick Start

1. **Open a Java project** with configuration files
2. **Place your cursor** on a property key string in Java code
3. **Right-click** and select "Jump to Property" or use `Alt+Shift+P`
4. **Navigate instantly** to the property definition

### Example Usage

```java
// Java code
 @Value("${spring.application.name}")
 private String applicationName;

 public void test(){
        String appName = getConfig("spring.application.name");
        String local =getConfig("local") ;
        System.out.println(appName);
        System.out.println(local);
 }
 
```

![Demo 1](docs/images/demo1.png)

![Demo 2](docs/images/demo2.png)

![Demo 2](docs/images/demo3.png)


The extension will help you navigate from `"server.port"` and `"welcome.message"` to their definitions in your configuration files.

## ⚙️ Configuration

### Extension Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `java-properties-navigator.scanDirectories` | Directories to scan for properties files | `["src/main/resources", "**/src/main/resources"]` |
| `java-properties-navigator.excludePatterns` | Patterns to exclude from scanning | `["**/target/**", "**/build/**", "**/node_modules/**"]` |
| `java-properties-navigator.fileExtensions` | File extensions to include | `[".properties", ".yml", ".yaml"]` |
| `java-properties-navigator.enableDiagnostics` | Enable diagnostics for undefined properties | `true` |
| `java-properties-navigator.showStatusBar` | Show status bar item | `true` |
| `java-properties-navigator.autoRebuildOnConfigChange` | Auto-rebuild index on config changes | `true` |

### Advanced Exclusion Patterns

Configure exclusion patterns to optimize scanning performance:

```json
{
  "java-properties-navigator.excludePatterns": [
    "**/target/**",
    "**/build/**", 
    "**/node_modules/**",
    "**/.git/**",
    "**/temp/**",
    "*.backup",
    "test-resources/**"
  ]
}
```

### Multi-Module Projects

For complex projects with multiple modules:

```json
{
  "java-properties-navigator.scanDirectories": [
    "*/src/main/resources",
    "*/*/src/main/resources", 
    "config/**",
    "shared/resources/**"
  ]
}
```

## 🎮 Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `Jump to Property` | Navigate to property definition | `Alt+Shift+P` (Win/Linux)<br>`Cmd+Shift+P` (macOS) |
| `Rebuild Properties Index` | Manually rebuild the properties index | - |
| `Find Property Usages` | Find where a property is used (coming soon) | - |

## 🔍 How It Works

1. **Indexing**: Scans your project for configuration files and builds an index
2. **Detection**: Analyzes Java strings to identify potential property keys  
3. **Navigation**: Provides instant navigation to property definitions
4. **Updates**: Monitors file changes and updates the index automatically

## 🛠️ Supported File Types

- **Properties Files**: `.properties`
- **YAML Files**: `.yml`, `.yaml`
- **Java Files**: `.java` (for property key detection)

## 📋 Requirements

- **VS Code**: Version 1.60.0 or higher
- **Java Project**: With configuration files in standard locations

## 🐛 Troubleshooting

### Common Issues

**Q: Properties not found?**
- Ensure your configuration files are in the scanned directories
- Check the `scanDirectories` setting
- Rebuild the index using the status bar button

**Q: Performance issues with large projects?**
- Add more exclusion patterns for irrelevant directories
- Limit scan directories to essential paths only

**Q: Navigation not working?**
- Verify the property key is a valid string literal
- Check that the property exists in your configuration files
- Try rebuilding the index

### Reset Extension

If you encounter persistent issues:
1. Open Command Palette (`Ctrl+Shift+P`)
2. Run "Rebuild Properties Index"
3. Restart VS Code if needed

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/java-tools/java-properties-navigator/blob/main/CONTRIBUTING.md) for details.

### Development Setup

1. Clone the repository
2. Run `npm install`
3. Open in VS Code
4. Press `F5` to start debugging

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Thanks to the VS Code team for the excellent extension API
- Inspired by the need for better Java development tools
- Built with ❤️ for the Java community

---

**Enjoy seamless navigation between your Java code and configuration files!** 🚀 