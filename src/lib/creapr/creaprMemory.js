/**
 * CREAPr Memory Service
 *
 * Loads, saves, and updates lightweight interaction memory for each producer.
 * This is what makes CREAPr context-aware rather than random.
 *
 * Memory is scoped to the current user (RLS handles isolation).
 */

import { base44 } from '@/api/base44Client';

/**
 * Load the producer's CREAPr memory record.
 * Creates a blank one if none exists yet.
 */
export async function loadCreaprMemory() {
  try {
    const existing = await base44.entities.CreaprMemory.list('-updated_date', 1);
    if (existing && existing.length > 0) return existing[0];
    // First visit — create blank memory
    const created = await base44.entities.CreaprMemory.create({
      visit_count: 0,
      last_topics_discussed: '[]',
      common_topic_interests: '[]',
    });
    return created;
  } catch {
    return null;
  }
}

/**
 * Derive the session type from memory + project state.
 * @returns {'first_visit'|'returning'|'resumed_project'}
 */
export function deriveSessionType(memory, projectState) {
  if (!memory || memory.visit_count === 0) return 'first_visit';
  if (memory.unfinished_topic_title) return 'resumed_project';
  if (memory.last_completed_packet) return 'returning';
  return 'returning';
}

/**
 * Build a human-readable context summary from memory.
 * This is injected into CREAPr's prompt so responses are grounded in real context.
 */
export function buildMemoryContextString(memory, sessionType, projectState, producer) {
  if (!memory) return 'No prior memory available (first interaction).';

  const firstName = (producer?.full_name || 'there').split(' ')[0];
  const lines = [];

  lines.push(`PRODUCER: ${firstName}`);
  lines.push(`SESSION TYPE: ${sessionType}`);
  lines.push(`VISIT COUNT: ${memory.visit_count || 0}`);

  if (memory.last_visit_date) {
    const lastVisit = new Date(memory.last_visit_date);
    const now = new Date();
    const hoursSince = Math.floor((now - lastVisit) / (1000 * 60 * 60));
    if (hoursSince < 1) lines.push(`LAST VISIT: Just moments ago`);
    else if (hoursSince < 24) lines.push(`LAST VISIT: ${hoursSince} hour(s) ago`);
    else lines.push(`LAST VISIT: ${Math.floor(hoursSince / 24)} day(s) ago`);
  }

  if (memory.last_greeting) {
    lines.push(`LAST GREETING USED (do NOT repeat): "${memory.last_greeting.substring(0, 150)}"`);
  }

  if (memory.last_response_style) {
    lines.push(`LAST RESPONSE STYLE USED (vary this): ${memory.last_response_style}`);
  }

  if (memory.unfinished_topic_title) {
    lines.push(`UNFINISHED TOPIC: "${memory.unfinished_topic_title}"`);
    if (memory.unfinished_topic_stage) lines.push(`  Left off at stage: ${memory.unfinished_topic_stage}`);
  }

  if (memory.last_completed_packet) {
    lines.push(`LAST COMPLETED PACKET: "${memory.last_completed_packet}"`);
  }

  if (memory.last_selected_category) {
    lines.push(`LAST CATEGORY SELECTED: ${memory.last_selected_category}`);
  }

  if (memory.preferred_depth) {
    lines.push(`PREFERRED RESEARCH DEPTH: ${memory.preferred_depth}`);
  }

  let topics = [];
  try { topics = JSON.parse(memory.last_topics_discussed || '[]'); } catch {}
  if (topics.length > 0) {
    lines.push(`RECENT TOPICS EXPLORED:\n${topics.map(t => `  - ${t}`).join('\n')}`);
  }

  let interests = [];
  try { interests = JSON.parse(memory.common_topic_interests || '[]'); } catch {}
  if (interests.length > 0) {
    lines.push(`COMMON INTERESTS: ${interests.join(', ')}`);
  }

  if (memory.last_session_department) {
    lines.push(`LAST SESSION ENDED IN: ${memory.last_session_department} department`);
  }

  return lines.join('\n');
}

/**
 * Update memory after an interaction.
 * Only updates fields that are provided — partial updates are fine.
 */
export async function updateCreaprMemory(memoryId, updates) {
  if (!memoryId || !updates) return;
  try {
    await base44.entities.CreaprMemory.update(memoryId, updates);
  } catch {}
}

/**
 * Compute the preferred depth from topics history.
 */
export function computePreferredDepth(topics) {
  if (!topics || topics.length === 0) return null;
  const depthCounts = {};
  for (const t of topics) {
    const d = t.research_depth || 'standard';
    depthCounts[d] = (depthCounts[d] || 0) + 1;
  }
  return Object.entries(depthCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

/**
 * Extract common topic interests from a list of topics.
 */
export function extractCommonInterests(topics) {
  if (!topics || topics.length === 0) return [];
  const categoryCounts = {};
  for (const t of topics) {
    const cat = t.category || t.intent;
    if (!cat) continue;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }
  return Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat);
}

export default { loadCreaprMemory, deriveSessionType, buildMemoryContextString, updateCreaprMemory, computePreferredDepth, extractCommonInterests };