import { NextRequest, NextResponse } from 'next/server';
import { notion } from '@/lib/notion/client';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

// POST - Connect a Notion database to a project
export async function POST(request: NextRequest) {
  try {
    if (!notion) {
      return NextResponse.json(
        { error: 'Notion API key not configured. Add NOTION_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    const { projectId, notionDatabaseId } = await request.json();

    if (!projectId || !notionDatabaseId) {
      return NextResponse.json(
        { error: 'projectId and notionDatabaseId are required' },
        { status: 400 }
      );
    }

    // Verify the database exists and is accessible
    try {
      await notion.databases.retrieve({ database_id: notionDatabaseId });
    } catch {
      return NextResponse.json(
        { error: 'Cannot access Notion database. Make sure the integration has access to this database.' },
        { status: 400 }
      );
    }

    // Save the Notion database ID to project settings
    const supabase = getSupabase();
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('settings')
      .eq('id', projectId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        settings: {
          ...project.settings,
          notionDatabaseId
        }
      })
      .eq('id', projectId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save Notion connection' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notion database connected successfully'
    });

  } catch (error) {
    console.error('Notion connect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Fetch pages from connected Notion database
export async function GET(request: NextRequest) {
  try {
    if (!notion) {
      return NextResponse.json(
        { error: 'Notion API key not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const pageId = searchParams.get('pageId');

    // If pageId is provided, fetch single page content
    if (pageId) {
      const blocks = await notion.blocks.children.list({ block_id: pageId });

      const content = blocks.results
        .map((block: any) => {
          if (!('type' in block)) return '';
          const blockType = block.type as string;
          const blockData = block[blockType];
          if (blockData?.rich_text) {
            return blockData.rich_text.map((t: any) => t.plain_text).join('');
          }
          return '';
        })
        .filter(Boolean)
        .join('\n');

      return NextResponse.json({
        success: true,
        page: { id: pageId, content }
      });
    }

    // Otherwise, list pages from project's connected database
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { data: project, error } = await supabase
      .from('projects')
      .select('settings')
      .eq('id', projectId)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const databaseId = project.settings?.notionDatabaseId;
    if (!databaseId) {
      return NextResponse.json({
        success: true,
        pages: [],
        connected: false,
        message: 'No Notion database connected to this project'
      });
    }

    // Query the Notion database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (notion as any).databases.query({
      database_id: databaseId,
      page_size: 100
    });

    const pages = response.results.map((page: any) => {
      let title = 'Untitled';
      for (const prop of Object.values(page.properties) as any[]) {
        if (prop.type === 'title' && prop.title?.length > 0) {
          title = prop.title.map((t: any) => t.plain_text).join('');
          break;
        }
      }

      return {
        id: page.id,
        title,
        lastEdited: page.last_edited_time
      };
    });

    return NextResponse.json({
      success: true,
      pages,
      connected: true,
      hasMore: response.has_more
    });

  } catch (error) {
    console.error('Notion API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Notion pages' },
      { status: 500 }
    );
  }
}
