# Producer Environment Archetypes (PEA)

**PEA Version 1.0 Complete**

PEA defines the reusable environment templates used throughout Producer. Every Production Profile inherits one or more Environment Archetypes rather than being designed from scratch.

> PEA exists to answer one question: **"What kind of place is this?"** These are not themes — they are functional workplace archetypes.

---

## Document Sections

| File | Section |
|------|---------|
| [`docs/pea/PEA_Section_01.md`](docs/pea/PEA_Section_01.md) | Philosophy, Purpose & Archetype Framework |
| [`docs/pea/PEA_Section_02.md`](docs/pea/PEA_Section_02.md) | Newsroom Archetype |
| [`docs/pea/PEA_Section_03.md`](docs/pea/PEA_Section_03.md) | Production Studio Archetype |
| [`docs/pea/PEA_Section_04.md`](docs/pea/PEA_Section_04.md) | Broadcast Studio Archetype |
| [`docs/pea/PEA_Section_05.md`](docs/pea/PEA_Section_05.md) | Study Center Archetype (Primary for Spiritual Production) |
| [`docs/pea/PEA_Section_06.md`](docs/pea/PEA_Section_06.md) | Studio Kitchen Archetype (Primary for Cooking Production) |
| [`docs/pea/PEA_Section_07.md`](docs/pea/PEA_Section_07.md) | Recording Studio Archetype (Primary for Music Production) |
| [`docs/pea/PEA_Section_08.md`](docs/pea/PEA_Section_08.md) | Production Profile Composition, Archetype Mapping & Implementation Standards |

---

## Quick Reference

### Producer Architecture Hierarchy

```
Producer Design System (PDS)        → Defines philosophy
        ↓
Producer Environmental Asset Library (PEAL)  → Defines reusable objects
        ↓
Producer Environment Archetypes (PEA)         → Defines reusable environments
        ↓
Environment Blueprint (EB)                    → Arranges PEAL assets in a specific room
        ↓
Production Profile                            → Combines archetypes into complete workflows
        ↓
Implementation (Base44)                        → Builds it in code
```

### The Six Environment Archetypes

| Archetype | Hero Asset | Identity | Typical Primary Profile |
|-----------|-----------|----------|--------------------------|
| **Newsroom** | Producer Desk | Information becomes broadcasts | News Production |
| **Production Studio** | Production Workstation | Ideas become finished creative products | (Supporting for many) |
| **Broadcast Studio** | Host Desk | Conversation becomes programming | Talk Production |
| **Study Center** | Study Desk | Knowledge becomes understanding | Spiritual Production |
| **Studio Kitchen** | Kitchen Island | Recipes become experiences | Cooking Production |
| **Recording Studio** | Recording Console | Ideas become music | Music Production |

### Archetype Definition Standard

Every Environment Archetype must define:

- Purpose
- Emotional Goal (Five ENs)
- Hero Asset
- Primary Workflow
- Environmental Personality
- Core PEAL Assets
- Environmental Behaviors
- Camera Philosophy
- Navigation Style
- Lighting Philosophy
- Spatial Organization
- Related Archetypes
- Typical Production Profiles

### Current Production Profile Mapping

| Profile | Primary Archetype | Supporting Archetypes |
|---------|-------------------|-----------------------|
| News Production | Newsroom | Production Studio, Broadcast Studio, Research Department |
| Cooking Production | Studio Kitchen | Production Studio, Broadcast Studio |
| Talk Production | Broadcast Studio | Production Studio |
| Spiritual Production | Study Center | Broadcast Studio, Production Studio |
| Sports Production | Newsroom | Broadcast Studio, Production Studio |
| Music Production | Recording Studio | Production Studio |

### Key Rules

1. **Composition over duplication** — Profiles compose archetypes; they don't reinvent environments.
2. **Scalability** — New profiles first ask "Can an existing archetype support this?" before creating new ones.
3. **PEAL Reuse** — Before creating a new asset, ask "Does PEAL already contain one that performs this function?"
4. **User Experience Consistency** — Folders always behave like folders, boards like boards, monitors like monitors, desks like workspaces.
5. **Environmental Identity** — Each profile is recognizable while still feeling like part of Producer.
6. **Base44 Implementation** — Load Blueprint → Populate PEAL assets → Apply PEAL interactions → Apply PDS philosophy → Implement profile workflows.

---

### Related Producer Systems

- **Producer Design System (PDS)** — Defines how Producer should feel.
- **Producer Environmental Asset Library (PEAL)** — Defines what functional objects exist inside environments.
- **Producer Environment Archetypes (PEA)** — Defines what kind of place an environment is.
- **Environment Blueprints (EB)** — Define how PEAL assets are arranged inside a specific room.
- **Production Profiles** — Combine archetypes into complete creative workflows.

---

*Source: `7e3269c00_PEA.docx` — saved to the project on 2026-07-03.*