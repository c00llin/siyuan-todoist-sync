# SiYuan Todoist Sync Plugin

Send tasks from SiYuan to Todoist and sync completions back automatically.

## Features

- **Send to Todoist**: Click the block icon menu or type `/todoist` to create a task
- **Auto-convert**: Regular blocks are automatically converted to task blocks (checkbox)
- **Task tagging**: Adds `#task#` tag to the block for easy identification
- **Bidirectional linking**: A `[»link«](todoist_url)` link is added to the SiYuan block, and a `[»SiYuan task](siyuan://blocks/...)` link is added to the Todoist task description
- **Completion sync**: Completed tasks in Todoist are automatically checked off in SiYuan with a `✔︎` marker
- **Configurable**: Set your preferred project, section, label, and sync interval

## Building the Plugin

### Using Docker (Recommended)

1. **Build and start the container:**
   ```bash
   docker-compose up -d
   ```

2. **Enter the container:**
   ```bash
   docker exec -it siyuan-todoist-plugin-dev sh
   ```

3. **Inside the container, install dependencies:**
   ```bash
   npm install
   ```

4. **Build the plugin:**
   ```bash
   npm run build
   ```

   Or for development with auto-rebuild:
   ```bash
   npm run dev
   ```

5. **Exit the container:**
   ```bash
   exit
   ```

The built plugin will be in the `dist/` directory.

### Without Docker

If you have Node.js installed locally:

```bash
npm install
npm run build
```

## Installation

### From SiYuan Marketplace (Recommended)
1. Open SiYuan > Settings > Marketplace > Plugins
2. Search for "Todoist Sync"
3. Click Install
4. Enable the plugin

### Manual Installation
1. Build the plugin (see above)
2. Copy the contents of `dist/` to `{workspace}/data/plugins/siyuan-todoist-sync/`
3. Restart SiYuan or reload plugins

## Usage

### Sending a Task to Todoist

**Option A — Block icon menu:**
1. Click the block icon (the dots in the gutter next to any block)
2. Select **Send to Todoist** from the context menu

**Option B — Slash command:**
1. Type `/todoist` (or `/todo`, `/task`, `/sendtotodoist`) in any block
2. Select **Send to Todoist** from the slash menu

Either way, the block will be:
   - Converted to a task block (checkbox) if it isn't already
   - Tagged with `#task#`
   - Sent to Todoist with a link back to SiYuan in the description
   - Updated with a `[»link«](todoist_url)` linking to the Todoist task

### Automatic Completion Sync
When you complete a task in Todoist that was sent from SiYuan:
- The plugin polls Todoist at a configurable interval (default: 5 minutes)
- Completed tasks are filtered by the configured label (e.g. `siyuan`)
- The SiYuan block is identified via the `siyuan://blocks/...` link in the Todoist task description
- The checkbox in SiYuan is automatically ticked and a `✔︎` is added after the link

## Configuration

Open the plugin settings (Settings > Marketplace > Downloaded > Todoist Sync > gear icon):

| Setting | Description | Default |
|---------|-------------|---------|
| **API Token** | Your Todoist personal API token (Settings > Integrations > Developer) | — |
| **Project** | Todoist project name for new tasks (leave empty for Inbox) | _(empty)_ |
| **Section** | Section name within the project (optional) | _(empty)_ |
| **Label** | Label added to tasks created from SiYuan | `siyuan` |
| **Slash Keywords** | Comma-separated keywords that trigger the `/` slash command | `sendtotodoist, todoist, todo, task` |
| **Sync Interval** | How often to check for completed tasks (minutes) | `5` |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT](LICENSE)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.
