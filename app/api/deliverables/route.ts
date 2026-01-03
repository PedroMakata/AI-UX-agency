import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import PDFDocument from 'pdfkit';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';
import PptxGenJS from 'pptxgenjs';

type ExportFormat = 'pdf' | 'docx' | 'pptx';

interface ExportRequest {
  deliverableId?: string;
  projectId?: string;
  format: ExportFormat;
  includeWireframes?: boolean;
  includePrototypes?: boolean;
}

// Helper to get deliverable data
async function getDeliverableData(supabase: ReturnType<typeof createServerClient>, deliverableId: string) {
  const { data, error } = await supabase
    .from('deliverables')
    .select(`
      *,
      project:projects(*),
      file:files(*)
    `)
    .eq('id', deliverableId)
    .single();

  if (error) throw error;
  return data;
}

// Helper to get project deliverables
async function getProjectDeliverables(
  supabase: ReturnType<typeof createServerClient>,
  projectId: string,
  includeWireframes = true,
  includePrototypes = true
) {
  const { data: deliverables } = await supabase
    .from('deliverables')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  let wireframes = null;
  let prototypes = null;

  if (includeWireframes) {
    const { data } = await supabase
      .from('wireframes')
      .select('*')
      .eq('project_id', projectId);
    wireframes = data;
  }

  if (includePrototypes) {
    const { data } = await supabase
      .from('vibe_prototypes')
      .select('*')
      .eq('project_id', projectId);
    prototypes = data;
  }

  return { deliverables, wireframes, prototypes };
}

// Generate PDF
async function generatePDF(
  data: {
    deliverables: Array<Record<string, unknown>> | null;
    wireframes?: Array<Record<string, unknown>> | null;
    prototypes?: Array<Record<string, unknown>> | null;
    project?: Record<string, unknown>;
  },
  title: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title
    doc.fontSize(24).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown(2);

    // Project info
    if (data.project) {
      doc.fontSize(12).font('Helvetica').text(`Project: ${data.project.name || 'Untitled'}`);
      doc.text(`Status: ${data.project.status || 'N/A'}`);
      doc.text(`Created: ${new Date(data.project.created_at as string).toLocaleDateString()}`);
      doc.moveDown(2);
    }

    // Deliverables section
    if (data.deliverables && data.deliverables.length > 0) {
      doc.fontSize(18).font('Helvetica-Bold').text('Deliverables');
      doc.moveDown();

      data.deliverables.forEach((d, index) => {
        doc.fontSize(14).font('Helvetica-Bold').text(`${index + 1}. ${d.name}`);
        doc.fontSize(10).font('Helvetica')
          .text(`Type: ${d.type} | Status: ${d.status}`);

        if (d.content && typeof d.content === 'object') {
          const content = d.content as { response?: string };
          if (content.response) {
            doc.moveDown(0.5);
            doc.fontSize(10).text(content.response.substring(0, 500) + (content.response.length > 500 ? '...' : ''));
          }
        }
        doc.moveDown();
      });
    }

    // Wireframes section
    if (data.wireframes && data.wireframes.length > 0) {
      doc.addPage();
      doc.fontSize(18).font('Helvetica-Bold').text('Wireframes');
      doc.moveDown();

      data.wireframes.forEach((w, index) => {
        doc.fontSize(14).font('Helvetica-Bold').text(`${index + 1}. ${w.name}`);
        doc.fontSize(10).font('Helvetica')
          .text(`Page Type: ${w.page_type || 'N/A'} | Status: ${w.status}`);
        if (w.description) {
          doc.text(`Description: ${w.description}`);
        }
        if (w.uxpilot_url) {
          doc.text(`Preview: ${w.uxpilot_url}`);
        }
        doc.moveDown();
      });
    }

    // Prototypes section
    if (data.prototypes && data.prototypes.length > 0) {
      doc.addPage();
      doc.fontSize(18).font('Helvetica-Bold').text('Prototypes');
      doc.moveDown();

      data.prototypes.forEach((p, index) => {
        doc.fontSize(14).font('Helvetica-Bold').text(`${index + 1}. ${p.name}`);
        doc.fontSize(10).font('Helvetica')
          .text(`Framework: ${p.framework} | Status: ${p.status} | Iteration: ${p.iteration}`);
        if (p.description) {
          doc.text(`Description: ${p.description}`);
        }
        if (p.v0_url) {
          doc.text(`Preview: ${p.v0_url}`);
        }
        doc.moveDown();
      });
    }

    // Footer
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Generated by UX AI Agency | Page ${i + 1} of ${pages.count}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }

    doc.end();
  });
}

// Generate DOCX
async function generateDOCX(
  data: {
    deliverables: Array<Record<string, unknown>> | null;
    wireframes?: Array<Record<string, unknown>> | null;
    prototypes?: Array<Record<string, unknown>> | null;
    project?: Record<string, unknown>;
  },
  title: string
): Promise<Buffer> {
  const sections: Paragraph[] = [];

  // Title
  sections.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 400 },
    })
  );

  // Project info
  if (data.project) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Project: ', bold: true }),
          new TextRun({ text: (data.project.name as string) || 'Untitled' }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Status: ', bold: true }),
          new TextRun({ text: (data.project.status as string) || 'N/A' }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Created: ', bold: true }),
          new TextRun({ text: new Date(data.project.created_at as string).toLocaleDateString() }),
        ],
        spacing: { after: 400 },
      })
    );
  }

  // Deliverables section
  if (data.deliverables && data.deliverables.length > 0) {
    sections.push(
      new Paragraph({
        text: 'Deliverables',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    // Deliverables table
    const tableRows = [
      new TableRow({
        children: ['Name', 'Type', 'Status', 'Created'].map(
          header => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })],
            width: { size: 25, type: WidthType.PERCENTAGE },
          })
        ),
      }),
      ...data.deliverables.map(
        d => new TableRow({
          children: [
            d.name as string,
            d.type as string,
            d.status as string,
            new Date(d.created_at as string).toLocaleDateString(),
          ].map(
            text => new TableCell({
              children: [new Paragraph({ text })],
              width: { size: 25, type: WidthType.PERCENTAGE },
            })
          ),
        })
      ),
    ];

    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: '' }), // Spacer for table
        ],
      })
    );

    const table = new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    sections.push(new Paragraph({ children: [] })); // Will add table separately
  }

  // Wireframes section
  if (data.wireframes && data.wireframes.length > 0) {
    sections.push(
      new Paragraph({
        text: 'Wireframes',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    data.wireframes.forEach((w, index) => {
      sections.push(
        new Paragraph({
          text: `${index + 1}. ${w.name}`,
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Page Type: ${w.page_type || 'N/A'} | Status: ${w.status}` }),
          ],
        })
      );
      if (w.description) {
        sections.push(new Paragraph({ text: w.description as string }));
      }
    });
  }

  // Prototypes section
  if (data.prototypes && data.prototypes.length > 0) {
    sections.push(
      new Paragraph({
        text: 'Prototypes',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    data.prototypes.forEach((p, index) => {
      sections.push(
        new Paragraph({
          text: `${index + 1}. ${p.name}`,
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Framework: ${p.framework} | Status: ${p.status} | Iteration: ${p.iteration}` }),
          ],
        })
      );
      if (p.description) {
        sections.push(new Paragraph({ text: p.description as string }));
      }
    });
  }

  const doc = new Document({
    sections: [{ children: sections }],
  });

  return await Packer.toBuffer(doc);
}

// Generate PPTX
async function generatePPTX(
  data: {
    deliverables: Array<Record<string, unknown>> | null;
    wireframes?: Array<Record<string, unknown>> | null;
    prototypes?: Array<Record<string, unknown>> | null;
    project?: Record<string, unknown>;
  },
  title: string
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.author = 'UX AI Agency';
  pptx.title = title;

  // Title slide
  const titleSlide = pptx.addSlide();
  titleSlide.addText(title, {
    x: 0.5,
    y: 2,
    w: '90%',
    h: 1.5,
    fontSize: 36,
    bold: true,
    align: 'center',
    color: '363636',
  });

  if (data.project) {
    titleSlide.addText(`Project: ${data.project.name || 'Untitled'}`, {
      x: 0.5,
      y: 3.5,
      w: '90%',
      fontSize: 18,
      align: 'center',
      color: '666666',
    });
  }

  // Deliverables slides
  if (data.deliverables && data.deliverables.length > 0) {
    const delivSlide = pptx.addSlide();
    delivSlide.addText('Deliverables', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      fontSize: 28,
      bold: true,
      color: '363636',
    });

    const tableData = [
      [
        { text: 'Name', options: { bold: true, fill: { color: 'E7E7E7' } } },
        { text: 'Type', options: { bold: true, fill: { color: 'E7E7E7' } } },
        { text: 'Status', options: { bold: true, fill: { color: 'E7E7E7' } } },
      ],
      ...data.deliverables.slice(0, 8).map(d => [
        { text: (d.name as string) || '' },
        { text: (d.type as string) || '' },
        { text: (d.status as string) || '' },
      ]),
    ];

    delivSlide.addTable(tableData, {
      x: 0.5,
      y: 1.2,
      w: 9,
      fontSize: 12,
      border: { type: 'solid', pt: 1, color: 'CFCFCF' },
    });
  }

  // Wireframes slides
  if (data.wireframes && data.wireframes.length > 0) {
    data.wireframes.forEach((w, index) => {
      const slide = pptx.addSlide();
      slide.addText(`Wireframe: ${w.name}`, {
        x: 0.5,
        y: 0.5,
        w: '90%',
        fontSize: 24,
        bold: true,
        color: '363636',
      });

      slide.addText(`Page Type: ${w.page_type || 'N/A'} | Status: ${w.status}`, {
        x: 0.5,
        y: 1.2,
        w: '90%',
        fontSize: 14,
        color: '666666',
      });

      if (w.description) {
        slide.addText(w.description as string, {
          x: 0.5,
          y: 1.8,
          w: '90%',
          fontSize: 12,
          color: '444444',
        });
      }
    });
  }

  // Prototypes slides
  if (data.prototypes && data.prototypes.length > 0) {
    data.prototypes.forEach((p) => {
      const slide = pptx.addSlide();
      slide.addText(`Prototype: ${p.name}`, {
        x: 0.5,
        y: 0.5,
        w: '90%',
        fontSize: 24,
        bold: true,
        color: '363636',
      });

      slide.addText(`Framework: ${p.framework} | Iteration: ${p.iteration}`, {
        x: 0.5,
        y: 1.2,
        w: '90%',
        fontSize: 14,
        color: '666666',
      });

      if (p.description) {
        slide.addText(p.description as string, {
          x: 0.5,
          y: 1.8,
          w: '90%',
          fontSize: 12,
          color: '444444',
        });
      }
    });
  }

  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return buffer as Buffer;
}

// GET - List deliverables
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get('projectId');
    const deliverableId = searchParams.get('deliverableId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get specific deliverable
    if (deliverableId) {
      const data = await getDeliverableData(supabase, deliverableId);
      return NextResponse.json({ success: true, deliverable: data });
    }

    // List deliverables
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('deliverables')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);

    const { data: deliverables, count, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch deliverables' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deliverables,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });

  } catch (error) {
    console.error('Get deliverables error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Export deliverables
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body: ExportRequest = await request.json();

    const {
      deliverableId,
      projectId,
      format,
      includeWireframes = true,
      includePrototypes = true,
    } = body;

    if (!format || !['pdf', 'docx', 'pptx'].includes(format)) {
      return NextResponse.json(
        { error: 'Valid format is required (pdf, docx, pptx)' },
        { status: 400 }
      );
    }

    if (!deliverableId && !projectId) {
      return NextResponse.json(
        { error: 'deliverableId or projectId is required' },
        { status: 400 }
      );
    }

    let data: {
      deliverables: Array<Record<string, unknown>> | null;
      wireframes?: Array<Record<string, unknown>> | null;
      prototypes?: Array<Record<string, unknown>> | null;
      project?: Record<string, unknown>;
    };
    let title: string;

    if (deliverableId) {
      const deliverable = await getDeliverableData(supabase, deliverableId);
      data = {
        deliverables: [deliverable],
        project: deliverable.project,
      };
      title = deliverable.name;
    } else {
      // Get project info
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      const projectData = await getProjectDeliverables(
        supabase,
        projectId!,
        includeWireframes,
        includePrototypes
      );

      data = {
        ...projectData,
        project,
      };
      title = `${project?.name || 'Project'} - Deliverables`;
    }

    // Generate document
    let buffer: Buffer;
    let contentType: string;
    let extension: string;

    switch (format) {
      case 'pdf':
        buffer = await generatePDF(data, title);
        contentType = 'application/pdf';
        extension = 'pdf';
        break;
      case 'docx':
        buffer = await generateDOCX(data, title);
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        extension = 'docx';
        break;
      case 'pptx':
        buffer = await generatePPTX(data, title);
        contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        extension = 'pptx';
        break;
      default:
        return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }

    // Generate filename
    const filename = `${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${extension}`;

    // Return file
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Export deliverables error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
