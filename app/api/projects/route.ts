import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

// GET all projects with stats
export async function GET() {
  try {
    const supabase = getSupabase();

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get stats for each project
    const projectsWithStats = await Promise.all(
      (projects || []).map(async (project) => {
        const [filesRes, messagesRes, wireframesRes, prototypesRes] = await Promise.all([
          supabase.from('files').select('id', { count: 'exact' }).eq('project_id', project.id),
          supabase.from('agent_messages').select('id', { count: 'exact' }).eq('project_id', project.id),
          supabase.from('wireframes').select('id', { count: 'exact' }).eq('project_id', project.id),
          supabase.from('vibe_prototypes').select('id', { count: 'exact' }).eq('project_id', project.id),
        ]);

        return {
          ...project,
          stats: {
            files: filesRes.count || 0,
            messages: messagesRes.count || 0,
            wireframes: wireframesRes.count || 0,
            prototypes: prototypesRes.count || 0,
          }
        };
      })
    );

    return NextResponse.json({ projects: projectsWithStats });
  } catch (error) {
    console.error('Error fetching projects:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch projects';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST create new project
export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const body = await request.json();

    const { name, description, client_name, client_email } = body;

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name,
        description: description || '',
        client_name: client_name || null,
        client_email: client_email || null,
        status: 'active',
        settings: {
          agents: ['riley'], // Riley as default agent
          customAgents: []
        }
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error creating project:', error);
    const message = error instanceof Error ? error.message : 'Failed to create project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
