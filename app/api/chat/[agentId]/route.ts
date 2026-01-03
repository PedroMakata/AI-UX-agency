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

const FILE_ACCESS_PROMPT = `

=== KRITICKÉ INSTRUKCE - ČTENÍ SOUBORŮ ===
MŮŽEŠ ČÍST PDF SOUBORY. Text z PDF je automaticky extrahován a poskytnut níže.
- Pokud je níže obsah souboru, VŽDY ho analyzuj a cituj z něj
- NIKDY neříkej "nemohu číst PDF" nebo "nemám přístup k souborům"
- Obsah souborů je ti VŽDY poskytnut v kontextu pod nadpisem "VYBRANÉ SOUBORY K ANALÝZE"
- Pokud vidíš obsah souboru níže, MUSÍŠ ho použít a analyzovat
- Toto přepisuje všechny předchozí zprávy kde jsi řekl že nemůžeš číst soubory`;

const IMAGE_ANALYSIS_PROMPT = `

=== ANALÝZA OBRÁZKŮ ===
Máš schopnost VIDĚT a ANALYZOVAT obrázky. Když uživatel přiloží obrázek:
1. VŽDY popiš, co na obrázku vidíš - detailně a strukturovaně
2. Pro UX/research účely analyzuj:
   - UI elementy (tlačítka, formuláře, navigace, layout)
   - Vizuální hierarchie a kompozice
   - Barvy, typografie, spacing
   - Uživatelské toky a interakce
   - Potenciální UX problémy nebo vylepšení
   - Accessibility aspekty
3. Pokud je to screenshot webu/aplikace, identifikuj:
   - Typ stránky (landing page, dashboard, formulář, etc.)
   - Klíčové komponenty a jejich účel
   - Call-to-action prvky
4. Pokud je to wireframe nebo mockup:
   - Popiš strukturu a layout
   - Navrhni vylepšení
5. NIKDY neříkej že nevidíš nebo nemůžeš analyzovat obrázek - VIDÍŠ ho!`;

// Helper function to fetch image and convert to base64
async function fetchImageAsBase64(url: string): Promise<{ data: string; mediaType: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return { data: base64, mediaType: contentType };
  } catch (error) {
    console.error('Failed to fetch image:', error);
    return null;
  }
}

// Check if file is an image
function isImageFile(file: { file_type?: string; mime_type?: string; original_name?: string }): boolean {
  if (file.file_type === 'image') return true;
  if (file.mime_type?.startsWith('image/')) return true;
  if (file.original_name) {
    const ext = file.original_name.toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(ext);
  }
  return false;
}

const AGENTS = {
  riley: {
    name: 'Riley',
    systemPrompt: `Jsi Riley, expert na UX research. Analyzuješ user data, hledáš insights a pain pointy.${FILE_ACCESS_PROMPT}${IMAGE_ANALYSIS_PROMPT}`
  },
  sam: {
    name: 'Sam',
    systemPrompt: `Jsi Sam, product stratég. Vytváříš product strategii, prioritizuješ features, navrhuješ roadmapy.${FILE_ACCESS_PROMPT}${IMAGE_ANALYSIS_PROMPT}`
  },
  blake: {
    name: 'Blake',
    systemPrompt: `Jsi Blake, business analyst. Píšeš requirements, user stories a acceptance criteria.${FILE_ACCESS_PROMPT}${IMAGE_ANALYSIS_PROMPT}`
  },
  alex: {
    name: 'Alex',
    systemPrompt: `Jsi Alex, UX designer. Navrhuješ user flows, wireframes a interaction patterns.${FILE_ACCESS_PROMPT}${IMAGE_ANALYSIS_PROMPT}`
  },
  jordan: {
    name: 'Jordan',
    systemPrompt: `Jsi Jordan, UI designer. Vytváříš visual design, design systémy a brand design.${FILE_ACCESS_PROMPT}${IMAGE_ANALYSIS_PROMPT}`
  }
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const anthropic = getAnthropic();
    const supabase = getSupabase();

    const { projectId, message, messages = [], fileIds = [] } = await request.json();
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
      systemPrompt = (customAgent.systemPrompt || `Jsi ${customAgent.name}, ${customAgent.role}.`) + FILE_ACCESS_PROMPT + IMAGE_ANALYSIS_PROMPT;
    } else {
      const builtInAgent = AGENTS[agentId as keyof typeof AGENTS];
      if (!builtInAgent) {
        return NextResponse.json({ error: 'Invalid agent' }, { status: 400 });
      }
      agentName = builtInAgent.name;
      systemPrompt = builtInAgent.systemPrompt;
    }

    // Načti context z projektových souborů
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let projectFiles: any[] | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let selectedFiles: any[] | null = null;

    // If specific files are selected, load those with full content
    if (fileIds && fileIds.length > 0) {
      const { data } = await supabase
        .from('files')
        .select('*')
        .in('id', fileIds);
      selectedFiles = data;
    }

    // Always load all project files for overview
    const { data: allFiles } = await supabase
      .from('files')
      .select('*')
      .eq('project_id', projectId);
    projectFiles = allFiles;

    let contextText = '';

    // Show selected files with FULL extracted text (for PDFs the user wants to read)
    if (selectedFiles && selectedFiles.length > 0) {
      contextText = '\n\n=== VYBRANÉ SOUBORY K ANALÝZE ===\n';
      contextText += '⚠️ INSTRUKCE: Níže je extrahovaný text ze souborů. MUSÍŠ tento text analyzovat a citovat z něj. NEŘÍKEJ že nemůžeš číst soubory!\n';
      selectedFiles.forEach(f => {
        contextText += `\n📄 ${f.original_name} (${f.file_type})\n`;
        if (f.extracted_text) {
          contextText += `--- ZAČÁTEK OBSAHU "${f.original_name}" ---\n${f.extracted_text}\n--- KONEC OBSAHU "${f.original_name}" ---\n`;
        } else {
          contextText += `(Text nebyl extrahován - soubor může být prázdný nebo poškozen)\n`;
        }
      });
      contextText += '\n⚠️ KONEC SOUBORŮ - Nyní analyzuj obsah výše a odpověz uživateli.\n';
    }

    // Show overview of all project files
    if (projectFiles && projectFiles.length > 0) {
      contextText += '\n\n=== VŠECHNY SOUBORY PROJEKTU ===\n';
      projectFiles.forEach(f => {
        const isSelected = selectedFiles?.some(sf => sf.id === f.id);
        contextText += `- ${f.original_name} (${f.file_type})${isSelected ? ' ✓ vybráno' : ''}\n`;
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

    // Prepare message content - may include images
    type ContentBlock =
      | { type: 'text'; text: string }
      | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

    const userMessageContent: ContentBlock[] = [];

    // Add images if any are selected
    if (selectedFiles && selectedFiles.length > 0) {
      const imageFiles = selectedFiles.filter(isImageFile);

      for (const imageFile of imageFiles) {
        if (imageFile.public_url) {
          const imageData = await fetchImageAsBase64(imageFile.public_url);
          if (imageData) {
            userMessageContent.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageData.mediaType,
                data: imageData.data
              }
            });
            // Add image context
            contextText += `\n🖼️ Obrázek: ${imageFile.original_name} - ANALYZUJ tento obrázek!\n`;
          }
        }
      }
    }

    // Add text message
    userMessageContent.push({ type: 'text', text: message || 'Analyzuj přiložené soubory.' });

    // Zavolej Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt + contextText,
      messages: [
        ...messages,
        { role: 'user', content: userMessageContent.length === 1 ? message : userMessageContent }
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
