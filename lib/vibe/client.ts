// ============================================
// REQUEST INTERFACES
// ============================================

export interface GeneratePromptRequest {
  projectId: string;
  description: string;
  industry?: string;
  targetAudience?: string;
  moodKeywords?: string[];
  referenceImages?: string[];
  brandGuidelines?: BrandGuidelines;
}

export interface CreatePrototypeRequest {
  projectId: string;
  vibePromptId?: string;
  prompt: string;
  framework?: FrameworkType;
  designSystem?: DesignSystem;
}

export interface UpdatePrototypeRequest {
  prototypeId: string;
  feedback: string;
  changes?: string[];
}

export interface ExportCodeRequest {
  prototypeId: string;
  format: ExportFormat;
  includeStyles?: boolean;
  minify?: boolean;
}

// ============================================
// RESPONSE INTERFACES
// ============================================

export interface GeneratePromptResponse {
  success: boolean;
  vibePrompt: VibePrompt;
  design: DesignPromptResult;
}

export interface CreatePrototypeResponse {
  success: boolean;
  prototype: VibePrototype;
  v0?: {
    id: string;
    url?: string;
    previewUrl?: string;
  };
}

export interface GetPrototypeResponse {
  success: boolean;
  prototype: VibePrototype & {
    vibe_prompt?: VibePrompt;
  };
}

export interface UpdatePrototypeResponse {
  success: boolean;
  prototype: VibePrototype;
  iteration: number;
}

export interface ListPrototypesResponse {
  success: boolean;
  prototypes: VibePrototype[];
}

export interface ExportCodeResponse {
  success: boolean;
  code: string;
  format: ExportFormat;
  filename: string;
}

// ============================================
// DATA TYPES
// ============================================

export type FrameworkType = 'react' | 'vue' | 'svelte' | 'html' | 'nextjs';

export type ExportFormat = 'react' | 'html' | 'vue' | 'svelte' | 'tailwind';

export type PrototypeStatus = 'generating' | 'generated' | 'customizing' | 'approved' | 'exported';

export interface BrandGuidelines {
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string;
  fonts?: {
    heading?: string;
    body?: string;
  };
  voice?: string;
  values?: string[];
}

export interface DesignSystem {
  colors?: Record<string, string>;
  typography?: Typography;
  spacing?: Record<string, string>;
  borderRadius?: Record<string, string>;
  shadows?: Record<string, string>;
}

export interface Typography {
  fontFamily?: string;
  headingFont?: string;
  bodyFont?: string;
  scale?: number;
  weights?: Record<string, number>;
}

export interface DesignPromptResult {
  enhancedPrompt: string;
  colorPalette: string[];
  typography: Typography;
  stylePreferences: Record<string, unknown>;
}

export interface VibePrompt {
  id: string;
  project_id: string;
  prompt: string;
  style_preferences: Record<string, unknown>;
  color_palette: string[];
  typography: Typography;
  mood_keywords: string[];
  reference_images: string[];
  industry?: string;
  target_audience?: string;
  brand_guidelines: BrandGuidelines;
  created_at: string;
  updated_at: string;
}

export interface VibePrototype {
  id: string;
  project_id: string;
  vibe_prompt_id?: string;
  name: string;
  description?: string;
  v0_url?: string;
  v0_id?: string;
  preview_url?: string;
  code_html?: string;
  code_css?: string;
  code_js?: string;
  code_react?: string;
  framework: FrameworkType;
  design_system: DesignSystem;
  components_used: string[];
  status: PrototypeStatus;
  iteration: number;
  feedback?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// ERROR TYPES
// ============================================

export class VibeClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'VibeClientError';
  }
}

// ============================================
// VIBE CLIENT CLASS
// ============================================

export class VibeClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || '/api/vibe';
  }

  /**
   * Make API request with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new VibeClientError(
        data.error || 'Request failed',
        response.status,
        data.details
      );
    }

    return data as T;
  }

  /**
   * Generate a design prompt with color palette, typography, and style preferences
   */
  async generatePrompt(params: GeneratePromptRequest): Promise<GeneratePromptResponse> {
    return this.request<GeneratePromptResponse>('?action=generate-prompt', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Create a new prototype from a prompt
   */
  async createPrototype(params: CreatePrototypeRequest): Promise<CreatePrototypeResponse> {
    return this.request<CreatePrototypeResponse>('?action=create-prototype', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Get a prototype by ID with optional vibe prompt data
   */
  async getPrototype(prototypeId: string): Promise<GetPrototypeResponse> {
    return this.request<GetPrototypeResponse>(`?prototypeId=${prototypeId}`, {
      method: 'GET',
    });
  }

  /**
   * List all prototypes for a project
   */
  async listPrototypes(projectId: string): Promise<ListPrototypesResponse> {
    return this.request<ListPrototypesResponse>(`?projectId=${projectId}`, {
      method: 'GET',
    });
  }

  /**
   * Get a vibe prompt by ID
   */
  async getVibePrompt(vibePromptId: string): Promise<{ success: boolean; vibePrompt: VibePrompt }> {
    return this.request(`?vibePromptId=${vibePromptId}`, {
      method: 'GET',
    });
  }

  /**
   * Update a prototype with feedback and regenerate code
   */
  async updatePrototype(params: UpdatePrototypeRequest): Promise<UpdatePrototypeResponse> {
    return this.request<UpdatePrototypeResponse>('?action=update-prototype', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Export prototype code in various formats
   */
  async exportCode(params: ExportCodeRequest): Promise<ExportCodeResponse> {
    const { prototypeId, format, includeStyles = true, minify = false } = params;

    // Get prototype data
    const { prototype } = await this.getPrototype(prototypeId);

    let code: string;
    let filename: string;

    switch (format) {
      case 'react':
        code = this.formatReactCode(prototype, includeStyles, minify);
        filename = `${prototype.name.replace(/\s+/g, '_')}.tsx`;
        break;

      case 'html':
        code = this.formatHtmlCode(prototype, includeStyles, minify);
        filename = `${prototype.name.replace(/\s+/g, '_')}.html`;
        break;

      case 'vue':
        code = this.formatVueCode(prototype, includeStyles, minify);
        filename = `${prototype.name.replace(/\s+/g, '_')}.vue`;
        break;

      case 'svelte':
        code = this.formatSvelteCode(prototype, includeStyles, minify);
        filename = `${prototype.name.replace(/\s+/g, '_')}.svelte`;
        break;

      case 'tailwind':
        code = this.extractTailwindClasses(prototype);
        filename = `${prototype.name.replace(/\s+/g, '_')}_tailwind.txt`;
        break;

      default:
        throw new VibeClientError('Invalid export format', 400);
    }

    if (minify) {
      code = this.minifyCode(code);
    }

    return {
      success: true,
      code,
      format,
      filename,
    };
  }

  /**
   * Format code as React component
   */
  private formatReactCode(prototype: VibePrototype, includeStyles: boolean, _minify: boolean): string {
    if (prototype.code_react) {
      return prototype.code_react;
    }

    // Convert HTML to React if only HTML is available
    const html = prototype.code_html || '<div>No content</div>';
    const css = prototype.code_css || '';

    const componentName = prototype.name.replace(/[^a-zA-Z0-9]/g, '');

    let code = `import React from 'react';

export function ${componentName}() {
  return (
    <>
      ${this.htmlToJsx(html)}
    </>
  );
}`;

    if (includeStyles && css) {
      code = `import React from 'react';

const styles = \`${css}\`;

export function ${componentName}() {
  return (
    <>
      <style>{styles}</style>
      ${this.htmlToJsx(html)}
    </>
  );
}`;
    }

    return code;
  }

  /**
   * Format code as HTML document
   */
  private formatHtmlCode(prototype: VibePrototype, includeStyles: boolean, _minify: boolean): string {
    const html = prototype.code_html || '<div>No content</div>';
    const css = prototype.code_css || '';
    const js = prototype.code_js || '';

    let document = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${prototype.name}</title>`;

    if (includeStyles && css) {
      document += `
  <style>
${css}
  </style>`;
    }

    document += `
</head>
<body>
${html}`;

    if (js) {
      document += `
  <script>
${js}
  </script>`;
    }

    document += `
</body>
</html>`;

    return document;
  }

  /**
   * Format code as Vue component
   */
  private formatVueCode(prototype: VibePrototype, includeStyles: boolean, _minify: boolean): string {
    const html = prototype.code_html || '<div>No content</div>';
    const css = prototype.code_css || '';
    const js = prototype.code_js || '';

    let code = `<template>
${html}
</template>

<script setup lang="ts">
${js || '// Component logic'}
</script>`;

    if (includeStyles && css) {
      code += `

<style scoped>
${css}
</style>`;
    }

    return code;
  }

  /**
   * Format code as Svelte component
   */
  private formatSvelteCode(prototype: VibePrototype, includeStyles: boolean, _minify: boolean): string {
    const html = prototype.code_html || '<div>No content</div>';
    const css = prototype.code_css || '';
    const js = prototype.code_js || '';

    let code = `<script lang="ts">
${js || '// Component logic'}
</script>

${html}`;

    if (includeStyles && css) {
      code += `

<style>
${css}
</style>`;
    }

    return code;
  }

  /**
   * Extract Tailwind classes from prototype
   */
  private extractTailwindClasses(prototype: VibePrototype): string {
    const html = prototype.code_html || prototype.code_react || '';
    const classMatches = html.match(/class(?:Name)?="([^"]+)"/g) || [];

    const classes = new Set<string>();

    classMatches.forEach(match => {
      const classValue = match.match(/="([^"]+)"/)?.[1] || '';
      classValue.split(/\s+/).forEach(cls => {
        if (cls) classes.add(cls);
      });
    });

    return Array.from(classes).sort().join('\n');
  }

  /**
   * Convert HTML to JSX
   */
  private htmlToJsx(html: string): string {
    return html
      .replace(/class=/g, 'className=')
      .replace(/for=/g, 'htmlFor=')
      .replace(/tabindex=/g, 'tabIndex=')
      .replace(/readonly/g, 'readOnly')
      .replace(/maxlength=/g, 'maxLength=')
      .replace(/colspan=/g, 'colSpan=')
      .replace(/rowspan=/g, 'rowSpan=')
      .replace(/<!--[\s\S]*?-->/g, '{/* $& */}')
      .replace(/style="([^"]+)"/g, (_, styles) => {
        const jsStyles = styles
          .split(';')
          .filter(Boolean)
          .map((s: string) => {
            const [prop, val] = s.split(':').map((x: string) => x.trim());
            const camelProp = prop.replace(/-([a-z])/g, (_: string, l: string) => l.toUpperCase());
            return `${camelProp}: '${val}'`;
          })
          .join(', ');
        return `style={{ ${jsStyles} }}`;
      });
  }

  /**
   * Minify code by removing unnecessary whitespace
   */
  private minifyCode(code: string): string {
    return code
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .replace(/\s*{\s*/g, '{')
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*;\s*/g, ';')
      .trim();
  }

  /**
   * Download code as file (browser only)
   */
  downloadCode(code: string, filename: string): void {
    if (typeof window === 'undefined') {
      throw new Error('downloadCode is only available in browser environment');
    }

    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const vibeClient = new VibeClient();

export default vibeClient;
