# BASE44 BUILD PROMPT

# Producer Environmental Asset Library (PEAL)

**PEAL Version 1.0 Complete**

> This is Section 1 of the PEAL specification. See `PEAL_Section_02.md` through `PEAL_Section_10.md` for remaining sections, or `PEAL.md` (root) for the table of contents.

---

## Section 1 — Philosophy, Purpose & Core Asset Laws

### Primary Instruction

Build the **Producer Environmental Asset Library**, also called **PEAL**.

PEAL defines the reusable environmental objects used to build Producer's immersive workspaces.

Producer should not rely on generic dashboards, cards, sidebars, and tables when a functional environmental object can create a more memorable experience.

PEAL is the bridge between the Producer Design System and actual interface implementation.

The Producer Design System defines how Producer should feel.

PEAL defines what functional objects exist inside Producer environments.

### Core Philosophy

Producer is not a collection of pages.

Producer is a collection of environments.

Each environment should feel like a real creative workspace.

The set design is the interface.

Every object inside an environment should either:

- display live information
- trigger a workflow
- open a workspace
- organize content
- show progress
- support automation
- reveal context
- guide the producer forward

If an object does not serve a purpose, it should not be included.

### PEAL Purpose

PEAL exists to prevent Base44 from creating generic UI.

Instead of:

- sidebar
- card
- table
- widget
- modal
- dashboard

Producer should use:

- file cabinet
- story folder
- monitor wall
- whiteboard
- corkboard
- sticky note
- producer desk
- control console
- ticker
- archive shelf
- source wall
- media vault

These are not decorations.

They are functional interface objects.

### PEAL Relationship to PDS

PEAL must always follow the Producer Design System.

Every PEAL asset should reinforce the Five ENs™:

- Enabled
- Engaged
- Enlightened
- Energized
- Encouraged

Every asset should make the producer feel more capable, curious, informed, motivated, or purposeful.

### The Seven Laws of PEAL

#### Law 1 — Every Asset Has a Job

No PEAL asset may exist only for decoration.

Every asset must have a clear function.

Example:

A whiteboard is not background art.

It organizes stories, planning notes, deadlines, and editorial decisions.

#### Law 2 — The Environment Is the Interface

Producer should not place standard UI inside a themed background.

The environment itself should become the interface.

Example:

Do not place story cards on a page.

Place story folders, sticky notes, or whiteboard items inside the News Production environment.

#### Law 3 — Objects Replace Generic UI

PEAL assets should replace generic web components when appropriate.

Examples:

- Sidebar → File Cabinet or Wall Directory
- Dashboard → Monitor Wall
- Card → Folder, Sticky Note, Monitor, Clipboard
- Table → Whiteboard, Rundown Board, Assignment Board
- Notification → LED Ticker, Intercom Alert, Sticky Note
- Settings Panel → Control Console

#### Law 4 — Assets Must Be Reusable

Each PEAL asset should be designed for reuse across environments when appropriate.

Example:

A Broadcast Monitor can appear in:

- News Production
- Production Studio
- Mission Control

But it may display different data in each environment.

#### Law 5 — Function Comes Before Decoration

Visual richness is encouraged.

However, function always comes first.

If a beautiful object makes the workflow harder, redesign the object.

#### Law 6 — Assets Must Support Automation

Producer is automation-first.

PEAL assets should visibly communicate automation.

Examples:

- A sticky note appears when a new RSS item arrives.
- A monitor updates when a story package is generated.
- A console light activates when production is ready.
- A folder shows progress as assets are created.

#### Law 7 — Assets Must Belong Somewhere

Every PEAL asset must declare where it appears.

Assets are never random.

Each asset must belong to:

- a Production Profile
- an Environment
- a Workflow
- a Purpose

### PEAL Asset Definition Standard

Every PEAL asset must define:

- Asset ID
- Asset Name
- Category
- Purpose
- Replaces
- Primary Functions
- Secondary Functions
- Available States
- Available Interactions
- AI Capabilities
- Automation Behavior
- Data Sources
- Workflow Position
- Appears In
- Related Assets
- Rules
- Notes

This ensures every asset is functional, reusable, and understandable.

### What PEAL Is Not

- PEAL is not a 3D modeling guide.
- PEAL is not an art manual.
- PEAL is not a CSS style sheet.
- PEAL is not a list of decorations.
- PEAL is not a replacement for the Producer Design System.

PEAL defines functional environmental assets and their behavior.

The Environment Blueprint decides how those assets are arranged.

Base44 implements the assets in code.

### News Production First Rule

The first PEAL implementation should focus on the **News Production** profile.

News Production is currently the most functional Producer profile and should become the test case for the environment-as-interface design philosophy.

The News Production environment should use newsroom objects instead of generic UI.

### Acceptance Tests

This section is complete only when:

- ✓ PEAL exists as a reusable environmental asset standard.
- ✓ PEAL clearly distinguishes functional objects from decorative props.
- ✓ Every asset must have a purpose.
- ✓ Every asset replaces or improves a generic UI pattern.
- ✓ Every asset supports workflow, automation, or context.
- ✓ PEAL follows the Producer Design System.
- ✓ News Production is identified as the first implementation target.
- ✓ Base44 understands that PEAL assets are functional interface objects.

### Final System Rule

Do not build themed dashboards.

Build functional environments.

Do not decorate software to look like a room.

Make the room itself become the software.

PEAL exists to give Producer a shared library of reusable, functional, immersive environmental assets so every Production Profile can feel like a real place where meaningful creative work happens.

**End of PEAL Section 1**

**Next Section:** Asset Taxonomy, Object Categories & Generic UI Replacement Map (`PEAL_Section_02.md`)