# 发布 Java Properties Navigator 到 VS Code 应用商店

[English](PUBLISH.md) | 中文

本文档概述了将扩展发布到 Visual Studio Code 应用商店的步骤。

## 版本 1.1.0 发布说明

### 🎯 新功能
- **增强的Spring @Value支持**：改进Spring @Value注解的检测和导航
- **高级属性检测**：更好地解析@Value注解中的复杂属性表达式
- **Spring Boot集成**：增强对Spring Boot配置模式的支持
- **性能改进**：优化大型Spring项目的属性索引

### 🔧 技术增强
- 改进@Value注解检测的正则表达式模式
- 增强复杂Spring配置的YAML/Properties解析
- 更好地处理格式错误的属性表达式错误
- 优化Spring Boot项目的索引重建

## 发布前检查清单

### ✅ v1.1.0已完成项目

- [x] **版本更新** package.json中更新到1.1.0
- [x] **描述增强** 添加Spring @Value支持说明
- [x] **CHANGELOG.md** 更新v1.1.0功能
- [x] **README.md** 更新Spring @Value示例和功能
- [x] **README_zh.md** 更新中文文档
- [x] **扩展功能** 增强Spring注解支持
- [x] **画廊横幅** 配置专业颜色
- [x] **关键词** 包含Spring相关术语以提高可发现性

### 更新的发现性关键词

`package.json` 中的当前关键词：
- java
- properties
- spring
- configuration
- navigation
- yaml
- yml
- jump to definition
- spring boot
- config
- **@Value** (新增)
- **annotation** (新增)
- **dependency injection** (新增)

### 🔄 待处理项目

- [ ] **扩展图标** (128x128 PNG)
  - 创建或获取专业图标
  - 保存为 `./icons/icon.png`
  - 更新 `package.json` 包含图标路径
- [ ] **发布者账户** 在 VS Code 应用商店设置
- [ ] **测试** 在真实 Java 项目中
- [ ] **截图** 用于应用商店列表
- [ ] **演示 GIF/视频** 展示功能

## 发布步骤

### 1. 创建发布者账户

1. 访问 [Visual Studio Code 应用商店](https://marketplace.visualstudio.com/manage)
2. 使用 Microsoft 账户登录
3. 创建发布者 ID：`pengge`
4. 验证邮箱并完成个人资料

### 2. 安装 VSCE（如果尚未安装）

```bash
npm install -g @vscode/vsce
```

### 3. 登录发布者账户

```bash
vsce login pengge
```

### 4. 添加扩展图标

1. 创建 128x128 PNG 图标
2. 保存为 `./icons/icon.png`
3. 更新 `package.json`：
   ```json
   "icon": "./icons/icon.png"
   ```

### 5. 最终测试

```bash
# 编译 TypeScript
npm run compile

# 运行测试
npm test

# 打包扩展
vsce package
```

### 6. 发布扩展

```bash
# 发布到应用商店
vsce publish
```

## 发布后任务

### 1. 更新仓库

- [ ] 创建 GitHub 发布版本并附带 VSIX 文件
- [ ] 更新 README 添加应用商店徽章
- [ ] 添加安装说明

### 2. 营销

- [ ] 在社交媒体分享
- [ ] 在 Java 开发者社区发布
- [ ] 撰写关于扩展的博客文章

### 3. 监控

- [ ] 监控应用商店评价
- [ ] 跟踪下载统计
- [ ] 回应用户反馈

## 应用商店优化

### 提高发现性的关键词

`package.json` 中的当前关键词：
- java
- properties
- spring
- configuration
- navigation
- yaml
- yml
- jump to definition
- spring boot
- config

### 分类

- Programming Languages
- Other

### 画廊横幅

- 颜色：`#1e3a8a`（专业蓝色）
- 主题：`dark`

## 版本管理

### 当前版本：1.1.0

### 版本历史
- **1.0.0**：基本属性导航的初始版本
- **1.0.1**：错误修复和稳定性改进
- **1.1.0**：增强Spring @Value注解支持

### 未来版本

- **1.1.1**：Spring @Value解析边缘情况的错误修复
- **1.2.0**：反向导航（查找属性使用）
- **1.3.0**：Spring Profile感知导航
- **2.0.0**：多语言支持和高级Spring功能

## v1.1.0发布步骤

### 1. 预发布检查

```bash
# 验证版本一致性
grep -r "1.1.0" package.json CHANGELOG.md

# 编译和测试
npm run compile
npm test

# 打包扩展
vsce package
```

### 2. 更新应用商店描述

确保应用商店列表突出显示：
- ✅ Spring @Value注解支持
- ✅ 复杂属性表达式解析
- ✅ Spring Boot配置集成
- ✅ 增强的开发者生产力

### 3. 发布到应用商店

```bash
# 登录发布者账户
vsce login pengge

# 发布新版本
vsce publish 1.1.0
```

### 4. 发布后任务

- [ ] 创建GitHub v1.1.0发布版本并附带VSIX文件
- [ ] 更新应用商店截图包含@Value示例
- [ ] 在Spring社区分享v1.1.0公告
- [ ] 监控新功能的用户反馈

## v1.1.0营销

### 关键信息
- "现在增强支持Spring @Value！"
- "从@Value注解导航到属性定义"
- "更好的Spring Boot开发体验"
- "提高Spring开发者的生产力"

### 目标受众
- Spring Boot开发者
- Java企业开发者
- 微服务架构师
- 配置管理团队

### 社区推广
- [ ] 在Spring Boot subreddit发布
- [ ] 在Java开发者Discord/Slack频道分享
- [ ] 发推介绍新的@Value支持功能
- [ ] 撰写博客："Java Properties Navigator v1.1.0改进Spring开发体验"

## v1.1.0成功指标

### 目标（第一个月）
- [ ] 500+新下载量
- [ ] Spring @Value功能的正面反馈
- [ ] 未报告关键错误
- [ ] 保持4.5+星级评分

### 关键绩效指标
- 下载增长率
- 用户留存率
- 功能使用分析（如果可用）
- 社区反馈情绪

## 支持和维护

### 需要监控的已知问题
- 带有SpEL的复杂@Value表达式
- 嵌套属性引用的边缘情况
- 超大型Spring项目的性能

### 社区支持
- GitHub Issues用于错误报告
- 通过GitHub提交功能请求
- 通过应用商店提供问答支持
- 积极监控Spring社区反馈

---

**准备发布v1.1.0！** 🚀

扩展现在提供全面的Spring @Value注解支持，使其成为Spring Boot开发者的必备工具。

## 应用商店指南合规性

- [x] 扩展遵循 VS Code 扩展指南
- [x] 无商标侵权
- [x] 适当的内容评级
- [x] 清晰的功能描述
- [x] 专业展示

## 成功指标

### 目标（前 6 个月）

- [ ] 1,000+ 下载量
- [ ] 4.5+ 星级评分
- [ ] 10+ 正面评价
- [ ] 活跃社区参与

### 长期目标（1 年）

- [ ] 10,000+ 下载量
- [ ] 在 VS Code 扩展推荐中被推荐
- [ ] 与流行 Java 框架集成
- [ ] 社区贡献

---

**准备发布！** 🚀

添加图标后，扩展将准备好发布到应用商店。 