import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    // Mock Vibe prototype creation
    // TODO: Implementovat skutečnou Vibe AI integraci

    return NextResponse.json({
      url: `https://prototype-${Date.now()}.vibe.app`,
      previewUrl: 'https://via.placeholder.com/1200x800?text=Live+Prototype',
      codeUrl: null,
      prototypeId: `proto-${Date.now()}`,
      success: true
    });

  } catch (error) {
    console.error('Vibe prototype error:', error);
    return NextResponse.json(
      { error: 'Prototype creation failed' },
      { status: 500 }
    );
  }
}
