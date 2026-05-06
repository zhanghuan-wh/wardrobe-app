# 衣橱整理助手

拍照存衣，轻松找衣。一个基于 Supabase 的个人衣物收纳管理 PWA 应用。

## 功能

- 拍照收纳衣物，AI 自动识别衣物类型和颜色
- 按箱子管理衣物，支持季节和位置标记
- 关键词搜索，按分类/季节筛选
- 标记衣物状态（已收纳/已取出）
- 添加到手机桌面，像原生 App 一样使用

## 快速开始

### 1. 注册 Supabase

访问 [supabase.com](https://supabase.com) 免费注册，创建一个新项目。

### 2. 初始化数据库

在 Supabase 控制台左侧点击 **SQL Editor** → **New query**，粘贴 `setup.sql` 中的内容并运行。

### 3. 获取连接信息

在 Supabase 控制台点击 **Settings** → **API**，找到：
- **Project URL**：`https://xxxxx.supabase.co`
- **anon public key**：`eyJhbGciOi...`

### 4. 部署

将所有文件部署到任意静态托管服务：

- **GitHub Pages**：上传到 GitHub，Settings → Pages → 选 `main` 分支 `/ (root)`
- **Vercel**：导入 GitHub 仓库，自动部署
- **Netlify**：直接拖拽文件夹到首页部署

### 5. 使用

手机打开部署后的网址，填入 Project URL 和 Anon Key，点击"开始使用"即可。

## 添加到手机桌面

**iPhone**：Safari 打开 → 底部分享按钮 → 添加到主屏幕

**Android**：Chrome 打开 → 右上角菜单 → 添加到主屏幕

## 项目结构

```
index.html      主页面（含内联 JS）
style.css       样式
manifest.json   PWA 配置
lib/
  supabase.min.js   Supabase SDK v2.0.0
setup.sql       数据库初始化脚本
```

## 浏览器兼容

支持 iOS Safari 10+、Android Chrome 55+、Via、UC 等主流手机浏览器。

## 免费额度

Supabase 免费版提供：
- 500MB 数据库
- 1GB 文件存储
- 2GB 带宽/月

个人衣物管理完全够用。
