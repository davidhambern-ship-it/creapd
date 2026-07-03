## Section 3 — Universal Asset Specification, Functional Standards & Behavior Framework

### Primary Instruction

Every asset in the Producer Environmental Asset Library must follow one universal specification.

This ensures that every environmental object behaves consistently regardless of which Production Profile or Environment it appears in.

PEAL does not define how an asset is programmed.

PEAL defines:

- what the asset is
- why it exists
- what it can do
- how it behaves
- how it supports the producer

Every PEAL asset should feel like a real object performing meaningful work.

### Universal Asset Structure

Every PEAL asset must contain the following sections.

No asset may omit any required section.

#### 1. Asset ID

Every asset receives a permanent identifier.

Examples:

- PEAL-NWS-001
- PEAL-LIB-014
- PEAL-CMN-008

The ID should never change.

#### 2. Asset Name

The common name of the object.

Examples:

- Broadcast Monitor
- Producer Desk
- Story Folder
- Whiteboard
- Bookshelf
- Control Console

#### 3. Category

Every asset belongs to one primary PEAL category.

Examples:

- Workspace
- Display
- Planning
- Storage
- Navigation
- Information
- Control
- Ambient

#### 4. Purpose

Describe the reason this object exists.

Purpose should answer:

"What problem does this object solve?"

Example:

The Story Folder organizes every resource associated with a single story package.

#### 5. Replaces

Identify which traditional UI pattern this object replaces.

Examples:

- Story Folder → Card
- Broadcast Monitor → Dashboard Widget
- Whiteboard → Planning Table
- Bookshelf → Navigation Tree

#### 6. Primary Functions

The main responsibilities of the asset.

Examples:

Story Folder

- Open story
- Edit package
- Display status
- Launch production
- Archive

Only the core responsibilities belong here.

#### 7. Secondary Functions

Supporting behaviors.

Examples:

- Duplicate
- Pin
- Favorite
- Share
- Compare
- Tag
- Quick Preview

Secondary functions should never overshadow the primary purpose.

#### 8. Available States

Every asset must define its possible operating states.

Examples:

- Idle
- Selected
- Hovered
- Loading
- Locked
- Editing
- Updating
- Archived
- Expanded
- Collapsed
- Alert
- Offline
- Complete

Every state should have a visual difference.

#### 9. Available Interactions

Define every interaction the producer may perform.

Examples:

- Click
- Double Click
- Hover
- Drag
- Drop
- Resize
- Pin
- Expand
- Collapse
- Right Click
- Long Press
- Keyboard Focus
- Touch

Interactions should remain consistent across Producer.

#### 10. Automation Behavior

Describe how Producer Automation interacts with the asset.

Examples:

- Updates automatically
- Appears when generated
- Refreshes live
- Archives itself
- Changes status
- Animates when completed

Automation should always remain understandable.

#### 11. AI Behavior

Describe how Producer AI uses the asset.

Examples:

- Suggests updates
- Creates contents
- Summarizes
- Highlights important information
- Adds recommendations
- Explains context

AI should assist—not replace—the producer.

#### 12. Data Sources

Identify where the asset receives its information.

Examples:

- Internal Database
- RSS
- Research Engine
- Library
- Weather API
- Market API
- Sports API
- Producer AI
- Knowledge Graph

This defines what powers the asset.

#### 13. Workflow Position

Every asset belongs somewhere within a workflow.

Example:

Story Folder

Story Queue → Story Manager → Production → Export → Archive

Workflow positioning prevents random placement.

#### 14. Appears In

Specify exactly where the asset may exist.

Format:

Production Profile → Environment → Optional Workspace

Example:

News Production → Newsroom Floor → Producer Desk

An asset should never appear without context.

#### 15. Related Assets

Identify assets that naturally work together.

Example:

Producer Desk

Related to:

- Story Folder
- Broadcast Monitor
- Notebook
- Coffee Mug
- Keyboard
- Desk Lamp

This helps Environment Blueprints assemble realistic workspaces.

#### 16. Rules

Every asset should define non-negotiable rules.

Examples:

- A Broadcast Monitor must always display meaningful information.
- A Story Folder always represents one story.
- A Whiteboard always supports organization.

Rules prevent inconsistent implementations.

#### 17. Notes

Optional implementation notes.

Examples:

- Future ideas
- Accessibility reminders
- Special behaviors
- Version history

Notes should never override PEAL standards.

### Functional Standards

Every PEAL asset must satisfy these functional requirements.

**Rule 1** — Every asset performs work. No asset exists solely as decoration.

**Rule 2** — Every asset communicates its purpose visually. The producer should immediately understand what the object is likely to do.

**Rule 3** — Every interaction provides feedback. Hover, Click, Selection, Automation, Completion, Errors must all provide meaningful visual confirmation.

**Rule 4** — Every asset supports keyboard navigation. Environmental design must never reduce accessibility.

**Rule 5** — Every asset supports responsive layouts. Assets should adapt to Desktop, Tablet, Mobile without losing their identity.

**Rule 6** — Every asset supports Producer Automation. Automation should visibly interact with environmental objects. Examples: Folders update. Sticky notes appear. Monitors refresh. Status lights activate.

**Rule 7** — Every asset supports future AI expansion. Even if AI functionality is minimal initially, the asset should be designed to support intelligent behaviors later.

### Behavior Framework

Producer assets should behave like physical objects.

Examples:

- Folders open.
- Cabinets slide.
- Whiteboards zoom.
- Monitors illuminate.
- Console switches activate.
- Bookshelves reveal.
- Drawers extend.

Behavior should reinforce immersion.

### Consistency Framework

An asset should never behave differently simply because it appears in another Production Profile.

Example:

A Story Folder in News Production and a Message Folder in another profile may contain different information, but they should still feel like members of the same object family.

Consistency builds trust.

### Acceptance Tests

This section is complete only when:

- ✓ Every PEAL asset follows one universal specification.
- ✓ Assets define both functionality and behavior.
- ✓ Workflow position is documented.
- ✓ Automation behavior is documented.
- ✓ AI behavior is documented.
- ✓ Asset relationships are documented.
- ✓ Environmental consistency is preserved.
- ✓ Assets remain reusable across Producer.
- ✓ Functional standards are enforced.

### Final System Rule

PEAL assets are not graphics.

They are functional environmental objects.

Every object should behave like something a producer would expect to interact with in a real creative workspace.

When Base44 builds an environment, it should not invent how an object works.

It should reference PEAL and implement the asset according to its defined purpose, behavior, interactions, and workflow role.

**End of PEAL Section 3**

**Next Section:** Environmental Assembly Rules, Layout Intelligence & Object Placement Standards (`PEAL_Section_04.md`)