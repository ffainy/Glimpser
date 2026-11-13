# Glimpser 视觉主题改版计划

> 状态：草案 v1 · 2026-11-13
> 分支：`design/theme-palette-redesign`
> 预览：`docs/theme-demo.html`（直接用浏览器打开，或在 OpenCode 中预览）
> 本文档只做设计规划，不改动扩展运行代码。

---

## 1. 我对需求的理解

这次不是简单换几个颜色，而是给 Glimpser 建立一套有辨识度、但仍然克制的双主题色彩语言：

| 角色 | 深色主题 | 浅色主题 |
| --- | --- | --- |
| 背景色 | 深紫灰 | 淡琥珀 |
| 强调色 | 淡紫灰 | 紫灰 |
| 点缀色 | 金橙 | 金橙 |

三个关键词：

1. **紫灰是骨架**：背景、表面、文字、按钮、选中态都以紫灰为基底，形成统一的气质。
2. **金橙是点睛**：只出现在少量高价值位置（品牌光晕、拖放图标、关键提示、焦点高光），占比控制在 5%–10%，不抢主操作。
3. **两套主题是同一家族的白天与夜晚**：不是「冷灰 + 深紫」的割裂，而是同一个黄昏意象的两端——夜晚的紫灰与灯火，清晨的琥珀与墨紫。

设计意象：**Dusk / 黄昏**。深色是夜幕下的紫灰与金色灯火；浅色是琥珀色晨光落在纸面上的温度。

---

## 2. 现状诊断

当前主题主要定义在 `src/css/foundation.css`，Popup 另有一套硬编码变量在 `src/css/popup.css`。

现有问题：

- **深色背景偏中性黑**（`#111114` / `#120f1c`），紫调不足，「深紫灰」的识别度弱。
- **浅色背景偏冷灰**（`#f0f2f5`），与暖金色点缀冲突，整体显得「办公软件」而不是「有温度的工具」。
- **浅色强调色过深**（`#4b4457`），作为大面积文字/按钮时接近黑色，紫灰的性格不明显。
- **金色的语义不统一**：`--gs-support-rgb` 同时承担装饰、警告和光晕，容易和 warning 状态混淆。
- **Popup 与 Settings / Preview 的色值不同源**，后续维护要改两处。
- 部分胶囊、光晕、阴影是中性黑/白，没有跟随主题的紫或琥珀色温。

---

## 3. 设计原则

1. **60 / 30 / 10**
   - 60%：背景与大面积表面（深紫灰 / 淡琥珀）
   - 30%：紫灰强调、文字、边框、控件
   - 10%：金橙点缀
2. **金色不做主按钮**：主按钮永远用紫灰强调色，金橙只做徽标、kicker、拖放图标、toast 边缘、品牌光晕、焦点高光。
3. **金色分两级**：装饰用亮金（可低透明度铺光），文字用深金（保证对比度）。
4. **状态色保持独立**：danger 仍是红色；warning 使用独立的琥珀棕文字，不复用装饰金，避免「提示」和「强调」混淆。
5. **深色不纯黑，浅色不纯白**：背景保留色相，卡片用微暖/微紫的抬升，而不是灰阶。
6. **层级靠明度 + 边框 + 阴影，而不是靠更多颜色**。
7. **所有正文对比度 ≥ 4.5:1，大字号/图标 ≥ 3:1**，并在 Demo 中标注实测值。

---

## 4. 深色主题 · Midnight Plum

### 4.1 色板

| 角色 | Hex | RGB | 用途 |
| --- | --- | --- | --- |
| Canvas | `#181226` | 24 18 38 | 页面底色、预览窗口外框 |
| Canvas raised | `#1D172B` | 29 23 43 | 抬升表面、窗口渐变起点 |
| Card | `#221B31` | 34 27 49 | 设置卡片、tooltip、弹层 |
| Card raised | `#2B2440` | 43 36 64 | 输入框聚焦、悬浮卡片 |
| Input | `#1B1429` | 27 20 41 | 输入框、下拉框、URL bar |
| Border | `rgb(226 216 242 / 0.10)` | — | 常规分割线、卡片描边 |
| Border strong | `rgb(226 216 242 / 0.18)` | — | hover、聚焦、活动窗口 |
| Text | `#EDE8F4` | 237 232 244 | 正文、主要标签 |
| Text dim | `#B8AFC7` | 184 175 199 | 次级说明、hint |
| Text muted | `#958BA5` | 149 139 165 | kicker、元信息、占位符 |
| Accent | `#C9BDDC` | 201 189 220 | 淡紫灰强调、按钮、开关、选中态 |
| Accent strong | `#EFE8F8` | 239 232 248 | hover 文字、焦点文字 |
| Accent ink | `#1A1523` | 26 21 35 | 强调色上的文字/图标 |
| Gold | `#E8A34C` | 232 163 76 | 金橙点缀、kicker、拖放图标 |
| Gold strong | `#F5C27C` | 245 194 124 | 金色高光文字、光晕 |
| Gold ink | `#1A1523` | 26 21 35 | 金色填充上的文字 |
| Danger | `#F27A7A` | 242 122 122 | 删除、关闭、错误 |

### 4.2 关键对比度（实测 WCAG）

| 组合 | 比值 | 结论 |
| --- | --- | --- |
| Text / Canvas | 15.13:1 | AAA |
| Text / Card | 13.75:1 | AAA |
| Text dim / Card | 7.88:1 | AAA |
| Text muted / Card | 5.13:1 | AA |
| Accent / Canvas | 10.23:1 | AAA |
| Accent ink / Accent | 10.04:1 | AAA |
| Gold / Canvas | 8.47:1 | AAA |
| Gold ink / Gold | 8.32:1 | AAA |
| Danger / Canvas | 6.80:1 | AA+ |

### 4.3 材质与光感

- 窗口底色：`linear-gradient(to bottom, #1D172Bf2, #181226e6)`
- 活动窗口光晕：`0 0 42px rgb(201 189 220 / 0.14)` + `0 0 24px rgb(232 163 76 / 0.08)`
- 卡片阴影：`0 16px 40px rgb(4 2 10 / 0.42)`
- 背景氛围光：左上淡紫灰 `0.18`，右下金橙 `0.12`
- 内高光：`inset 0 1px 0 rgb(255 255 255 / 0.06)`

---

## 5. 浅色主题 · Amber Dawn

### 5.1 色板

| 角色 | Hex | RGB | 用途 |
| --- | --- | --- | --- |
| Canvas | `#F8F1E4` | 248 241 228 | 页面底色、预览窗口外框 |
| Canvas sunken | `#F3EADB` | 243 234 219 | 下沉区域、URL bar、分段控件底 |
| Card | `#FFFCF6` | 255 252 246 | 设置卡片、tooltip、弹层 |
| Card raised | `#FFFFFF` | 255 255 255 | 输入框聚焦、悬浮卡片 |
| Input | `#FFFDF9` | 255 253 249 | 输入框、下拉框 |
| Border | `rgb(62 52 74 / 0.12)` | — | 常规分割线、卡片描边 |
| Border strong | `rgb(62 52 74 / 0.20)` | — | hover、聚焦、活动窗口 |
| Text | `#2E2736` | 46 39 54 | 正文、主要标签 |
| Text dim | `#5F5668` | 95 86 104 | 次级说明、hint |
| Text muted | `#756A80` | 117 106 128 | kicker、元信息、占位符 |
| Accent | `#5B5169` | 91 81 105 | 紫灰强调、按钮、开关、选中态 |
| Accent strong | `#3D3649` | 61 54 73 | hover、强调文字 |
| Accent ink | `#FFFCF6` | 255 252 246 | 强调色上的文字/图标 |
| Gold text | `#9A5612` | 154 86 18 | 金色文字、图标、kicker（保证对比度） |
| Gold fill | `#D99A4A` | 217 154 74 | 金色填充、光晕、装饰（不用于小字） |
| Gold strong | `#7E440B` | 126 68 11 | 深金文字、hover |
| Gold ink | `#2E2736` | 46 39 54 | 金色填充上的文字 |
| Danger | `#B3403F` | 179 64 63 | 删除、关闭、错误 |

### 5.2 关键对比度（实测 WCAG）

| 组合 | 比值 | 结论 |
| --- | --- | --- |
| Text / Canvas | 12.81:1 | AAA |
| Text / Card | 14.05:1 | AAA |
| Text dim / Card | 6.80:1 | AAA |
| Text muted / Canvas | 4.53:1 | AA |
| Accent / Canvas | 6.62:1 | AA+ |
| Accent ink / Accent | 7.26:1 | AAA |
| Gold text / Canvas | 5.03:1 | AA |
| Gold text / Card | 5.52:1 | AA |
| Gold fill / Canvas | 2.16:1 | 仅装饰，不承载信息 |
| Gold ink / Gold fill | 5.94:1 | AA |
| Danger / Canvas | 5.02:1 | AA |

### 5.3 材质与光感

- 窗口底色：`linear-gradient(to bottom, #FFFCF6f5, #FBF4E8ee)`
- 活动窗口光晕：`0 22px 48px rgb(82 61 38 / 0.16)` + `0 0 28px rgb(217 154 74 / 0.10)`
- 卡片阴影：`0 12px 30px rgb(82 61 38 / 0.10)`
- 背景氛围光：左上紫灰 `0.07`，右下金橙 `0.10`
- 内高光：`inset 0 1px 0 rgb(255 255 255 / 0.72)`

---

## 6. Token 映射（实现阶段使用）

第一阶段只改 `foundation.css` 的主题块与 `popup.css` 的变量值，不改结构。

### 6.1 全局 Primitive

| Token | 深色 | 浅色 | 说明 |
| --- | --- | --- | --- |
| `--gs-accent-rgb` | `201 189 220` | `91 81 105` | 强调色 |
| `--gs-accent-strong-rgb` | `239 232 248` | `61 54 73` | 强调 hover / 深色文字 |
| `--gs-support-rgb` | `232 163 76` | `217 154 74` | **装饰金**（低透明度铺光） |
| 新增 `--gs-support-text-rgb`（建议） | `245 194 124` | `154 86 18` | **金色文字**（保证 AA） |
| `--gs-danger-rgb` | 保持红色系 | 保持红色系 | 建议深色 `242 122 122`，浅色 `179 64 63` |

### 6.2 核心表面与文字

| Token | 深色 | 浅色 |
| --- | --- | --- |
| `--gs-surface-card` | `rgb(34 27 49 / 0.92)` | `rgb(255 252 246 / 0.92)` |
| `--gs-preview-surface` | `#181226` | `#F8F1E4` |
| `--text` | `#EDE8F4` | `#2E2736` |
| `--text-dim` | `#B8AFC7` | `#5F5668` |
| `--text-strong` | `#F7F3FC` | `#241E2C` |
| `--text-muted` | `#958BA5` | `#756A80` |

### 6.3 Settings

| Token | 深色 | 浅色 |
| --- | --- | --- |
| `--gs-settings-surface-page` | `#181226` | `#F8F1E4` |
| `--gs-settings-surface-card` | `rgb(255 255 255 / 0.045)` | `#FFFCF6` |
| `--gs-settings-surface-subtle` | `rgb(255 255 255 / 0.03)` | `rgb(62 52 74 / 0.04)` |
| `--gs-settings-surface-input` | `#1B1429` | `#FFFDF9` |
| `--gs-settings-surface-elevated` | `#2B2440` | `#FFFDF9` |
| `--gs-settings-foreground` | `#EDE8F4` | `#2E2736` |
| `--gs-settings-foreground-dim` | `#B8AFC7` | `#5F5668` |
| `--gs-settings-foreground-muted` | `#958BA5` | `#756A80` |
| `--gs-settings-border` | `rgb(226 216 242 / 0.10)` | `rgb(62 52 74 / 0.12)` |
| `--gs-settings-border-subtle` | `rgb(226 216 242 / 0.05)` | `rgb(62 52 74 / 0.06)` |
| `--gs-settings-shadow-section` | `rgb(4 2 10 / 0.28)` | `rgb(82 61 38 / 0.08)` |
| `--gs-settings-overlay-fill` | `rgb(10 8 16 / 0.66)` | `rgb(243 234 219 / 0.55)` |
| `--gs-settings-halo-a` | `rgb(201 189 220 / 0.20)` | `rgb(91 81 105 / 0.07)` |
| `--gs-settings-halo-b` | `rgb(232 163 76 / 0.14)` | `rgb(217 154 74 / 0.10)` |
| `--gs-settings-accent-contrast` | `#1A1523` | `#FFFCF6` |
| `--gs-settings-ring` | `rgb(201 189 220 / 0.55)` | `rgb(91 81 105 / 0.70)` |
| `--gs-settings-rail` | `rgb(226 216 242 / 0.18)` | `rgb(62 52 74 / 0.18)` |
| `--gs-settings-badge-surface` | `rgb(255 255 255 / 0.08)` | `rgb(62 52 74 / 0.08)` |
| `--gs-settings-badge-foreground` | `rgb(237 232 244 / 0.70)` | `rgb(46 39 54 / 0.70)` |
| `--gs-settings-toggle-knob` | `#1A1523` | `#FFFCF6` |

### 6.4 Preview

| Token | 深色 | 浅色 |
| --- | --- | --- |
| `--gs-preview-window-surface-bg` | `linear-gradient(to bottom, rgb(29 23 43 / 0.95), rgb(24 18 38 / 0.92))` | `linear-gradient(to bottom, rgb(255 252 246 / 0.96), rgb(251 244 232 / 0.92))` |
| `--gs-preview-window-surface-border` | `rgb(226 216 242 / 0.12)` | `rgb(62 52 74 / 0.14)` |
| `--gs-preview-window-surface-border-active` | `rgb(201 189 220 / 0.34)` | `rgb(91 81 105 / 0.30)` |
| `--gs-preview-window-surface-shadow` | `0 24px 60px rgb(4 2 10 / 0.52), 0 6px 18px rgb(4 2 10 / 0.24)` | `0 20px 44px rgb(82 61 38 / 0.14), 0 3px 10px rgb(82 61 38 / 0.06)` |
| `--gs-preview-window-surface-shadow-active` | `0 34px 92px rgb(4 2 10 / 0.66), 0 0 42px rgb(201 189 220 / 0.14), 0 0 24px rgb(232 163 76 / 0.08)` | `0 28px 64px rgb(82 61 38 / 0.20), 0 0 30px rgb(217 154 74 / 0.10)` |
| `--gs-preview-header-surface` | `rgb(29 23 43 / 0.64)` | `rgb(255 252 246 / 0.74)` |
| `--gs-preview-header-surface-active` | `rgb(34 27 49 / 0.72)` | `rgb(255 255 255 / 0.86)` |
| `--gs-preview-urlbar-surface` | `rgb(27 20 41 / 0.72)` | `rgb(243 234 219 / 0.80)` |
| `--gs-preview-urlbar-surface-active` | `rgb(32 25 45 / 0.80)` | `rgb(248 241 228 / 0.88)` |
| `--gs-preview-drop-surface-bg` | `radial-gradient(circle at 82% 100%, rgb(232 163 76 / 0.10), transparent 30%), rgb(29 23 43 / 0.88)` | `radial-gradient(circle at 82% 100%, rgb(217 154 74 / 0.10), transparent 32%), rgb(255 252 246 / 0.88)` |
| `--gs-preview-drop-surface-border` | `rgb(226 216 242 / 0.14)` | `rgb(62 52 74 / 0.12)` |
| `--gs-preview-drop-surface-border-hover` | `rgb(232 163 76 / 0.34)` | `rgb(154 86 18 / 0.26)` |
| `--gs-preview-drop-slot-kicker` | `#F5C27C` | `#9A5612` |
| `--gs-preview-drop-title-foreground` | `#F7F3FC` | `#2E2736` |
| `--gs-preview-drop-copy-foreground` | `#B8AFC7` | `#5F5668` |
| `--gs-preview-drop-icon-foreground` | `#C9BDDC` | `#5B5169` |

> 完整清单在实现阶段逐项替换，原则是：**表面用紫灰/琥珀，强调用紫灰，金色只做边缘、图标、光晕和 kicker。**

### 6.5 Popup

Popup 已合并到 foundation token：`popup.html` 先加载 `foundation.css`，`popup.css` 只在 `:root` 中保留一层别名映射，不再保存任何颜色值：

- 表面：`--bg-primary` → `--gs-settings-surface-page`，`--bg-secondary` → `--gs-settings-surface-card`，`--bg-tertiary` → `--gs-settings-surface-subtle`，`--input-bg` → `--gs-settings-surface-input`
- 文字：`--text-primary` / `--text-secondary` / `--text-muted` → `--gs-settings-foreground` / `-dim` / `-muted`
- 控件：`--accent-color`、`--accent-hover`、`--border-color`、`--rail-color`、`--badge-*`、`--toggle-knob`、`--checkmark-image`、`--select-arrow`、`--input-focus-border-color` 分别映射到对应 `--gs-settings-*`
- 动效：`--bezier` → `--gs-ease-standard`
- `popup.js` 同时写入 `data-theme` 与 `data-dp-theme`，避免与 Settings 的主题切换逻辑分叉。

---

## 7. 组件级设计决定

### 7.1 主按钮

- 深色：淡紫灰底 `#C9BDDC` + 深色字 `#1A1523`
- 浅色：紫灰底 `#5B5169` + 暖白字 `#FFFCF6`
- hover 提亮/加深，不使用金色。

### 7.2 金色出现的位置（白名单）

- 品牌 logo 光晕的暖色边缘
- 拖放区 kicker（`DROP TO PREVIEW`）与图标 shell
- 活动窗口的第二层光晕
- Toast / 状态徽标的描边或小圆点
- 「当前站点已屏蔽」等需要被注意但不危险的提示
- 版本号旁的极小装饰点（可选）

**不出现**：主按钮、普通正文、大面积卡片背景、导航选中条。

### 7.3 焦点与选中

- 焦点环：深色 `rgb(201 189 220 / 0.55)`，浅色 `rgb(91 81 105 / 0.70)`，2–3px。
- 选中 tab：紫灰底/文字，不用金色。
- 拖放悬停：边框转为金色，配合轻微金色光晕，表示「可以放下」。

### 7.4 状态色

- Danger：深色 `#F27A7A`，浅色 `#B3403F`。
- Warning：深色 `#F5C27C` 文字 + `rgb(232 163 76 / 0.14)` 底；浅色 `#8A4F0F` 文字 + `rgb(217 154 74 / 0.16)` 底。
- 不复用装饰金作为 warning 文字，反之亦然。

### 7.5 层级

| 层级 | 深色 | 浅色 |
| --- | --- | --- |
| 页面 | `#181226` | `#F8F1E4` |
| 卡片 | `#221B31` | `#FFFCF6` |
| 悬浮/聚焦 | `#2B2440` | `#FFFFFF` |
| 输入 | `#1B1429` | `#FFFDF9` |

深色通过「越靠前越亮、越偏紫」建立层级；浅色通过「越靠前越白、越少黄」建立层级。

---

## 8. Demo 说明

`docs/theme-demo.html` 是独立的静态预览页，不依赖扩展运行时：

- 左右并排展示深色 / 浅色两套完整 mini UI：Popup、Settings 卡片、Preview 窗口、Drop 提示、Toast、按钮与开关。
- 顶部可切换「对比 / 只看深色 / 只看浅色」。
- 每个主题展示核心色板、Hex、角色说明与实测对比度。
- 所有颜色与本文档第 4、5 节一致。

预览方式：

1. 直接用浏览器打开 `docs/theme-demo.html`。
2. 或在 OpenCode 中使用浏览器预览该文件。

Demo 只用于评审，不会被打包进扩展。

---

## 9. 实施计划（评审通过后）

### Phase 1 — Token 换血（低风险）

1. 更新 `foundation.css` 深色主题块的 primitive、surface、text、preview、settings token。
2. 更新 `foundation.css` 浅色主题块。
3. 同步 `popup.css` 的变量值。
4. 更新 `popup.css` 中硬编码的 focus ring、checkbox、select arrow 颜色（图标 stroke 需要跟主题一致）。
5. 检查 `preview.css` / `settings.css` 是否有绕过 token 的硬编码颜色，逐项替换。

### Phase 2 — 组件微调

1. 调整窗口阴影、光晕、玻璃模糊的色温（紫灰 / 琥珀）。
2. 统一按钮、toggle、slider、select 的 hover/active/focus 状态。
3. 检查金橙的使用是否超过白名单；超出的改回紫灰。
4. Popup 与 Settings 的控件密度、圆角、边框对齐。

### Phase 3 — 验证

- Chrome / Firefox 各检查一次。
- 深色、浅色、system 三种模式。
- Popup、Settings、Preview、Drop overlay、Toast、Tooltip 六个界面。
- 键盘 Tab 焦点可见；对比度抽检。
- 低亮度屏幕 / 高亮度屏幕各看一次，确认深色不糊、浅色不刺眼。

---

## 10. 验收标准

- [ ] 深色背景在 RGB 上明确偏紫（B > R > G），不再像中性黑。
- [ ] 浅色背景在 RGB 上明确偏暖（R > G > B），不再像冷灰。
- [ ] 主按钮、选中态、焦点环全部由紫灰承担。
- [ ] 金橙只出现在白名单位置，且不承载正文信息。
- [ ] 正文对比度 ≥ 4.5:1；金色文字 ≥ 4.5:1。
- [ ] Popup / Settings / Preview 三处同一角色颜色一致。
- [ ] 切换主题时没有「某个控件还是旧颜色」的漏网之鱼。
- [ ] Demo 与实际实现肉眼一致。

---

## 11. 待确认

1. **金色比例**：当前方案把金色控制在 5%–10%。如果你希望更「华丽」，可以把活动窗口光晕、选中 tab 的下划线也改成金色；如果希望更克制，可以只保留拖放区与品牌光晕。
2. **浅色背景温度**：`#F8F1E4` 是偏奶油琥珀。如果希望更接近纸张白，可以改成 `#FAF4EA`；如果希望琥珀更明显，可以改成 `#F5EAD5`。
3. **深色背景深度**：`#181226` 是「深紫灰」。如果希望更黑，可以降到 `#121019`；如果希望更紫，可以升到 `#1A1428`。
4. **Popup 是否合并到 foundation token**：已在 Phase 2 完成，Popup 通过别名层直接消费 `--gs-*`，不再维护第二套色值。
5. **是否需要第三套「高对比度」主题**：本次不做，但 token 结构可以预留。

---

## 12. 快速色卡

### Dark

```
#181226  #1D172B  #221B31  #2B2440  #1B1429
#EDE8F4  #B8AFC7  #958BA5
#C9BDDC  #EFE8F8  #1A1523
#E8A34C  #F5C27C
#F27A7A
```

### Light

```
#F8F1E4  #F3EADB  #FFFCF6  #FFFDF9
#2E2736  #5F5668  #756A80
#5B5169  #3D3649  #FFFCF6
#9A5612  #D99A4A  #7E440B
#B3403F
```

---

## 13. 实施状态（2026-11-13）

- Phase 1（token 换血）完成：foundation 深浅主题、preview / drop / toast / tooltip / settings token 全部切换到新色板。
- Phase 2（组件统一）完成：popup 改为加载 foundation 并消费 `--gs-*`；`--bezier`、focus ring、checkbox、select arrow 统一；金色使用范围复核完成。
- Phase 3（验证）已做：真实 CSS 计算样式检查 + Lighthouse 深/浅色可访问性审计；Settings 与 Popup 均达到 100 分。
- 收尾完成：主题块加入 `color-scheme`；foundation 增加 `prefers-reduced-motion` 降级；浅色 focus ring 提升到 `0.70`（对画布 ≥ 3:1）；新增 `theme-tokens` 守卫测试。
- 尚未完成：低亮度 / 高亮度屏幕的实体显示器观感确认，以及 Chrome / Firefox 打包后的肉眼走查。
