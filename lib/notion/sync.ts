import { notion } from "./client";

interface NotionPage {
  id: string;
  title: string;
  content: string;
  lastEditedTime: string;
}

export async function fetchNotionPages(): Promise<NotionPage[]> {
  const client = notion;
  if (!client) {
    throw new Error("NOTION_API_KEY is not defined in environment variables");
  }

  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!databaseId) {
    throw new Error("NOTION_DATABASE_ID is not defined in environment variables");
  }

  const response = await (client.databases as any).query({
    database_id: databaseId,
  });

  const pages: NotionPage[] = [];

  for (const page of response.results) {
    if (!("properties" in page)) continue;

    const id = page.id;
    const lastEditedTime = page.last_edited_time;

    let title = "";
    for (const prop of Object.values(page.properties) as any[]) {
      if (prop.type === "title" && prop.title.length > 0) {
        title = prop.title.map((t: any) => t.plain_text).join("");
        break;
      }
    }

    const blocks = await client.blocks.children.list({
      block_id: id,
    });

    const content = blocks.results
      .map((block: any) => {
        if (!("type" in block)) return "";
        const blockType = block.type as string;
        const blockData = block[blockType];
        if (blockData?.rich_text) {
          return blockData.rich_text.map((t: any) => t.plain_text).join("");
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");

    pages.push({
      id,
      title,
      content,
      lastEditedTime,
    });
  }

  return pages;
}
