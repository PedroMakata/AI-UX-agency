import { NextRequest, NextResponse } from 'next/server';

// TODO: Implementovat UX Pilot API integraci
// Pro teď vrátíme mock data

export async function POST(request: NextRequest) {
  try {
    const { description, screenType, complexity } = await request.json();

    // Mock response - až získáš UX Pilot API, nahraď tímto:
    /*
    const response = await fetch('https://api.uxpilot.ai/v1/wireframes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.UXPILOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: description,
        screen_type: screenType,
        complexity
      })
    });

    const data = await response.json();
    return NextResponse.json(data);
    */

    // Mock data pro testování
    return NextResponse.json({
      imageUrl: 'https://via.placeholder.com/800x600?text=Wireframe+Preview',
      figmaUrl: null,
      uxpilotId: `mock-${Date.now()}`,
      creditsUsed: 1
    });

  } catch (error) {
    console.error('UX Pilot error:', error);
    return NextResponse.json(
      { error: 'Wireframe generation failed' },
      { status: 500 }
    );
  }
}
