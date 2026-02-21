# Changelog

## v1.0.3 (2026-02-21)

- Fix completion sync not ticking checkboxes in SiYuan when tasks are completed in Todoist (#1)
- Store parent NodeListItem block ID for reliable checkbox lookup
- Add backward-compatible parent block fallback for existing synced tasks
- Prevent overlapping sync polls from racing

## v1.0.2 (2026-02-11)

- Support for Todoist's new API version
- More robust handling of creating todo blocks when the block is already a block

## v1.0.1 (2026-02-08)

- Address bazaar review: use full GitHub URLs in READMEs, remove unnecessary files from package

## v1.0.0 (Initial Release)

- Send blocks to Todoist via block icon context menu or `/todoist` slash command
- Auto-convert blocks to task blocks with `#task#` tag
- Bidirectional linking between SiYuan and Todoist
- Automatic completion sync from Todoist to SiYuan
- Configurable project, section, label, slash keywords, and sync interval
