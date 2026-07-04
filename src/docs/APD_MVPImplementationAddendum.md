# CREAPD — AI PRESENTATION DIRECTOR (APD)

## MVP Implementation Addendum

**Version:** 1.0

---

## DOCUMENT PURPOSE

This addendum supplements the following documents:
- AI Presentation Director (APD) Technical Architecture & Functional Specification
- AI Presentation Director (APD) Executable Technical Contract

Its purpose is to resolve implementation ambiguities, establish canonical engineering decisions, and define the minimum technical requirements necessary to implement Version 1.0 of the AI Presentation Director.

Where ambiguity exists between previous documents, the decisions contained within this addendum **SHALL** take precedence for Version 1.0 implementation only.

---

## SECTION 1 — CANONICAL MVP DECISIONS

### 1.1 Presentation Model

The canonical production object SHALL remain the Stories Presentation. Stories Presentations SHALL NOT be represented internally as video files. Videos SHALL be generated exclusively through the Export Engine.

### 1.2 Runtime Package Count

The APD architecture SHALL support one (1) or more approved Story Packages.

Version 1.0 SHALL NOT require five Story Packages for runtime operation.

- **Runtime Requirement:** 1–N Story Packages
- **Acceptance Test Requirement:** 5 Story Packages

### 1.3 Story Slide Relationship

Every generated Story Slide SHALL reference exactly one originating Story Package.

Producer-created Story Slides SHALL be classified as Derived Story Slides. Derived Story Slides SHALL preserve a reference to their originating Story Package.

### 1.4 Story Order

During generation, Story Slides SHALL be created using the order of approved Story Packages. Producer reordering SHALL NOT modify Story Package order. Producer reordering SHALL create a new Presentation Version.

### 1.5 Canonical Terminology

Canonical Terms:
- Stories Presentation
- Story Slide
- Presentation Scene
- Presentation Layer
- Presentation Element
- Timeline Event
- Media Asset
- Presentation Runtime
- Presentation Session

The term "Presentation Component" SHALL be considered deprecated for Version 1.0. Existing references SHALL be interpreted as Presentation Elements.

### 1.6 Media Assets

Media Assets SHALL exist independently of Stories Presentations. Presentation Elements SHALL reference Media Assets using persistent Asset IDs. Media Assets SHALL NEVER become child objects of Story Slides.

---

## SECTION 2 — MVP TECHNOLOGY DECISIONS

| Property | Value |
|----------|-------|
| Presentation Runtime | Web Browser |
| Rendering | HTML5, CSS, JavaScript, Canvas where required |
| Presentation Model | JSON Scene Graph |
| Primary Preview | Interactive Presentation |
| Primary Export | MP4 |
| Resolution | 1920 × 1080 |
| Aspect Ratio | 16:9 |
| Frame Rate | 30 FPS |
| Video Codec | H.264 |
| Audio Codec | AAC |
| Audio Sample Rate | 48 kHz |
| Color Space | sRGB |

---

## SECTION 3 — AI REPRODUCIBILITY

AI reasoning SHALL remain reproducible. Every AI directing decision SHALL record:
- Model Version
- Prompt Version
- Temperature
- Random Seed (when supported)
- Decision Timestamp
- Decision Confidence
- Decision Summary

These values SHALL permit future regeneration using identical production settings whenever supported by the underlying AI provider.

---

## SECTION 4 — MVP QA DEFAULTS

| Metric | Threshold |
|--------|-----------|
| Synchronization Drift | Maximum ±50 ms |
| Minimum Text Contrast | WCAG AA |
| Minimum Display Time | 2 seconds |
| Maximum Dead Time | 2 seconds |
| Minimum Production Confidence | 90 |
| Readability | Pass / Warning / Fail |
| Timeline | Pass / Warning / Fail |
| Motion | Pass / Warning / Fail |
| Communication | Producer Approval Required |

---

## SECTION 5 — MVP EXPORT DEFAULTS

| Property | Value |
|----------|-------|
| Default Export | MP4 |
| Resolution | 1920 × 1080 |
| Aspect Ratio | 16:9 |
| Frame Rate | 30 FPS |
| Codec | H.264 |
| Audio | AAC |
| Maximum Runtime | Unlimited |
| Filename | Presentation Title + Timestamp + Version Number |

Future export formats SHALL include: PPTX, PDF, Interactive Web Package.

---

## SECTION 6 — MVP IMPLEMENTATION ORDER

Implementation SHALL proceed in the following sequence:

```
Phase 1: Persistence
Phase 2: Validation
Phase 3: Scene Graph
Phase 4: Timeline
Phase 5: Presentation Runtime
Phase 6: Producer Review
Phase 7: Export
Phase 8: Quality Assurance
Phase 9: AI Directing Expansion
```

Each phase SHALL be considered complete before the next phase begins.

---

## FINAL ENGINEERING RULE

Version 1.0 SHALL prioritize architectural correctness, modularity, editability, and Producer control over advanced AI directing capabilities.

Every implementation decision SHALL preserve the Stories Presentation as the canonical production object.

No implementation shortcut SHALL compromise future platform extensibility.

---

*END OF MVP IMPLEMENTATION ADDENDUM*