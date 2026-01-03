import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

// GET single project with stats
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const supabase = getSupabase();

    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get stats
    const [filesRes, messagesRes, wireframesRes, prototypesRes] = await Promise.all([
      supabase.from('files').select('id', { count: 'exact' }).eq('project_id', projectId),
      supabase.from('agent_messages').select('id', { count: 'exact' }).eq('project_id', projectId),
      supabase.from('wireframes').select('id', { count: 'exact' }).eq('project_id', projectId),
      supabase.from('vibe_prototypes').select('id', { count: 'exact' }).eq('project_id', projectId),
    ]);

    return NextResponse.json({
      project: {
        ...project,
        stats: {
          files: filesRes.count || 0,
          messages: messagesRes.count || 0,
          wireframes: wireframesRes.count || 0,
          prototypes: prototypesRes.count || 0,
        }
      }
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH update project (including agent settings)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const supabase = getSupabase();
    const body = await request.json();

    const { data: project, error } = await supabase
      .from('projects')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error updating project:', error);
    const message = error instanceof Error ? error.message : 'Failed to update project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE project
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const supabase = getSupabase();

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
