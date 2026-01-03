import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const supabase = getSupabase();
    const { agentId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    // Fetch last 50 messages for this agent and project
    const { data: dbMessages, error } = await supabase
      .from('agent_messages')
      .select('role, content, created_at')
      .eq('project_id', projectId)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Error fetching history:', error);
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }

    const messages = (dbMessages || []).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('History API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
