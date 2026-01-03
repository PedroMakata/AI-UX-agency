import { NextRequest, NextResponse } from 'next/server';
import { notion } from '@/lib/notion/client';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

// Convert Notion blocks to our note content format
function convertBlocksToContent(blocks: any[]): any[] {
  return blocks.map((block: any) => {
    if (!('type' in block)) return null;

    const blockType = block.type as string;
    const blockData = block[blockType];

    if (!blockData?.rich_text) return null;

    const text = blockData.rich_text.map((t: any) => t.plain_text).join('');
    if (!text) return null;

    // Map Notion block types to our content types
    let type = 'paragraph';
    if (blockType === 'heading_1') type = 'heading';
    else if (blockType === 'heading_2' || blockType === 'heading_3') type = 'subheading';
    else if (blockType === 'bulleted_list_item' || blockType === 'numbered_list_item') type = 'bullet';
    else if (blockType === 'to_do') type = 'todo';

    const contentBlock: any = {
      id: block.id,
      type,
      content: text
    };

    // Add checked property for todos
    if (blockType === 'to_do') {
      contentBlock.checked = blockData.checked || false;
    }

    return contentBlock;
  }).filter(Boolean);
}

// POST - Sync Notion pages as notes
export async function POST(request: NextRequest) {
  try {
    if (!notion) {
      return NextResponse.json(
        { error: 'Notion API key not configured. Add NOTION_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Get project settings to find connected Notion database
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('settings')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const databaseId = project.settings?.notionDatabaseId;
    if (!databaseId) {
      return NextResponse.json({
        error: 'No Notion database connected to this project. Connect a database first.'
      }, { status: 400 });
    }

    // Query all pages from the Notion database
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 100
    });

    let totalPages = 0;
    let newPages = 0;
    let updatedPages = 0;

    for (const page of response.results as any[]) {
      totalPages++;

      // Get page title
      let title = 'Untitled';
      for (const prop of Object.values(page.properties) as any[]) {
        if (prop.type === 'title' && prop.title?.length > 0) {
          title = prop.title.map((t: any) => t.plain_text).join('');
          break;
        }
      }

      // Fetch page content (blocks)
      const blocks = await notion.blocks.children.list({ block_id: page.id });
      const content = convertBlocksToContent(blocks.results);

      // Check if note with this Notion page ID already exists
      const { data: existingNote } = await supabase
        .from('notes')
        .select('id')
        .eq('project_id', projectId)
        .eq('notion_page_id', page.id)
        .single();

      if (existingNote) {
        // Update existing note
        await supabase
          .from('notes')
          .update({
            title,
            content,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingNote.id);
        updatedPages++;
      } else {
        // Create new note
        await supabase
          .from('notes')
          .insert({
            project_id: projectId,
            title,
            content,
            notion_page_id: page.id,
            source: 'notion'
          });
        newPages++;
      }
    }

    // Update sync timestamp in project settings
    await supabase
      .from('projects')
      .update({
        settings: {
          ...project.settings,
          lastNotionSync: new Date().toISOString()
        }
      })
      .eq('id', projectId);

    return NextResponse.json({
      success: true,
      totalPages,
      newPages,
      updatedPages,
      syncedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Notion sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed. Check your Notion connection.' },
      { status: 500 }
    );
  }
}
