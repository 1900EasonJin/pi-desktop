# PiDeck 产品命名调整清单

## 需要调整的原生页面与入口

- 启动页：`src/renderer/index.html` 中的启动品牌文字需要从 `pi desktop` 改为 `PiDeck`。
- 打包应用名称：`package.json` 的 `build.productName` 需要改为 `PiDeck`，影响安装包、窗口应用名和系统应用列表展示。
- Web 服务页：`src/main/web/WebServiceManager.ts` 的健康检查服务名、页面标题和页面主标题需要改为 `PiDeck`。
- 应用内反馈模板：`src/renderer/src/i18n.ts` 中反馈报告里的产品字段需要改为 `PiDeck`。
- 侧栏/空状态 logo 可访问名称：`src/renderer/src/components/app/AppParts.tsx` 的 logo `aria-label` 需要改为 `PiDeck logo`。
- README 中的产品标题、简介和安装说明需要改为 `PiDeck`，同时保留仓库地址和本地目录名 `pi-desktop`。
- CHANGELOG 当前说明中的产品名需要改为 `PiDeck`，历史条目里表示文件夹名或旧版本事实的 `.pi-desktop` 保持不变。
- CONTRIBUTING 和 LICENSE 中面向用户或贡献者的项目名需要改为 `PiDeck`。

## 暂不建议调整的技术标识

- `package.json` / `package-lock.json` 的 npm 包名 `pi-desktop`：改名会影响锁文件、发布标识和安装脚本，可在正式迁仓或改包名时单独处理。
- GitHub URL `https://github.com/ayuayue/pi-desktop`：仓库尚未改名时必须保持可用。
- `window.piDesktop` / `PiDesktopApi`：这是 preload 暴露给 renderer 和浏览器 mock 的兼容 API，改名会扩大破坏面。
- 设置项 `desktopProxy*` 和文案里的“桌面代理”：这是功能概念，不是品牌名。
- localStorage key `pi-desktop:outline-top`：改名会丢失用户已有布局状态，除非做迁移。
- 历史 changelog 中的 `.pi-desktop` 文件夹示例：这是具体路径示例，不应改成品牌名。
