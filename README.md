# V-P-R床旁快速评估 · 22区ICU、SICU

静态 PWA（纯 HTML+JS），手机扫码打开，离线可用，数据只在手机本机计算，不上传。

## 文件
- `index.html` `app.js`：界面
- `rules.js`：**全部临床规则与阈值（科室修改只改这里）**，PENDING 项=科室建议标准，待审定
- `manifest.json` `sw.js` `icons/`：PWA / 离线缓存（修改规则后请把 sw.js 里的 `C='vpr-v1.0'` 改版本号，手机才会更新）
- `vpr-tool-single.html`：单文件版（`python3 build_single.py` 重新生成），可微信/U盘发送后直接打开
- `tests/test.js`：`node tests/test.js`
- `make_qr.py`：`python3 make_qr.py https://xxx.github.io/vpr-qr-tool/ [床号]` 生成带标题、可打印的二维码；带床号时会自动加上 `?bed=`

## 发布到 GitHub Pages
1. 在 GitHub 新建公开仓库，例如 `vpr-qr-tool`
2. 上传 index.html、app.js、rules.js、manifest.json、sw.js、icons/（可以不上传 tests、screenshots 和各个 .py 脚本）
3. 打开 Settings → Pages → Source 选 `Deploy from a branch`，Branch 选 `main`，目录选 `/ (root)`
4. 1–2 分钟后网址为 `https://<用户名>.github.io/vpr-qr-tool/`，再用 make_qr.py 生成二维码
5. 院内网络访问 GitHub 不稳定时：可改放到医院内网静态服务器（只需 HTTPS，离线缓存才生效），或直接分发单文件版。

本工具为护理决策支持，处方调整以医嘱为准；适用于 SA-AKI 成人 CRRT 患者，不适用于儿童和孕妇。
