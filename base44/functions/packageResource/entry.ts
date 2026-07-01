import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Resource Packaging Engine
// Transforms raw acquired text into a structured native knowledge object
// with chapters, sections, paragraphs, table of contents, word count, and reading time.
// Can be called from runCAE or manually from the admin dashboard.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { library_text_id, raw_text, metadata, chapters_from_llm } = body;

    let textRecord = null;

    // If a library_text_id is provided, fetch the existing record
    if (library_text_id) {
      textRecord = await base44.asServiceRole.entities.LibraryText.get(library_text_id);
      if (!textRecord) {
        return Response.json({ error: 'LibraryText not found' }, { status: 404 });
      }
      await base44.asServiceRole.entities.LibraryText.update(library_text_id, {
        packaging_status: 'packaging'
      });
    }

    const title = textRecord?.title || metadata?.title || 'Untitled';
    const tradition = textRecord?.tradition || metadata?.tradition || 'Unknown';
    const collection = textRecord?.collection || metadata?.collection || 'sacred_scriptures';

    let chapters = [];
    let fullText = '';
    let acquisitionMethod = 'llm_acquired';

    // If LLM returned structured chapters directly, use them
    if (chapters_from_llm && Array.isArray(chapters_from_llm) && chapters_from_llm.length > 0) {
      chapters = chapters_from_llm.map((ch, idx) => ({
        title: ch.title || `Chapter ${idx + 1}`,
        order: idx + 1,
        sections: splitIntoSections(ch.content || ch.text || '')
      }));
      fullText = chapters_from_llm.map(ch => ch.content || ch.text || '').join('\n\n');
      acquisitionMethod = 'llm_acquired';
    } else if (raw_text) {
      // Otherwise, structure raw text using pattern-based detection
      const structured = structureRawText(raw_text, title);
      chapters = structured.chapters;
      fullText = raw_text;
      acquisitionMethod = 'native_fetch';
    } else if (textRecord?.full_text) {
      // Use existing full_text from the record
      const structured = structureRawText(textRecord.full_text, title);
      chapters = structured.chapters;
      fullText = textRecord.full_text;
      acquisitionMethod = textRecord.acquisition_method || 'native_fetch';
    } else {
      return Response.json({ error: 'No text content provided for packaging' }, { status: 400 });
    }

    // Build table of contents
    const toc = chapters.map((ch, idx) => ({
      chapter_number: idx + 1,
      title: ch.title
    }));

    // Calculate word count and reading time
    const wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    // Build full_text from chapters if not already set
    if (!fullText && chapters.length > 0) {
      fullText = chapters.map(ch =>
        ch.sections.map(s => s.paragraphs.join('\n\n')).join('\n\n')
      ).join('\n\n');
    }

    // Update the LibraryText record if we have an ID
    if (textRecord) {
      await base44.asServiceRole.entities.LibraryText.update(textRecord.id, {
        full_text: fullText,
        full_text_available: true,
        full_text_unavailable_reason: '',
        chapters: JSON.stringify(chapters),
        table_of_contents: JSON.stringify(toc),
        word_count: wordCount,
        reading_time_minutes: readingTime,
        packaging_status: 'packaged',
        acquisition_method: acquisitionMethod,
        access_level: 'full_text',
        last_verification: new Date().toISOString(),
        structure: chapters.length > 0
          ? `${chapters.length} chapter(s), ${wordCount} words, ~${readingTime} min read`
          : textRecord.structure || ''
      });

      // Log the packaging event
      await base44.asServiceRole.entities.CAEActivityEvent.create({
        event_type: 'published_to_library',
        resource_title: title,
        source_provider: textRecord.source_provider || 'CAE',
        status: 'success',
        details: `Native resource packaged: ${title} — ${chapters.length} chapters, ${wordCount} words`,
        is_public: true,
        category: 'newly_indexed',
        tradition: tradition
      });

      await base44.asServiceRole.entities.CAEOperationLog.create({
        operation_type: 'publishing',
        description: `Packaged resource: ${title}`,
        resource_title: title,
        outcome: 'success',
        details: `${chapters.length} chapters, ${wordCount} words, ${readingTime} min read`,
        subsystem: 'live_library_publisher'
      });
    }

    return Response.json({
      status: 'success',
      title,
      chapters_count: chapters.length,
      word_count: wordCount,
      reading_time_minutes: readingTime,
      acquisition_method: acquisitionMethod,
      library_text_id: textRecord?.id || null
    });

  } catch (error) {
    // Mark as failed if we have the record ID
    try {
      const body = await req.clone().json();
      if (body.library_text_id) {
        const base44 = createClientFromRequest(req);
        await base44.asServiceRole.entities.LibraryText.update(body.library_text_id, {
          packaging_status: 'failed'
        });
      }
    } catch {}
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Split text content into sections (paragraphs grouped together)
function splitIntoSections(text) {
  const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
  if (paragraphs.length === 0) return [];
  // Group every 5-10 paragraphs into a section (or just one section for short texts)
  if (paragraphs.length <= 10) {
    return [{ title: '', paragraphs }];
  }
  const sections = [];
  const sectionSize = Math.ceil(paragraphs.length / Math.ceil(paragraphs.length / 8));
  for (let i = 0; i < paragraphs.length; i += sectionSize) {
    sections.push({
      title: '',
      paragraphs: paragraphs.slice(i, i + sectionSize)
    });
  }
  return sections;
}

// Structure raw text into chapters using pattern-based detection
function structureRawText(rawText, title) {
  // Common chapter heading patterns
  const chapterPatterns = [
    /^#{1,3}\s+(.+)$/gm,                    // Markdown headings
    /^Chapter\s+(\d+|I+|V|X+)[\.\:\s]*(.*)$/gim,  // "Chapter 1" or "Chapter I"
    /^CHAPTER\s+(\d+|I+|V|X+)[\.\:\s]*(.*)$/gm,   // "CHAPTER 1"
    /^Book\s+(\d+|I+|V|X+)[\.\:\s]*(.*)$/gim,      // "Book 1"
    /^(\d+)\.\s+(.+)$/gm,                    // "1. Title"
    /^Section\s+(\d+)[\.\:\s]*(.*)$/gim,    // "Section 1"
    /^Psalm\s+(\d+)/gim,                     // "Psalm 1"
    /^Surah\s+(\d+|Al-[A-Za-z]+)/gim,        // "Surah 1" or "Surah Al-Fatihah"
  ];

  // Try to find chapter boundaries
  let chapterMatches = [];
  for (const pattern of chapterPatterns) {
    const matches = [...rawText.matchAll(pattern)];
    if (matches.length >= 2) {
      chapterMatches = matches.map((m, idx) => ({
        title: m[0].trim().replace(/^#+\s*/, ''),
        index: m.index,
        matchLength: m[0].length
      }));
      break;
    }
  }

  // If we found chapter boundaries, split by them
  if (chapterMatches.length >= 2) {
    const chapters = [];
    for (let i = 0; i < chapterMatches.length; i++) {
      const start = chapterMatches[i].index + chapterMatches[i].matchLength;
      const end = i + 1 < chapterMatches.length ? chapterMatches[i + 1].index : rawText.length;
      const content = rawText.substring(start, end).trim();
      chapters.push({
        title: chapterMatches[i].title,
        order: i + 1,
        sections: splitIntoSections(content)
      });
    }
    // Check if there's content before the first chapter (introduction, preface, etc.)
    if (chapterMatches[0].index > 100) {
      const introContent = rawText.substring(0, chapterMatches[0].index).trim();
      if (introContent.length > 50) {
        chapters.unshift({
          title: 'Introduction',
          order: 0,
          sections: splitIntoSections(introContent)
        });
      }
    }
    return { chapters };
  }

  // No chapter structure detected — treat the entire text as a single chapter
  const paragraphs = rawText.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
  if (paragraphs.length === 0) {
    return { chapters: [{ title: title || 'Text', order: 1, sections: [{ title: '', paragraphs: [rawText] }] }] };
  }

  // For longer texts, try to split into logical sections of ~20 paragraphs
  if (paragraphs.length > 30) {
    const sectionCount = Math.ceil(paragraphs.length / 20);
    const chapters = [];
    for (let i = 0; i < sectionCount; i++) {
      const sectionParas = paragraphs.slice(i * 20, (i + 1) * 20);
      chapters.push({
        title: `Part ${i + 1}`,
        order: i + 1,
        sections: [{ title: '', paragraphs: sectionParas }]
      });
    }
    return { chapters };
  }

  return {
    chapters: [{
      title: title || 'Full Text',
      order: 1,
      sections: splitIntoSections(rawText)
    }]
  };
}