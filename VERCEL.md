# Vercel 部署说明

这个仓库已经兼容 Vercel 动态部署。`NEXT_OUTPUT_EXPORT=true` 只给 GitHub Pages 静态导出使用；Vercel 构建时不要设置它，这样 `/api/tts` 会正常启用。

## 推荐项目

创建两个 Vercel Project：

- PC: Root Directory `apps/english-web`
- H5: Root Directory `apps/english-h5`

两个项目都使用：

- Production Branch: `nextjs-main`
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm build`

如果 Vercel 控制台提示 workspace 包找不到，开启项目设置里的 Include source files outside of the Root Directory；或者把 Root Directory 临时改为仓库根目录，并分别使用：

- PC Build Command: `pnpm --filter english-web build`
- H5 Build Command: `pnpm --filter english-h5 build`

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

## TTS 行为

- 双击单词按需请求 `/api/tts`
- 前端 IndexedDB 缓存 mp3，缓存命中不再请求 ElevenLabs
- 默认速度 `0.7`
- 没有配置 ElevenLabs key 时，会降级到浏览器自带朗读

## GitHub Pages 备用

`.github/workflows/nextjs-pages.yml` 已改为手动触发。新版推荐 Vercel，因为 `/api/tts` 需要服务端 API；GitHub Pages 只能作为静态备用发布。
