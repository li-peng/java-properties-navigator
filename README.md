# Java Properties Definition

一个VSCode扩展，用于在Java代码和属性文件之间提供智能跳转功能。当您在Java代码中使用字符串时，此扩展可以帮助您快速定位到对应的属性文件定义。

## 功能特性

### 1. 智能识别配置键

自动检测Java代码中的字符串是否为配置键，支持多种场景：

- 变量定义： `String s = "key";`
- 方法参数： `a.getMsg("key")`
- 注解中的字符串： `@MyAnnotation("key")`

### 2. 配置文件索引构建

- 自动扫描项目内所有 .properties、.yaml、.yml 文件并建立键值映射
- 支持多环境配置（如 application-dev.properties 和 application-prod.properties）
- 记录键的物理位置信息（文件路径 + 行号）

### 3. 跳转交互功能

- 在字符串上点击右键菜单项 "Jump to Property" 跳转到属性定义
- 支持快捷键跳转：Windows/Linux (Alt+Shift+P)，macOS (Cmd+Shift+P)
- 如果属性存在于多个配置文件中，会显示选择对话框

### 4. 高级特性

- 状态栏指示器，可快速重建索引
- 配置文件修改后自动刷新索引

## 使用指南

1. 打开包含Java代码和属性文件的项目
2. 在Java文件中，将光标放置在字符串上或选中一个字符串
3. 右键单击并从上下文菜单中选择 "Jump to Property"，或使用快捷键
4. 插件将打开包含该属性的配置文件并高亮相关行

## 设置选项

此扩展提供以下设置：

- `java-properties-definition.scanDirectories`: 要扫描的目录列表 (默认: ["src/main/resources", "**/src/main/resources"])
- `java-properties-definition.excludePatterns`: 排除的文件模式 (默认: ["**/target/**", "**/build/**", "**/node_modules/**"])
- `java-properties-definition.fileExtensions`: 要包含的文件扩展名 (默认: [".properties", ".yml", ".yaml"])
- `java-properties-definition.enableDiagnostics`: 启用未定义键的诊断提示 (默认: true)
- `java-properties-definition.showStatusBar`: 显示状态栏项 (默认: true)
- `java-properties-definition.autoRebuildOnConfigChange`: 配置文件变更时自动重建索引 (默认: true)

### 排除模式详细说明

`excludePatterns` 支持多种匹配方式：

#### 1. 相对路径精确匹配
```json
"java-properties-definition.excludePatterns": [
    "common/src/main/resources/messages_en_US.properties"
]
```

#### 2. 文件名匹配
```json
"java-properties-definition.excludePatterns": [
    "messages_en_US.properties",
    "temp.properties"
]
```

#### 3. 目录通配符匹配
```json
"java-properties-definition.excludePatterns": [
    "**/target/**",
    "**/build/**",
    "**/temp/**"
]
```

#### 4. 文件扩展名匹配
```json
"java-properties-definition.excludePatterns": [
    "*.bak",
    "*.tmp"
]
```

#### 5. 路径包含匹配
```json
"java-properties-definition.excludePatterns": [
    "test",
    "backup",
    "cache"
]
```

#### 完整配置示例
```json
{
    "java-properties-definition.scanDirectories": [
        "src/main/resources",
        "**/src/main/resources",
        "config"
    ],
    "java-properties-definition.excludePatterns": [
        "**/target/**",
        "**/build/**",
        "**/node_modules/**",
        "common/src/main/resources/messages_en_US.properties",
        "*.bak",
        "temp"
    ],
    "java-properties-definition.fileExtensions": [
        ".properties",
        ".yml",
        ".yaml"
    ]
}
```

## 命令

- `java-properties-definition.jumpToProperty`: 跳转到属性定义
- `java-properties-definition.rebuildIndex`: 手动重建索引
- `java-properties-definition.findUsages`: 查找属性使用位置（将在未来版本实现）

## 需求

- VS Code 1.60.0 或更高版本

## 注意事项

- 首次加载大型项目时，索引构建可能需要一些时间
- 对于非常复杂的YAML结构，可能需要手动跳转到正确位置

## 反馈与贡献

如果您有任何问题、建议或反馈，请提交GitHub Issue。 