import { TodoistClient } from "./api/todoist";
import { getBlockKramdown, updateBlock } from "./api/siyuan";
import { markTaskComplete } from "./kramdown";

export class TaskSyncManager {
    private intervalId: ReturnType<typeof setInterval> | null = null;
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
        }
    }

    private async processCompletedTask(task: { description?: string; content?: string }): Promise<void> {
        // Extract SiYuan block ID from the task description
        const siyuanLinkMatch = task.description?.match(
            /siyuan:\/\/blocks\/([a-zA-Z0-9-]+)/,
        );

        if (!siyuanLinkMatch) {
            return;
        }

        const blockId = siyuanLinkMatch[1];

        try {
            const blockData = await getBlockKramdown(blockId);
            if (!blockData || !blockData.kramdown) {
                console.warn(`[todoist-sync] Block ${blockId} not found, skipping`);
                return;
            }

            const kramdown = blockData.kramdown;

            // Check if already completed
            if (/\[x\]/.test(kramdown)) {
                return;
            }

            const updatedKramdown = markTaskComplete(kramdown);
            await updateBlock(blockId, updatedKramdown);
            console.log(`[todoist-sync] Marked block ${blockId} as completed`);
        } catch (error) {
            console.error(`[todoist-sync] Error processing block ${blockId}:`, error);
        }
    }
}
