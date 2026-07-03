# News Production Environment Design Blueprint

## Blueprint 1 — Newsroom Floor

### 1. Environment Purpose

The Newsroom Floor is the main working environment for the News Production profile. It contains Dashboard, Today's Brief, Story Queue, and Story Manager. This is where the producer sees what is happening, reviews story opportunities, organizes the day, and begins building stories into production-ready packages.

The Newsroom Floor should feel like entering a calm, professional broadcast newsroom where stories are actively developing.

### 2. Experience Goal

When the producer enters the Newsroom Floor, they should immediately understand:

- What is happening right now
- What stories need attention
- What today's broadcast is becoming
- What Producer has already prepared
- What action should happen next

The producer should feel: Enabled, Engaged, Enlightened, Energized, Encouraged.

### 3. Floor Plan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ LED NEWS TICKER — headlines • markets • weather • sports • events • trivia  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   MONITOR WALL                 ASSIGNMENT WHITEBOARD       AI PRODUCER BOOTH │
│   Dashboard / Live Feeds        Story Queue / Priorities    Suggestions      │
│                                                                             │
│   RESEARCH QUICK DESK           PRODUCER DESK               STORY MANAGER    │
│   Source context                Today's Brief               Active folders   │
│                                 Current rundown                              │
│                                                                             │
│   MEDIA PREVIEW                 BROADCAST READY PANEL        MINI ARCHIVE     │
│   Images / video preview        Package status              Recent stories   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

The Producer Desk is the hero asset and visual center. All other assets support it.

### 4. Primary PEAL Assets

**Producer Desk** — Displays Today's Brief, shows current rundown, displays selected story folder, gives quick actions, shows production readiness, anchors the room visually.

**LED News Ticker** — Scrolling headlines, breaking news, weather, markets, sports, live events, trivia, producer alerts. Always alive but never distracting.

**Monitor Wall** — Live headlines, weather, market, sports, trending, production status, AI activity monitors. Each clickable, zooms into its workspace.

**Assignment Whiteboard** — Displays story candidates, supports drag/drop priority, displays statuses, supports editorial notes, shows urgent stories, groups by category.

**Story Folder** — Opens story package, displays summary, shows research/sources/script status/visual assets/production package progress. Supports edit, archive, duplicate, promote, and produce.

**AI Producer Booth** — Displays AI recommendations, shows automation activity, indicates when AI is working, suggests next actions, opens assistant drawer when clicked.

### 5. Page Mapping

- **Dashboard** → Monitor Wall, LED Ticker, Producer Desk overview, AI Producer Booth
- **Today's Brief** → Producer Desk, Current Rundown folder, Broadcast Ready Panel
- **Story Queue** → Assignment Whiteboard, RSS Sticky Notes, Priority groups, Story Folders
- **Story Manager** → Story Folder, Story Manager area, Producer Desk selected folder

### 6. Camera Positions

Overview, Producer Desk (default), Assignment Board, Monitor Wall, Story Folder, AI Booth.

### 7. Interaction Flow

Enter → Overview → settles on Producer Desk → review Assignment Whiteboard → open Story Folder → Build Segment / Send to Production → Broadcast Ready Panel activates → Return to Desk.

### 8. Environmental Behaviors

LED ticker scrolls continuously, Monitor Wall refreshes, new RSS stories appear as sticky notes, AI Booth light activates when working, Story Folder progress updates, Assignment Whiteboard updates statuses, Broadcast Ready Panel lights up when packages ready.

### 9. Visual Style

Premium, calm, modern, editorial, broadcast-ready, intelligent, organized. Dark charcoal and glass surfaces, warm studio lighting, blue information accents, orange action accents, emerald completion accents, subtle purple AI/creative accents, monitor glow, whiteboard brightness, soft depth shadows.

### 10. Mobile / Tablet Behavior

Focused zones: Desk | Board | Monitors | Story | AI. Each zone still visually feels like part of the Newsroom Floor.

### 11. Accessibility

Keyboard navigation, command palette, reduced motion mode, screen reader labels, high contrast mode, quick jump menu, traditional list fallback for Story Queue.

### 12. Base44 Implementation Instructions

1. Create Newsroom Floor layout shell.
2. Implement PEAL assets visually.
3. Bind existing data to new assets. Do not remove existing functionality.
4. Add 2.5D camera-style movement (CSS transform, scale, translate, smooth transitions).
5. Add environmental motion and polish. Keep all motion subtle and purposeful.

### 13. Acceptance Tests

- ✓ Dashboard feels like a Monitor Wall, not a grid of cards.
- ✓ Today's Brief feels like a producer briefing packet on the desk.
- ✓ Story Queue feels like an Assignment Whiteboard.
- ✓ Story Manager feels like opening a Story Folder.
- ✓ Navigation happens through newsroom objects.
- ✓ Producer Desk is the hero asset.
- ✓ LED ticker displays live/updateable information.
- ✓ AI appears as part of the room.
- ✓ Existing News Production functionality still works.
- ✓ The Newsroom Floor feels like the flagship Producer experience.

### Final Rule

Do not build a dashboard that looks like a newsroom. Build a newsroom whose objects perform the work of the dashboard. The set design is the UI.

**End of Blueprint 1 — Newsroom Floor**