export interface TodoistTask {
    id: string;
    url: string;
    content: string;
    description: string;
    labels: string[];
    project_id: string;
    section_id: string | null;
    is_completed: boolean;
    completed_at: string | null;
}

export interface TodoistProject {
    id: string;
    name: string;
    color: string;
    is_inbox_project: boolean;
}

export interface TodoistSection {
    id: string;
    name: string;
    project_id: string;
    order: number;
}

export interface CreateTaskArgs {
    content: string;
    description?: string;
    projectId?: string;
    sectionId?: string;
    labels?: string[];
}

export class TodoistClient {
    private baseUrl = "https://api.todoist.com/api/v1";
    private token: string;

    constructor(token: string) {
        this.token = token;
    }

    setToken(token: string) {
        this.token = token;
    }

    private async request<T>(
        method: string,
        path: string,
        body?: Record<string, unknown>,
        params?: Record<string, string>,
    ): Promise<T> {
        const url = new URL(`${this.baseUrl}${path}`);
        if (params) {
            Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        }

        const headers: Record<string, string> = {
            Authorization: `Bearer ${this.token}`,
        };
        if (body) {
            headers["Content-Type"] = "application/json";
        }

        const response = await fetch(url.toString(), {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const text = await response.text().catch(() => "");
            throw new Error(`Todoist API error: ${response.status} ${response.statusText} ${text}`);
        }

        if (response.status === 204) {
            return {} as T;
        }

        return response.json();
    }

    async createTask(args: CreateTaskArgs): Promise<TodoistTask> {
        const body: Record<string, unknown> = {
            content: args.content,
        };
        if (args.description) body.description = args.description;
        if (args.projectId) body.project_id = args.projectId;
        if (args.sectionId) body.section_id = args.sectionId;
        if (args.labels && args.labels.length > 0) body.labels = args.labels;

        return this.request<TodoistTask>("POST", "/tasks", body);
    }

    async getProjects(): Promise<TodoistProject[]> {
        const result = await this.request<{ results: TodoistProject[]; next_cursor: string | null }>(
            "GET", "/projects",
        );
        return result.results || [];
    }

    async getSections(projectId?: string): Promise<TodoistSection[]> {
        const params: Record<string, string> = {};
        if (projectId) params.project_id = projectId;
        const result = await this.request<{ results: TodoistSection[]; next_cursor: string | null }>(
            "GET", "/sections", undefined, params,
        );
        return result.results || [];
    }

    async getCompletedTasks(since: string, until: string): Promise<TodoistTask[]> {
        const params: Record<string, string> = { since, until };
        // Correct v1 API endpoint: /tasks/completed/by_completion_date (NOT completed_by_)
        const result = await this.request<{ items: TodoistTask[]; next_cursor: string | null }>(
            "GET",
            "/tasks/completed/by_completion_date",
            undefined,
            params,
        );
        return result.items || [];
    }

    async validateToken(): Promise<boolean> {
        try {
            await this.getProjects();
            return true;
        } catch {
            return false;
        }
    }
}
