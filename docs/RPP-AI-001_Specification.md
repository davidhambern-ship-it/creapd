# RPP-AI-001 — Research Production Profile: AI Systems & Department Operations Specification

**Document Type:** Constitution-Level AI Architecture Specification
**Applies To:** Research Production Profile
**Status:** Canonical Implementation Specification

---

## 1. Purpose

The Research Production Profile is powered by a hierarchy of specialized AI systems working together under the supervision of CREAPr.

CREAPr is not responsible for performing every task. Instead, CREAPr functions as the **Executive Producer**, coordinating specialized departments, monitoring progress, validating workflow, and ensuring every department receives the correct information at the correct time.

Each AI system has one clearly defined responsibility. Each AI system transforms information before handing it to the next department.

---

## 2. AI Organizational Structure

```
Producer
    │
    ▼
CREAPr Brain (Executive Producer)
    │
    ▼
Department Controllers
    │
    ▼
Generation Workers
    │
    ▼
Review Workers
    │
    ▼
QA Workers
    │
    ▼
Department Controller Approval
    │
    ▼
Next Department
```

Every Production Profile uses this same hierarchy. CREAPr supervises. Department Controllers manage departments. Workers perform specialized tasks. QA validates quality. Controllers determine workflow.

---

## 3. CREAPr Brain

**Purpose:** CREAPr Brain is the operating intelligence of the Research Production Profile. CREAPr does not perform research. CREAPr does not generate presentations. CREAPr manages workflow.

**Responsibilities:**
- Interpret producer intent
- Maintain conversation history
- Maintain project state
- Maintain workflow state
- Determine active department
- Delegate work to Department Controllers
- Monitor department progress
- Track dependencies
- Detect workflow interruptions
- Explain workflow status to the producer
- Recommend next actions
- Coordinate automation
- Escalate unresolved issues

CREAPr functions as the Executive Producer.

---

## 4. Topics Department Controller

**Mission:** Transform producer intent into an approved Research Assignment.

**Primary AI Role:** Intent Mapping AI

**Responsibilities:** Interpret producer requests. Determine: primary topic, supporting topics, categories, research scope, missing information, clarification questions, research objectives. Generate: suggested categories, suggested sections, suggested research paths. Construct: Research Assignment. Present it to the producer for approval.

**Output:** Approved Research Assignment → Research Department

---

## 5. Research Department Controller

**Mission:** Acquire knowledge. The Research Department functions as an AI Research Office. The Controller distributes specialized research tasks among Research Workers.

### Research Workers

- **Fact Research Worker** — Collects verified factual information.
- **Historical Research Worker** — Builds historical context, timelines, chronology, major events.
- **Statistics Worker** — Collects numerical data, reports, studies, percentages, measurements.
- **Source Verification Worker** — Evaluates source credibility, authority, trustworthiness, confidence, conflicting sources.
- **Visual Research Worker** — Collects maps, images, charts, reference diagrams, visual references.
- **Debate Worker** — Identifies areas of debate, gray areas, contradictory viewpoints, scholarly disagreement, public controversy, open questions.
- **Entity Worker** — Identifies people, organizations, locations, products, events, technologies, relevant entities.

**Controller Responsibilities:** Assign research tasks. Monitor progress. Merge worker outputs. Remove duplicates. Preserve conflicting viewpoints. Assign confidence scores. Build the Raw Research Dataset.

**Output:** Raw Research Dataset → Dossier Department

---

## 6. Dossier Department Controller

**Mission:** Transform raw research into structured knowledge. The Dossier becomes the authoritative knowledge source.

**Primary AI Role:** Knowledge Organization AI

**Responsibilities:** Organize: Executive Summary, Background, Timeline, Key Facts, Important People, Organizations, Statistics, Maps, Images, Supporting Documents, Verified Sources, References, Areas of Debate, Open Questions, Related Topics, Confidence Scores. Present Dossier for producer approval. No additional research should occur here.

**Output:** Approved Research Dossier → Develop Department

---

## 7. Develop Department Controller

**Mission:** Transform the Approved Research Dossier into every production asset required to build a presentation. The Develop Department does not build slides. It creates assets.

### Production Asset Workers

- **Presentation Planning Worker** — Creates: Presentation Outline, Presentation Points, Story Flow, Section Breaks, Slide Sequence. One Presentation Point equals one future StorySlide.
- **Script Worker** — Creates: Teleprompter Script, Presentation Script, Speaker Notes, Talking Points, Story Summaries, Presenter Notes.
- **Image Worker** — Creates: Image Prompts, Generated Images, Illustrations, Icons, Charts, Infographics, Maps, Diagrams, Visual Concepts.
- **Video Worker** — Creates: Video Prompts, Generated Videos, Motion Graphics, B-Roll Suggestions, Video Concepts.
- **Voice Worker** — Creates: Narration Script, Voice Package, Voiceovers, Timing, Pronunciation Notes, Music Suggestions, Sound Suggestions.
- **Presentation Design Worker** — Creates: Layout Recommendations, Typography, Animation Suggestions, Transition Suggestions, Visual Hierarchy, Color Recommendations.

**Controller Responsibilities:** Coordinate all Production Asset Workers. Track dependencies. Ensure every required asset exists. Route assets through QA. Approve assets for Packet Assembly.

**Output:** Presentation Assets → Packet Department

---

## 8. Packet Department Controller

**Mission:** Construct the editable presentation. The Packet Department assembles. It does not generate.

**Primary AI Role:** Presentation Assembly AI

**Responsibilities:** Consume: Approved Research Dossier, Presentation Points, Scripts, Images, Icons, Charts, Maps, Videos, Voice Package, Layouts, Animations, Transitions, Metadata. Create: StorySlides. Populate: Title, Content, Images, Media, Speaker Notes, Narration, Layout, Animations, Transitions. Assemble: StoriesPresentation. Generate: Production Packet.

### Export Worker

Produces: Microsoft PowerPoint, Google Slides, PDF, Video, Future formats. Exports are disposable. StoriesPresentation remains the authoritative editable source.

**Output:** Production Packet

---

## 9. AI Model Strategy

Department Controllers should remain independent of AI vendors. Workers should be assigned according to capability rather than provider.

Example:
- Reasoning → GPT
- Deep Research → Gemini
- Long-form Writing → Claude

Future models should be interchangeable. Controllers should never depend on a specific AI vendor. Only Worker capabilities matter.

---

## 10. Quality Assurance Layer

Every Generation Worker must pass through:

```
Review Worker → QA Worker → Quality Report → Controller Decision Engine
```

No Worker may approve its own work. Every generated asset should be independently evaluated before reaching the next department.

---

## 11. Controller Decision Engine

Controllers shall evaluate Quality Reports rather than production assets. Controllers determine: Pass, Revision, Escalation, Producer Review. Controllers never rewrite assets. Controllers delegate revisions to the appropriate Worker.

---

## 12. Automation Philosophy

CREAPD should automate every operational decision that does not require creative judgment.

**Automated tasks:** Worker assignment, research coordination, quality evaluation, revision routing, department handoffs, packet assembly, export preparation.

**Requires producer approval:** Research Assignment, Approved Research Dossier, Final Presentation, creative direction, subjective style decisions.

Automation should reduce operational workload while preserving producer control over creative decisions.

---

## 13. Canonical Rules

1. CREAPr is the Executive Producer.
2. Department Controllers manage departmental workflow.
3. Generation Workers create production assets.
4. Review Workers critique generated assets.
5. QA Workers evaluate assets using standardized rubrics.
6. Controllers interpret Quality Reports and make deterministic workflow decisions.
7. Every department performs exactly one transformation.
8. Every output becomes the input for the next department.
9. No Worker may approve its own work.
10. Department Controllers shall remain independent of specific AI vendors.
11. The producer interacts only with CREAPr — not individual Workers.
12. The Research Production Profile exists to transform an idea into a complete, editable, production-ready Presentation Packet through a coordinated network of specialized AI systems operating under CREAPr's supervision.