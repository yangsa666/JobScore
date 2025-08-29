# JobScore — 职位评分器

轻量静态 Web 应用，用于按薪酬、工时、通勤、是否打卡/在家办公及职业前景等维度对职位进行快速评分（满分 100）。

核心特性
- 以权重加权的子项评分（薪酬、工作负荷、通勤、打卡、在家办公、业务前景、晋升、知名度）。
- 支持把雇主公积金缴纳比例计入总包（employer provident fund %），作为薪酬的一部分参与评分。
- 可导出当前输入与评分的 JSON。

先决条件
- Node.js & npm (用于构建和本地静态托管)
- 可选：VS Code（用于按 F5 启动调试）

快速开始

1) 安装依赖（如果还没装过）:

```powershell
npm install
```

2) 本地构建并启动（开发）:

```powershell
npm run dev
```

这会运行构建流程（JS/CSS 最小化），并使用 `serve` 在本地托管 `dist/` 目录，默认监听 8000 端口。

3) 直接打开（不构建，仅用于快速检查 UI 修改）:

```powershell
# 在仓库根目录打开源文件（注意：直接打开根目录的 index.html 会加载未压缩的 js/app.js）
start .\index.html
```

npm scripts
- `npm run build` — 只做构建：压缩 JS/CSS 并将构建产物放到 `dist/`，并修正 `dist/index.html` 中的引用。
- `npm run dev` — 构建后在 `dist/` 上启动静态服务器（`npx serve dist -l 8000`）。
- `npm run start` — 等同于 `npm run dev`。

VS Code 调试（F5）

1. 在 VS Code 中打开此项目。
2. 按 F5 将触发 `preLaunchTask`（目前配置为运行 `npm run build`），构建会先完成。
3. 请在另一个终端运行 `npm run dev` 来启动本地服务器（或我可以再配置 F5 来同时启动服务器并等待准备就绪）。

（提示）如果你希望 F5 同时构建并自动启动服务器并在服务器就绪后再打开浏览器，我可以把这个集成在一起，使用一个小的启动脚本或一个 problemMatcher 来检测就绪。

关于“--” 的原因（常见疑问）
- 页面中的径向指示器显示 `--` 表示没有可用的总分（computeTotalScore 返回 `null`）。常见原因：
  - 没有填写任何需要评分的输入（按设计会忽略空项）。
  - 填写的数字格式不正确（例如包含千位分隔符 `,` 导致 Number(...) 返回 NaN）。
  - 未正确加载构建后的 `app.min.js`（如果你直接打开 `dist/index.html`，确保它引用 `js/app.min.js`，或用 `npm run dev` 启动服务器）。

雇主公积金说明
- 新增输入 `雇主公积金缴纳比例（%）`（字段 id: `employer_pf_pct`）。
- 计算逻辑：如果输入了 `employer_pf_pct`，则计算：

  effective_salary = annual_salary + annual_salary * (employer_pf_pct / 100)

  然后用 `effective_salary`（如果存在）替代 `annual_salary` 参与薪酬子项评分。这会把雇主缴纳的公积金视为包的一部分。

导出
- 点击“导出 JSON”会下载包含 `inputs`, `weights`, `result` 的 JSON，`result` 中包含 `effective_salary`（如果计算过）。

故障排查快速清单
- 打开浏览器 DevTools → Console，查看是否有错误（例如无法加载 `app.min.js`）。
- 确认你正在访问 `dist/index.html`（构建后的产物），并确保 `js/app.min.js` 返回 200。
- 确认 numeric inputs 中不含逗号或 `%` 等非数字字符。

贡献 & 开发建议
- 欢迎扩展评分规则、添加国家/地区化的公积金规则、或把前端拆为更小组件并添加单元测试。

License
- ISC
