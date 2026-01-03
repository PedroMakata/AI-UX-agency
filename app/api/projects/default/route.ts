import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

const DEFAULT_PROJECT_NAME = 'Default Project';

export async function GET() {
  try {
    const supabase = getSupabase();

    // Try to find existing default project
    const { data: existingProject, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('name', DEFAULT_PROJECT_NAME)
      .single();

    if (existingProject) {
      return NextResponse.json({ project: existingProject });
    }

    // Create default project if it doesn't exist
    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert({
        name: DEFAULT_PROJECT_NAME,
        description: 'Default project for file uploads and agent interactions',
        status: 'active'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating default project:', createError);
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ project: newProject });

  } catch (error) {
    console.error('Default project error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get default project';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
