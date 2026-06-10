# Vercel 部署说明

这个仓库已经兼容 Vercel 动态部署。`NEXT_OUTPUT_EXPORT=true` 只给 GitHub Pages 静态导出使用；Vercel 构建时不要设置它，这样 `/api/tts` 会正常启用。

## 推荐项目

创建两个 Vercel Project：

- PC: Root Directory `apps/english-web`
- H5: Root Directory `apps/english-h5`

两个项目都使用：

- Production Branch: `main`
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm build`

如果 Vercel 控制台提示 workspace 包找不到，开启项目设置里的 Include source files outside of the Root Directory；或者把 Root Directory 临时改为仓库根目录，并分别使用：

- PC Build Command: `pnpm --filter english-web build`
- H5 Build Command: `pnpm --filter english-h5 build`

当前线上项目是通过 Vercel CLI / prebuilt 方式创建和部署的，Vercel API 返回的 Git link 为空，所以它们还没有真正连接到 GitHub 仓库。未连接 GitHub 时，Production Branch 设置不会自动监听 `main` 推送；推荐先使用下面的 GitHub Actions 主动部署链路。

## 环境变量

两个项目都配置：

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`，可选，默认 `pNInz6obpgDQGcFmaJgB`
- `ELEVENLABS_MODEL_ID`，可选，默认 `eleven_flash_v2_5`

设备跳转：

- PC 项目可设置 `NEXT_PUBLIC_H5_ORIGIN`
- H5 项目可设置 `NEXT_PUBLIC_WEB_ORIGIN`

如果想保持一个域名，在 PC 项目里把主域名绑定到 PC，然后把 `/h5/:path*` rewrite 到 H5 项目的生产域名；此时 PC 项目可以不设置 `NEXT_PUBLIC_H5_ORIGIN`，移动端会跳到同域名 `/h5/...`。

如果暂时不做同域名 rewrite，也可以直接：

- PC 设置 `NEXT_PUBLIC_H5_ORIGIN=https://你的-h5-项目.vercel.app`
- H5 设置 `NEXT_PUBLIC_WEB_ORIGIN=https://你的-pc-项目.vercel.app`

## 每日文章自动更新

推荐链路：

1. GitHub Actions 每天北京时间 07:30 运行 `.github/workflows/daily.yml`
2. workflow checkout `main`
3. `python src/generate.py` 抓取 CNN This Morning 文稿并生成 `output/YYYY-MM-DD.json`
4. `pnpm prepare:data` 把 `output/` 转成 Next.js 读取的 `public/data/`，并同步 `public/audio/`
5. `pnpm validate:data` 校验生成数据
6. workflow 提交 `output/`、`public/data/`、`public/audio/` 到 `main`
7. workflow 使用 Vercel CLI 分别把 PC 和 H5 部署到生产环境

需要确认：

- GitHub 仓库默认分支仍为 `main`
- `.github/workflows/daily.yml` 存在于默认分支 `main`
- GitHub Actions secret 已配置 `DEEPSEEK_API_KEY`
- 如需预生成发音，GitHub Actions secret 配置 `ELEVENLABS_API_KEY`
- GitHub Actions secret 已配置 `VERCEL_AUTH_JSON_B64` 或正式的 `VERCEL_TOKEN`
- `github-actions[bot]` 允许向 `main` 推送

Vercel 自动部署使用这些项目 ID，已经在 workflow 里写了默认值：

- `VERCEL_ORG_ID`: `team_1bo68GKRsXoT2DiPBWHiD9NK`
- `VERCEL_WEB_PROJECT_ID`: `prj_3cUbNdsi38fSX0bPXoZ5LZ8jOW6B`
- `VERCEL_H5_PROJECT_ID`: `prj_WHlzXhnhB5UjiJOoOOoS9yhyEq0T`

如果后面换了 Vercel 项目，可以在 GitHub 仓库 Variables 里覆盖这三个值。

当前 workflow 会优先使用 `VERCEL_AUTH_JSON_B64` 恢复 Vercel CLI 登录态；没有这个 secret 时，才使用 `VERCEL_TOKEN`。本机 Vercel CLI 的短期 token 不能直接当 CI 的 `--token` 使用，会出现 `The token provided via --token argument is not valid`。后面如果在 Vercel Account Tokens 页面创建了正式 Access Token，可以更新 `VERCEL_TOKEN` 并删除 `VERCEL_AUTH_JSON_B64`。

如果想改成 Vercel 原生 Git 自动部署，需要先在 Vercel 账号里添加 GitHub Login Connection，然后把两个项目分别连接到 `xicha356/cnn-study-daliy`。连接完成后，在 Vercel Project Settings -> Environments -> Production -> Branch Tracking 里把 Production Branch 设为 `main`。

旧版 `main` 内容会保留在 `old-main` 分支；日常开发、自动更新和 Vercel 部署
统一使用 `main`。

周末没有新的 CNN This Morning 文稿时，生成脚本会自动回退到最近工作日，
网站继续展示最新可用文章，不强行创建周末日期。

## TTS 行为

- 双击单词按需请求 `/api/tts`
- 前端 IndexedDB 缓存 mp3，缓存命中不再请求 ElevenLabs
- 默认速度 `0.7`
- 没有配置 ElevenLabs key 时，会降级到浏览器自带朗读

## GitHub Pages 备用

`.github/workflows/nextjs-pages.yml` 已改为手动触发。新版推荐 Vercel，因为 `/api/tts` 需要服务端 API；GitHub Pages 只能作为静态备用发布。

## CLI 部署

仓库根目录提供了两个 Vercel 本地配置：

- PC: `vercel.web.json`
- H5: `vercel.h5.json`

CLI prebuilt 部署命令：

```bash
vercel link --project english-web --yes
vercel pull --yes --environment production -A vercel.web.json
vercel build --prod --yes -A vercel.web.json
vercel deploy --prebuilt --prod --yes -A vercel.web.json

vercel link --project english-h5 --yes
vercel pull --yes --environment production -A vercel.h5.json
vercel build --prod --yes -A vercel.h5.json
vercel deploy --prebuilt --prod --yes -A vercel.h5.json
```

两个 app 的 build script 使用 `next build --webpack`，用于避开 Next 16 Turbopack 在 monorepo 子应用里的 root 推断问题。
