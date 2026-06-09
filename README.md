# CNN 英语精读 · GitHub Actions 自动化

每天北京时间 07:00 自动抓取 CNN This Morning 文稿，
调用 DeepSeek API 生成精读学习内容，发布到 GitHub Pages。

## 功能

- 📝 **逐字稿对照** — 原文关键段落 + 中文翻译
- 📚 **12个高频词汇** — 考研六级以上，含音标/释义/原句
- 🔍 **5个长难句解析** — 结构标注 + 语法分析
- 🌐 **4个话题背景** — 中文背景知识 + 关键术语
- ✅ **6道测验题** — 词汇3道 + 理解3道，即时反馈
- 🔊 **美式男音发音** — 单词预生成音频，长难句按需朗读并本机缓存
- 🧠 **词汇复习状态** — 待复习 / 已掌握，本机保存学习进度

---

## 部署步骤（10分钟完成）

### 第一步：Fork 本仓库

点击右上角 **Fork** → 复制到你的账号下

### 第二步：添加 DeepSeek API Key

1. 注册 DeepSeek：https://platform.deepseek.com
   （新用户免费获得 500万 tokens）
2. 进入你 Fork 的仓库 →
   **Settings → Secrets and variables → Actions**
3. 点击 **New repository secret**
   - Name: `DEEPSEEK_API_KEY`
   - Value: 你的 API Key（sk-xxxxxxxx）

### 可选：添加 ElevenLabs 发音配置

如果希望每天自动给词汇生成美式男音发音，再添加两个 Actions secrets：

- `ELEVENLABS_API_KEY`：你的 ElevenLabs API Key
- `ELEVENLABS_VOICE_ID`：你在 ElevenLabs 里选择的 American male voice ID

可选添加仓库变量：

- `ELEVENLABS_MODEL_ID`：默认 `eleven_flash_v2_5`

不要把 ElevenLabs token 写进 `index.html`、JSON 或任何会提交到仓库的文件。
长难句朗读是浏览器按需请求：在页面右上角「发音设置」中填入 Key 和 Voice ID，
生成后的音频会缓存到当前浏览器的 IndexedDB，重复朗读不再消耗字符额度。

### 第三步：开启 GitHub Pages

1. 仓库 → **Settings → Pages**
2. Source 选择：**Deploy from a branch**
3. Branch 选择：**main** / **root**
4. 保存

### 第四步：手动触发首次生成

1. 仓库 → **Actions → 每日CNN精读自动生成**
2. 点击 **Run workflow** → Run workflow
3. 等待约 1-2 分钟
4. 刷新你的 GitHub Pages 地址即可看到学习内容

之后每天北京时间 07:00 自动运行，无需任何操作。

---

## 项目结构

```
├── .github/
│   └── workflows/
│       └── daily.yml          # 自动化任务（每天 07:00 北京时间）
├── src/
│   ├── generate.py            # 抓取文稿 + 调用 DeepSeek API
│   ├── build_index.py         # 重建 index.html
│   └── template.html          # 前端页面模板
├── output/
│   ├── 2026-06-05.json        # 每日生成的学习内容
│   ├── 2026-06-06.json
│   └── audio/                 # ElevenLabs 词汇发音 mp3
├── index.html                 # GitHub Pages 入口（自动生成）
└── .gitignore
```

---

## 费用估算

| 项目 | 费用 |
|---|---|
| GitHub Actions | 免费（每月2000分钟） |
| GitHub Pages | 免费 |
| DeepSeek V4 Flash | 每日约 $0.001（不到1分钱） |
| **每月合计** | **< $0.03** |

---

## 手动指定日期

在 Actions → Run workflow 的输入框填入日期（如 `2026-06-01`），
可生成任意历史日期的学习内容。
