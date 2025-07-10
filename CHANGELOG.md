# Change Log

All notable changes to the "Java Properties Navigator" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2025-01-XX

### Added
- 📝 **Enhanced Scan Logging**: Added detailed logging for directory and file scanning operations
- 🔍 **Absolute Path Support**: Configuration now supports absolute paths in scanDirectories setting
- 📊 **Scan Progress Tracking**: Real-time logging of scanning progress and file counts

### Enhanced
- 🔧 **Configuration Flexibility**: Improved support for complex project structures with absolute paths
- 📋 **Debugging Support**: More detailed logging for troubleshooting scanning issues

### Example Configuration
```json
{
  "java-properties-navigator.scanDirectories": [
    "src/main/resources",
    "D:/myworkspace/demo/src/main/resources",
    "**/src/main/resources"
  ]
}
```

## [1.1.0] - 2025-06-02

### Added
- 🎯 **Enhanced Spring @Value Support**: Improved detection and navigation for Spring @Value annotations
- 🔍 **Advanced Property Detection**: Better parsing of complex property expressions within @Value annotations
- 📊 **Spring Boot Integration**: Enhanced support for Spring Boot configuration patterns
- ⚡ **Performance Improvements**: Optimized property indexing for large Spring projects

### Enhanced
- 💡 **Hover Information**: Enhanced hover details for @Value annotated properties
- 🎮 **Navigation Experience**: Smoother navigation from @Value annotations to property definitions
- 🔧 **Configuration Detection**: Better handling of nested property expressions

### Technical Improvements
- Improved regex patterns for @Value annotation detection
- Enhanced YAML/Properties parsing for complex Spring configurations
- Better error handling for malformed property expressions
- Optimized index rebuilding for Spring Boot projects

## [1.0.1] - 2025-05-30

### Fixed
- 🐛 Bug fixes and stability improvements
- 📝 Documentation updates and examples
- ⚙️ Configuration validation enhancements

## [1.0.0] - 2025-05-26

### Added
- 🎯 Smart property key detection in Java code
- 🚀 Instant navigation from Java strings to configuration files
- 💡 Hover information showing property values
- 🔧 Support for .properties, .yml, and .yaml files
- ⚙️ Configurable scanning directories and exclusion patterns
- 📊 Status bar integration with rebuild index functionality
- 🎮 Keyboard shortcuts for quick navigation (Alt+Shift+P / Cmd+Shift+P)
- 🔄 Automatic index rebuilding when configuration files change
- 🎨 Professional extension icon and branding
- 📚 Comprehensive documentation and usage examples

### Features
- **Multi-format Support**: Works with Properties, YAML, and YML files
- **Context-Aware Detection**: Recognizes property keys in variables, method parameters, and annotations
- **Multi-location Navigation**: Choose from multiple property definitions when they exist in different files
- **Real-time Updates**: Automatically refreshes index when files change
- **Performance Optimized**: Smart exclusion patterns for large projects
- **Environment Support**: Handle multiple environment configurations

### Technical Details
- Minimum VS Code version: 1.60.0
- Built with TypeScript for reliability and performance
- Comprehensive error handling and user feedback
- Extensible architecture for future enhancements

### Documentation
- Professional README with installation and usage guides
- Detailed configuration options and examples
- Troubleshooting section for common issues
- Contributing guidelines for developers

---

## Future Releases

### Planned Features
- 🔍 Find property usages (reverse navigation)
- 🌐 Multi-language support
- 📈 Usage analytics and insights
- 🔗 Integration with Spring Boot tools
- 🎨 Custom themes and appearance options

---

**Note**: This is the initial release of Java Properties Navigator. We welcome feedback and contributions from the community! 