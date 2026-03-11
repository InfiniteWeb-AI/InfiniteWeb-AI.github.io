# InfiniteWeb 搜索引擎 — 交接文档

## 1. 项目概览

InfiniteWeb 项目主页（https://infiniteweb-ai.github.io/）集成了一个客户端全文搜索引擎，允许用户浏览和搜索 AI 生成的网站。

### 涉及的仓库

| 仓库 | 用途 | 地址 |
|------|------|------|
| **InfiniteWeb-AI.github.io** | 项目主页 + 搜索引擎（GitHub Pages 部署） | https://github.com/InfiniteWeb-AI/InfiniteWeb-AI.github.io |
| **simulated-web-search** | 早期独立搜索引擎（已弃用，内容已合并） | https://github.com/xyzhang626/simulated-web-search |

### 线上页面

| 页面 | URL |
|------|-----|
| 项目主页 | https://infiniteweb-ai.github.io/ |
| 搜索引擎 | https://infiniteweb-ai.github.io/search.html |
| 网站浏览器 | https://infiniteweb-ai.github.io/viewer.html?url=...&site=...&q=... |

---

## 2. 用户流程

```
主页 (index.html)
  │
  ├─ 点击 "Explore Websites" 按钮
  │
  ▼
搜索页 (search.html)
  │ - Google 风格首页，输入关键词搜索
  │ - 使用 MiniSearch 全文检索 search_index.json
  │ - 无匹配时随机展示所有网站
  │
  ├─ 点击搜索结果
  │
  ▼
浏览器 (viewer.html)
  │ - iframe 加载目标网站
  │ - 顶部导航栏 + 任务栏（读取 rewritten_tasks.json）
  │ - 返回按钮 → 回到 search.html
```

---

## 3. 目录结构

```
InfiniteWeb-AI.github.io/
├── index.html                    # 项目主页（论文介绍）
├── search.html                   # 搜索引擎页面（Google 风格）
├── viewer.html                   # 网站浏览器（iframe + 任务栏）
├── search_index.json             # 搜索索引（MiniSearch 使用）
├── source/                       # 626 个网站文件夹
│   ├── 1_hawaii_vacation_rent/
│   │   ├── index.html            # 网站首页（被索引）
│   │   ├── *.html / *.css        # 其他页面（不被索引但可浏览）
│   │   ├── business_logic.js     # 网站业务逻辑
│   │   ├── website_data.json     # 网站数据（索引提取关键词）
│   │   └── rewritten_tasks.json  # 任务定义（viewer 任务栏显示）
│   ├── 2_local_automotive_rep/
│   └── ...（共 626 个）
├── static/
│   ├── css/
│   │   ├── index.css             # 主页样式
│   │   ├── search-app.css        # 搜索引擎样式
│   │   ├── search.css            # 旧 gallery 样式（未使用）
│   │   └── bulma.min.css         # Bulma CSS 框架
│   ├── js/
│   │   ├── index.js              # 主页 JS
│   │   └── search-app.js         # 搜索引擎 JS（MiniSearch 逻辑）
│   ├── data/
│   │   └── gallery.json          # 旧 gallery 数据（未使用）
│   └── images/                   # 主页用的图片
├── demos/placeholder/            # 旧占位 demo（未使用）
└── .nojekyll                     # 禁用 Jekyll 构建
```

### 构建工具（位于独立目录，不在部署仓库内）

```
/home/xiaoyizhang/SimulatedInternet/search_engine/
├── scripts/
│   └── build-index.js            # 索引构建脚本（Node.js）
├── package.json                  # 依赖: cheerio, minisearch
└── source/ → 符号链接或复制目标
```

---

## 4. 技术栈

| 组件 | 技术 |
|------|------|
| 搜索引擎 | [MiniSearch](https://lucaong.github.io/minisearch/) v7.x（CDN 加载） |
| 索引构建 | Node.js + [cheerio](https://cheerio.js.org/)（HTML 解析） |
| 前端框架 | 纯 HTML/CSS/JS，主页使用 Bulma CSS |
| 部署 | GitHub Pages（自动，push 后 1-2 分钟生效） |
| 字体 | Product Sans（Google 风格彩色字体） |

### 搜索权重配置（search-app.js）

```javascript
boost: {
  title: 3,        // 页面标题
  siteName: 2,     // 站点名称
  headings: 2,     // h1/h2/h3
  metaDesc: 1.5,   // meta description
  dataKeywords: 1.2,// website_data.json 提取的关键词
  body: 1,         // 正文（前 2000 字符）
  linkTitles: 0.8  // 链接标题
}
```

---

## 5. 如何更新网站（替换为新一批）

### 前置条件

```bash
# 确保安装了 Node.js
node -v  # 需要 v16+

# 构建工具目录
cd /home/xiaoyizhang/SimulatedInternet/search_engine
npm install
```

### 步骤一：准备网站列表

网站列表 JSON 格式为路径数组：

```json
[
  "/path/to/batch_generated/20260303_030340/1_hawaii_vacation_rent",
  "/path/to/batch_generated/20260303_030340/2_local_automotive_rep",
  ...
]
```

当前使用的列表：
```
/home/xiaoyizhang/SimulatedInternet/Infinite-Web/results/websites_above_60pct.json
```

### 步骤二：复制网站到部署目录（排除无用文件）

```bash
REPO_DIR=/home/xiaoyizhang/SimulatedInternet/InfiniteWeb-AI.github.io
WEBSITES_JSON=/path/to/your/new_websites.json

# 1. 删除旧的 source 目录
rm -rf "$REPO_DIR/source"
mkdir -p "$REPO_DIR/source"

# 2. 复制新网站（排除 logs/ 和 data/ 以节省空间）
python3 << PYEOF
import json, os, shutil

with open("$WEBSITES_JSON") as f:
    paths = json.load(f)

deploy_source = "$REPO_DIR/source"
count = 0

for src_path in paths:
    folder_name = os.path.basename(src_path.rstrip('/'))
    dest_path = os.path.join(deploy_source, folder_name)
    shutil.copytree(
        src_path, dest_path,
        ignore=shutil.ignore_patterns('logs', 'data'),
        dirs_exist_ok=True
    )
    count += 1

print(f"Copied: {count}/{len(paths)} websites")
PYEOF

# 3. 进一步清理不必要文件（可选但推荐）
find "$REPO_DIR/source/" -type d -name ".playwright-cli" -exec rm -rf {} + 2>/dev/null
find "$REPO_DIR/source/" -type f \( \
  -name "*.log" -o -name "*.backup" -o -name "*.txt" \
  -o -name "evaluators.json" -o -name "original_tasks.json" \
  -o -name "instrumentation_plan.json" -o -name "test_flows.js" \
\) -delete
```

### 步骤三：重建搜索索引

```bash
BUILD_DIR=/home/xiaoyizhang/SimulatedInternet/search_engine

# 让构建脚本指向部署目录的 source
# 方法 1: 创建符号链接
rm -rf "$BUILD_DIR/source"
ln -s "$REPO_DIR/source" "$BUILD_DIR/source"

# 构建索引（只索引首页）
cd "$BUILD_DIR"
npm run build:index

# 如果要索引所有页面（不推荐，索引会很大）
# npm run build:index -- --all

# 复制索引到部署目录
cp "$BUILD_DIR/search_index.json" "$REPO_DIR/search_index.json"
```

### 步骤四：本地测试

```bash
# 启动本地 HTTP 服务器
cd "$REPO_DIR"
python3 -m http.server 8080

# 访问测试（替换为你的 IP）
# 主页: http://<YOUR_IP>:8080/
# 搜索: http://<YOUR_IP>:8080/search.html
```

测试要点：
- [ ] 主页 "Explore Websites" 按钮跳转到 search.html
- [ ] search.html 首页显示网站数量统计
- [ ] 输入关键词能搜到结果
- [ ] 输入无匹配的随机字符串，显示随机排序的所有网站
- [ ] 点击搜索结果能在 viewer.html 中打开网站
- [ ] viewer.html 返回按钮回到 search.html
- [ ] viewer.html 任务栏正确显示任务（如果有 rewritten_tasks.json）

### 步骤五：提交并推送

```bash
cd "$REPO_DIR"
git add source/ search_index.json
git commit -m "Update websites to new batch (N websites)"
git push origin main

# GitHub Pages 会在 1-2 分钟内自动重新部署
```

---

## 6. GitHub Pages 容量限制

| 限制项 | 额度 | 当前使用 |
|--------|------|---------|
| 仓库大小（建议） | < 1 GB | ~211 MB（git 压缩后） |
| 发布站点大小 | < 1 GB | ~680 MB |
| 月带宽 | 100 GB | - |
| 单文件 | < 100 MB | 最大 ~3.5 MB (search_index.json) |

### 容量估算

- 每个网站（去除 logs/data 后）平均 ~1.6 MB
- search_index.json 增长约 ~5.7 KB/网站
- **GitHub Pages 1 GB 限制下最多约 600 个网站**
- 当前 626 个网站，使用 ~680 MB，接近但未超限

> ⚠️ 如果新批次网站数量超过 ~600，需要考虑：
> - 进一步精简每个网站的文件（只保留 HTML/CSS/JS）
> - 或拆分为多个仓库

---

## 7. 关键文件说明

### search.html
搜索引擎主页面。包含两个视图：
- **home-view**: Google 风格搜索首页（大 Logo + 搜索框）
- **results-view**: 搜索结果页（顶部搜索栏 + 结果列表 + 分页）

品牌文字 "InfiniteWeb" 使用 Google 四色风格（蓝红黄绿），每个字母用 `<span>` 独立着色。

MiniSearch 通过 CDN 加载：
```html
<script src="https://cdn.jsdelivr.net/npm/minisearch@7.1.1/dist/umd/index.min.js"></script>
```

### static/js/search-app.js
搜索逻辑核心。关键行为：
- 加载 `search_index.json`，用 MiniSearch 建立客户端索引
- 支持 `?q=` URL 参数（从主页搜索框跳转时传入）
- 模糊匹配（`fuzzy: 0.2`）+ 前缀匹配（`prefix: true`）
- **无匹配时随机展示所有网站**（`allPages.slice().sort(() => Math.random() - 0.5)`）
- 自动补全建议（最多 8 个）

### viewer.html
网站浏览器。通过 URL 参数控制：
- `url`: 要加载的网站路径（如 `source/1_hawaii_vacation_rent/index.html`）
- `site`: 站点名称（显示在导航栏）
- `q`: 搜索查询（返回时保留搜索状态）

自动加载同目录下的 `rewritten_tasks.json` 并在蓝色任务栏中显示。

### scripts/build-index.js（构建工具，不在部署仓库内）
索引构建脚本。扫描 `source/` 目录，对每个网站提取：
- 页面标题、meta description
- h1/h2/h3 标题
- 正文前 2000 字符
- 链接标题和 aria-label
- `website_data.json` 中的关键词（name, title, description 等字段）

默认只索引 `index.html`（首页），加 `--all` 参数索引所有 HTML 文件。

---

## 8. 常见操作速查

### 只更新搜索索引（不换网站）

```bash
cd /home/xiaoyizhang/SimulatedInternet/search_engine
npm run build:index
cp search_index.json /home/xiaoyizhang/SimulatedInternet/InfiniteWeb-AI.github.io/
cd /home/xiaoyizhang/SimulatedInternet/InfiniteWeb-AI.github.io
git add search_index.json && git commit -m "Rebuild search index" && git push
```

### 修改搜索权重

编辑 `static/js/search-app.js` 中的 `boost` 对象（第 48 行附近）。

### 修改搜索引擎样式

编辑 `static/css/search-app.css`。

### 修改主页样式

编辑 `static/css/index.css`。"Explore Websites" 按钮样式在 `.explore-btn` 类中。

### 本地快速测试

```bash
cd /home/xiaoyizhang/SimulatedInternet/InfiniteWeb-AI.github.io
python3 -m http.server 8080
# 浏览器访问 http://localhost:8080/
```

---

## 9. 注意事项

1. **不要提交 node_modules**：构建工具的依赖不应进入部署仓库
2. **排除 logs/ 和 data/**：这些文件占项目 95% 以上的空间，搜索引擎不需要
3. **GitHub Pages 构建延迟**：push 后通常 1-2 分钟生效，偶尔可能更长
4. **MiniSearch CDN**：如果 CDN 不可用，搜索页面将无法工作。可考虑将 minisearch.min.js 下载到 `static/js/` 作为备份
5. **网站文件夹命名**：必须以 `数字_` 开头（如 `1_hawaii_vacation_rent`），构建脚本通过正则 `/^\d+_/` 过滤
6. **`search.css` 和 `gallery.json`**：这是旧版 gallery 页面的残留文件，目前未使用，可安全删除
7. **`demos/placeholder/`**：旧占位 demo，目前未使用，可安全删除
