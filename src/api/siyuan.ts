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

export async function getParentId(blockId: string): Promise<string | null> {
    const response = await fetchSyncPost("/api/query/sql", {
        stmt: `SELECT parent_id FROM blocks WHERE id = '${blockId}'`,
    });
    return response.data?.[0]?.parent_id ?? null;
}
