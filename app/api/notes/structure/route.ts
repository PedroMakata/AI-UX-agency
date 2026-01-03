import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Chovej se jako inteligentní editor poznámek ve stylu Notion.

Tvým úkolem je převést jakýkoliv neupravený text do přehledné strukturované podoby.

Výstupní formát (JSON pole bloků):
- Pro nadpis 1: { "type": "heading1", "content": "Text nadpisu" }
- Pro nadpis 2: { "type": "heading2", "content": "Text nadpisu" }
- Pro běžný text: { "type": "text", "content": "Text odstavce" }
- Pro položku seznamu: { "type": "list", "content": "Text položky" }
- Pro úkol: { "type": "todo", "content": "Text úkolu", "checked": false }
- Pro dokončený úkol: { "type": "todo", "content": "Text úkolu", "checked": true }

Pravidla:
1. Rozděl text na logické sekce podle významu.
2. Každá sekce musí mít výstižný nadpis (heading1 nebo heading2).
3. Úkoly nebo akční kroky převáděj na todo.
4. Výčty a vlastnosti převáděj na list.
5. Dlouhé texty zhušťuj, ale neztrácej význam.
6. Každý blok má unikátní obsah - neduplikuj.

DŮLEŽITÉ: Vrať POUZE validní JSON pole bez jakéhokoliv dalšího textu nebo markdown.`;

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Strukturuj tento text:\n\n${text}`
        }
      ]
    });

    // Extract the text content from the response
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Parse the JSON response
    let blocks;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        blocks = JSON.parse(jsonMatch[0]);
      } else {
        blocks = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse structured content' },
        { status: 500 }
      );
    }

    // Add unique IDs to each block
    const blocksWithIds = blocks.map((block: any, index: number) => ({
      id: `${Date.now()}-${index}`,
      type: block.type || 'text',
      content: block.content || '',
      checked: block.checked || false,
    }));

    return NextResponse.json({
      success: true,
      blocks: blocksWithIds
    });

  } catch (error) {
    console.error('Structure API error:', error);
    return NextResponse.json(
      { error: 'Failed to structure text' },
      { status: 500 }
    );
  }
}
