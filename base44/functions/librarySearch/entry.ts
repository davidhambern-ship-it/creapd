import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { query, mode } = body;

    if (!query) {
      return Response.json({ error: 'query is required' }, { status: 400 });
    }

    const searchMode = mode || 'general';

    // Mode: word_study — generate a word profile with language bridges
    if (searchMode === 'word_study') {
      return await handleWordStudy(base44, query);
    }

    // Mode: comparison — generate a comparison workspace
    if (searchMode === 'comparison') {
      return await handleComparison(base44, query);
    }

    // Default mode: general library search
    return await handleLibrarySearch(base44, query);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleLibrarySearch(base44, query) {
  // First check if we already have NATIVE LibraryText records matching this query
  // Only native texts (full_text_available) are returned — hyperlinks are not library books
  const existingTexts = await base44.entities.LibraryText.filter(
    { title: { $regex: query, $options: 'i' }, full_text_available: true },
    '-updated_date',
    20
  ).catch(() => []);

  const prompt = `You are the World Scripture Library research assistant. A producer has searched for: "${query}"

Your task is to find relevant texts, passages, words, and topics from the world's spiritual, religious, historical, and philosophical literature.

ACCURACY RULES (highest priority):
- Never fabricate text, translations, citations, historical claims, dates, authors, or languages
- If you are uncertain, clearly identify the uncertainty
- Distinguish between: Primary Source, Secondary Source, AI Summary, Historical Tradition, Scholarly Debate, Estimated Dating, Traditional Attribution
- Only include source URLs that genuinely exist
- If full text is not available, set full_text_available to false and explain why

Search for texts, passages, and words that match the query. Return results organized by type.

Return a JSON object with these keys:
{
  "texts": [{ "title", "tradition", "collection", "original_language", "writing_system", "traditional_attribution", "scholarly_dating", "historical_context", "geographic_origin", "major_themes" (array), "structure", "available_translations" (array), "access_level", "verification_status", "license_status", "source_provider", "source_url", "full_text_available", "full_text_unavailable_reason", "confidence_notes", "summary" }],
  "passages": [{ "text_title", "reference", "translation", "content", "context_note" }],
  "words": [{ "word", "original_script", "language", "transliteration", "literal_meaning", "grammar", "occurrences" (array of references) }],
  "topics": [{ "topic", "description", "related_traditions" (array), "key_texts" (array) }],
  "suggestions": [{ "label", "type", "query" }]
}`;

  const schema = {
    type: 'object',
    properties: {
      texts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            tradition: { type: 'string' },
            collection: { type: 'string' },
            original_language: { type: 'string' },
            writing_system: { type: 'string' },
            traditional_attribution: { type: 'string' },
            scholarly_dating: { type: 'string' },
            historical_context: { type: 'string' },
            geographic_origin: { type: 'string' },
            major_themes: { type: 'array', items: { type: 'string' } },
            structure: { type: 'string' },
            available_translations: { type: 'array', items: { type: 'string' } },
            access_level: { type: 'string' },
            verification_status: { type: 'string' },
            license_status: { type: 'string' },
            source_provider: { type: 'string' },
            source_url: { type: 'string' },
            full_text_available: { type: 'boolean' },
            full_text_unavailable_reason: { type: 'string' },
            confidence_notes: { type: 'string' },
            summary: { type: 'string' }
          }
        }
      },
      passages: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text_title: { type: 'string' },
            reference: { type: 'string' },
            translation: { type: 'string' },
            content: { type: 'string' },
            context_note: { type: 'string' }
          }
        }
      },
      words: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            word: { type: 'string' },
            original_script: { type: 'string' },
            language: { type: 'string' },
            transliteration: { type: 'string' },
            literal_meaning: { type: 'string' },
            grammar: { type: 'string' },
            occurrences: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      topics: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            topic: { type: 'string' },
            description: { type: 'string' },
            related_traditions: { type: 'array', items: { type: 'string' } },
            key_texts: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      suggestions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            type: { type: 'string' },
            query: { type: 'string' }
          }
        }
      }
    }
  };

  const llmResponse = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    response_json_schema: schema,
    model: 'gemini_3_flash'
  });

  // Create LibraryText records for found texts
  const validCollections = ['sacred_scriptures', 'historical_documents', 'ancient_manuscripts', 'apocryphal', 'original_languages', 'lexicons', 'historical_records', 'reference_works', 'organization_publications', 'language_learning', 'research_collections', 'personal_collections'];
  const validAccess = ['full_text', 'embedded_access', 'external_link', 'metadata_only'];
  const validVerification = ['verified_primary_source', 'verified_historical_source', 'verified_academic_source', 'official_publisher', 'official_organization', 'public_domain', 'licensed_content', 'metadata_only', 'community_resource'];
  const validLicense = ['public_domain', 'official_free_access', 'licensed_integration', 'external_official_link', 'metadata_only', 'unavailable'];

  const textsToCreate = (llmResponse.texts || []).map(t => ({
    title: t.title || query,
    tradition: t.tradition || 'General',
    collection: validCollections.includes(t.collection) ? t.collection : 'sacred_scriptures',
    original_language: t.original_language || '',
    writing_system: t.writing_system || '',
    traditional_attribution: t.traditional_attribution || '',
    scholarly_dating: t.scholarly_dating || '',
    historical_context: t.historical_context || '',
    geographic_origin: t.geographic_origin || '',
    major_themes: JSON.stringify(t.major_themes || []),
    structure: t.structure || '',
    available_translations: JSON.stringify(t.available_translations || []),
    full_text_available: false,
    full_text_unavailable_reason: 'Pending native acquisition by the Content Acquisition Engine.',
    source_url: t.source_url || '',
    access_level: 'metadata_only',
    packaging_status: 'not_packaged',
    acquisition_method: 'external_only',
    verification_status: validVerification.includes(t.verification_status) ? t.verification_status : 'metadata_only',
    license_status: validLicense.includes(t.license_status) ? t.license_status : 'metadata_only',
    source_provider: t.source_provider || '',
    confidence_notes: t.confidence_notes || '',
    last_verification: new Date().toISOString()
  }));

  // Only create texts that don't already exist
  const newTexts = [];
  for (const t of textsToCreate) {
    const exists = (existingTexts || []).some(e => e.title && e.title.toLowerCase() === t.title.toLowerCase());
    if (!exists) newTexts.push(t);
  }
  if (newTexts.length > 0) {
    await base44.entities.LibraryText.bulkCreate(newTexts).catch(() => {});
  }

  return Response.json({
    success: true,
    query,
    existing_texts: existingTexts || [],
    new_texts: newTexts,
    passages: llmResponse.passages || [],
    words: llmResponse.words || [],
    topics: llmResponse.topics || [],
    suggestions: llmResponse.suggestions || []
  });
}

async function handleWordStudy(base44, query) {
  // Check if we already have this word studied
  const existing = await base44.entities.WordStudy.filter(
    { word: { $regex: query, $options: 'i' } },
    '-updated_date',
    1
  ).catch(() => []);

  if (existing && existing.length > 0) {
    return Response.json({ success: true, word_study: existing[0], existing: true });
  }

  const prompt = `You are a language scholar in the World Scripture Library. Create a comprehensive Word Profile for: "${query}"

ACCURACY RULES:
- Never fabricate pronunciations, grammar, etymology, or occurrences
- If uncertain, clearly state the uncertainty
- Distinguish between: Direct Translation, Closest Translation, Conceptual Parallel, Related Theme, Shared Root, No Direct Equivalent
- Only include occurrences you are confident about

Create a complete Word Profile including the Language Bridge Engine connections.

Return a JSON object with these exact keys:
{
  "word": "the transliterated word",
  "original_script": "the word in its original script",
  "language": "the language (e.g. Biblical Hebrew, Koine Greek)",
  "writing_system": "the writing system",
  "transliteration": "transliteration",
  "pronunciation": "phonetic pronunciation",
  "ipa": "IPA notation if known, empty string if not",
  "literal_meaning": "literal meaning",
  "contextual_meaning": "contextual meaning in religious texts",
  "grammar": "grammar notes",
  "part_of_speech": "part of speech",
  "root": "root word",
  "word_family": ["related word family members"],
  "historical_development": "how the word developed historically",
  "occurrences": [{"reference": "book chapter:verse", "context": "brief context"}],
  "translation_variations": [{"translation": "version name", "rendering": "how it's translated", "notes": "translation note"}],
  "related_concepts": ["related concepts"],
  "language_bridges": [{"target_word": "word in another language", "target_language": "language", "bridge_type": "one of: direct_translation, closest_translation, conceptual_parallel, related_theme, shared_root, no_direct_equivalent", "explanation": "why this bridge exists"}],
  "bridge_type": "the primary bridge type for this word to English",
  "follow_up_questions": ["3-5 suggested follow-up study questions"]
}`;

  const schema = {
    type: 'object',
    properties: {
      word: { type: 'string' },
      original_script: { type: 'string' },
      language: { type: 'string' },
      writing_system: { type: 'string' },
      transliteration: { type: 'string' },
      pronunciation: { type: 'string' },
      ipa: { type: 'string' },
      literal_meaning: { type: 'string' },
      contextual_meaning: { type: 'string' },
      grammar: { type: 'string' },
      part_of_speech: { type: 'string' },
      root: { type: 'string' },
      word_family: { type: 'array', items: { type: 'string' } },
      historical_development: { type: 'string' },
      occurrences: { type: 'array', items: { type: 'object', properties: { reference: { type: 'string' }, context: { type: 'string' } } } },
      translation_variations: { type: 'array', items: { type: 'object', properties: { translation: { type: 'string' }, rendering: { type: 'string' }, notes: { type: 'string' } } } },
      related_concepts: { type: 'array', items: { type: 'string' } },
      language_bridges: { type: 'array', items: { type: 'object', properties: { target_word: { type: 'string' }, target_language: { type: 'string' }, bridge_type: { type: 'string' }, explanation: { type: 'string' } } } },
      bridge_type: { type: 'string' },
      follow_up_questions: { type: 'array', items: { type: 'string' } }
    }
  };

  const llmResponse = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    response_json_schema: schema,
    model: 'gemini_3_flash'
  });

  const validBridgeTypes = ['direct_translation', 'closest_translation', 'conceptual_parallel', 'related_theme', 'shared_root', 'no_direct_equivalent'];

  const wordStudy = await base44.entities.WordStudy.create({
    word: llmResponse.word || query,
    original_script: llmResponse.original_script || '',
    language: llmResponse.language || '',
    writing_system: llmResponse.writing_system || '',
    transliteration: llmResponse.transliteration || '',
    pronunciation: llmResponse.pronunciation || '',
    ipa: llmResponse.ipa || '',
    literal_meaning: llmResponse.literal_meaning || '',
    contextual_meaning: llmResponse.contextual_meaning || '',
    grammar: llmResponse.grammar || '',
    part_of_speech: llmResponse.part_of_speech || '',
    root: llmResponse.root || '',
    word_family: JSON.stringify(llmResponse.word_family || []),
    historical_development: llmResponse.historical_development || '',
    occurrences: JSON.stringify(llmResponse.occurrences || []),
    translation_variations: JSON.stringify(llmResponse.translation_variations || []),
    related_concepts: JSON.stringify(llmResponse.related_concepts || []),
    language_bridges: JSON.stringify(llmResponse.language_bridges || []),
    bridge_type: validBridgeTypes.includes(llmResponse.bridge_type) ? llmResponse.bridge_type : 'direct_translation',
    mastery_level: 'new'
  });

  // Update or create language progress
  if (wordStudy.language) {
    const progExisting = await base44.entities.LanguageProgress.filter(
      { language: wordStudy.language },
      '-updated_date',
      1
    ).catch(() => []);

    if (progExisting && progExisting.length > 0) {
      await base44.entities.LanguageProgress.update(progExisting[0].id, {
        words_learned: (progExisting[0].words_learned || 0) + 1,
        last_studied: new Date().toISOString()
      });
    } else {
      await base44.entities.LanguageProgress.create({
        language: wordStudy.language,
        words_learned: 1,
        last_studied: new Date().toISOString()
      });
    }
  }

  return Response.json({
    success: true,
    word_study: wordStudy,
    follow_up_questions: llmResponse.follow_up_questions || []
  });
}

async function handleComparison(base44, query) {
  const prompt = `You are the Comparative Studies Engine in the World Scripture Library. A producer wants to compare: "${query}"

ACCURACY RULES:
- Never fabricate sources, quotations, translations, or historical events
- Clearly distinguish between sourced facts and AI-generated synthesis
- Every similarity and difference must include supporting citations
- Never merge concepts that are historically or linguistically distinct
- Never force conclusions — the producer remains responsible for interpretation
- Distinguish between: Direct Translation, Conceptual Parallel, Historical Influence, Shared Root, No Equivalent

Automatically determine the comparison type and generate a comprehensive comparison.

Return a JSON object with these exact keys:
{
  "title": "comparison title",
  "comparison_type": "one of: scripture_vs_scripture, passage_vs_passage, book_vs_book, word_vs_word, theme_vs_theme, doctrine_vs_doctrine, tradition_vs_tradition, translation_vs_translation, language_vs_language, figure_vs_figure, place_vs_place, custom_comparison",
  "items_compared": [{"name": "item name", "tradition": "tradition", "type": "text/passage/word/theme/figure/place", "description": "brief description"}],
  "comparison_matrix": [{"row": "row name (e.g. Major Themes, Historical Context, Original Language, Key Teachings, Terminology, Important Figures, Timeline, Geography, Related Concepts, Supporting References)", "values": [{"item": "item name", "content": "content for this row and item"}]}],
  "similarities": [{"point": "similarity description", "citation": "supporting citation", "source": "source name"}],
  "differences": [{"point": "difference description", "citation": "supporting citation", "source": "source name"}],
  "historical_development": "historical development narrative",
  "timeline_events": [{"date": "date or period", "event": "event description", "related_item": "which item this relates to"}],
  "language_notes": "language comparison notes if applicable, empty if not",
  "multiple_perspectives": [{"perspective": "perspective name", "summary": "summary", "sources": ["supporting sources"]}],
  "ai_summary": "executive summary distinguishing sourced facts from AI synthesis",
  "ai_questions": ["3-5 questions for further study"],
  "sources_used": [{"name": "source name", "url": "source URL if available", "type": "primary/secondary/academic/historical"}],
  "related_studies": ["suggested related study topics"]
}`;

  const schema = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      comparison_type: { type: 'string' },
      items_compared: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, tradition: { type: 'string' }, type: { type: 'string' }, description: { type: 'string' } } } },
      comparison_matrix: { type: 'array', items: { type: 'object', properties: { row: { type: 'string' }, values: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, content: { type: 'string' } } } } } } },
      similarities: { type: 'array', items: { type: 'object', properties: { point: { type: 'string' }, citation: { type: 'string' }, source: { type: 'string' } } } },
      differences: { type: 'array', items: { type: 'object', properties: { point: { type: 'string' }, citation: { type: 'string' }, source: { type: 'string' } } } },
      historical_development: { type: 'string' },
      timeline_events: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, event: { type: 'string' }, related_item: { type: 'string' } } } },
      language_notes: { type: 'string' },
      multiple_perspectives: { type: 'array', items: { type: 'object', properties: { perspective: { type: 'string' }, summary: { type: 'string' }, sources: { type: 'array', items: { type: 'string' } } } } },
      ai_summary: { type: 'string' },
      ai_questions: { type: 'array', items: { type: 'string' } },
      sources_used: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, url: { type: 'string' }, type: { type: 'string' } } } },
      related_studies: { type: 'array', items: { type: 'string' } }
    }
  };

  const llmResponse = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    response_json_schema: schema,
    model: 'gemini_3_flash'
  });

  const validTypes = ['scripture_vs_scripture', 'passage_vs_passage', 'book_vs_book', 'word_vs_word', 'theme_vs_theme', 'doctrine_vs_doctrine', 'tradition_vs_tradition', 'translation_vs_translation', 'language_vs_language', 'figure_vs_figure', 'place_vs_place', 'custom_comparison'];

  const comparison = await base44.entities.LibraryComparison.create({
    title: llmResponse.title || query,
    comparison_type: validTypes.includes(llmResponse.comparison_type) ? llmResponse.comparison_type : 'custom_comparison',
    items_compared: JSON.stringify(llmResponse.items_compared || []),
    comparison_matrix: JSON.stringify(llmResponse.comparison_matrix || []),
    similarities: JSON.stringify(llmResponse.similarities || []),
    differences: JSON.stringify(llmResponse.differences || []),
    historical_development: llmResponse.historical_development || '',
    timeline_events: JSON.stringify(llmResponse.timeline_events || []),
    language_notes: llmResponse.language_notes || '',
    multiple_perspectives: JSON.stringify(llmResponse.multiple_perspectives || []),
    ai_summary: llmResponse.ai_summary || '',
    ai_questions: JSON.stringify(llmResponse.ai_questions || []),
    sources_used: JSON.stringify(llmResponse.sources_used || []),
    status: 'ready'
  });

  return Response.json({
    success: true,
    comparison,
    related_studies: llmResponse.related_studies || []
  });
}