# 不背日语 🇯🇵

基于 SM-2 记忆曲线的日语单词学习 PWA 应用。

教材：**新版中日交流标准日本语 初级上册**（人民教育出版社 第三版）

---

## 功能

- 📖 **学习新词** - 卡片翻转 + 左右滑动交互，支持 TTS 日语发音
- 🔄 **智能复习** - SM-2 间隔重复算法，在遗忘临界点安排复习
- 📝 **四种测验** - 看日文选中文 / 看中文选日文 / 判对错 / 回想模式
- 📊 **学习统计** - 连续天数、每日学习/复习数量、学习时长
- 📱 **PWA 离线** - 添加到 iPhone 主屏幕，完全离线可用

## 部署到 GitHub Pages（免费）

### 1. 创建 GitHub 仓库

```bash
cd "不背日语"
git init
git add .
git commit -m "初始版本"
```

在 GitHub 创建新仓库，然后：

```bash
git remote add origin https://github.com/你的用户名/仓库名.git
git branch -M main
git push -u origin main
```

### 2. 启用 GitHub Pages

在 GitHub 仓库 → Settings → Pages：
- Source: `Deploy from a branch`
- Branch: `main` → `/ (root)` → Save

### 3. 访问

等待 1-2 分钟部署完成后，访问：
`https://你的用户名.github.io/仓库名/`

### 4. 在 iPhone 上使用

1. 用 **Safari** 打开上述网址
2. 点击底部 **分享按钮**（方框箭头）
3. 选择 **「添加到主屏幕」**
4. 点击 **「添加」**
5. 主屏幕会出现「不背日语」图标，像原生 App 一样打开

## 本地测试

```bash
npx serve .
```

然后用浏览器打开 `http://localhost:3000`

---

## 词汇数据

词库位于 `data/vocabulary.json`，包含 24 课约 1020 个单词（新标日初级上册全词汇）。如需修改或补充词汇，编辑该 JSON 文件即可（需重置 IndexedDB 数据或修改 version 号）。

格式：
```json
{
  "index": 1,
  "japanese": "初対面",
  "reading": "しょたいめん",
  "meaning": "初次见面",
  "partOfSpeech": "名詞",
  "exampleSentence": "初対面の時は、自己紹介をします。",
  "exampleReading": "しょたいめんのときは、じこしょうかいをします。",
  "exampleMeaning": "初次见面时要进行自我介绍。"
}
```

---

## 技术栈

- 纯 HTML/CSS/JS（无框架）
- Dexie.js（IndexedDB 封装）
- Service Worker（离线缓存）
- Web Speech API（日语 TTS）
- SM-2 间隔重复算法
