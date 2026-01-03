import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

const UXPILOT_API_URL = process.env.UXPILOT_API_URL || 'https://api.uxpilot.ai';
const UXPILOT_API_KEY = process.env.UXPILOT_API_KEY;

interface GenerateWireframeRequest {
  projectId: string;
  prompt: string;
  pageType?: string;
  style?: 'minimal' | 'detailed' | 'high-fidelity';
  components?: string[];
  colorScheme?: string;
  responsive?: boolean;
}

interface UXPilotResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  wireframe?: {
    svg: string;
    html: string;
    components: string[];
    layout: Record<string, unknown>;
  };
  previewUrl?: string;
  error?: string;
}

async function callUXPilotAPI(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>
): Promise<UXPilotResponse> {
  const response = await fetch(`${UXPILOT_API_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${UXPILOT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`UXPilot API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// POST - Generate wireframe
export async function POST(request: NextRequest) {
  try {
    if (!UXPILOT_API_KEY) {
      return NextResponse.json(
        { error: 'UXPilot API key not configured' },
        { status: 500 }
      );
    }

    const supabase = createServerClient();
    const body: GenerateWireframeRequest = await request.json();

    const {
      projectId,
      prompt,
      pageType = 'landing',
      style = 'detailed',
      components = [],
      colorScheme,
      responsive = true,
    } = body;

    if (!projectId || !prompt) {
      return NextResponse.json(
        { error: 'projectId and prompt are required' },
        { status: 400 }
      );
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Call UXPilot API to generate wireframe
    let uxpilotResponse: UXPilotResponse;
    try {
      uxpilotResponse = await callUXPilotAPI('/v1/wireframes/generate', 'POST', {
        prompt,
        pageType,
        style,
        components,
        colorScheme,
        responsive,
        format: ['svg', 'html'],
      });
    } catch (apiError) {
      console.error('UXPilot API error:', apiError);
      return NextResponse.json(
        { error: 'Failed to generate wireframe', details: apiError instanceof Error ? apiError.message : 'Unknown error' },
        { status: 502 }
      );
    }

    // Create wireframe record in database
    const { data: wireframe, error: wireframeError } = await supabase
      .from('wireframes')
      .insert({
        project_id: projectId,
        name: `${pageType} - ${new Date().toLocaleDateString()}`,
        description: prompt,
        page_type: pageType,
        uxpilot_id: uxpilotResponse.id,
        uxpilot_url: uxpilotResponse.previewUrl,
        svg_content: uxpilotResponse.wireframe?.svg,
        html_content: uxpilotResponse.wireframe?.html,
        components: uxpilotResponse.wireframe?.components || [],
        layout: uxpilotResponse.wireframe?.layout || {},
        status: uxpilotResponse.status === 'completed' ? 'draft' : 'draft',
        design_tokens: {
          style,
          colorScheme,
          responsive,
        },
      })
      .select()
      .single();

    if (wireframeError) {
      console.error('Database error:', wireframeError);
      return NextResponse.json(
        { error: 'Failed to save wireframe', details: wireframeError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      wireframe,
      uxpilot: {
        id: uxpilotResponse.id,
        status: uxpilotResponse.status,
        previewUrl: uxpilotResponse.previewUrl,
      },
    });

  } catch (error) {
    console.error('Generate wireframe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Check wireframe status or list wireframes
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const wireframeId = searchParams.get('wireframeId');
    const uxpilotId = searchParams.get('uxpilotId');
    const projectId = searchParams.get('projectId');

    // Check status of specific wireframe by UXPilot ID
    if (uxpilotId) {
      if (!UXPILOT_API_KEY) {
        return NextResponse.json(
          { error: 'UXPilot API key not configured' },
          { status: 500 }
        );
      }

      try {
        const uxpilotResponse = await callUXPilotAPI(`/v1/wireframes/${uxpilotId}`);

        // Update local record if completed
        if (uxpilotResponse.status === 'completed' && uxpilotResponse.wireframe) {
          await supabase
            .from('wireframes')
            .update({
              svg_content: uxpilotResponse.wireframe.svg,
              html_content: uxpilotResponse.wireframe.html,
              components: uxpilotResponse.wireframe.components,
              layout: uxpilotResponse.wireframe.layout,
              uxpilot_url: uxpilotResponse.previewUrl,
            })
            .eq('uxpilot_id', uxpilotId);
        }

        return NextResponse.json({
          success: true,
          status: uxpilotResponse.status,
          wireframe: uxpilotResponse.wireframe,
          previewUrl: uxpilotResponse.previewUrl,
        });
      } catch (apiError) {
        console.error('UXPilot status check error:', apiError);
        return NextResponse.json(
          { error: 'Failed to check wireframe status' },
          { status: 502 }
        );
      }
    }

    // Get specific wireframe from database
    if (wireframeId) {
      const { data: wireframe, error } = await supabase
        .from('wireframes')
        .select('*')
        .eq('id', wireframeId)
        .single();

      if (error || !wireframe) {
        return NextResponse.json(
          { error: 'Wireframe not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        wireframe,
      });
    }

    // List wireframes for project
    if (projectId) {
      const { data: wireframes, error } = await supabase
        .from('wireframes')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch wireframes' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        wireframes,
      });
    }

    return NextResponse.json(
      { error: 'wireframeId, uxpilotId, or projectId is required' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Get wireframe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
