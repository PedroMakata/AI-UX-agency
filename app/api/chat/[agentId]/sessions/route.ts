import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

interface Message {
  role: string;
  content: string;
  created_at: string;
}

interface Session {
  id: string;
  date: string;
  topic: string;
  messageCount: number;
  firstMessageAt: string;
}

function generateTopic(messages: Message[]): string {
  // Find first user message
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (!firstUserMessage) return 'Konverzace';

  // Truncate to first 50 chars
  const content = firstUserMessage.content;
  if (content.length <= 50) return content;
  return content.substring(0, 47) + '...';
}

function groupMessagesByDate(messages: Message[]): Map<string, Message[]> {
  const groups = new Map<string, Message[]>();

  for (const msg of messages) {
    const date = new Date(msg.created_at).toISOString().split('T')[0];
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)!.push(msg);
  }

  return groups;
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

    // Fetch all messages for this agent and project
    const { data: dbMessages, error } = await supabase
      .from('agent_messages')
      .select('role, content, created_at')
      .eq('project_id', projectId)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    const messages = dbMessages || [];
    const groupedByDate = groupMessagesByDate(messages);

    const sessions: Session[] = [];

    for (const [date, msgs] of groupedByDate) {
      sessions.push({
        id: date,
        date: date,
        topic: generateTopic(msgs),
        messageCount: msgs.length,
        firstMessageAt: msgs[0].created_at,
      });
    }

    // Sort by date descending (newest first)
    sessions.sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Sessions API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
