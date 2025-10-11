// app/api/onboarding/upload/route.js
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { PDFParse } from 'pdf-parse';
import { pathToFileURL } from 'url';
import { resolve } from 'path';
import { cwd } from 'process';

//
// 🧩 Configure PDF.js Worker for Next.js/Turbopack builds
//
try {
  const workerPath = resolve(cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
  const workerUrl = pathToFileURL(workerPath).href;
  PDFParse.setWorker(workerUrl);
  console.log('🧩 PDF.js worker configured from:', workerUrl);
} catch (err) {
  console.warn('⚠️ Could not configure pdf.worker.mjs automatically:', err.message);
}

//
// 📨 POST /api/onboarding/upload
//
export async function POST(request) {
  try {
    const formData = await request.formData();
    const accountId = formData.get('accountId');

    console.log('📥 Upload request received');
    console.log('Account ID:', accountId);

    if (!accountId) {
      console.error('❌ No accountId provided');
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    const files = formData.getAll('documents') || [];
    console.log(`Found ${files.length} file(s) in request`);

    if (files.length === 0) {
      return NextResponse.json({ error: 'No documents provided' }, { status: 400 });
    }

    // ✅ Verify account
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      console.error('❌ Invalid account:', accountError);
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 404 });
    }

    console.log('✅ Account verified');

    // ✅ Check how many docs exist
    const { data: existingDocs, error: countError } = await supabaseAdmin
      .from('business_faqs')
      .select('id')
      .eq('account_id', accountId);

    if (countError) throw countError;

    const currentCount = existingDocs?.length || 0;
    const remainingSlots = 4 - currentCount;

    console.log(`Current docs: ${currentCount}/4, Remaining slots: ${remainingSlots}`);

    if (files.length > remainingSlots) {
      return NextResponse.json(
        { error: `Can only upload ${remainingSlots} more document(s). Maximum is 4 total.` },
        { status: 400 }
      );
    }

    const uploadedDocs = [];

    // ✅ Process each file
    for (const file of files) {
      console.log(`\n📄 Processing: ${file.name}`);
      console.log(`   Type: ${file.type}`);
      console.log(`   Size: ${file.size} bytes`);

      let content = '';

      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          console.log('   📕 Extracting text from PDF...');

          try {
            const parser = new PDFParse({ data: buffer });
            const result = await parser.getText();
            await parser.destroy();

            content = result.text?.trim() || '';

            if (content.length > 0) {
              console.log(`   ✅ PDF text extracted (${content.length} chars)`);
            } else {
              console.warn('   ⚠️  No text found (possibly scanned PDF)');
              content = `[PDF FILE - ${file.name}]\n\nThis PDF contains no extractable text. It may be a scanned image.\n`;
            }
          } catch (pdfError) {
            console.error('   ❌ PDF parsing error:', pdfError.message);
            content = `[PDF FILE - ${file.name}]\n\nFailed to extract text: ${pdfError.message}\n`;
          }

        } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          content = Buffer.from(buffer).toString('utf-8');
          console.log(`   ✅ Text content extracted (${content.length} chars)`);

        } else if (
          file.name.toLowerCase().endsWith('.docx') ||
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
          content = `[DOCX FILE - ${file.name}]\n\nDOCX parsing not implemented yet.\nPlease convert to PDF or TXT.`;
          console.log('   ⚠️  DOCX stored as placeholder');

        } else {
          content = `[FILE - ${file.name}]\nType: ${file.type}\nUnsupported file type.`;
          console.log('   ⚠️  Unsupported file type');
        }
      } catch (err) {
        console.error(`   ❌ Error processing ${file.name}:`, err.message);
        content = `[ERROR - ${file.name}]\n\nFailed to extract content: ${err.message}`;
      }

      // ✅ Save to Supabase
      const { data, error } = await supabaseAdmin
        .from('business_faqs')
        .insert({
          account_id: accountId,
          document_name: file.name,
          content,
          file_size: file.size,
          file_type: file.type || 'application/octet-stream',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`   ✅ Saved to database with ID: ${data.id}`);

      uploadedDocs.push({
        id: data.id,
        name: file.name,
        size: file.size,
        type: file.type,
        extracted: content.length > 0,
      });
    }

    console.log(`\n✅ Successfully uploaded ${uploadedDocs.length} document(s)`);

    return NextResponse.json({
      success: true,
      message: `${uploadedDocs.length} document(s) uploaded successfully`,
      documents: uploadedDocs,
    });
  } catch (error) {
    console.error('❌ Upload API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload documents' },
      { status: 500 }
    );
  }
}
