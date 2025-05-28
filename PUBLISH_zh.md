# 发布 Java Properties Navigator 到 VS Code 应用商店

[English](PUBLISH.md) | 中文

本文档概述了将扩展发布到 Visual Studio Code 应用商店的步骤。

## 发布前检查清单

### ✅ 已完成项目

- [x] **扩展重命名** 从 "Java Properties Definition" 改为 "Java Properties Navigator"
- [x] **专业 README** 包含全面文档
- [x] **MIT 许可证** 已添加
- [x] **CHANGELOG.md** 创建版本历史
- [x] **CONTRIBUTING.md** 包含开发指南
- [x] **Package.json** 更新应用商店元数据
- [x] **画廊横幅** 配置专业颜色
- [x] **关键词** 添加以提高可发现性
- [x] **分类** 正确设置
- [x] **仓库 URL** 已配置
- [x] **扩展编译** 成功
- [x] **VSIX 包** 创建成功

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
3. 创建发布者 ID：`Li-lianjie`
4. 验证邮箱并完成个人资料

### 2. 安装 VSCE（如果尚未安装）

```bash
npm install -g @vscode/vsce
```

### 3. 登录发布者账户

```bash
vsce login java-tools
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

### 当前版本：1.0.0

### 未来版本

- **1.0.1**：错误修复和小改进
- **1.1.0**：新功能（反向导航等）
- **1.2.0**：增强 YAML 支持
- **2.0.0**：主要功能添加

## 支持和维护

### 问题跟踪

- GitHub Issues 用于错误报告
- 通过 GitHub 提交功能请求
- 通过应用商店提供问答支持

### 更新计划

- 错误修复：根据需要
- 小功能：每月
- 主要功能：每季度

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