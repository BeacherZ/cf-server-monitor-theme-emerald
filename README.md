<h1 align="center">Emerald Theme for CF Server Monitor</h1>

<p align="center">基于 Vue 3 + Vite + reka-ui + Tailwind CSS v4 构建的 CF Server Monitor主题</p>

![preview](/docs/preview.png)

---

## 本仓库怎么用（小白版）

### 1. 探针后台要填的地址

```
https://github.com/BeacherZ/cf-server-monitor-theme-emerald/tree/dd59b9d6e330df665910b8d0858093f62d030e68
```

填写位置：CF Server Monitor 后台 → 设置 → 主题 → 「自定义主题 URL」→ 粘贴 → 预览 → 启用自定义 → 保存。

地址也备份在根目录 [`CUSTOM-THEME-URL.txt`](./CUSTOM-THEME-URL.txt)（以后忘了就打开这个文件）。

### 2. 只有两个分支，各管一件事

| 分支 | 内容 | 谁读它 |
| --- | --- | --- |
| `main` | 源码（`src/` 里的 `.vue` / `.ts`） | 只给人看和改 |
| `build` | 编译产物：`index.html` + `assets/` | **探针只读这个** |

所以「构建产物」= `build` 分支的根目录，就是 <https://github.com/BeacherZ/cf-server-monitor-theme-emerald/tree/build> 这个页面里的 `index.html` 和 `assets/`。仓库里的 `dist/` 只是本地临时目录，已被 git 忽略，不用管。

### 3. 后台地址为什么是一串乱码

那串是 `build` 分支某一次提交的 commit id（这里对应短号 `dd59b9d`）。用固定 commit 而不是写 `build` 分支名，是为了锁版本 —— 重新构建不会悄悄替换掉你在用的主题。

### 4. 改完代码后如何重新发布

```bash
npm install          # 首次需要，装依赖
npm run build         # 编译，产物在 dist/
bash scripts/publish-build.sh   # 推到 build 分支，并打印新地址
```

脚本最后几行会打印形如 `https://github.com/BeacherZ/cf-server-monitor-theme-emerald/tree/<新commit>` 的地址，把它复制到后台，并顺手更新 `CUSTOM-THEME-URL.txt` 里那行。只想先看看不推送，加环境变量 `DRY_RUN=1`。

### 5. 本仓库相对上游改了什么

- 改动 1：`src/components/NodeEarthGlobe.vue` 移除了自转地球上的蓝色连线弧（cobe 的 `arcs`），其余地球表现与上游 v1.2.10 一致。
- 改动 2：`src/components/Footer.vue` 的「Theme by Emerald」署名链接改为指向本仓库（官方 `Powered by CF Server Monitor` 署名与链接按规范保留）。
- 改动 3：`src/components/VisitorInfoCard.vue` 访客信息条改为自动隐藏 —— 数据就绪后直接显示（无淡入），展示 8 秒后 1 秒淡出并从页面移除；鼠标悬停或点开详情时暂停计时，离开后重新计 8 秒。
- 想还原某处：`git revert` 对应提交后重新按第 4 步发布。

---

## 功能


- 卡片和表格两种节点视图
- 多分组、搜索、地区旗帜和操作系统图标
- CPU、内存、磁盘、流量、网络和 Ping 历史图表
- 世界地图节点分布，支持在线/离线散点与计数
- `CF Server Monitor` WebSocket 实时更新与断线重连
- 单后端 Turnstile 验证
- 深色、浅色和跟随系统主题
- 遵循后端 `sysConfig.show_price` 开关控制价格信息的可见性

## 价格信息可见性（`sysConfig.show_price`）

主题读取 `/api/servers` 响应中的 `sysConfig.show_price`，按官方语义控制价格类信息的展示：

| `show_price`         | 访客（未登录） | 管理员（已登录） |
| -------------------- | -------------- | ---------------- |
| `true`               | 可见           | 可见             |
| `false`              | **不可见**     | 可见             |
| 字段缺失（旧版后端） | 可见           | 可见             |

关闭时访客看不到以下内容，其余指标不受影响：

- 节点卡片与列表的「费用」行中的价格（**剩余时间仍保留**，例如 `+120 天`）
- 首页汇总卡片中的「剩余价值」卡片，以及其展开面板里的总价值 / 月均支出 / 今日汇率
- 节点详情页的「节点价格」「月均支出」「剩余价值」卡片（**剩余时间卡片保留**）

管理员身份来自 `/api/config` 返回的 `authorization`（即请求携带了有效 JWT），因此从后台登录后访问主题页依然可以看到价格信息。

## 主题设置

拷贝&调整下方参数，将其填入到 **CF Server Monitor** 后端设置页面的 `主题自定义配置 JSON` 中并保存。

```
{
  "configuration": [
    {
      "key": "defaultThemeMode",
      "value": "auto",
      "options": "auto,light,dark",
      "description": "访客的默认主题模式：auto 跟随系统，light 浅色，dark 深色（用户手动切换后以用户选择为准）"
    },
    {
      "key": "defaultViewMode",
      "value": "card",
      "options": "card,list",
      "description": "节点列表的默认显示模式"
    },
    {
      "key": "alertEnabled",
      "value": "false",
      "options": "",
      "description": "在首页显示自定义公告"
    },
    {
      "key": "alertTitle",
      "value": "",
      "options": "",
      "description": "公告的标题内容"
    },
    {
      "key": "alertContent",
      "value": "",
      "options": "",
      "description": "公告的详细内容（支持简单 Markdown 格式）"
    },
    {
      "key": "earthViewMode",
      "value": "maps",
      "options": "earth,earth-stop,maps,cards,hide",
      "description": "earth：自转地球；earth-stop：静止地球；maps：点状地图；cards：仅显示头部卡片；hide：隐藏整个头部"
    },
    {
      "key": "visitorInfoCardEnabled",
      "value": "true",
      "options": "",
      "description": "显示访客来源、设备和浏览器信息卡片"
    },
    {
      "key": "hideAdminEntryWhenLoggedOut",
      "value": "false",
      "options": "",
      "description": "隐藏顶部管理后台按钮"
    },
    {
      "key": "disablePageAnimation",
      "value": "false",
      "options": "",
      "description": "减少页面过渡动画效果，提升访问速度和响应性"
    },
    {
      "key": "offlineNodesLast",
      "value": "false",
      "options": "",
      "description": "开启后离线节点默认显示到所有节点最后"
    },
    {
      "key": "icpEnabled",
      "value": "false",
      "options": "",
      "description": "在页脚显示网站备案号"
    },
    {
      "key": "icpNumber",
      "value": "",
      "options": "",
      "description": "网站备案号（如：京ICP备12345678号）"
    },
    {
      "key": "icpUrl",
      "value": "https://beian.miit.gov.cn/",
      "options": "",
      "description": "点击备案号跳转的链接地址"
    },
    {
      "key": "policeEnabled",
      "value": "false",
      "options": "",
      "description": "在页脚显示公安备案信息"
    },
    {
      "key": "policeNumber",
      "value": "",
      "options": "",
      "description": "公安备案号（如：京公网安备 11010502000000号）"
    },
    {
      "key": "policeUrl",
      "value": "",
      "options": "",
      "description": "点击公安备案号跳转的链接地址，留空则不跳转"
    },
    {
      "key": "backgroundEnabled",
      "value": "false",
      "options": "",
      "description": "启用后可设置自定义图片或视频作为页面背景"
    },
    {
      "key": "backgroundType",
      "value": "image",
      "options": "image,video",
      "description": "选择背景类型：图片或视频"
    },
    {
      "key": "lightBackgroundUrl",
      "value": "",
      "options": "",
      "description": "亮色模式下的背景图片/视频 URL"
    },
    {
      "key": "darkBackgroundUrl",
      "value": "",
      "options": "",
      "description": "暗色模式下的背景图片/视频 URL"
    },
    {
      "key": "backgroundBlur",
      "value": "0",
      "options": "",
      "description": "背景的高斯模糊半径（单位：px），0 表示不模糊"
    },
    {
      "key": "backgroundOverlay",
      "value": "0",
      "options": "",
      "description": "背景遮罩强度（-100 到 100）：负数降低背景透明度，0 表示关闭，正数为黑色遮罩，绝对值越大效果越明显"
    }
  ]
}
```

## 开发

```bash
bun install
cp .env.example .env
bun run dev
```

`.env` 示例：

```dotenv
API_BASE=https://monitor.example.com
BASE_PATH=./
```

`API_BASE` 支持用英文逗号配置多个 Worker。开发模式会把同源 `/api` 请求代理到单个 `API_BASE`，避免本地 CORS 限制。

生产环境采用同源部署：由 Web 服务器（如 Nginx）托管 `dist/` 静态文件，并将 `/api`、`/flags`、`/os-icons` 和 `/api/ws` 反向代理到 CF Server Monitor Worker。

## 构建

```bash
bun run lint
bun run build
bun run preview
```

自定义域名和其他静态平台通常保留 `BASE_PATH=./` 即可。

### 主题开发文档：

- [CF-Server-Monitor项目地址](https://github.com/huilang-me/CF-Server-Monitor)
- [开发指南](https://github.com/huilang-me/CF-Server-Monitor/blob/main/develop.md)
- [前端API文档](https://github.com/huilang-me/CF-Server-Monitor/blob/main/theme-develop.md)
- [后端API文档](https://github.com/huilang-me/CF-Server-Monitor/blob/main/API.md)

## 运行时约定

- 路由：`/#/`、`/#/server/:id`
- 后端管理入口：`${origin}#/admin`
- 后端地址为当前页面 origin（同源部署）
- 匿名用户最多可查询近 24 小时的历史数据；登录且开启长历史时最多可查询近 7 天

## 致谢

- [Tokinx/komari-theme-emerald](https://github.com/Tokinx/komari-theme-emerald)
- [huilang-me/CF-Server-Monitor](https://github.com/huilang-me/CF-Server-Monitor)
- [huilang-me/CF-Server-Monitor-theme](https://github.com/huilang-me/CF-Server-Monitor-theme)

## License

[MIT](./LICENSE)
