# BASE44 BUILD PROMPT

# Producer Environment Archetypes (PEA)

## Section 8 — Production Profile Composition, Archetype Mapping & Implementation Standards

### Primary Instruction

Production Profiles should not be built from scratch.

Every Production Profile should be composed from one or more Environment Archetypes, using PEAL assets as the building blocks.

This ensures every Producer experience feels unique while remaining part of the same ecosystem.

Producer grows through composition—not duplication.

### Relationship to Producer Architecture

The complete Producer architecture should follow this hierarchy:

```
Producer Design System (PDS)
        ↓
Producer Environmental Asset Library (PEAL)
        ↓
Producer Environment Archetypes (PEA)
        ↓
Environment Blueprint (EB)
        ↓
Production Profile
        ↓
Implementation (Base44)
```

Each document has a unique responsibility.

No document should duplicate another.

### Production Profile Composition Rule

Every Production Profile must declare:

- Primary Archetype
- Secondary Archetypes (if applicable)
- Shared PEAL Assets
- Profile-Specific PEAL Assets
- Environment Blueprints
- Workflow

This creates a predictable and scalable system.

### Current Producer Profile Mapping

#### News Production

- **Primary Archetype:** Newsroom
- **Supporting Archetypes:** Production Studio, Broadcast Studio, Research Department
- **Primary Purpose:** Transform current information into broadcast-ready programming.

#### Cooking Production

- **Primary Archetype:** Studio Kitchen
- **Supporting Archetypes:** Production Studio, Broadcast Studio
- **Primary Purpose:** Transform recipes, techniques, and ingredients into educational and entertaining culinary productions.

#### Talk Production

- **Primary Archetype:** Broadcast Studio
- **Supporting Archetypes:** Production Studio
- **Primary Purpose:** Transform conversations into engaging broadcasts.

#### Spiritual Production

- **Primary Archetype:** Study Center
- **Supporting Archetypes:** Broadcast Studio, Production Studio
- **Primary Purpose:** Transform study, research, and understanding into meaningful lessons and presentations.

#### Sports Production

- **Primary Archetype:** Newsroom
- **Supporting Archetypes:** Broadcast Studio, Production Studio
- **Primary Purpose:** Transform sports information into engaging broadcasts and analysis.

#### Music Production

- **Primary Archetype:** Recording Studio
- **Supporting Archetypes:** Production Studio
- **Primary Purpose:** Transform musical ideas into finished recordings.

### Environment Blueprint Rule

Each Production Profile should create an Environment Blueprint for every archetype it uses.

Example:

```
News Production
    ↓
Newsroom Blueprint
    ↓
Production Studio Blueprint
    ↓
Broadcast Studio Blueprint
```

The Blueprint determines:

- Layout
- Room organization
- Camera positions
- Object placement
- Environmental storytelling

PEAL determines what the objects are.

The Blueprint determines where they live.

### PEAL Reuse Rule

Before creating a new environmental asset, ask:

**"Does PEAL already contain an asset that performs this function?"**

If yes: Reuse it.

Only create new assets when genuinely necessary.

Producer should grow through reuse.

### User Experience Rule

Although environments differ, the producer should never need to relearn Producer.

Examples:

- Folders always behave like folders.
- Boards always behave like boards.
- Monitors always behave like monitors.
- Desks always function as workspaces.

Consistency reduces cognitive load.

### Environmental Identity Rule

Each Production Profile should possess a recognizable identity while still feeling like part of Producer.

The producer should immediately recognize:

- "This is News Production."
- "This is Music Production."
- "This is Spiritual Production."

…without feeling like they have opened an entirely different application.

### Scalability Rule

Future Production Profiles should follow this exact methodology.

Examples:

- Financial Production
- Political Production
- Travel Production
- Gaming Production
- Technology Production
- Science Production

These should compose existing archetypes whenever possible before introducing new ones.

### Base44 Implementation Rule

When implementing a Production Profile:

```
Load the appropriate Environment Blueprint.
    ↓
Populate the environment using PEAL assets.
    ↓
Apply the interactions defined in PEAL.
    ↓
Apply the philosophy defined in the PDS.
    ↓
Implement profile-specific workflows.
```

Base44 should never invent environmental behavior independently.

The documentation should remain the source of truth.

### Design Validation Checklist

Before any Production Profile is considered complete, confirm:

- ✓ Environment matches its assigned archetype.
- ✓ PEAL assets are used consistently.
- ✓ Camera behavior follows PEA standards.
- ✓ Navigation feels architectural.
- ✓ Workflow matches profile purpose.
- ✓ Environmental storytelling communicates identity.
- ✓ The Five ENs are reinforced.
- ✓ Accessibility remains intact.
- ✓ Performance remains excellent.

### Future Growth

As Producer expands, new capabilities should fit naturally into the existing architecture.

The platform should evolve by extending its vocabulary—not replacing it.

Producer should remain recognizable no matter how many Production Profiles are added.

### Acceptance Tests

This document is complete only when:

- ✓ Every Production Profile maps to one or more Environment Archetypes.
- ✓ Environment Blueprints are identified as the next implementation layer.
- ✓ PEAL remains the reusable asset library.
- ✓ PDS remains the philosophical foundation.
- ✓ Base44 has a clear implementation hierarchy.
- ✓ Producer can scale without redesigning its architecture.

### Final System Rule

Producer is not a collection of unrelated applications.

It is a connected creative campus.

Every Production Profile represents a department.

Every Environment Archetype represents a type of workspace.

Every PEAL asset represents a reusable object.

Every producer should feel like they are moving naturally through one unified creative world designed to help them think, create, produce, and publish with confidence.

**End of Producer Environment Archetypes (PEA)**

**PEA Version 1.0 Complete**