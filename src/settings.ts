import { Dialog, showMessage } from "siyuan";
import { TodoistClient } from "./api/todoist";

export interface PluginSettings {
    apiToken: string;
    projectName: string;
    sectionName: string;
    defaultLabel: string;
    slashKeywords: string;
    syncInterval: number;
    lastSyncTime: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    apiToken: "",
    projectName: "",
    sectionName: "",
    defaultLabel: "siyuan",
    slashKeywords: "sendtotodoist, todoist, todo, task",
    syncInterval: 5,
    lastSyncTime: "",
};

export function showSettingsDialog(
    settings: PluginSettings,
    todoistClient: TodoistClient,
    i18n: Record<string, string>,
    onSave: (settings: PluginSettings) => Promise<void>,
): void {
    const dialog = new Dialog({
        title: i18n.settingsTitle || "Todoist Sync Settings",
        content: `<div id="todoist-sync-settings" style="padding: 20px;">
            <div class="b3-label" style="margin-bottom: 16px;">
                <div class="b3-label__text" style="margin-bottom: 8px;">${i18n.apiKey || "Todoist API Token"}</div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input id="ts-api-token" type="password" class="b3-text-field fn__flex-1"
                           placeholder="${i18n.apiKeyDesc || "Enter your Todoist API token"}" />
                    <button id="ts-validate-btn" class="b3-button">${i18n.validate || "Validate"}</button>
                </div>
            </div>
            <div class="b3-label" style="margin-bottom: 16px;">
                <div class="b3-label__text" style="margin-bottom: 8px;">${i18n.project || "Project"}</div>
                <input id="ts-project" type="text" class="b3-text-field" style="width: 300px;"
                       placeholder="${i18n.projectDesc || "Project name (leave empty for Inbox)"}" />
                <div class="b3-label__text" style="margin-top: 4px; font-size: 12px; color: var(--b3-theme-on-surface-light);">
                    ${i18n.projectDesc || "Todoist project name (leave empty for Inbox)"}
                </div>
            </div>
            <div class="b3-label" style="margin-bottom: 16px;">
                <div class="b3-label__text" style="margin-bottom: 8px;">${i18n.section || "Section"}</div>
                <input id="ts-section" type="text" class="b3-text-field" style="width: 300px;"
                       placeholder="${i18n.sectionDesc || "Section name (optional)"}" />
                <div class="b3-label__text" style="margin-top: 4px; font-size: 12px; color: var(--b3-theme-on-surface-light);">
                    ${i18n.sectionDesc || "Section name within the project (optional)"}
                </div>
            </div>
            <div class="b3-label" style="margin-bottom: 16px;">
                <div class="b3-label__text" style="margin-bottom: 8px;">${i18n.defaultLabel || "Label"}</div>
                <input id="ts-label" type="text" class="b3-text-field" style="width: 200px;"
                       placeholder="siyuan" />
                <div class="b3-label__text" style="margin-top: 4px; font-size: 12px; color: var(--b3-theme-on-surface-light);">
                    ${i18n.defaultLabelDesc || "Label added to tasks created from SiYuan"}
                </div>
            </div>
            <div class="b3-label" style="margin-bottom: 16px;">
                <div class="b3-label__text" style="margin-bottom: 8px;">${i18n.slashKeywords || "Slash Keywords"}</div>
                <input id="ts-slash-keywords" type="text" class="b3-text-field" style="width: 300px;"
                       placeholder="sendtotodoist, todoist, todo, task" />
                <div class="b3-label__text" style="margin-top: 4px; font-size: 12px; color: var(--b3-theme-on-surface-light);">
                    ${i18n.slashKeywordsDesc || "Comma-separated keywords that trigger the /slash command (e.g. sendtotodoist, todoist, todo, task)"}
                </div>
            </div>
            <div class="b3-label" style="margin-bottom: 16px;">
                <div class="b3-label__text" style="margin-bottom: 8px;">${i18n.syncInterval || "Sync Interval (minutes)"}</div>
                <input id="ts-interval" type="number" class="b3-text-field" min="1"
                       style="width: 80px;" />
                <div class="b3-label__text" style="margin-top: 4px; font-size: 12px; color: var(--b3-theme-on-surface-light);">
                    ${i18n.syncIntervalDesc || "How often to check for completed tasks in Todoist"}
                </div>
            </div>
        </div>`,
        width: "600px",
        height: "550px",
    });

    const container = dialog.element.querySelector("#todoist-sync-settings") as HTMLElement;
    if (!container) return;

    const tokenInput = container.querySelector("#ts-api-token") as HTMLInputElement;
    const validateBtn = container.querySelector("#ts-validate-btn") as HTMLButtonElement;
    const projectInput = container.querySelector("#ts-project") as HTMLInputElement;
    const sectionInput = container.querySelector("#ts-section") as HTMLInputElement;
    const labelInput = container.querySelector("#ts-label") as HTMLInputElement;
    const slashKeywordsInput = container.querySelector("#ts-slash-keywords") as HTMLInputElement;
    const intervalInput = container.querySelector("#ts-interval") as HTMLInputElement;

    // Populate current values
    tokenInput.value = settings.apiToken;
    projectInput.value = settings.projectName;
    sectionInput.value = settings.sectionName;
    labelInput.value = settings.defaultLabel;
    slashKeywordsInput.value = settings.slashKeywords;
    intervalInput.value = String(settings.syncInterval);

    // Helper to save current state
    const save = async () => {
        settings.apiToken = tokenInput.value.trim();
        settings.projectName = projectInput.value.trim();
        settings.sectionName = sectionInput.value.trim();
        settings.defaultLabel = labelInput.value.trim();
        settings.slashKeywords = slashKeywordsInput.value.trim();
        settings.syncInterval = Math.max(1, parseInt(intervalInput.value, 10) || 5);
        await onSave(settings);
    };

    // Validate button
    validateBtn.addEventListener("click", async () => {
        validateBtn.disabled = true;
        validateBtn.textContent = "...";
        todoistClient.setToken(tokenInput.value.trim());

        const valid = await todoistClient.validateToken();
        if (valid) {
            showMessage(i18n.apiKeyValid || "API token is valid");
            await save();
        } else {
            showMessage(i18n.apiKeyInvalid || "API token is invalid", -1, "error");
        }

        validateBtn.disabled = false;
        validateBtn.textContent = i18n.validate || "Validate";
    });

    // Save on field changes
    projectInput.addEventListener("change", save);
    sectionInput.addEventListener("change", save);
    labelInput.addEventListener("change", save);
    slashKeywordsInput.addEventListener("change", save);
    intervalInput.addEventListener("change", save);
    tokenInput.addEventListener("change", save);
}
