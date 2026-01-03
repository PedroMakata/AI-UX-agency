import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { wireframeData } = await request.json();

    // Mock Vibe prompt generování
    const mockPrompt = `
Component: Homepage Hero Section
Type: hero-section

Styling:
- Background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
- Font: Inter, sans-serif
- Heading size: 48px, weight: 700
- Padding: 80px 24px
- Border-radius: 16px

Components:
- Heading: "Welcome to Our Platform"
- Subheading: "Build amazing UX with AI"
- CTA Button: "Get Started" (primary color)

Interactions:
- Hover: Button scales to 1.05
- Click: Smooth scroll to next section

Responsive:
- Mobile: Heading 32px, padding 40px 16px
- Tablet: Heading 40px, padding 60px 20px
- Desktop: Heading 48px, padding 80px 24px
`;

    return NextResponse.json({
      prompt: mockPrompt,
      success: true
    });

  } catch (error) {
    console.error('Vibe prompt error:', error);
    return NextResponse.json(
      { error: 'Prompt generation failed' },
      { status: 500 }
    );
  }
}
