# 衣橱整理助手 - 部署指南

> 零代码部署，按步骤操作即可

---

## 第一步：注册 Supabase（免费云数据库）

1. 打开 https://supabase.com
2. 点击 **Start your project** → 用 GitHub 账号登录（或邮箱注册）
3. 点击 **New project**
4. 填写信息：
   - **Organization**: 选择或创建一个
   - **Project name**: `wardrobe`（随便取）
   - **Database password**: 设一个密码（记住它，虽然这里用不到）
   - **Region**: 选 **Northeast Asia (Tokyo)** 或离你最近的
5. 点击 **Create new project**，等待约 1 分钟

---

## 第二步：创建数据库表

1. 在 Supabase 控制台左侧，点击 **SQL Editor**
2. 点击 **New query**
3. 复制 `setup.sql` 文件中的全部内容，粘贴进去
4. 点击 **Run**（运行）
5. 看到 `数据库初始化完成 ✅` 就成功了

---

## 第三步：获取连接信息

1. 在 Supabase 控制台左侧，点击 **Settings**（齿轮图标）
2. 点击 **API**
3. 记下两个值：
   - **Project URL**: 类似 `https://xxxxxxx.supabase.co`
   - **anon public key**: 类似 `eyJhbGciOi...`（很长的一串）

---

## 第四步：部署网站

### 方法 A：Vercel（推荐，最简单）

1. 打开 https://vercel.com → 用 GitHub 登录
2. 把 `wardrobe-app` 整个文件夹上传到 GitHub：
   - 打开 https://github.com/new
   - 仓库名填 `wardrobe-app`
   - 点击 **create repository**
   - 点击 **uploading an existing file**
   - 把 `wardrobe-app` 文件夹里的所有文件拖进去
   - 点 **Commit**
3. 回到 Vercel → **New Project** → 导入你刚创建的仓库
4. 点 **Deploy**
5. 等待部署完成，会给你一个网址（如 `wardrobe-app.vercel.app`）

### 方法 B：Netlify（同样简单）

1. 打开 https://netlify.com → 注册登录
2. 把 `wardrobe-app` 文件夹直接拖到 Netlify 首页的部署区域
3. 等待部署完成

### 方法 C：GitHub Pages（免费）

1. 把代码上传到 GitHub（同方法 A 的步骤 2）
2. 进入仓库 → **Settings** → **Pages**
3. **Source** 选 `main` 分支，文件夹选 `/ (root)`
4. 点 **Save**，等待几分钟

---

## 第五步：手机上使用

1. 用手机浏览器打开部署后的网址
2. 首次打开会显示引导页，填入第三步获取的 **Project URL** 和 **Anon Key**
3. 点击 **开始使用**

### 添加到手机桌面（变成"App"）

**iPhone:**
1. 用 Safari 打开网址
2. 点底部分享按钮（方框+箭头）
3. 选择 **添加到主屏幕**

**Android:**
1. 用 Chrome 打开网址
2. 点右上角菜单（三个点）
3. 选择 **添加到主屏幕** 或 **安装应用**

---

## 使用方法

### 收纳衣服

1. 点底部 **+收纳** 按钮
2. 拍照或选择衣服图片
3. AI 会自动识别衣服类型和颜色
4. 输入名称，选择箱子
5. 点 **保存衣物**

### 找衣服

1. 点底部 **搜索**
2. 输入关键词（如 "羽绒服"、"黑色"、"冬季"）
3. 也可以按分类或季节筛选
4. 找到后可以看到：
   - 衣服在哪个箱子
   - 箱子放在哪里
   - 照片长什么样

### 管理箱子

1. 点底部 **箱子**
2. 可以创建、编辑、删除箱子
3. 设置季节和存放位置
4. 点进箱子可以看到里面所有衣服

---

## 常见问题

**Q: 数据安全吗？**
A: 数据存在 Supabase 云端，有备份。图片也存在云端，不会丢失。

**Q: 免费额度够用吗？**
A: Supabase 免费版提供：
- 500MB 数据库
- 1GB 文件存储
- 2GB 带宽/月
- 对于个人衣物管理完全够用

**Q: 可以多人共用吗？**
A: 可以。分享网址给家人，大家都能查看和添加。

**Q: AI 识别不准怎么办？**
A: AI 只是辅助，你可以在保存前手动修改分类、颜色和标签。

**Q: 离线能用吗？**
A: 首次需要联网。之后如果网络断开，已加载的数据仍可查看，但新增操作需要联网。

---

## 文件说明

| 文件 | 用途 |
|------|------|
| `index.html` | 主页面 |
| `style.css` | 样式文件 |
| `app.js` | 应用逻辑 |
| `sw.js` | Service Worker（离线缓存） |
| `manifest.json` | PWA 配置（添加到桌面） |
| `setup.sql` | 数据库初始化脚本 |
| `deploy.md` | 本部署指南 |
