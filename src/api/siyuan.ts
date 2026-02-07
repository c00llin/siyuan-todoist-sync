import { fetchSyncPost } from "siyuan";

export async function getBlockKramdown(id: string): Promise<{ id: string; kramdown: string } | null> {
    const response = await fetchSyncPost("/api/block/getBlockKramdown", { id });
    return response.data || null;
}

export async function updateBlock(id: string, markdown: string): Promise<any> {
    const response = await fetchSyncPost("/api/block/updateBlock", {
        id,
        dataType: "markdown",
        data: markdown,
    });
    return response.data;
}
