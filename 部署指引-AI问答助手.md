# AI 问答助手 — 部署到 www.surprise-night.com

## 方案概述

不需要额外买服务器！利用你现有的 Cloudflare Pages 部署，新增两个文件即可：

| 文件 | 作用 |
|------|------|
| `js/chat-widget.js` | 前端聊天组件（右下角悬浮气泡 + 对话窗口） |
| `functions/api/chat.js` | 后端 API（Cloudflare Edge Function，调用 MiniMax） |

另外所有 HTML 页面的 `</body>` 前加了一行 `<script src="js/chat-widget.js" defer></script>`。

---

## 部署步骤（共 3 步）

### 第 1 步：在 Cloudflare 添加 MiniMax API Key

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入你的 Pages 项目（surprise-night-web）
3. 点 **Settings** → **Environment variables**
4. 点 **Add variable**：
   - Variable name: `MINIMAX_API_KEY`
   - Value: 你的 MiniMax Token Plan Key（从 MiniMax 后台 → 接口密钥 页面复制）
5. 选择 **Production** 和 **Preview** 都添加
6. 保存

### 第 2 步：推送代码到 GitHub

在你电脑上，进入网站代码文件夹，然后：

```bash
# 如果还没 clone 过
git clone https://github.com/ananinalfe-ship-it/surprise-night-web.git
cd surprise-night-web

# 如果已经有，先拉最新
cd surprise-night-web
git pull
```

然后把我改好的这几个文件复制过去：

```bash
# 从我给你的 surprise-night-web-updated 文件夹复制新增/修改的文件
# 具体来说是这些文件：

# 新文件：
#   js/chat-widget.js
#   functions/api/chat.js

# 修改的文件（所有 .html 都加了一行 script 引用）：
#   index.html, about.html, collaborate.html, collaborators.html,
#   contact.html, works.html, 以及所有 project-*.html, en/index.html
```

提交并推送：

```bash
git add -A
git commit -m "feat: 添加 AI 问答助手（交易会用）"
git push
```

### 第 3 步：等待自动部署

推送到 GitHub 后，Cloudflare Pages 会自动检测到更新并部署。
通常 1-2 分钟完成。部署完成后打开 https://www.surprise-night.com/ 就能看到右下角的对话气泡了。

---

## 验证

1. 打开 https://www.surprise-night.com/
2. 看到右下角有一个橙色对话气泡（带红色角标）
3. 点击气泡，弹出对话窗口
4. 输入"你好"或点击快捷问题按钮
5. AI 以流式打字效果回答

如果点击后报错或无响应：
- 检查 Cloudflare 环境变量 `MINIMAX_API_KEY` 是否已设置
- 检查 Cloudflare Pages 部署日志有没有报错
- 确认 `functions/api/chat.js` 已正确推送

---

## 费用

**¥0 额外费用**

- Cloudflare Pages Functions: 免费额度每天 10 万次请求（远超交易会需求）
- MiniMax API: 用你现有订阅额度
- 不需要买服务器、不需要买域名

---

## 后续调整

### 修改知识库内容
编辑 `functions/api/chat.js` 文件顶部的 `KNOWLEDGE` 变量，改完 push 到 GitHub 即可自动更新。

### 修改 AI 人设/语气
编辑同一文件中的 `SYSTEM_PROMPT` 变量。

### 修改快捷问题按钮
编辑 `js/chat-widget.js` 中的 `QUICK` 数组。

### 关闭 AI 问答
从所有 HTML 文件中删除 `<script src="js/chat-widget.js" defer></script>` 这一行，push 即可。
