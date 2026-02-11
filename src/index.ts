import { Plugin, showMessage } from "siyuan";
import { getBlockKramdown, updateBlock } from "./api/siyuan";
import { TodoistClient } from "./api/todoist";
import {
  showSettingsDialog,
  PluginSettings,
  DEFAULT_SETTINGS,
} from "./settings";
import { TaskSyncManager } from "./sync";
import {
  isTaskBlock,
  convertToTaskBlock,
  addTagToFirstLine,
  addTodoistLink,
  extractTaskContent,
  hasTodoistLink,
  removeSlashTrigger,
} from "./kramdown";

const STORAGE_KEY = "settings.json";

export default class TodoistSyncPlugin extends Plugin {
  private settings: PluginSettings = { ...DEFAULT_SETTINGS };
  private todoistClient: TodoistClient = new TodoistClient("");
  private syncManager!: TaskSyncManager;
  private boundBlockIconClick!: (event: CustomEvent) => void;

  async onload() {
    console.log("[todoist-sync] Loading Todoist Sync Plugin");

    await this.loadSettings();

    this.todoistClient = new TodoistClient(this.settings.apiToken);

    this.syncManager = new TaskSyncManager(
      this.todoistClient,
      () => this.settings,
      async (time) => {
        this.settings.lastSyncTime = time;
        await this.saveSettings();
      },
    );

    // Register block icon context menu handler
    this.boundBlockIconClick = this.onBlockIconClick.bind(this) as (
      event: CustomEvent,
    ) => void;
    this.eventBus.on("click-blockicon", this.boundBlockIconClick);

    // Register slash command
    this.registerSlashCommand();

    // Start sync polling if API token is configured
    if (this.settings.apiToken) {
      this.syncManager.start();
    }
  }

  onunload() {
    console.log("[todoist-sync] Unloading Todoist Sync Plugin");
    this.syncManager.stop();
    this.eventBus.off("click-blockicon", this.boundBlockIconClick);
  }

  uninstall() {
    this.removeData(STORAGE_KEY).catch(
      (e: { msg?: string; message?: string }) => {
        showMessage(
          `Failed to remove settings: ${e.msg || e.message}`,
          -1,
          "error",
        );
      },
    );
  }

  // --- Settings ---

  private async loadSettings() {
    const data = await this.loadData(STORAGE_KEY);
    this.settings = { ...DEFAULT_SETTINGS, ...(data || {}) };
  }

  private async saveSettings() {
    await this.saveData(STORAGE_KEY, this.settings);
  }

  openSetting() {
    showSettingsDialog(
      { ...this.settings },
      this.todoistClient,
      this.i18n as Record<string, string>,
      async (newSettings: PluginSettings) => {
        const oldInterval = this.settings.syncInterval;
        const oldToken = this.settings.apiToken;
        this.settings = newSettings;
        await this.saveSettings();

        // Update client token if changed
        if (newSettings.apiToken !== oldToken) {
          this.todoistClient.setToken(newSettings.apiToken);
        }

        // Restart sync if interval changed or token changed
        if (
          newSettings.syncInterval !== oldInterval ||
          newSettings.apiToken !== oldToken
        ) {
          if (newSettings.apiToken) {
            this.syncManager.restart();
          } else {
            this.syncManager.stop();
          }
        }

        // Update slash command filter keywords
        if (this.protyleSlash.length > 0) {
          this.protyleSlash[0].filter = this.parseSlashKeywords();
        }
      },
    );
  }

  // --- Slash Command ---

  private parseSlashKeywords(): string[] {
    const raw =
      this.settings.slashKeywords || "sendtotodoist, todoist, todo, task";
    return raw
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }

  private registerSlashCommand() {
    this.protyleSlash = [
      {
        filter: this.parseSlashKeywords(),
        html: `<div class="b3-list-item__first"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" class="b3-list-item__graphic"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg><span class="b3-list-item__text">${this.i18n.sendToTodoist || "Send to Todoist"}</span></div>`,
        id: "send-to-todoist",
        callback: (_protyle: unknown, nodeElement: HTMLElement) => {
          this.sendSingleBlockToTodoist(nodeElement, true);
        },
      },
    ];
  }

  // --- Context Menu Handler ---

  private onBlockIconClick(
    event: CustomEvent<{
      menu: { addItem: (option: Record<string, unknown>) => void };
      blockElements: HTMLElement[];
    }>,
  ) {
    const detail = event.detail;

    detail.menu.addItem({
      iconHTML:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" style="margin-right: 4px;"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
      label: this.i18n.sendToTodoist || "Send to Todoist",
      click: () => {
        this.sendBlockToTodoist(detail.blockElements);
      },
    });
  }

  // --- Core: Send Block to Todoist ---

  private async sendBlockToTodoist(blockElements: HTMLElement[]) {
    if (!this.settings.apiToken) {
      showMessage(
        (this.i18n.apiKeyRequired as string) ||
          "Please configure your Todoist API token in settings",
        -1,
        "error",
      );
      return;
    }

    for (const blockEl of blockElements) {
      await this.sendSingleBlockToTodoist(blockEl);
    }
  }

  private async sendSingleBlockToTodoist(
    blockEl: HTMLElement,
    fromSlash = false,
  ) {
    if (!this.settings.apiToken) {
      showMessage(
        (this.i18n.apiKeyRequired as string) ||
          "Please configure your Todoist API token in settings",
        -1,
        "error",
      );
      return;
    }

    const blockId = blockEl.getAttribute("data-node-id");
    if (!blockId) return;

    // Check DOM to see if this block is already inside a todo list item.
    // When the slash command fires inside a Cmd+L todo, blockEl is the child
    // paragraph — getBlockKramdown returns plain text without the checkbox,
    // so we need this DOM-based check to avoid adding a duplicate checkbox.
    const isAlreadyTodo =
      blockEl.closest('[data-subtype="t"][data-type="NodeListItem"]') !== null;

    try {
      // Step 1: Get block kramdown
      const blockData = await getBlockKramdown(blockId);
      if (!blockData || !blockData.kramdown) {
        showMessage("Failed to get block content", -1, "error");
        return;
      }

      let kramdown = blockData.kramdown;

      // Step 1b: Remove slash trigger text if invoked from slash command
      if (fromSlash) {
        kramdown = removeSlashTrigger(kramdown, this.parseSlashKeywords());
      }

      // Step 2: Check for duplicate
      if (hasTodoistLink(kramdown)) {
        showMessage(
          (this.i18n.taskAlreadySent as string) ||
            "This block has already been sent to Todoist",
          3000,
          "info",
        );
        return;
      }

      // Step 3: Extract clean text for Todoist BEFORE modifying kramdown
      const taskContent = extractTaskContent(kramdown);

      // Step 4: Convert to task block if not already
      if (!isAlreadyTodo && !isTaskBlock(kramdown)) {
        kramdown = convertToTaskBlock(kramdown);
      }

      // Step 5: Add #task# tag to first line
      kramdown = addTagToFirstLine(kramdown, "#task#");

      // Step 6: Resolve project/section names to IDs
      let projectId: string | undefined;
      let sectionId: string | undefined;

      if (this.settings.projectName) {
        const projects = await this.todoistClient.getProjects();
        const match = projects.find(
          (p) =>
            p.name.toLowerCase() === this.settings.projectName.toLowerCase(),
        );
        if (match) {
          projectId = match.id;
        } else {
          showMessage(
            `Project "${this.settings.projectName}" not found in Todoist`,
            3000,
            "error",
          );
        }
      }

      if (this.settings.sectionName && projectId) {
        const sections = await this.todoistClient.getSections(projectId);
        const match = sections.find(
          (s) =>
            s.name.toLowerCase() === this.settings.sectionName.toLowerCase(),
        );
        if (match) {
          sectionId = match.id;
        } else {
          showMessage(
            `Section "${this.settings.sectionName}" not found in Todoist`,
            3000,
            "error",
          );
        }
      }

      // Warn if no label is configured (completion sync won't work without it)
      if (!this.settings.defaultLabel) {
        showMessage(
          (this.i18n.noLabelWarning as string) ||
            "No label configured — completion sync from Todoist won't work",
          5000,
          "info",
        );
      }

      // Step 7: Create task in Todoist
      const todoistTask = await this.todoistClient.createTask({
        content: taskContent,
        description: `[\u00BBSiYuan task](siyuan://blocks/${blockId})`,
        projectId,
        sectionId,
        labels: this.settings.defaultLabel
          ? [this.settings.defaultLabel]
          : undefined,
      });

      // Step 8: Add Todoist link back to block content
      const todoistUrl = `https://app.todoist.com/app/task/${todoistTask.id}`;
      kramdown = addTodoistLink(kramdown, todoistUrl);

      // Step 9: Update block in SiYuan
      await updateBlock(blockId, kramdown);

      showMessage((this.i18n.taskSent as string) || "Task sent to Todoist");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[todoist-sync] Error sending block to Todoist:", error);
      showMessage(
        `${(this.i18n.taskSendFailed as string) || "Failed to send task to Todoist"}: ${msg}`,
        -1,
        "error",
      );
    }
  }
}
