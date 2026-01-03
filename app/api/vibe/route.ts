import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@/lib/supabase/client';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const V0_API_URL = process.env.V0_API_URL || 'https://api.v0.dev';
const V0_API_KEY = process.env.V0_API_KEY;

interface GeneratePromptRequest {
  projectId: string;
  description: string;
  industry?: string;
  targetAudience?: string;
  moodKeywords?: string[];
  referenceImages?: string[];
  brandGuidelines?: Record<string, unknown>;
}

interface CreatePrototypeRequest {
  projectId: string;
  vibePromptId?: string;
  prompt: string;
  framework?: 'react' | 'vue' | 'svelte' | 'html' | 'nextjs';
  designSystem?: Record<string, unknown>;
}

interface UpdatePrototypeRequest {
  prototypeId: string;
  feedback: string;
  changes?: string[];
}

// Helper to call V0 API
async function callV0API(
  endpoint: string,
  method: 'GET' | 'POST' = 'POST',
  body?: Record<string, unknown>
) {
  if (!V0_API_KEY) {
    throw new Error('V0 API key not configured');
  }

  const response = await fetch(`${V0_API_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${V0_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`V0 API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Generate design system and color palette using Claude
async function generateDesignPrompt(params: GeneratePromptRequest): Promise<{
  enhancedPrompt: string;
  colorPalette: string[];
  typography: Record<string, string>;
  stylePreferences: Record<string, unknown>;
}> {
  const systemPrompt = `You are an expert visual designer. Generate a comprehensive design prompt based on the user's requirements.

Return a JSON object with:
- enhancedPrompt: A detailed, enhanced prompt for generating a UI prototype
- colorPalette: Array of 5-6 hex colors that match the vibe
- typography: Object with fontFamily, headingFont, bodyFont, and scale
- stylePreferences: Object with borderRadius, shadows, spacing, and other design tokens

Consider the industry, target audience, and mood keywords to create a cohesive visual direction.`;

  const userMessage = `Create a design prompt for:
Description: ${params.description}
Industry: ${params.industry || 'general'}
Target Audience: ${params.targetAudience || 'general users'}
Mood Keywords: ${params.moodKeywords?.join(', ') || 'modern, clean'}
${params.brandGuidelines ? `Brand Guidelines: ${JSON.stringify(params.brandGuidelines)}` : ''}

Return only valid JSON.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: userMessage }],
    system: systemPrompt,
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  // Parse JSON from response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse design prompt');
  }

  return JSON.parse(jsonMatch[0]);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // POST /api/vibe?action=generate-prompt
    if (action === 'generate-prompt') {
      const body: GeneratePromptRequest = await request.json();
      const { projectId, description, industry, targetAudience, moodKeywords, referenceImages, brandGuidelines } = body;

      if (!projectId || !description) {
        return NextResponse.json(
          { error: 'projectId and description are required' },
          { status: 400 }
        );
      }

      // Generate enhanced prompt using Claude
      const designPrompt = await generateDesignPrompt(body);

      // Save vibe prompt to database
      const { data: vibePrompt, error: dbError } = await supabase
        .from('vibe_prompts')
        .insert({
          project_id: projectId,
          prompt: designPrompt.enhancedPrompt,
          style_preferences: designPrompt.stylePreferences,
          color_palette: designPrompt.colorPalette,
          typography: designPrompt.typography,
          mood_keywords: moodKeywords || [],
          reference_images: referenceImages || [],
          industry,
          target_audience: targetAudience,
          brand_guidelines: brandGuidelines || {},
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        return NextResponse.json(
          { error: 'Failed to save vibe prompt' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        vibePrompt,
        design: designPrompt,
      });
    }

    // POST /api/vibe?action=create-prototype
    if (action === 'create-prototype') {
      const body: CreatePrototypeRequest = await request.json();
      const { projectId, vibePromptId, prompt, framework = 'react', designSystem } = body;

      if (!projectId || !prompt) {
        return NextResponse.json(
          { error: 'projectId and prompt are required' },
          { status: 400 }
        );
      }

      // Get vibe prompt if provided
      let vibePromptData = null;
      if (vibePromptId) {
        const { data } = await supabase
          .from('vibe_prompts')
          .select('*')
          .eq('id', vibePromptId)
          .single();
        vibePromptData = data;
      }

      // Enhance prompt with vibe data
      let enhancedPrompt = prompt;
      if (vibePromptData) {
        enhancedPrompt = `${prompt}

Design System:
- Colors: ${vibePromptData.color_palette?.join(', ')}
- Typography: ${JSON.stringify(vibePromptData.typography)}
- Style: ${JSON.stringify(vibePromptData.style_preferences)}`;
      }

      // Call V0 API to generate prototype
      let v0Response;
      try {
        v0Response = await callV0API('/v1/generate', 'POST', {
          prompt: enhancedPrompt,
          framework,
          designSystem: designSystem || vibePromptData?.style_preferences,
        });
      } catch (apiError) {
        console.error('V0 API error:', apiError);

        // Fallback: Generate code using Claude
        const codeResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: `You are an expert frontend developer. Generate clean, modern ${framework} code based on the design prompt. Return only the code, no explanations.`,
          messages: [{ role: 'user', content: enhancedPrompt }],
        });

        const codeContent = codeResponse.content[0];
        v0Response = {
          id: `claude-${Date.now()}`,
          code: codeContent.type === 'text' ? codeContent.text : '',
          framework,
        };
      }

      // Save prototype to database
      const { data: prototype, error: dbError } = await supabase
        .from('vibe_prototypes')
        .insert({
          project_id: projectId,
          vibe_prompt_id: vibePromptId,
          name: `Prototype - ${new Date().toLocaleDateString()}`,
          description: prompt,
          v0_id: v0Response.id,
          v0_url: v0Response.url,
          preview_url: v0Response.previewUrl,
          code_react: framework === 'react' || framework === 'nextjs' ? v0Response.code : null,
          code_html: framework === 'html' ? v0Response.code : null,
          framework,
          design_system: designSystem || vibePromptData?.style_preferences || {},
          components_used: v0Response.components || [],
          status: 'generated',
          iteration: 1,
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        return NextResponse.json(
          { error: 'Failed to save prototype' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        prototype,
        v0: {
          id: v0Response.id,
          url: v0Response.url,
          previewUrl: v0Response.previewUrl,
        },
      });
    }

    // POST /api/vibe?action=update-prototype
    if (action === 'update-prototype') {
      const body: UpdatePrototypeRequest = await request.json();
      const { prototypeId, feedback, changes } = body;

      if (!prototypeId || !feedback) {
        return NextResponse.json(
          { error: 'prototypeId and feedback are required' },
          { status: 400 }
        );
      }

      // Get current prototype
      const { data: currentPrototype, error: fetchError } = await supabase
        .from('vibe_prototypes')
        .select('*')
        .eq('id', prototypeId)
        .single();

      if (fetchError || !currentPrototype) {
        return NextResponse.json(
          { error: 'Prototype not found' },
          { status: 404 }
        );
      }

      // Generate updated code using Claude
      const currentCode = currentPrototype.code_react || currentPrototype.code_html || '';

      const updateResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: `You are an expert frontend developer. Update the provided code based on the feedback. Return only the updated code, no explanations.`,
        messages: [
          {
            role: 'user',
            content: `Current code:
\`\`\`
${currentCode}
\`\`\`

Feedback: ${feedback}
${changes ? `Specific changes requested: ${changes.join(', ')}` : ''}

Provide the updated code.`,
          },
        ],
      });

      const updatedContent = updateResponse.content[0];
      const updatedCode = updatedContent.type === 'text' ? updatedContent.text : '';

      // Extract code from markdown if present
      const codeMatch = updatedCode.match(/```(?:\w+)?\n([\s\S]*?)```/);
      const cleanCode = codeMatch ? codeMatch[1] : updatedCode;

      // Update prototype in database
      const { data: updatedPrototype, error: updateError } = await supabase
        .from('vibe_prototypes')
        .update({
          code_react: currentPrototype.framework === 'react' || currentPrototype.framework === 'nextjs' ? cleanCode : currentPrototype.code_react,
          code_html: currentPrototype.framework === 'html' ? cleanCode : currentPrototype.code_html,
          feedback,
          iteration: currentPrototype.iteration + 1,
          status: 'customizing',
        })
        .eq('id', prototypeId)
        .select()
        .single();

      if (updateError) {
        console.error('Database error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update prototype' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        prototype: updatedPrototype,
        iteration: updatedPrototype.iteration,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: generate-prompt, create-prototype, or update-prototype' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Vibe API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get prototype details
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const prototypeId = searchParams.get('prototypeId');
    const projectId = searchParams.get('projectId');
    const vibePromptId = searchParams.get('vibePromptId');

    // Get specific prototype
    if (prototypeId) {
      const { data: prototype, error } = await supabase
        .from('vibe_prototypes')
        .select(`
          *,
          vibe_prompt:vibe_prompts(*)
        `)
        .eq('id', prototypeId)
        .single();

      if (error || !prototype) {
        return NextResponse.json(
          { error: 'Prototype not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        prototype,
      });
    }

    // List prototypes for project
    if (projectId) {
      const { data: prototypes, error } = await supabase
        .from('vibe_prototypes')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch prototypes' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        prototypes,
      });
    }

    // Get vibe prompts
    if (vibePromptId) {
      const { data: vibePrompt, error } = await supabase
        .from('vibe_prompts')
        .select('*')
        .eq('id', vibePromptId)
        .single();

      if (error || !vibePrompt) {
        return NextResponse.json(
          { error: 'Vibe prompt not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        vibePrompt,
      });
    }

    return NextResponse.json(
      { error: 'prototypeId, projectId, or vibePromptId is required' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Get vibe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
