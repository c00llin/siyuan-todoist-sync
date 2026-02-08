# 思源 Todoist 同步插件

将思源笔记中的任务发送到 Todoist，并自动同步完成状态。

## 功能

- **发送到 Todoist**：点击块图标菜单或输入 `/todoist` 创建任务
- **自动转换**：普通块自动转换为任务块（复选框）
- **任务标记**：为块添加 `#task#` 标签，便于识别
- **双向链接**：在思源块中添加 `[»link«](todoist_url)` 链接，在 Todoist 任务描述中添加 `[»SiYuan task](siyuan://blocks/...)` 链接
- **完成同步**：在 Todoist 中完成的任务会自动在思源中勾选，并添加 `✔︎` 标记
- **可配置**：设置项目、分区、标签和同步间隔

## 安装

### 从思源集市安装（推荐）
1. 打开 思源 > 设置 > 集市 > 插件
2. 搜索「Todoist Sync」
3. 点击安装
4. 启用插件

### 手动安装
1. 构建插件（见下方说明）
2. 将 `dist/` 中的内容复制到 `{工作空间}/data/plugins/siyuan-todoist-sync/`
3. 重启思源或重新加载插件

## 使用方法

### 发送任务到 Todoist

**方式一 — 块图标菜单：**
1. 点击块图标（块左侧的圆点按钮）
2. 从菜单中选择 **发送到 Todoist**

**方式二 — 斜杠命令：**
1. 在任意块中输入 `/todoist`（或 `/todo`、`/task`、`/sendtotodoist`）
2. 从斜杠菜单中选择 **发送到 Todoist**

以上两种方式都会：
   - 如果不是任务块，自动转换为任务块（复选框）
   - 添加 `#task#` 标签
   - 发送到 Todoist，并在描述中包含返回思源的链接
   - 在块中添加 `[»link«](todoist_url)` 指向 Todoist 任务

### 自动完成同步
当你在 Todoist 中完成从思源发送的任务时：
- 插件按可配置的间隔轮询 Todoist（默认：5 分钟）
- 通过配置的标签（如 `siyuan`）筛选已完成的任务
- 通过 Todoist 任务描述中的 `siyuan://blocks/...` 链接定位思源块
- 自动勾选思源中的复选框，并在链接后添加 `✔︎`

## 配置

打开插件设置（设置 > 集市 > 已下载 > Todoist Sync > 齿轮图标）：

| 设置项 | 说明 | 默认值 |
|--------|------|--------|
| **API 令牌** | 你的 Todoist 个人 API 令牌（设置 > 集成 > 开发者） | — |
| **项目** | 新任务的 Todoist 项目名称（留空则使用收件箱） | _（空）_ |
| **分区** | 项目中的分区名称（可选） | _（空）_ |
| **标签** | 从思源创建的任务所添加的标签 | `siyuan` |
| **斜杠关键词** | 触发斜杠命令的关键词，用逗号分隔 | `sendtotodoist, todoist, todo, task` |
| **同步间隔** | 检查已完成任务的频率（分钟） | `5` |

## 构建插件

### 使用 Docker（推荐）

1. **构建并启动容器：**
   ```bash
   docker-compose up -d
   ```

2. **进入容器：**
   ```bash
   docker exec -it siyuan-todoist-plugin-dev sh
   ```

3. **在容器内安装依赖：**
   ```bash
   npm install
   ```

4. **构建插件：**
   ```bash
   npm run build
   ```

   或使用开发模式（自动重新构建）：
   ```bash
   npm run dev
   ```

5. **退出容器：**
   ```bash
   exit
   ```

构建后的插件位于 `dist/` 目录中。

### 不使用 Docker

如果本地已安装 Node.js：

```bash
npm install
npm run build
```

## 贡献

欢迎贡献！请随时提交 Pull Request。

## 许可证

[MIT](https://github.com/c00llin/siyuan-todoist-sync/blob/main/LICENSE)

## 更新日志

查看 [CHANGELOG.md](https://github.com/c00llin/siyuan-todoist-sync/blob/main/CHANGELOG.md) 了解版本历史。
