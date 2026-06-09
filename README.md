# CNN 英语精读 · Vercel 每日自动更新

每天北京时间 07:30 由 GitHub Actions 自动抓取 CNN This Morning 文稿，
调用 DeepSeek API 生成精读学习内容，写入 Next.js 静态数据，再推送到
`main` 分支触发 Vercel 生产部署。

## 功能

- 📝 **逐字稿对照** — 原文关键段落 + 中文翻译
- 📚 **12个高频词汇** — 考研六级以上，含音标/释义/原句
- 🔍 **5个长难句解析** — 结构标注 + 语法分析
- 🌐 **4个话题背景** — 中文背景知识 + 关键术语
- ✅ **6道测验题** — 词汇3道 + 理解3道，即时反馈
- 🔊 **美式男音发音** — 单词预生成音频，长难句按需朗读并本机缓存
- 🧠 **词汇复习状态** — 待复习 / 已掌握，本机保存学习进度

---

## 部署步骤

### 第一步：Fork 本仓库

点击右上角 **Fork** → 复制到你的账号下

### 第二步：添加 GitHub Actions Secrets

1. 注册 DeepSeek：https://platform.deepseek.com
   （新用户免费获得 500万 tokens）
2. 进入你 Fork 的仓库 →
   **Settings → Secrets and variables → Actions**
3. 点击 **New repository secret**
   - Name: `DEEPSEEK_API_KEY`
   - Value: 你的 API Key（sk-xxxxxxxx）

### 第三步：可选添加 ElevenLabs 发音配置

如果希望每天自动给词汇和长难句生成美式男音发音，添加这个 Actions secret：

- `ELEVENLABS_API_KEY`：你的 ElevenLabs API Key

可选添加仓库变量：

- `ELEVENLABS_MODEL_ID`：默认 `eleven_flash_v2_5`
- `ELEVENLABS_VOICE_ID`：默认使用 `Adam`（American male）`pNInz6obpgDQGcFmaJgB`

不要把 ElevenLabs token 写进 `index.html`、JSON 或任何会提交到仓库的文件。
页面不会要求学习者填写 Key 或 Voice ID；音频由 GitHub Actions 生成后作为静态 mp3 播放。

### 第四步：部署到 Vercel

推荐创建两个 Vercel Project：

- PC：Root Directory `apps/english-web`
- H5：Root Directory `apps/english-h5`

两个项目都使用：

- Production Branch：`main`
- Install Command：`pnpm install --frozen-lockfile`
- Build Command：`pnpm build`

如果 Vercel 控制台提示 workspace 包找不到，开启项目设置里的
Include source files outside of the Root Directory；或者参考
`VERCEL.md` 使用仓库根目录构建。

### 第五步：手动触发首次生成

1. 仓库 → **Actions → 每日CNN精读自动生成**
2. 点击 **Run workflow** → Run workflow
3. 等待约 1-2 分钟
4. 确认 workflow 向 `main` 推送了 `public/data/` 更新
5. 等待 Vercel 自动完成生产部署

之后每天北京时间 07:30 自动运行，无需任何操作。

> 注意：GitHub 定时 workflow 只会从仓库默认分支运行。当前默认分支是
> `main`，因此 `.github/workflows/daily.yml` 需要存在于 `main` 上。旧版
> `main` 内容会保留在 `old-main` 分支，日常开发和部署统一使用 `main`。

---

## 项目结构

```
├── .github/
│   └── workflows/
│       └── daily.yml          # 自动化任务（每天 07:30 北京时间）
├── apps/
│   ├── english-web/           # PC 端 Next.js 应用
│   └── english-h5/            # 移动端 Next.js 应用
├── packages/
│   ├── study-core/            # 数据读取、类型和共享逻辑
│   └── study-ui/              # 共享阅读组件
├── public/
│   ├── data/                  # Vercel/Next.js 读取的文章索引和详情 JSON
│   └── audio/                 # 预生成音频
├── src/
│   ├── generate.py            # 抓取文稿 + 调用 DeepSeek API
│   ├── build_index.py         # GitHub Pages 备用入口生成
│   └── template.html          # 前端页面模板
├── output/
│   ├── 2026-06-05.json        # 原始生成内容
│   └── audio/                 # ElevenLabs 词汇/长难句发音 mp3
└── VERCEL.md                  # Vercel 部署和自动更新说明
```

---

## 费用估算

| 项目 | 费用 |
|---|---|
| GitHub Actions | 免费（每月2000分钟） |
| Vercel | Hobby 项目通常免费 |
| DeepSeek V4 Flash | 每日约 $0.001（不到1分钱） |
| **每月合计** | **< $0.03** |

---

## 手动指定日期

在 Actions → Run workflow 的输入框填入日期（如 `2026-06-01`），
可生成任意历史日期的学习内容。
