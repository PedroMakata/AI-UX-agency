import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

function getAnthropic() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

const AGENTS = {
  riley: {
    name: 'Riley',
    systemPrompt: `Jsi Riley, expert na UX research. Analyzuješ user data, hledáš insights a pain pointy. Používej data z uploadnutých souborů.`
  },
  sam: {
    name: 'Sam',
    systemPrompt: `Jsi Sam, product stratég. Vytváříš product strategii, prioritizuješ features, navrhuješ roadmapy.`
  },
  blake: {
    name: 'Blake',
    systemPrompt: `Jsi Blake, business analyst. Píšeš requirements, user stories a acceptance criteria.`
  },
  alex: {
    name: 'Alex',
    systemPrompt: `Jsi Alex, UX designer. Navrhuješ user flows, wireframes a interaction patterns.`
  },
  jordan: {
    name: 'Jordan',
    systemPrompt: `Jsi Jordan, UI designer. Vytváříš visual design, design systémy a brand design.`
  }
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const anthropic = getAnthropic();
    const supabase = getSupabase();

    const { projectId, message, messages = [] } = await request.json();
    const { agentId } = await params;

    // Check if this is a custom agent
    const isCustomAgent = agentId.startsWith('custom-');
    let agentName = '';
    let systemPrompt = '';

    if (isCustomAgent) {
      // Fetch project to get custom agent
      const { data: project } = await supabase
        .from('projects')
        .select('settings')
        .eq('id', projectId)
        .single();

      const customAgents = project?.settings?.customAgents || [];
      const customAgent = customAgents.find((a: { id: string }) => a.id === agentId);

      if (!customAgent) {
        return NextResponse.json({ error: 'Custom agent not found' }, { status: 400 });
      }

      agentName = customAgent.name;
      systemPrompt = customAgent.systemPrompt || `Jsi ${customAgent.name}, ${customAgent.role}.`;
    } else {
      const builtInAgent = AGENTS[agentId as keyof typeof AGENTS];
      if (!builtInAgent) {
        return NextResponse.json({ error: 'Invalid agent' }, { status: 400 });
      }
      agentName = builtInAgent.name;
      systemPrompt = builtInAgent.systemPrompt;
    }

    // Načti context z projektových souborů
    const { data: projectFiles } = await supabase
      .from('files')
      .select('*')
      .eq('project_id', projectId);

    let contextText = '';

    if (projectFiles && projectFiles.length > 0) {
      contextText = '\n\nSoubory projektu:\n';
      projectFiles.forEach(f => {
        contextText += `- ${f.original_name} (${f.file_type})`;
        if (f.extracted_text) {
          contextText += `\n  Obsah: ${f.extracted_text.substring(0, 500)}...`;
        }
        contextText += '\n';
      });
    }

    // Načti poznámky projektu
    const { data: projectNotes } = await supabase
      .from('notes')
      .select('title, content')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (projectNotes && projectNotes.length > 0) {
      contextText += '\n\nPoznámky projektu:\n';
      projectNotes.forEach(note => {
        contextText += `\n## ${note.title}\n`;
        // Extract text content from blocks
        if (Array.isArray(note.content)) {
          note.content.forEach((block: { type: string; content: string }) => {
            if (block.content && block.type !== 'image' && block.type !== 'file') {
              contextText += `${block.content}\n`;
            }
          });
        }
      });
    }

    // Zavolej Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt + contextText,
      messages: [
        ...messages,
        { role: 'user', content: message }
      ]
    });

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Ulož do DB
    await supabase.from('agent_messages').insert([
      {
        project_id: projectId,
        agent_id: agentId,
        role: 'user',
        content: message
      },
      {
        project_id: projectId,
        agent_id: agentId,
        role: 'assistant',
        content: assistantMessage
      }
    ]);

    return NextResponse.json({
      message: assistantMessage,
      agentId
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
