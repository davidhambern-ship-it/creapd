# CREAPD — AI PRESENTATION DIRECTOR (APD)

## Executable Technical Contract

**Version:** 1.0  
**Status:** Foundation Specification

---

## DOCUMENT PURPOSE

This document defines the executable technical requirements for implementing the CREAPD AI Presentation Director (APD).

Where the APD Technical Architecture & Functional Specification defines the philosophy, behavior, and responsibilities of APD, this Executable Technical Contract defines the technical rules required to build, integrate, render, validate, and operate the system.

This document establishes the canonical data contracts, rendering model, synchronization requirements, system interfaces, operational constraints, and implementation requirements for APD Version 1.0.

Unless explicitly stated otherwise, all requirements contained within this document SHALL be considered mandatory.

### Core Engineering Principle

APD SHALL create Presentations. APD SHALL NOT create Videos.

A Stories Presentation is the canonical output of the AI Presentation Director. Video files are export formats generated from completed Stories Presentations.

### Normative Language

- **SHALL** — A mandatory requirement.
- **MUST** — An absolute technical requirement.
- **SHOULD** — A strongly recommended implementation.
- **MAY** — An optional implementation.
- **PROHIBITED** — An implementation that shall never occur.

---

## SECTION 1 — SYSTEM SCOPE & MVP

### 1.3 In Scope (Version 1.0)

- Story Package validation
- Voice Package validation
- Fact Check integration
- Source Reference validation
- Story Package Analysis
- Story Slide generation
- Stories Presentation assembly
- Presentation Timeline generation
- Presentation Scene generation
- Presentation Layer generation
- Presentation metadata
- Producer review workflow
- Interactive Presentation playback
- MP4 export
- Basic Presentation QA
- Error recovery

### 1.5 MVP Success Criteria

1. Accept a minimum of five approved Story Packages.
2. Validate all required production assets.
3. Generate one Story Slide for every approved Story Package.
4. Assemble all Story Slides into one Stories Presentation.
5. Generate a synchronized Presentation Timeline.
6. Render the Stories Presentation using the CREAPD Presentation Player.
7. Allow Producer review.
8. Export the Stories Presentation to MP4.
9. Store the completed Stories Presentation.
10. Support future regeneration without requiring Story Package recreation.

---

## SECTION 2 — CANONICAL OUTPUT FORMAT

### 2.2 Canonical Production Object

The canonical output of APD SHALL be a Stories Presentation. A Stories Presentation SHALL NOT be stored as a video. A Stories Presentation SHALL remain fully editable until explicitly exported by the Producer.

### 2.3 Stories Presentation Hierarchy

```
Production → Stories Presentation → Story Slide → Presentation Scene → Presentation Layer → Presentation Element → Timeline Event
```

Every production object SHALL belong to exactly one parent object. No object SHALL exist independently of its parent.

### 2.4 Stories Presentation

A Stories Presentation SHALL contain:
- Presentation Metadata
- Presentation Timeline
- Story Slides
- Playback Settings
- Presentation Assets
- Producer Metadata
- Export Metadata
- Presentation Version

### 2.5 Story Slide

One approved Story Package SHALL generate exactly one Story Slide. One Story Slide SHALL NEVER represent multiple Story Packages. Multiple Story Slides SHALL NEVER be generated from one Story Package.

### 2.6 Presentation Scene

A Presentation Scene SHALL represent one continuous visual state within a Story Slide. Scenes change on: topic changes, subject changes, supporting evidence, statistics, quotes, demonstrations, AI Discussion responses, emotional changes. Scenes SHALL be timeline-driven.

### 2.7 Presentation Layer

Layers organize rendered objects by visual hierarchy:
- Background
- Environmental Effects
- Primary Imagery
- Secondary Imagery
- Motion Graphics
- Text
- Lower Third
- Foreground Effects

Layers SHALL remain independently controllable.

### 2.8 Presentation Elements

Individual renderable objects: Images, Headlines, Body Text, Talking Point Cards, AI Discussion Responses, Lower Third Graphics, Charts, Logos, Icons, Callouts, Animations. Every Element SHALL belong to exactly one Layer.

### 2.9 Timeline Events

Timeline Events control all time-based behavior: Scene Start, Scene End, Element Entrance, Element Exit, Animation Start, Animation End, Camera Movement, Voice Synchronization, Transition Trigger.

### 2.10 Presentation Player

The CREAPD Presentation Player SHALL render Stories Presentations dynamically during playback. The Player SHALL interpret Story Slides, Presentation Scenes, Presentation Layers, Presentation Elements, and Timeline Events. The Player SHALL NOT require pre-rendered video assets.

### 2.14 Core Engineering Rule

The AI Presentation Director SHALL create Presentations. The Presentation Player SHALL render Presentations. The Presentation Export Engine SHALL export Presentations. These responsibilities SHALL remain separate.

---

## SECTION 3 — INPUT DATA CONTRACTS

### 3.2 Accepted Production Objects

- Production Profile
- Story Package
- Voice Package
- Fact Check Report
- Source References
- Media Assets
- Producer Approval
- Presentation Settings

### 3.3 Production Profile Contract

Required Properties: Profile ID, Profile Name, Profile Version, Style Configuration, Motion Configuration, Typography Rules, Color Palette, Layout Rules, Export Configuration, Opening Sequence, Closing Sequence, APD Directing Rules.

### 3.4 Story Package Contract

Required Properties: Story Package ID, Story Order, Story Status, Headline, Teleprompter Script, Story Summary, Talking Points, Lower Third Text, Title Suggestions, Image Generation Prompt, Thumbnail Prompt, Visual Suggestions, B-roll Suggestions, Social Caption, Fact Check Notes, Producer Notes, Source References, Voice Package ID, Story Image Assets, Creation Timestamp, Approval Status.

### 3.5 Voice Package Contract

Required Properties: Voice Package ID, Voice Provider, Voice Model, Voice Name, Audio File, Transcript, Total Runtime, Sentence Timeline, Paragraph Timeline, Pause Metadata, Speech Rate, Approval Status. The Voice Package SHALL become the master timeline for the Story Slide.

### 3.6 Fact Check Contract

Required Properties: Fact Check ID, Validation Status, Confidence Score, Verified Claims, Disputed Claims, Unsupported Claims, Recommended Corrections, Verification Timestamp.

### 3.7 Source Reference Contract

Required Properties: Source ID, Source Name, Source URL, Publication Name, Publication Date, Author, Citation, Verification Status.

### 3.8 Media Asset Contract

Required Properties: Asset ID, Asset Type, Asset Filename, Asset Location, Asset Dimensions, Aspect Ratio, Resolution, File Size, Format, Licensing Status, Generation Method, Approval Status.

### 3.11 Validation Rules

Before APD initialization:
✓ Production Profile exists  
✓ Minimum Story Package count satisfied  
✓ Every Story Package approved  
✓ Every Voice Package approved  
✓ Every Fact Check approved  
✓ Source References attached  
✓ Required media assets available  
✓ Presentation Settings complete  

---

## SECTION 4 — STORY SLIDE SCENE GRAPH

### 4.2 Scene Graph Definition

A Story Slide SHALL be represented by a hierarchical Scene Graph containing:
- Story Slide Metadata
- Presentation Scenes
- Presentation Layers
- Presentation Elements
- Timeline Events
- Motion Instructions
- Playback Instructions
- Synchronization Data

### 4.4 Presentation Scene Structure

Each Scene SHALL contain: Scene ID, Scene Order, Scene Start Time, Scene End Time, Scene Duration, Scene Type, Scene Purpose, Camera State, Motion State, Active Layers, Timeline Events. Scene timing SHALL originate from the Voice Package.

### 4.5 Scene Lifecycle

Created → Populated → Validated → Rendered → Completed → Archived

### 4.6 Presentation Layer Structure

```
Layer 0: Background
Layer 1: Environmental Effects
Layer 2: Primary Visuals
Layer 3: Supporting Visuals
Layer 4: Graphics
Layer 5: Text
Layer 6: Lower Third
Layer 7: Foreground Effects
```

### 4.7 Presentation Element Structure

Every Element SHALL contain: Element ID, Element Type, Parent Layer, Position, Scale, Rotation, Opacity, Visibility, Entrance Animation, Exit Animation, Active Timeline, Asset Reference, Interaction State.

### 4.8 Coordinate System

Normalized coordinate system: Origin Top Left (0.0, 0.0) → Bottom Right (1.0, 1.0). Positioning SHALL remain independent of screen resolution.

### 4.13 Rendering Responsibility

The Scene Graph SHALL NOT contain rendered pixels. The Scene Graph SHALL describe WHAT should be rendered. The Presentation Player SHALL determine HOW the Scene Graph is rendered.

---

## SECTION 5 — PRESENTATION TIMELINE & SYNCHRONIZATION MODEL

### 5.2 Master Timeline

Every Stories Presentation SHALL contain one Master Presentation Timeline beginning at 00:00.000 and terminating at the completion of the final Story Slide.

### 5.5 Timeline Units

All timing SHALL use milliseconds. No renderer SHALL estimate timeline values.

### 5.6 Voice Synchronization

The Voice Package SHALL remain the master timing authority. Synchronization SHALL include: Headlines, Images, Talking Point Cards, AI Discussion Responses, Lower Third Graphics, Statistics, Quotes, Camera Movement, Motion.

### 5.8 Synchronization Tolerance

Maximum allowable synchronization drift: **±50 milliseconds**. Any drift exceeding this value SHALL trigger timeline correction.

### 5.9 Timeline Priority

1. Voice Playback
2. Presentation Timeline
3. Presentation Scene
4. Presentation Components
5. Animations
6. Environmental Effects

### 5.15 Pause & Resume

The Presentation Player SHALL support: Pause, Resume, Seek, Jump to Story Slide, Jump to Presentation Scene, Replay Scene, Replay Story Slide.

---

## SECTION 6 — AI DECISION CONTRACT

### 6.2 Decision Architecture

- **Editorial Decisions** — originate from the approved Story Package
- **Presentation Decisions** — originate from APD
- **Rendering Decisions** — originate from the Presentation Player
- **System Decisions** — originate from the CREAPD platform

### 6.3 Deterministic Decisions

Story Package validation, Voice Package validation, Fact Check validation, Source validation, Story ordering, Story Package to Story Slide mapping, Timeline generation, Timeline synchronization, Scene ordering, Layer ordering, Presentation hierarchy, Metadata generation, Presentation versioning, Export generation, Playback timing, Producer permissions, Storage operations.

### 6.4 AI Reasoning Decisions

Presentation strategy, Visual storytelling, Image placement, Presentation Scene creation, Camera selection, Motion selection, Visual hierarchy, Discussion responses, Supporting graphics, Transition selection, Layout variation, Emotional pacing, Audience engagement, Communication optimization.

### 6.7 AI Constraints

APD SHALL NEVER: Invent facts, Rewrite approved scripts, Contradict Fact Check Notes, Ignore Source References, Fabricate quotations, Alter Story Package intent, Misrepresent statistics, Introduce unsupported claims.

### 6.13 Decision Confidence

Every AI reasoning decision SHALL produce a Decision Confidence Score. Low-confidence decisions MAY trigger: Alternate layout generation, Additional asset generation, Producer notification, Regeneration.

---

## SECTION 7 — PRESENTATION PLAYER CONTRACT

### 7.2 Primary Responsibilities

Load Stories Presentations, Load Story Slides, Load Presentation Scenes, Render Presentation Components, Execute Timeline Events, Synchronize Voice Playback, Render Motion, Manage Presentation State, Execute Scene Transitions, Support Producer Navigation.

### 7.5 Presentation State

Initializing → Ready → Playing → Paused → Seeking → Buffering → Completed → Error

### 7.11 Producer Controls

Play, Pause, Stop, Restart, Replay Story Slide, Replay Presentation Scene, Jump to Story Slide, Jump to Presentation Scene, Timeline Scrubbing, Playback Speed Control. Producer controls SHALL NOT modify the underlying Stories Presentation.

### 7.15 Core Engineering Rule

The Presentation Player SHALL NEVER: Rewrite Story content, Modify Timeline Events, Rearrange Story Slides, Generate Presentation Components, Make production decisions.

---

## SECTION 8 — SYSTEM INTERFACE CONTRACTS

### 8.3 Primary System Interfaces

Story Package Service, Voice Package Service, Fact Check Service, Source Reference Service, Media Asset Service, Production Profile Service, Presentation Runtime, Export Service, Producer Review Service, Storage Service, Authentication Service.

### 8.15 Event Contracts

Presentation Requested → Validation Started → Validation Complete → Generation Started → Story Slide Generated → Presentation Complete → Producer Review Started → Presentation Approved → Presentation Exported → Presentation Archived

### 8.17 Error Contracts

Every Error SHALL contain: Error Code, Error Description, Affected Object, Recovery Recommendation.

---

## SECTION 9 — PERSISTENCE CONTRACT

### 9.3 Persisted Objects

Production Profiles, Story Packages, Voice Packages, Stories Presentations, Story Slides, Presentation Scenes, Presentation Components, Presentation Layers, Timeline Events, Motion Instructions, Camera Instructions, Producer Approvals, Version History, Export History, Showcase Status.

### 9.11 Presentation Recovery

A persisted Stories Presentation SHALL be recoverable without requiring APD regeneration.

---

## SECTION 10 — QUALITY ASSURANCE CONTRACT

### 10.2 Validation Categories

Story Integrity, Timeline Synchronization, Presentation Structure, Presentation Components, Motion, Camera, Communication, Readability, Presentation Consistency, Technical Integrity.

### 10.4 Timeline Validation

Maximum synchronization drift: ±50 milliseconds.

### 10.11 Dead Time Detection

Dead Time = continuous period exceeding 2 seconds during which no visual progression, no meaningful Component activity, and no communication objective is being supported.

### 10.14 Quality Scores (0–100)

Story Integrity Score, Timeline Score, Communication Score, Readability Score, Motion Score, Presentation Consistency Score, Technical Integrity Score.

### 10.15 Production Confidence Score

- 95–100: Broadcast Ready
- 90–94: Producer Review Recommended
- 80–89: Minor Improvements Suggested
- Below 80: Regeneration Recommended

### 10.16 Validation Results

PASS → Presentation proceeds.  
WARNING → Presentation proceeds with Producer notification.  
FAIL → Presentation returns for correction or regeneration.

---

## SECTION 11 — MEDIA ASSET CONTRACT

### 11.2 Media Asset Types

Story Images, Generated Images, Logos, Icons, Charts, Graphs, Infographics, Illustrations, Background Graphics, Video Clips, Animations, Audio Assets, Voice Packages.

### 11.7 Asset Placement

Media Assets SHALL NOT determine their own placement. Placement SHALL remain the exclusive responsibility of APD.

### 11.15 Core Engineering Rule

Media Assets SHALL exist independently of Stories Presentations. Stories Presentations SHALL reference Media Assets through persistent identifiers.

---

## SECTION 12 — PRODUCER REVIEW & EDITING CONTRACT

### 12.4 Editing Philosophy

Editing SHALL be non-destructive. APD SHALL regenerate only the minimum number of affected production objects.

### 12.15 Regeneration Scope

Presentation Component → Presentation Scene → Story Slide → Stories Presentation. Entire Stories Presentation regeneration SHALL occur only when absolutely necessary.

---

## SECTION 13 — OPERATIONAL REQUIREMENTS

### 13.4 Performance Requirements

- Story Package Validation: Under 2 seconds
- Presentation Initialization: Under 5 seconds
- Story Slide Generation: Under 30 seconds per Story Package
- Stories Presentation Assembly: Under 60 seconds
- Presentation Loading: Under 3 seconds

---

## SECTION 14 — IMPLEMENTATION ROADMAP

### Phase 1 — Foundation
Production Profile Contract, Story Package Contract, Voice Package Contract, Persistence Layer, Validation Engine, Authentication, Producer Identity, Version Management, Logging, Error Framework.

### Phase 2 — APD Core Engine
Story Package Analysis, Story Slide Generation, Presentation Scene Generation, Presentation Component Generation, Timeline Construction, Motion Planning, Camera Planning, Scene Graph Generation, Stories Presentation Assembly.

### Phase 3 — Presentation Runtime
Presentation Loading, Story Slide Rendering, Scene Rendering, Component Rendering, Timeline Execution, Voice Synchronization, Motion Playback, Camera Playback, Producer Navigation, Timeline Scrubbing.

### Phase 4 — Producer Review
Producer Review, Story Slide Regeneration, Presentation Scene Editing, Component Replacement, Version History, Undo, Restore, Approval Workflow, Presentation Sessions.

### Phase 5 — Export Engine
MP4 Export, Presentation Packaging, Export Metadata, Export History, Presentation Archiving, Showcase Integration.

### Phase 6 — Intelligence Expansion
Advanced Presentation Components, Additional Production Profiles, Advanced Camera Logic, Enhanced Motion Intelligence, Multi-Agent Reasoning, Adaptive Directing, Interactive Presentations, Live Presentation Support.

---

*END OF EXECUTABLE TECHNICAL CONTRACT*