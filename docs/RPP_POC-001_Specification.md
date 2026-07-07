# RPP-POC-001 — Research Production Profile: Process of Creation

**Document Type:** Canonical Workflow Specification
**Applies To:** Research Production Profile
**Status:** Constitution-Level Specification

---

## 1. Purpose

The Research Production Profile exists to transform an initial idea into a complete, production-ready presentation.

It is a structured production environment where specialized AI departments work together to prepare the producer for content creation. Each department has one clearly defined responsibility. Departments must never perform another department's work. Every department receives an input, performs a transformation, and produces an output that becomes the input for the next department.

---

## Overall Process of Creation

```
Producer Idea → Topics Department → Research Assignment
             → Research Department → Raw Research Dataset
             → Dossier Department → Approved Research Dossier
             → Develop Department → Presentation Assets
             → Packet Department → Production Packet (Production Ready)
```

---

## 2. Topics Department

**Mission:** Transform an idea into a structured Research Assignment. CREAPr guides the producer through narrowing broad interests into a clearly defined research objective. The Topics Department never performs research. It determines **what** will be researched.

**Responsibilities:**
- Interpret producer intent
- Ask clarifying questions only when necessary
- Generate intelligent research directions
- Suggest related categories
- Help define research boundaries
- Determine the scope of the research
- Identify missing context
- Refine objectives
- Build a structured Research Assignment
- Present the assignment for producer approval

**Rule:** Research must never begin until the producer approves the Research Assignment.

**Output:** Research Assignment

---

## 3. Research Department

**Mission:** Acquire knowledge by executing the approved Research Assignment. Functions as an AI research office composed of multiple specialized research workers. Collects the highest quality information possible without organizing or interpreting it into production assets.

**Responsibilities:**
- Fact gathering, source verification, historical research
- Timeline construction, statistical research
- Expert opinions, important people, organizations
- Supporting documents, government publications, academic references
- Visual references, images, maps
- Areas of disagreement, contradictory viewpoints
- Open questions, emerging developments
- Reconcile conflicting findings while preserving areas of legitimate debate
- Utilize multiple AI models to increase coverage and confidence

**Rule:** Nothing produced by this department should be considered presentation-ready.

**Output:** Raw Research Dataset

---

## 4. Dossier Department

**Mission:** Transform raw research into structured knowledge. Organize, validate, and present research in a format suitable for production. The Dossier becomes the authoritative knowledge source for the remainder of the Process of Creation.

**Responsibilities:** Organize research into:
- Executive Summary, Background, Timeline
- Key Facts, Important People, Organizations
- Statistics, Verified Sources, References
- Supporting Documents, Images, Maps
- Areas of Debate, Open Questions
- Related Topics, Confidence Scores

**Rule:** No downstream department should return to the raw research unless additional research has been requested. Once approved, the Dossier becomes the single source of truth.

**Output:** Approved Research Dossier

---

## 5. Develop Department

**Mission:** Transform the approved Research Dossier into every production element required to construct a presentation. Does **not** create slides. Does **not** assemble presentations. Generates all individual components that will eventually be placed into slides.

**Responsibilities — generate:**

### Presentation Structure
- Presentation Points (one Point = one future Slide)
- Presentation Outline, Slide Titles, Section Breaks, Story Flow

### Scripts
- Teleprompter Script, Long-form Presentation Script
- Speaker Notes, Talking Points, Story Summaries, Presenter Notes

### Visual Assets
- Image Prompts, Generated Images, Icons, Infographics, Charts, Maps, Diagrams
- Illustrations, Lower Third Graphics, Thumbnail Concepts

### Video Assets
- Video Prompts, Generated Video Concepts, B-Roll Suggestions, Motion Graphics Suggestions

### Audio Assets
- Voice Package, Narration Script, Voiceovers, Audio Timing
- Music Suggestions, Sound Effect Suggestions

### Presentation Metadata
- Suggested Layouts, Animation Recommendations, Transition Recommendations
- Runtime Estimates, Reading Style, Producer Notes

**Rule:** Every generated asset remains editable. Nothing is assembled into slides at this stage.

**Output:** Presentation Assets

---

## 6. Packet Department

**Mission:** Construct the final presentation. Consumes all production assets from the Develop Department. Does not generate content — its responsibility is assembly.

**Responsibilities:**
- Construct the presentation
- Create individual StorySlide records
- Populate each slide using the corresponding Presentation Point
- Assign: Slide Title, Body Content, Speaker Notes, Images, Icons, Charts, Video References, Voice Timing, Narration, Layout Template, Animation Settings, Transition Settings
- Generate slides in logical order per the approved Presentation Outline
- Create the master StoriesPresentation entity (the editable presentation)

**Editable Presentation:** The presentation must remain fully editable — text, speaker notes, images, icons, videos, voiceovers, layouts, slide order. Producer can add, duplicate, delete, reorder, and regenerate slides and assets.

**Export:** PowerPoint, Google Slides, PDF, Video. Exports generated from the editable StoriesPresentation. The exported file is never the authoritative source.

**Output:** Production Packet (Editable StoriesPresentation + StorySlide collection + Approved Research Dossier + Voice Package + Scripts + Images + Videos + Icons + Supporting assets + Export-ready files)

**Status:** Production Ready

---

## Canonical Rule

Every department performs one transformation:

| Department | Input | Transformation | Output |
|---|---|---|---|
| Topics | Producer Idea | Narrow into research objective | Research Assignment |
| Research | Research Assignment | Acquire knowledge | Raw Research Dataset |
| Dossier | Raw Research Dataset | Organize & validate | Approved Research Dossier |
| Develop | Approved Research Dossier | Generate production assets | Presentation Assets |
| Packet | Presentation Assets | Assemble into presentation | Production Packet |

Each department builds upon the work of the previous department. No department should perform another department's responsibilities. This separation of concerns ensures modularity, maintainability, and independent improvement while preserving a consistent path from idea to production-ready presentation.