import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Disable worker for Node.js environment
GlobalWorkerOptions.workerSrc = '';

// PDF text extraction using pdfjs-dist (reliable Node.js compatible)
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const uint8Array = new Uint8Array(buffer);
    const pdf = await getDocument({ data: uint8Array, useSystemFonts: true }).promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: { str?: string }) => item.str || '')
        .join(' ');
      fullText += pageText + '\n';
    }

    console.log(`PDF extracted: ${fullText.length} characters from ${pdf.numPages} pages`);
    return fullText.substring(0, 50000); // Limit to 50k chars
  } catch (error) {
    console.error('PDF parse error:', error);
    return '';
  }
}

// Route segment config for large file uploads
export const runtime = 'nodejs';
export const maxDuration = 60;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'File required' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId required' },
        { status: 400 }
      );
    }

    // Get project name for folder naming
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Sanitize project name for folder (remove special chars, replace spaces with dashes)
    const sanitizedProjectName = project.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    // File size limit: 100MB
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 100MB limit' },
        { status: 400 }
      );
    }

    // Check for rename strategy from form data
    const renameStrategy = formData.get('renameStrategy') as string | null;
    const customName = formData.get('customName') as string | null;

    // Determine the original name to use
    let originalName = file.name;
    if (customName) {
      // Keep extension from original file
      const ext = file.name.split('.').pop();
      const customBase = customName.replace(/\.[^/.]+$/, ''); // Remove extension if provided
      originalName = `${customBase}.${ext}`;
    }

    // Check for duplicate files in the same project
    const { data: existingFiles } = await supabase
      .from('files')
      .select('id, original_name')
      .eq('project_id', projectId)
      .ilike('original_name', `${originalName.replace(/\.[^/.]+$/, '')}%`);

    // Find exact match or numbered versions
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    const ext = originalName.split('.').pop();
    const exactMatch = existingFiles?.find(f => f.original_name === originalName);

    if (exactMatch && !renameStrategy) {
      // Find the next available number
      const pattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(-\\d+)?\\.${ext}$`, 'i');
      const numberedFiles = existingFiles?.filter(f => pattern.test(f.original_name)) || [];

      let maxNum = 0;
      numberedFiles.forEach(f => {
        const match = f.original_name.match(/-(\d+)\./);
        if (match) {
          maxNum = Math.max(maxNum, parseInt(match[1]));
        }
      });

      const suggestedName = `${baseName}-${maxNum + 2}.${ext}`;

      return NextResponse.json({
        isDuplicate: true,
        existingFile: exactMatch,
        originalName: originalName,
        suggestedName: suggestedName,
        message: `Soubor "${originalName}" již existuje`
      }, { status: 409 });
    }

    // If auto-rename strategy, use suggested name
    if (renameStrategy === 'auto' && exactMatch) {
      const pattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(-\\d+)?\\.${ext}$`, 'i');
      const numberedFiles = existingFiles?.filter(f => pattern.test(f.original_name)) || [];

      let maxNum = 0;
      numberedFiles.forEach(f => {
        const match = f.original_name.match(/-(\d+)\./);
        if (match) {
          maxNum = Math.max(maxNum, parseInt(match[1]));
        }
      });

      originalName = `${baseName}-${maxNum + 2}.${ext}`;
    }

    // Upload do Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${sanitizedProjectName}/${fileName}`;

    // Convert File to Buffer for Node.js environment
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Získej public URL
    const { data: { publicUrl } } = supabase.storage
      .from('project-files')
      .getPublicUrl(filePath);

    // Determine file type category
    const getFileType = (mimeType: string): string => {
      if (mimeType.startsWith('image/')) return 'image';
      if (mimeType.startsWith('video/')) return 'video';
      if (mimeType.startsWith('audio/')) return 'audio';
      if (mimeType === 'application/pdf') return 'pdf';
      if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
      if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'spreadsheet';
      return 'other';
    };

    // Ulož metadata do DB
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert({
        project_id: projectId,
        name: fileName,
        original_name: originalName, // Use potentially renamed file
        file_type: getFileType(file.type),
        mime_type: file.type,
        storage_path: filePath,
        public_url: publicUrl,
        size_bytes: file.size,
        processing_status: 'pending'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Try to clean up the uploaded file from storage
      await supabase.storage.from('project-files').remove([filePath]);
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      );
    }

    // Extract text from PDF files
    if (file.type === 'application/pdf') {
      try {
        const extractedText = await extractPdfText(buffer);

        if (extractedText) {
          await supabase
            .from('files')
            .update({
              extracted_text: extractedText,
              processing_status: 'completed'
            })
            .eq('id', fileRecord.id);

          fileRecord.extracted_text = extractedText;
          fileRecord.processing_status = 'completed';
        } else {
          await supabase
            .from('files')
            .update({ processing_status: 'completed' })
            .eq('id', fileRecord.id);
          fileRecord.processing_status = 'completed';
        }
      } catch (pdfError) {
        console.error('PDF extraction error:', pdfError);
        await supabase
          .from('files')
          .update({ processing_status: 'failed' })
          .eq('id', fileRecord.id);
      }
    } else if (file.type.startsWith('image/')) {
      // For images, mark as completed - analysis happens on-demand or in chat
      await supabase
        .from('files')
        .update({ processing_status: 'completed' })
        .eq('id', fileRecord.id);
      fileRecord.processing_status = 'completed';
      console.log(`Image uploaded: ${file.name} - ready for visual analysis by agents`);
    } else {
      // Mark other files as completed
      await supabase
        .from('files')
        .update({ processing_status: 'completed' })
        .eq('id', fileRecord.id);
      fileRecord.processing_status = 'completed';
    }

    // TODO: Pokud video/audio, zavolat Whisper API pro transkripci

    return NextResponse.json({
      success: true,
      file: fileRecord,
      url: publicUrl
    });

  } catch (error) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
