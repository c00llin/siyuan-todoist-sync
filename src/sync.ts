import { TodoistClient } from "./api/todoist";
import { getBlockKramdown, updateBlock, getParentId } from "./api/siyuan";
import { markTaskComplete } from "./kramdown";

export class TaskSyncManager {
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private isPolling = false;
    private todoistClient: TodoistClient;
    private getSettings: () => { lastSyncTime: string; syncInterval: number; defaultLabel: string };
    private saveLastSyncTime: (time: string) => Promise<void>;

    constructor(
        todoistClient: TodoistClient,
        getSettings: () => { lastSyncTime: string; syncInterval: number; defaultLabel: string },
        saveLastSyncTime: (time: string) => Promise<void>,
    ) {
        this.todoistClient = todoistClient;
        this.getSettings = getSettings;
        this.saveLastSyncTime = saveLastSyncTime;
    }

    start(): void {
        this.stop();
        const settings = this.getSettings();
        const intervalMs = settings.syncInterval * 60 * 1000;

        // Run once immediately, then on interval
        this.pollCompletedTasks();
        this.intervalId = setInterval(() => this.pollCompletedTasks(), intervalMs);
    }

    stop(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    restart(): void {
        this.start();
    }

    private async pollCompletedTasks(): Promise<void> {
        if (this.isPolling) return;
        this.isPolling = true;
        try {
            const settings = this.getSettings();
            if (!settings.lastSyncTime) {
                // First run: set lastSyncTime to now, don't process old tasks
                await this.saveLastSyncTime(new Date().toISOString());
                return;
            }

            const since = settings.lastSyncTime;
            const now = new Date().toISOString();

            console.log(`[todoist-sync] Polling completed tasks since=${since} until=${now}`);
            const completedTasks = await this.todoistClient.getCompletedTasks(since, now);
            console.log(`[todoist-sync] Found ${completedTasks.length} completed tasks`);

            for (const task of completedTasks) {
                // Filter by label (client-side) if configured
                if (settings.defaultLabel) {
                    const hasLabel = task.labels?.includes(settings.defaultLabel);
                    if (!hasLabel) continue;
                }

                await this.processCompletedTask(task);
            }

            await this.saveLastSyncTime(now);
        } catch (error) {
            console.error("[todoist-sync] Error polling completed tasks:", error);
        } finally {
            this.isPolling = false;
        }
    }

    private async processCompletedTask(task: { description?: string; content?: string }): Promise<void> {
        const siyuanLinkMatch = task.description?.match(
            /siyuan:\/\/blocks\/([a-zA-Z0-9-]+)/,
        );
        if (!siyuanLinkMatch) return;

        const blockId = siyuanLinkMatch[1];

        try {
            let targetId = blockId;
            let blockData = await getBlockKramdown(blockId);
            if (!blockData || !blockData.kramdown) {
                console.warn(`[todoist-sync] Block ${blockId} not found, skipping`);
                return;
            }

            // If the fetched block has no checkbox, it's a child paragraph inside
            // a NodeListItem. The [ ] lives on the parent. Walk up one level.
            // This handles tasks created before the send-side fix stored the
            // parent NodeListItem's ID.
            const hasCheckbox = /\[[ x]\]/.test(blockData.kramdown);
            if (!hasCheckbox) {
                const parentId = await getParentId(blockId);
                if (parentId) {
                    const parentData = await getBlockKramdown(parentId);
                    if (parentData && /\[ \]/.test(parentData.kramdown)) {
                        targetId = parentId;
                        blockData = parentData;
                    } else {
                        console.warn(`[todoist-sync] Could not find checkbox block for ${blockId}, skipping`);
                        return;
                    }
                } else {
                    console.warn(`[todoist-sync] No parent found for block ${blockId}, skipping`);
                    return;
                }
            }

            // Already completed
            if (/\[x\]/.test(blockData.kramdown)) {
                return;
            }

            const updatedKramdown = markTaskComplete(blockData.kramdown);
            await updateBlock(targetId, updatedKramdown);
            console.log(`[todoist-sync] Marked block ${targetId} as completed`);
        } catch (error) {
            console.error(`[todoist-sync] Error processing block ${blockId}:`, error);
        }
    }
}
