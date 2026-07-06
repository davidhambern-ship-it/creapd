# CREAPr Brain Specification (CBS)

## The Decision Framework for the CREAPr Engine

**Version:** 1.0 (Draft)
**Status:** Canonical Architecture Document
**Depends On:** CREAPr Engine Specification (CES) Volume 1

---

# Part 1 — Purpose & Scope

## 1.1 What This Document Is

The **CREAPr Brain** is the decision-making framework that sits between CREAPr (the AI personality) and the CREAPr Engine (the operational orchestration system).

The Brain does not execute tasks.
The Brain does not generate content.
The Brain does not speak to the producer.

The Brain **decides** what happens next and tells the Engine to make it so.

This document defines **how decisions are made** — deterministically where possible, with AI escalation only where ambiguity requires it.

---

## 1.2 The Three-Layer Architecture

```text
┌─────────────────────────────────────────┐
│  CREAPr (Personality Layer)             │
│  • Greeting, narration, conversation    │
│  • Topic suggestions, natural language  │
│  • Driven by: LLM + CreapSettings       │
└──────────────────┬──────────────────────┘
                   │  "What should I say?"
                   ▼
┌─────────────────────────────────────────┐
│  CREAPr Brain (Decision Layer)          │
│  • POC stage tracking                    │
│  • Department delegation decisions      │
│  • Decision Packet triggers              │
│  • Automation rule evaluation            │
│  • Driven by: This specification          │
└──────────────────┬──────────────────────┘
                   │  "What should happen next?"
                   ▼
┌─────────────────────────────────────────┐
│  CREAPr Engine (Execution Layer)         │
│  • Navigation, state management          │
│  • Department invocation                  │
│  • Speech synchronization                 │
│  • UI orchestration, Guided Focus        │
│  • Driven by: Code (deterministic)        │
└─────────────────────────────────────────┘
```

**Key Principle:** The Brain outputs **decisions**, not words and not code. CREAPr translates decisions into words. The Engine translates decisions into actions.

---

## 1.3 Design Philosophy

The Brain follows the CES principle: **Automation is King.**

Every decision the Brain makes asks:

> *Can the system perform this task for the producer, or does this require a creative decision?*

- If **operational** → the Brain auto-advances.
- If **creative** → the Brain emits a Decision Packet and waits.
- If **ambiguous** → the Brain escalates to the LLM at a defined escalation point.

The Brain never uses the LLM for decisions that can be made deterministically.

---

# Part 2 — The Process of Creation (POC)

## 2.1 Canonical POC Stages

Every ProductionModule follows the Process of Creation. The Brain tracks the producer's position within this pipeline.

```text
Stage 0: Configuration
    │
Stage 1: Content Acquisition
    │
Stage 2: Content Intelligence (Sift)
    │
Stage 3: Editorial Review
    │
Stage 4: Production Package Generation
    │
Stage 5: Voice Package Generation
    │
Stage 6: Slide / Presentation Generation
    │
Stage 7: StoriesPresentation Assembly
    │
Stage 8: Export
```

### 2.1.1 Stage Definitions

| Stage | Name | What Happens | Department Lead |
|-------|------|--------------|-----------------|
| 0 | Configuration | Producer sets up production parameters | CREAPr (direct) |
| 1 | Content Acquisition | Stories/topics gathered from sources | Sift Department |
| 2 | Content Intelligence | Articles classified, scored, filtered, matched to ShowProfile | Sift Department |
| 3 | Editorial Review | Producer reviews stories/points, approves/rejects | CREAPr (with Research Dept) |
| 4 | Package Generation | ProductionPackages created from approved content | Manager Department |
| 5 | Voice Package | VoicePackages generated from package scripts | Manager Department |
| 6 | Slide Generation | Presentation slides created from packages | APD Department |
| 7 | Presentation Assembly | StoriesPresentation assembled from slides | APD Department |
| 8 | Export | Final production exported to desired format | CREAPr (direct) |

### 2.1.2 Valid Transitions

The Brain only allows forward progression through the POC. Stage regression is allowed only under specific conditions:

| From | To | Condition |
|------|-----|-----------|
| 0 → 1 | Configuration saved | `config.production_name` exists |
| 1 → 2 | Acquisition complete | Stories/topics exist for this production |
| 2 → 3 | Intelligence complete | Stories have been sifted/scored |
| 3 → 4 | Review complete | Producer has approved at least one story/point |
| 4 → 5 | Package approved | At least one ProductionPackage approved |
| 5 → 6 | Voice approved | At least one VoicePackage approved |
| 6 → 7 | Slides generated | Slides exist for all approved packages |
| 7 → 8 | Assembly complete | StoriesPresentation exists and is assembled |
| Any → Previous | Producer requests revision | Producer explicitly asks to go back |

**Rule:** The Brain never auto-regresses. Regression requires an explicit producer request (a creative decision).

---

## 2.2 POC Stage Model — Research PP Mapping

The Research Production Pipeline has its own internal POC that maps to the canonical stages:

| Canonical Stage | Research PP Equivalent | Entity Trigger |
|----------------|----------------------|----------------|
| 0. Configuration | ResearchProductionConfiguration saved | `ResearchProductionConfiguration` created |
| 1. Content Acquisition | ResearchTopic created | `ResearchTopic` with status `pending` |
| 2. Content Intelligence | Deep research running | `ResearchDossier` with status `researching` |
| 3. Editorial Review | ResearchPoints extracted & reviewed | `ResearchPoint` with status `pending` → `approved` |
| 4. Package Generation | ProductionPackage from approved points | `ProductionPackage` created |
| 5. Voice Package | VoicePackage from package script | `VoicePackage` created |
| 6. Slide Generation | Slides from package | `StorySlide` / `PresentationScene` created |
| 7. Presentation Assembly | StoriesPresentation assembled | `StoriesPresentation` created |
| 8. Export | Export job created | `ExportJob` created |

---

# Part 3 — Department Registry

## 3.1 Department Overview

The Brain delegates work to four specialized departments. Each department has a defined scope, trigger conditions, and contract.

```text
CREAPr Brain
    │
    ├── Sift Department (Content Intelligence)
    ├── Research Department (Deep Investigation)
    ├── Manager Department (Production Preparation)
    └── APD Department (Presentation Assembly)
```

---

## 3.2 Sift Department

**Role:** Content acquisition, classification, scoring, filtering, and ShowProfile matching.

**Responsibilities:**
- Acquire stories from RSS feeds, manual imports, and external sources
- Classify articles as video or text content
- Score articles (priority, opportunity, freshness, credibility, usefulness)
- Detect and group duplicate stories
- Match articles to the active ShowProfile
- Match articles to the active ProductionModule

**Trigger Conditions:**
- POC Stage 1 (Content Acquisition) begins
- Producer requests a manual story fetch
- Scheduled automation fires (daily brief, etc.)

**Backend Functions:**
- `fetchStories` — RSS/feed acquisition
- `siftArticles` — classification, scoring, filtering
- `importStory` — manual import
- `processVideoArticle` — video transcription
- `fetchArticleContent` — full body extraction

**Entities:**
- `Article` — the primary output entity
- `Source` — feed/source configuration
- `ShowProfile` — matching target

**Brain Delegation Rule:**
The Brain delegates to Sift when:
1. The producer enters Stage 1, OR
2. The producer says "get me today's stories" / "find stories about X", OR
3. A scheduled automation triggers content acquisition

The Brain does NOT delegate to Sift for:
- Deep research on a specific topic (that's the Research Department)
- Package generation (that's the Manager)

---

## 3.3 Research Department

**Role:** Deep investigation, multi-source research, dossier assembly, and research point extraction.

**Responsibilities:**
- Break down a research query into sub-questions
- Discover sources via web search
- Verify source credibility
- Synthesize findings into a structured dossier
- Fact-check claims
- Perform critical analysis (gray areas, competing perspectives, open questions)
- Extract research points from dossiers

**Internal Specialist Structure:**
The Research Department is itself a mini-orchestrator with three specialists:

```text
Research Department Orchestrator
    │
    ├── Discovery Specialist — web search, source gathering
    ├── Organization Specialist — theme clustering, timeline, categorization
    └── Critical Analysis Specialist — gray areas, logical gaps, competing perspectives
```

**Trigger Conditions:**
- A `ResearchTopic` is created and research is launched
- POC Stage 2 begins for the Research PP
- Producer asks CREAPr to "dig into" or "research" a topic

**Backend Functions:**
- `deepResearchV2` — full orchestration pipeline
- `researchDepartmentOrchestrator` — specialist coordination
- `conductResearch` — legacy single-query research
- `performDeepResearch` — legacy deep research
- `extractResearchPoints` — point extraction from dossier

**Entities:**
- `ResearchTopic` — the research question
- `ResearchDossier` — the assembled findings
- `ResearchPoint` — extracted, reviewable findings

**Brain Delegation Rule:**
The Brain delegates to Research when:
1. A topic is approved for research (via TopicConversation or TopicWizard), OR
2. The producer explicitly asks to research something, OR
3. POC Stage 2 begins for a Research production

The Brain monitors the Research Department via:
- Polling `ResearchDossier.status` (researching → ready → failed)
- Reading `ResearchDossier.orchestration_metadata.current_stage` for progress updates
- Counting extracted `ResearchPoint` records on completion

---

## 3.4 Manager Department

**Role:** Production package creation, voice package generation, and production preparation.

**Responsibilities:**
- Receive approved stories/research points
- Generate ProductionPackages (script, talking points, b-roll suggestions)
- Generate VoicePackages (TTS audio from scripts)
- Runtime tracking and status management
- Coordinate with APD for slide generation

**Trigger Conditions:**
- POC Stage 4 begins (at least one story/point approved)
- Producer requests package generation
- Auto-advancement from Stage 3 (editorial review complete)

**Backend Functions:**
- `generateProductionPackage` — create package from approved content
- `generateSynthesizedPackage` — synthesized multi-source package
- `generateVoicePackage` — TTS generation from package script
- `buildResearchProduction` — full Research PP build
- `buildNewsProduction` — full News PP build
- (and per-module build functions: `buildTalkProduction`, `buildMusicProduction`, etc.)

**Entities:**
- `ProductionPackage` — script + production metadata
- `VoicePackage` — audio + timing data
- `ProductionModule` — module configuration

**Brain Delegation Rule:**
The Brain delegates to the Manager when:
1. The producer approves content in Stage 3, AND
2. No existing package covers that content, AND
3. The producer confirms "generate packages" (creative decision) OR auto-advancement is enabled

The Brain pauses for producer approval before package generation — this is a creative decision (which content to package, which angle to take).

---

## 3.5 APD Department

**Role:** Slide generation, presentation assembly, and visual production.

**Responsibilities:**
- Generate presentation slides from ProductionPackages
- Create visual scenes (AI image generation, scripture popups, graphics)
- Assemble StoriesPresentations from slides
- Manage slide transitions and timing
- Generate presentation timelines

**Trigger Conditions:**
- POC Stage 6 begins (voice packages approved)
- Producer requests slide/presentation generation
- Auto-advancement from Stage 5

**Backend Functions:**
- `createAPDReadyPackage` — prepare package for APD
- `generateStoriesPresentation` — assemble full presentation
- `generateNewsPresentation` — news-specific presentation
- `generatePresentationTimeline` — timeline/rundown generation
- `generateSpiritualVoiceovers` — spiritual module voiceovers
- `sharePresentation` — share/export presentation

**Entities:**
- `StoriesPresentation` — the assembled presentation
- `StorySlide` / `PresentationScene` — individual slides/scenes
- `PresentationTimeline` — timing and order

**Brain Delegation Rule:**
The Brain delegates to APD when:
1. At least one VoicePackage is approved (Stage 5 complete), AND
2. No existing presentation covers the production, AND
3. The producer confirms "build the presentation" (creative decision)

---

## 3.6 Department Decision Matrix

When the Brain receives a producer request, it determines which department to delegate to:

| Producer Intent | Department | Signal |
|----------------|-----------|--------|
| "Get today's stories" | Sift | Content acquisition request |
| "Find stories about X" | Sift | Topic-based acquisition |
| "Research this topic" | Research | Deep investigation request |
| "Dig into this" | Research | Deep investigation request |
| "Package these points" | Manager | Package generation request |
| "Generate the script" | Manager | Script generation request |
| "Read this for me" (TTS) | Manager | Voice package request |
| "Build the presentation" | APD | Presentation assembly request |
| "Make slides" | APD | Slide generation request |
| "Export the show" | CREAPr (direct) | Export request |
| Ambiguous intent | → AI Escalation Point | See Part 6 |

---

# Part 4 — Decision Packet System

## 4.1 What Is a Decision Packet?

A **Decision Packet** is the Brain's mechanism for presenting a creative decision to the producer.

When the Brain encounters a decision that requires producer input, it emits a Decision Packet. CREAPr translates the packet into natural language and presents it. The Engine displays the appropriate UI. The producer decides. The Brain processes the decision and advances.

**Structure of a Decision Packet:**

```json
{
  "packet_id": "unique-identifier",
  "packet_type": "point_approval",
  "stage": 3,
  "department": "research",
  "title": "Approve Research Points",
  "description": "15 research points extracted from the dossier. Review and approve the ones you want in the production.",
  "items": [
    {
      "id": "point-id",
      "title": "Point title",
      "summary": "Brief summary",
      "suggested_action": "approve",
      "metadata": {
        "point_type": "finding",
        "priority_score": 8.5,
        "confidence_score": 85
      }
    }
  ],
  "creative_decision_required": true,
  "automation_available": "auto_approve_high_scoring",
  "timeout": null,
  "expires": false
}
```

---

## 4.2 Decision Packet Types

### 4.2.1 Topic Selection Packet

**Fires at:** Stage 1 → Stage 2 transition (Research PP)

**When:** CREAPr has proposed a research topic and is waiting for the producer to accept or decline.

**Producer Decision:** Accept topic / Decline topic / Modify topic / Propose own topic

**Existing Implementation:** `TopicConversation.jsx` — CREAPr proposes, producer responds.

**Brain Logic:**
- If producer accepts → delegate to Research Department, advance to Stage 2
- If producer declines → increment decline counter, CREAPr proposes new topic
- If decline count ≥ `max_decline_attempts` → offer TopicWizard fallback
- If producer modifies → update `ResearchTopic`, delegate to Research

---

### 4.2.2 Point Approval Packet

**Fires at:** Stage 2 → Stage 3 transition (Research PP)

**When:** `ResearchDossier.status === 'ready'` and points have been extracted.

**Producer Decision:** Approve / Reject / Archive each research point

**Existing Implementation:** `ResearchManager.jsx` — producer reviews point cards.

**Brain Logic:**
- When dossier is ready → auto-invoke `extractResearchPoints`
- Count extracted points → emit Point Approval Packet
- CREAPr narrates: "I found N research points. The strongest ones are X, Y, Z."
- Producer reviews → approved points advance to Stage 4
- If no points approved → Brain does NOT advance, CREAPr asks for guidance

**Automation Available:** "Auto-approve points with priority_score ≥ 8.0 and confidence_score ≥ 80" (producer can enable this in settings)

---

### 4.2.3 Coverage Angle Packet

**Fires at:** Stage 3 → Stage 4 transition

**When:** Approved points are ready for packaging, and multiple coverage angles exist.

**Producer Decision:** Select which coverage angle(s) to use for the package

**Brain Logic:**
- Read `ResearchPoint.suggested_angle` and `ResearchDossier.coverage_angles`
- If multiple angles exist → emit Coverage Angle Packet
- CREAPr presents: "I can approach this from angle A, B, or C. Which feels right?"
- Producer selects → Brain delegates to Manager with selected angle
- If only one angle → skip packet, auto-advance

---

### 4.2.4 Package Approval Packet

**Fires at:** Stage 4 → Stage 5 transition

**When:** Manager has generated a ProductionPackage and it's ready for review.

**Producer Decision:** Approve package / Request revisions / Reject package

**Brain Logic:**
- Manager generates package → Brain emits Package Approval Packet
- CREAPr narrates: "I've drafted your package. Here's the script and talking points."
- Producer reviews → approved packages advance to Stage 5
- If revisions requested → Brain delegates back to Manager with revision notes
- If rejected → Brain returns to Stage 3 (regression, explicit producer decision)

---

### 4.2.5 Voice Package Approval Packet

**Fires at:** Stage 5 → Stage 6 transition

**When:** VoicePackage has been generated.

**Producer Decision:** Approve voiceover / Request different voice / Request re-take

**Brain Logic:**
- Voice package generated → Brain emits Voice Approval Packet
- CREAPr plays the audio preview
- Producer approves → advance to Stage 6
- Producer requests different voice → Brain re-delegates to Manager with new voice_id
- Producer requests re-take → Manager regenerates with adjusted parameters

---

### 4.2.6 Presentation Approval Packet

**Fires at:** Stage 6 → Stage 7 transition

**When:** APD has generated slides and assembled the StoriesPresentation.

**Producer Decision:** Approve presentation / Request slide revisions / Reorder slides

**Brain Logic:**
- Presentation assembled → Brain emits Presentation Approval Packet
- CREAPr introduces: "Your presentation is ready. Let me walk you through it."
- Producer reviews via PresentationViewer
- Approved → advance to Stage 7
- Revisions requested → Brain delegates back to APD

---

### 4.2.7 Export Packet

**Fires at:** Stage 7 → Stage 8 transition

**When:** Presentation is approved and ready for export.

**Producer Decision:** Select export format / Confirm export / Cancel

**Brain Logic:**
- Presentation approved → Brain emits Export Packet
- CREAPr presents export options (PDF, DOCX, HTML, etc.)
- Producer selects format → Brain delegates to Export (createExportJob)
- Export complete → CREAPr announces completion, offers to share

---

### 4.2.8 Department Handoff Packet (Cross-Department)

**Fires at:** Any stage transition where a new department takes over.

**When:** The Brain delegates work from one department to another.

**Producer Decision:** Confirm handoff / Override (choose different department) / Cancel

**Brain Logic:**
- Brain decides department delegation → emits Handoff Packet
- CREAPr narrates: "I'm handing this over to the [Department]. They'll handle [task]."
- If producer confirms → Engine triggers the department
- If producer overrides → Brain re-evaluates delegation (AI escalation if needed)

**Note:** In AUTOPILOT mode, handoff packets are auto-confirmed. In HYBRID mode, they require producer confirmation. In FREE mode, the producer initiates all handoffs.

---

## 4.3 Decision Packet Lifecycle

```text
1. Brain detects trigger condition
2. Brain constructs Decision Packet
3. Brain sends packet to Engine
4. Engine displays UI + tells CREAPr to narrate
5. CREAPr presents the decision naturally
6. Producer makes decision (or automation handles it)
7. Brain processes decision
8. Brain determines next action (advance, delegate, regress)
9. Cycle repeats
```

---

# Part 5 — Automation Rules

## 5.1 The Automation Cycle

Per CES Principle 4, the Brain follows this cycle for every decision:

```text
Observe → Decide → Act → Verify → Advance
```

### 5.1.1 Observe

The Brain continuously observes:
- Current POC stage
- Entity statuses (ResearchDossier.status, ResearchPoint.status, etc.)
- Producer actions (messages, approvals, requests)
- Department activity (running tasks, completed tasks, failures)
- CREAPr conversation state (phase, speaking, listening)

### 5.1.2 Decide

The Brain evaluates:
- Can this task be automated? (operational vs creative)
- Which department should handle this?
- Is a Decision Packet required?
- Should AI escalation be triggered?

### 5.1.3 Act

The Brain instructs the Engine to:
- Navigate to a page
- Invoke a backend function
- Display a Decision Packet
- Tell CREAPr to narrate
- Trigger a department

### 5.1.4 Verify

The Brain checks:
- Did the action succeed?
- Did the entity state change as expected?
- Did the department complete its task?
- Are there errors?

### 5.1.5 Advance

The Brain determines:
- Advance to next POC stage?
- Emit a Decision Packet?
- Escalate to AI?
- Wait for producer input?

---

## 5.2 Automation Rules Catalog

### Rule A1: Auto-Extract Research Points

**Trigger:** `ResearchDossier.status` transitions to `ready`
**Action:** Invoke `extractResearchPoints({ topic_id })`
**Verification:** `ResearchPoint` records exist for the topic
**Creative Decision Required:** No (operational)
**Decision Packet:** Yes — Point Approval Packet fires after extraction

---

### Rule A2: Auto-Draft Production Package

**Trigger:** At least one `ResearchPoint` with status `approved` exists, AND no `ProductionPackage` linked to those points exists
**Action:** Invoke `generateProductionPackage({ point_ids, configuration_id })`
**Verification:** `ProductionPackage` created with status `draft`
**Creative Decision Required:** Yes — Coverage Angle Packet fires first
**Decision Packet:** Coverage Angle Packet → Package Approval Packet

**Note:** This rule only fires if the producer has enabled auto-drafting in settings (default: off in HYBRID mode, on in AUTOPILOT mode).

---

### Rule A3: Auto-Generate Voice Package

**Trigger:** `ProductionPackage.status` transitions to `approved`
**Action:** Invoke `generateVoicePackage({ package_id, voice_id })`
**Verification:** `VoicePackage` created with audio URL
**Creative Decision Required:** No (operational, voice_id is pre-configured)
**Decision Packet:** Voice Package Approval Packet fires after generation

---

### Rule A4: Auto-Build Presentation

**Trigger:** At least one `VoicePackage` with status `approved` exists
**Action:** Invoke `generateStoriesPresentation({ package_ids })`
**Verification:** `StoriesPresentation` created
**Creative Decision Required:** Yes — Presentation Approval Packet fires

**Note:** Only fires in AUTOPILOT mode or when producer confirms.

---

### Rule A5: Auto-Navigate Between Stages

**Trigger:** A stage transition condition is met (see Section 2.1.2)
**Action:** Engine navigates to the appropriate page for the new stage
**Verification:** Page loads, relevant entities are present
**Creative Decision Required:** Depends on transition (see Decision Packet types)
**Decision Packet:** If creative decision required, fires before navigation

---

### Rule A6: Auto-Announce Completion

**Trigger:** Any department task completes successfully
**Action:** CREAPr narrates the completion
**Verification:** TTS audio plays successfully
**Creative Decision Required:** No
**Decision Packet:** Next stage's Decision Packet fires (if applicable)

**Existing Implementation:** `announceCompletion()` in `TopicConversation.jsx`

---

### Rule A7: Auto-Announce Failure

**Trigger:** Any department task fails (entity status `failed`)
**Action:** CREAPr narrates the failure and offers recovery options
**Verification:** Producer acknowledges or requests retry
**Creative Decision Required:** Yes — producer decides to retry, modify, or abandon
**Decision Packet:** Failure Recovery Packet (producer decides next action)

---

### Rule A8: Auto-Poll Long-Running Tasks

**Trigger:** A department task is running (e.g., `ResearchDossier.status === 'researching'`)
**Action:** Brain polls entity status every 2 seconds
**Verification:** Status transitions detected
**Creative Decision Required:** No
**Decision Packet:** None (progress is displayed via UI, not as a decision)

**Existing Implementation:** `startPolling()` in `TopicConversation.jsx`

---

## 5.3 Mode-Based Automation Behavior

The Brain adjusts automation behavior based on the producer's CREAP Mode:

| Mode | Auto-Advance | Decision Packets | CREAPr Narration | Department Handoffs |
|------|-------------|-----------------|------------------|---------------------|
| **AUTOPILOT** | Yes (automatic) | Only creative decisions | Full narration | Automatic |
| **HYBRID** | Semi (operational only) | All creative + major operational | Full narration | Confirm before handoff |
| **FREE** | No (producer-driven) | Only when producer requests | On-demand | Producer initiates |

---

# Part 6 — AI Escalation Points

## 6.1 When the Brain Uses the LLM

The Brain uses the LLM **only** at defined escalation points. Every other decision is deterministic.

### 6.1.1 Escalation Point E1: Ambiguous Producer Intent

**When:** The producer says something the Brain cannot map to a department or action using deterministic rules.

**Trigger:** Producer input doesn't match any pattern in the Department Decision Matrix (Section 3.6).

**LLM Task:** Classify the producer's intent and determine which department/action is appropriate.

**LLM Input:**
- Producer's message
- Current POC stage
- Recent conversation history
- Available departments and their capabilities

**LLM Output:**
```json
{
  "intent": "research_request | acquisition_request | package_request | presentation_request | export_request | general_conversation | unclear",
  "department": "research | sift | manager | apd | null",
  "action": "delegate | respond | clarify",
  "confidence": 0.0-1.0
}
```

**Brain Action:**
- If `confidence ≥ 0.7` and `action === 'delegate'` → delegate to department
- If `confidence ≥ 0.7` and `action === 'respond'` → CREAPr responds naturally
- If `confidence < 0.7` or `action === 'clarify'` → CREAPr asks for clarification

---

### 6.1.2 Escalation Point E2: Natural Narration Generation

**When:** The Brain needs CREAPr to narrate something that isn't a pre-defined template.

**Trigger:** Department task completes, stage transition occurs, or CREAPr needs to explain something.

**LLM Task:** Generate natural, personality-consistent narration.

**LLM Input:**
- Event that occurred (e.g., "research complete, 15 points found")
- CreapSettings (personality, tone, humor level, catchphrases)
- Conversation history
- Current POC stage

**LLM Output:** Natural language narration string

**Brain Action:** Send to Engine for TTS generation and playback.

**Existing Implementation:** `creapRespond()` in `TopicConversation.jsx` uses InvokeLLM with `buildCreapSystemPrompt()`.

---

### 6.1.3 Escalation Point E3: Topic Suggestion

**When:** CREAPr needs to propose a research topic to the producer.

**Trigger:** Stage 1 begins, or producer declines a topic, or producer asks "what should I research?"

**LLM Task:** Generate a compelling, timely, research-worthy topic.

**LLM Input:**
- CreapSettings (personality, catchphrase)
- Active ShowProfile (topics of interest)
- Previously proposed topics (avoid repeats)
- Current events context (`add_context_from_internet: true`)

**LLM Output:**
```json
{
  "message": "Natural language message presenting the topic",
  "action": "offer",
  "topic_data": {
    "title": "Topic title",
    "description": "Why this topic matters",
    "research_query": "Refined query for the research pipeline",
    "category": "Topic category"
  }
}
```

**Existing Implementation:** Initial CREAPr greeting in `TopicConversation.jsx` uses this pattern.

---

### 6.1.4 Escalation Point E4: Producer Response Interpretation

**When:** The Brain needs to determine if the producer's response means yes or no to a Decision Packet.

**Trigger:** A Decision Packet is presented and the producer responds with natural language.

**LLM Task:** Classify the response as affirmative, negative, or ambiguous.

**LLM Input:**
- Producer's response
- The Decision Packet context
- Conversation history

**LLM Output:**
```json
{
  "response": "yes | no | unclear",
  "confidence": 0.0-1.0
}
```

**Brain Action:**
- `yes` → process as approval
- `no` → process as decline
- `unclear` → CREAPr asks for clarification

**Existing Implementation:** `handleViewResponse()` in `TopicConversation.jsx`.

---

### 6.1.5 Escalation Point E5: Coverage Angle Selection

**When:** Multiple coverage angles exist for a set of approved research points.

**Trigger:** Stage 3 → Stage 4 transition with multiple angles available.

**LLM Task:** Identify and articulate the distinct coverage angles.

**LLM Input:**
- Approved research points
- `ResearchDossier.coverage_angles`
- ShowProfile target audience

**LLM Output:**
```json
{
  "angles": [
    {
      "angle": "Angle name/description",
      "rationale": "Why this angle works",
      "target_audience": "Who this appeals to",
      "supporting_points": ["point_id_1", "point_id_2"]
    }
  ]
}
```

**Brain Action:** Emit Coverage Angle Packet with these angles.

---

## 6.2 LLM Model Selection

The Brain selects the LLM model based on the escalation point:

| Escalation Point | Default Model | Reason |
|-----------------|---------------|--------|
| E1: Intent Classification | `gpt_5_mini` | Fast, simple classification |
| E2: Narration Generation | From `CreapSettings.ai_model` | Personality consistency |
| E3: Topic Suggestion | `gemini_3_flash` | Needs web context for timeliness |
| E4: Response Interpretation | `gpt_5_mini` | Fast, simple classification |
| E5: Coverage Angle Selection | `gpt_5_mini` | Structured analysis, no web needed |

**Rule:** Use the cheapest/fastest model that reliably handles the task. Only escalate to more powerful models when the task complexity demands it.

---

## 6.3 Escalation Guardrails

The Brain enforces these guardrails on all LLM calls:

1. **Never let the LLM make orchestration decisions** — the LLM provides recommendations; the Brain makes the final decision deterministically.
2. **Never let the LLM bypass creative approval gates** — even if the LLM says "the producer would want this," the Brain still emits a Decision Packet.
3. **Always validate LLM output against the schema** — if the LLM returns malformed data, the Brain falls back to a deterministic default.
4. **Rate-limit LLM calls** — the Brain batches narration requests and avoids redundant calls.
5. **Log all escalation decisions** — for debugging and improvement.

---

# Part 7 — State Model

## 7.1 Brain State

The Brain maintains the following state:

```json
{
  "poc_stage": 0,
  "poc_stage_entered_at": "2026-07-06T12:00:00Z",
  "active_production_module": "research",
  "active_configuration_id": "config-id",
  "active_show_profile_id": "show-profile-id",
  "creap_mode": "hybrid",
  "pending_decision_packet": null,
  "active_department": null,
  "department_tasks": [
    {
      "department": "research",
      "task_id": "topic-id",
      "status": "running",
      "started_at": "2026-07-06T12:00:00Z"
    }
  ],
  "decline_count": 0,
  "completion_announced": false,
  "conversation_history": [],
  "last_producer_action": {
    "type": "message",
    "content": "...",
    "timestamp": "2026-07-06T12:00:00Z"
  }
}
```

---

## 7.2 State Transitions

The Brain's state transitions are driven by:

1. **Producer actions** — messages, approvals, navigation
2. **Entity status changes** — dossier ready, point approved, package generated
3. **Department task completions** — research complete, package generated
4. **Timer events** — polling intervals, timeouts
5. **Mode changes** — producer switches from HYBRID to AUTOPILOT

Each transition triggers the Observe → Decide → Act → Verify → Advance cycle.

---

## 7.3 Persistence

Brain state is **not** persisted as a single blob. Instead, it is **reconstructed** from entity states:

- POC stage is derived from entity statuses (see Section 2.2 mapping)
- Active configuration is the `ResearchProductionConfiguration` record
- Active department is derived from running entity tasks
- Decline count is tracked in conversation context
- Conversation history is stored in the agent conversation

This ensures the Brain is always consistent with the actual data state — there is no drift between "what the Brain thinks" and "what the database says."

---

# Part 8 — Integration with Existing Systems

## 8.1 Current Architecture Mapping

| Brain Concept | Existing Implementation | Status |
|--------------|----------------------|--------|
| CREAPr Personality | `CreapSettings` entity, `creapSettings.js`, `creapd.jsonc` agent | ✅ Exists |
| CREAPr Conversation | `TopicConversation.jsx`, `CreapdChat.jsx` | ✅ Exists (topic selection only) |
| TTS / Speech | `generateCreapSpeech` backend function | ✅ Exists |
| Research Department | `deepResearchV2`, `researchDepartmentOrchestrator` | ✅ Exists |
| Point Extraction | `extractResearchPoints` | ✅ Exists |
| Package Generation | `generateProductionPackage`, `generateSynthesizedPackage` | ✅ Exists |
| Voice Package | `generateVoicePackage` | ✅ Exists |
| Presentation Assembly | `generateStoriesPresentation`, `createAPDReadyPackage` | ✅ Exists |
| Export | `createExportJob` | ✅ Exists |
| CREAP Mode Context | `CREAPModeContext.jsx`, `CREAPModeLayout.jsx` | ✅ Exists |
| **CREAPr Brain** | — | ❌ **Does not exist yet** |
| **CREAPr Engine** | Partial (CREAPModeContext) | ⚠️ **Partial** |
| **Decision Packet System** | — | ❌ **Does not exist yet** |
| **POC Stage Tracker** | — | ❌ **Does not exist yet** |
| **Department Registry** | — | ❌ **Does not exist yet** |

---

## 8.2 What Needs to Be Built

To implement the Brain, the following components need to be created:

### 8.2.1 POC Stage Tracker

A hook/context that derives the current POC stage from entity states and exposes it to the Engine and CREAPr.

**Suggested file:** `src/lib/pocStageTracker.js`

**Responsibility:** Given a configuration ID and production module, return the current POC stage, pending decisions, and valid next actions.

---

### 8.2.2 Brain Decision Engine

A function/module that implements the Observe → Decide → Act → Verify → Advance cycle.

**Suggested file:** `src/lib/creaprBrain.js`

**Responsibility:** Given the current state and a trigger event, determine the next action (delegate, emit Decision Packet, advance, escalate to AI).

---

### 8.2.3 Decision Packet System

A component that renders Decision Packets in the UI and routes producer decisions back to the Brain.

**Suggested files:**
- `src/components/creapr/DecisionPacket.jsx` — generic packet renderer
- `src/components/creapr/packets/PointApprovalPacket.jsx`
- `src/components/creapr/packets/CoverageAnglePacket.jsx`
- `src/components/creapr/packets/PackageApprovalPacket.jsx`
- `src/components/creapr/packets/VoiceApprovalPacket.jsx`
- `src/components/creapr/packets/PresentationApprovalPacket.jsx`
- `src/components/creapr/packets/ExportPacket.jsx`

---

### 8.2.4 Department Registry

A configuration module that defines each department's capabilities, triggers, and contracts.

**Suggested file:** `src/lib/departmentRegistry.js`

**Responsibility:** Static configuration mapping department names to their functions, entities, triggers, and delegation rules.

---

### 8.2.5 CREAPr Engine (Extended)

Extend `CREAPModeContext` to include Brain state, POC stage tracking, and department coordination.

**Suggested file:** Extend `src/context/CREAPModeContext.jsx`

**Responsibility:** Provide Brain state and Engine actions to all components in the CREAPModeLayout.

---

## 8.3 Implementation Priority

1. **POC Stage Tracker** — foundation, needed by everything else
2. **Department Registry** — static config, no runtime dependencies
3. **Brain Decision Engine** — core logic, depends on 1 & 2
4. **Decision Packet System** — UI layer, depends on 3
5. **CREAPr Engine Extension** — integration layer, ties it all together

---

# Part 9 — Success Criteria

The Brain is successful when:

- The producer always knows what stage of production they are in
- Creative decisions are presented as Decision Packets, not buried in pages
- Operational tasks are automated without removing creative control
- LLM calls only happen at defined escalation points (not for every decision)
- The producer's experience is consistent regardless of ProductionModule
- Department handoffs feel natural, not mechanical
- The Brain's decisions are deterministic and debuggable
- The producer finishes a production with confidence in both the content and the process

---

# Part 10 — The Producer Promise (Reaffirmed)

Every Brain decision must satisfy:

- Reduce the producer's cognitive load
- Preserve the producer's creative control
- Advance the producer through the Process of Creation
- Eliminate unnecessary clicks, repetitive work, and decision fatigue
- Provide automation that feels like collaboration rather than control
- Ensure every action has a clear purpose within the production workflow

When uncertainty exists, the question is always:

> **"Does this make production easier for the producer while preserving creative control?"**

If the answer is **no**, the decision does not align with the CREAPr Brain.

---

## Closing Statement

The CREAPr Brain is the decision layer that makes the CREAPr Engine intelligent.

It does not replace the producer.
It does not replace the departments.
It does not replace CREAPr's personality.

It ensures that the right things happen at the right time — automatically where possible, with producer approval where it matters — so the producer can focus entirely on creativity, storytelling, and production quality.

**Automation is King.**
**The producer remains the creator.**