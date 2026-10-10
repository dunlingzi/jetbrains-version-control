# JGC i18n 收尾计划（feat/i18n）

- 日期：2026-10-08
- 状态：待复核（复核通过后转 writing-plans 生成实施计划）
- 背景：本日最初按"从零接入 i18n"完成了一套设计（含 webview 官方 `@vscode/l10n` 方案）；复核阶段发现 `upstream/feat/i18n` 已有 **2026-08-30 完工的完整实现**（仅 Phase G 未做），路径改为**收尾**。从零设计的 spec 已废弃（无实现）；其内容由维护者作为历史记录移植至本分支（提交 974c99d），仅供追溯。

## 1. 既有实现盘点（upstream/feat/i18n，已推送、未合并）

**规模**：16 commits / 56 files vs main；webview 词典 en/zh-cn 各 **333 key**；`package.nls` 54 key；`l10n/bundle` 标准 `[en, zh]` 元组 42 条。webview vitest 28 passed；构建全绿；F5 冒烟已过。

**架构**（保留，不重构）：

```
webview/src/l10n/en.json + zh-cn.json          ← webview 唯一语言源（一语言一文件）
   │ scripts/sync-nls.mjs（构建期派生，生成物提交 git）
   └──▶ package.nls.{json,zh-cn.json}           → contributes %key% 模板化（54 处）

l10n/bundle.l10n.{json,zh-cn.json}             主机 vscode.l10n.t() 用；手工维护，非脚本派生
                                               （34 处通知 + blame 3 条 + 确认框按钮）

Webview 运行时：自研 t()/tpl() + import.meta.glob（全部语言打包进 webview bundle）
  · store / t / bundle / languages 四个模块；data-locale 由 html.ts 注入
  · 复数：key 拆分 _one/_other；插值 {param}
  · 兜底：缺 key 回落 en 并显式显示 key（便于排查）

语言解析：默认跟随 vscode.env.language；jgc.locale（""|en|zh-cn）可覆盖；Reload Window 生效
```

> 注：`sync-nls.mjs` 只派生 `package.nls*`；`l10n/bundle.l10n.*` 是手工维护的翻译（按英文源串键控）。新增语言时除 `webview/src/l10n/<locale>.json` 外，还需手工添加 `l10n/bundle.l10n.<locale>.json`（主机通知），并在 `jgc.locale` 枚举中增加条目。

**已完成**：webview 全量替换（29 组件）、contributes、配置描述 27 条、主机通知、README(en/zh)/CHANGELOG、测试与构建、冒烟。

**遗留**：Phase G（合并 main + PR）；术语与 IDEA 官方口径的部分差异（见 §3）。

## 2. 收尾范围

### S1 合并 latest main（落后 12 commits）

- 策略：`git merge main` 进 feat/i18n；**不做 rebase / force-push**（分支已推送，且 Aug 已用 merge 方式与 main 汇聚过一次）
- 冲突预检（`git merge-tree` 实测，恰 7 个文件）：

  ```
  package.json
  webview/src/commit/components/CommitFileContextMenu.tsx
  webview/src/commit/components/CommitTab.tsx
  webview/src/panel/components/CommitList.tsx
  webview/src/panel/components/FileChangeTree.tsx
  webview/src/panel/components/FileContextMenu.tsx
  webview/src/panel/components/Toolbar.tsx
  ```

- 解决原则：**双方都保**——main 后期功能（提交哈希搜索、文件列表/表头改动等）与 i18n 的 `t()/tpl()` 替换逐 hunk 手工合并；**禁止整文件取任一边**
- `package.json` 要点：main 侧版本/新配置项 与 i18n 侧 %key% 模板化同时保留；合并后运行 `node scripts/sync-nls.mjs`，校验 %contrib.*% 占位全解析
- 合并完成后重跑 key 完整性扫描：en=zh、无缺失、无重复、无未使用 key

### S2 术语修订 pass（IDEA 官方中文口径）

主要修订项（全量以附录 A 为准）：

| key | 现值 | 改为 | 依据 |
|---|---|---|---|
| `commit.tab.stash` | 暂存 | **搁置** | 用户 IDE 口径（Stash→搁置系）；"暂存"与 staging（已暂存/取消暂存）撞车 |
| `commit.tab.shelf` | 搁置 | **Shelf**（保留英文）；备选"搁置区" | 与 Stash tab 避免重名；CHANGELOG "IDEA 兼容 Shelf" 先例 —— **复核点 A** |
| `shelf.restore` | 恢复 | **还原** | IDEA 官方中文 |
| `shelf.jumpToSource` | 跳转到源 | **跳转源码** | IDEA 官方中文 |
| `panel.menu.cherryPick` 及全部 Cherry-Pick 文案（banner：正在/中止/继续） | Cherry-Pick（英文） | **拣选** | IDEA 官方中文（按钮与流程用"拣选"） |
| 其余 | — | — | 对照附录 A 全量扫描 zh-cn.json 逐条修订 |

- 只改 `webview/src/l10n/zh-cn.json`（en.json 为基准不动）；`package.nls.zh-cn.json` 与 `bundle.l10n.zh-cn.json` 由脚本重新派生
- 顺手项：标点/风格一致性核对（如半角 `?` 与全角"？"混用）
- 保留既有好译法：`Discard→放弃`、`Rollback→回滚` 等已与 IDEA 口径一致，不动

### S3 验证

- 门禁：`pnpm run check-types` + webview vitest + `node esbuild.js` + `pnpm run build:web` 全绿（`pnpm run lint` 因 ~92 条 CRLF 存量误报不纳入，沿用项目约定）
- WSL 冒烟（项目既有流程）：三步构建打包 → `code-server --install-extension` 安装 → 以唯一字符串字面量 grep 证明新构建生效；zh-cn 下过全矩阵（7 个 webview + 命令面板 + 设置页 + 状态栏 + 提交/搁置/拣选关键路径）
- **复核点 B**：`gitService` 3 条罕见自撰错误（如 "No changes to shelve"）——Aug 版决定不本地化（穿透成本不成比例；git stderr 本就英文）。**建议维持**，如需本地化在 S2 一并补齐

### S4 Phase G：合回 main（fork → 上游 PR 流程）

- 仓库流程：本地 `origin`=dunlingzi fork；上游 `witt-bit/jetbrains-version-control`（`upstream` remote；i18n 分支托管于 `upstream/feat/i18n`）
- push feat/i18n（fork 流为主；或经维护者确认后直推上游分支）→ 用 `gh` CLI 向上游开 PR：
  `gh pr create -R witt-bit/jetbrains-version-control --base main --head dunlingzi:feat/i18n`（github MCP 的 create_pull_request 不可用）
- PR 内容：实现综述 + 术语口径（链接本 spec）+ 验证证据；含 docs 在内全部内容已脱敏
- 维护者习惯 **squash merge**（PR #4 先例）：我方 commit SHA 不会出现在上游，勿依赖

## 3. 术语修订基准：IDEA 官方中文

基准来源：JetBrains 官方中文帮助（2025.2 版）。新增术语先查 zh-cn 帮助页再定词。

### A.1 搁置 / Stash 体系（JGC 双 tab 结构）

| JGC 英文 | 中文 | 说明 |
|---|---|---|
| Shelf tab（.idea/shelf，IDEA 兼容） | **搁置区** | 用户 IDEA 中文界面口径（2026-10-09 冒烟确认） |
| Stash tab（git stash） | **搁置** | 用户 IDE 口径；官方文档旧译"储藏/储存"、2025.2 正文"隐藏"均备查 |
| Shelve Changes / Unshelve | 搁置更改 / 取消搁置 | IDEA 官方中文 |
| Restore | 还原 | IDEA 官方中文 |
| Create Patch / Import Patches | 创建补丁 / 导入补丁 | IDEA 官方中文 |
| Copy as Patch to Clipboard | 将补丁复制到剪贴板 | IDEA 文档未覆盖，按同类动作推导 |
| Import Patches from Clipboard | 从剪贴板导入补丁 | 同上 |
| Delete | 删除 | IDEA 官方中文 |

两个 tab 的动作菜单英文本就同词（Unshelve / Restore / Delete），中文保持同词同译，不另行区分。

### A.2 Git 操作通用术语

| en | zh-cn | 备注 |
|---|---|---|
| Commit / Commit and Push / Push | 提交 / 提交并推送 / 推送 | IDEA 官方中文 |
| Commit Message | 提交消息 | 文档亦作"提交信息"，统一"提交消息" |
| Changes | 更改 | |
| Staged / Unstage | 已暂存 / 取消暂存 | git staging 语境，VS Code 生态惯例（与 stash 的"搁置"刻意错开） |
| Unversioned Files | 未进行版本管理的文件 | 用户 IDEA 中文界面口径（2026-10-09 冒烟确认；官方文档作"未受版本控制的文件"，从用户所见） |
| Amend | 修正提交 | IDEA 官方中文 |
| Merge / Rebase | 合并 / 变基 | |
| Cherry-Pick | 拣选 | 文档标题曾用"挑选"，按钮与操作流程为"拣选"，从后者 |
| Checkout | 检出 | |
| Conflicts / Resolve | 冲突 / 解决冲突 | |
| Abort / Continue | 中止 / 继续 | |
| Squash / Fixup / Reword | 压缩 / 修正 / 改写 | |
| Drop / Pick | 丢弃 / 选取 | |
| Reset / Rollback / Revert | 重置 / 回滚 / 还原 | |
| Tag / Remote / Branch | 标签 / 远程 / 分支 | |
| Worktree | 工作树 | IDEA 无对照，用 git 社区通用译法 |
| Blame / Annotate | 注解 | |
| Show Diff / Jump to Source | 显示差异 / 跳转源码 | |
| Discard | 放弃 | 与既有 bundle 译文一致 |
| Refresh | 刷新 | |
| Log / History | 日志 / 历史 | |
| Patch | 补丁 | |
| Initial commit | 初始提交 | |

品牌与专名不译：JetBrains Git Control、JGC、IDEA Git、Git、VS Code。

## 4. 验收标准

1. feat/i18n 与 main 合并完成，7 个冲突文件手工解决且双保（功能 + i18n）
2. 术语修订落地；同一文案在 webview / 主机 / manifest 三面同词
3. 构建、测试、key 扫描全绿；WSL zh-cn 冒烟通过
4. Phase G：PR 合入 main，CHANGELOG 双语记录随 PR 更新

## 5. 范围外

- webview 迁移到官方 `@vscode/l10n`（路径选择时已否决——迁移成本高、收益仅为"更官方"）
- 新语言（机制已就绪：加 `webview/src/l10n/<locale>.json` + 跑 `sync-nls`；`l10n/bundle.l10n.<locale>.json` 与 `jgc.locale` 枚举另需手工补，见 §1 注）
- `jgc.locale` 保留（既有实现已含，默认跟随 + 可覆盖）
- README 文档的 marketplace 本地化命名（`README.zh_CN.md` 现状不动）
- 从零设计 spec（c97da07）的实施

## 6. 复核点清单

- **A**：（已定，2026-10-09 冒烟）Stash tab=「搁置」、Shelf tab=「搁置区」——用户对照 IDEA 中文界面确认
- **B**：`gitService` 3 条自撰错误维持不译？
- **C**：附录 A 术语表有无需调整条目（如 Cherry-Pick→拣选、Restore→还原）
- **D**：S1 合并冲突原则（双方都保）认可否

## 7. 决策记录

| # | 决策 | 结论 |
|---|---|---|
| D1 | 路径 | 复活 feat/i18n 收尾；不重做、webview 不迁移官方机制 |
| D2 | Stash 术语 | 搁置系（用户 IDE 口径） |
| D3 | Shelf tab 命名 | **搁置区**（2026-10-09 冒烟中按用户 IDEA 中文界面确认，覆盖原"保留英文"） |
| D4 | 合并与 PR | merge main 进 feat/i18n；PR 走 fork → 上游流程（维护者 squash merge，见 S4） |
| D5 | gitService 3 条 | 维持不译（复核点 B） |
