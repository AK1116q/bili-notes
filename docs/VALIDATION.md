# v0.2.0 验证记录

日期：2026-09-12。环境：Windows、Node.js 24.11.0；浏览器测试通过 Playwright 驱动本机浏览器。

- 8 项 Node 测试通过：视频/分 P 标识、时间格式、笔记校验、Markdown、并发独立存储、失败导入不产生部分写入、恢复与删除、旧编辑冲突保护。
- Edge 独立浏览器配置中实际加载 Manifest V3 扩展，验证真实 service worker、content script 与 chrome.storage.local。
- 在拦截为离线夹具的 B 站格式 URL 中完成：保存笔记、点击时间回看、页面刷新后保留、SPA 分 P 切换、笔记库编辑与搜索、Markdown 下载、JSON 备份、删除、恢复及无效备份拒绝。
- 播放器是 HTML video 元素，测试媒体为本地生成的静音 WAV；没有使用用户账号或真实 B 站接口。
- 笔记库与视频面板没有捕获到未处理的 JavaScript 运行错误。

未验收：当前真实 B 站页面的人工测试、登录后的播放器变体、Chrome 中实际扩展安装、商店上架。README 截图明确标注离线夹具。

## 本地复现核心测试

```bash
npm test
```

GitHub Actions 配置使用 Node.js 22；云端最新结果见 [CI 运行记录](https://github.com/AK1116q/bili-notes/actions/workflows/ci.yml)。完整交互可按 README 的使用步骤人工复现。
