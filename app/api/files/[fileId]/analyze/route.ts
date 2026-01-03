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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const anthropic = getAnthropic();
    const supabase = getSupabase();
    const { fileId } = await params;

    // Get file from database
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check if it's an image
    if (file.file_type !== 'image' && !file.mime_type?.startsWith('image/')) {
      return NextResponse.json({ error: 'File is not an image' }, { status: 400 });
    }

    // Fetch image as base64
    const imageData = await fetchImageAsBase64(file.public_url);
    if (!imageData) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
    }

    // Analyze image with Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageData.mediaType,
                data: imageData.data
              }
            },
            {
              type: 'text',
              text: `Analyzuj tento obrázek pro UX/design účely. Poskytni:

1. **Stručný popis** (1-2 věty) - co obrázek zobrazuje
2. **Typ obsahu** - screenshot webu/aplikace, wireframe, mockup, fotografie, ikona, diagram, jiné
3. **Klíčové elementy** - seznam hlavních vizuálních prvků
4. **UI komponenty** (pokud relevantní) - tlačítka, formuláře, navigace, karty, etc.
5. **Barevná paleta** - hlavní barvy použité v obrázku
6. **Tagy** - 5-10 klíčových slov pro vyhledávání

Odpověz ve formátu JSON:
{
  "description": "...",
  "type": "screenshot|wireframe|mockup|photo|icon|diagram|other",
  "elements": ["..."],
  "uiComponents": ["..."],
  "colors": ["..."],
  "tags": ["..."],
  "uxNotes": "..."
}`
            }
          ]
        }
      ]
    });

    const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Try to parse JSON from response
    let analysis: {
      description?: string;
      type?: string;
      elements?: string[];
      uiComponents?: string[];
      colors?: string[];
      tags?: string[];
      uxNotes?: string;
    } = {};

    try {
      // Extract JSON from response (may be wrapped in markdown code block)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If JSON parsing fails, store raw text
      analysis = { description: analysisText };
    }

    // Update file with analysis
    const { error: updateError } = await supabase
      .from('files')
      .update({
        extracted_text: analysis.description || analysisText,
        metadata: {
          ...file.metadata,
          imageAnalysis: analysis,
          analyzedAt: new Date().toISOString()
        },
        processing_status: 'completed'
      })
      .eq('id', fileId);

    if (updateError) {
      console.error('Failed to update file:', updateError);
    }

    return NextResponse.json({
      success: true,
      analysis,
      fileId
    });

  } catch (error) {
    console.error('Image analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image' },
      { status: 500 }
    );
  }
}
