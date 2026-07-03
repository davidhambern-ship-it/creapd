# BASE44 SYSTEM UPDATE

# Producer Core AI System

# Voice Package (VP)

## Core Specification v1.0

---

# Primary Instruction

Implement the **Voice Package (VP)** as a Producer Core AI System.

The Voice Package is the standardized narration asset generated whenever a teleprompter script is converted into speech.

The Voice Package becomes the **authoritative timing source** for all Producer systems that depend on narration.

Future systems such as the AI Presentation Director, Caption Generator, Subtitle Generator, Translation Engine, Clip Generator, and Voice Dubbing must consume the Voice Package rather than independently analyzing audio.

---

# Core Philosophy

The Voice Package is not simply an audio file.

It is a complete narration dataset describing:

* What was spoken
* How it was spoken
* When it was spoken
* How long it lasted
* Where pauses occur
* The rhythm and pacing of the narration

The Voice Package becomes the master production clock for every presentation.

---

# Automatic Generation

Whenever a Teleprompter Script is approved:

```text
Teleprompter Script
        ↓
Voice Generation
        ↓
Voice Package Generation
        ↓
Voice Package
```

The Voice Package must be generated automatically.

No additional producer interaction should be required.

---

# Voice Package Structure

Every Voice Package must contain the following assets.

---

## Voice Audio

The final generated narration.

Supported formats:

* MP3
* WAV
* AAC (future)

---

## Teleprompter Script

The original script used to generate the narration.

This script should remain immutable unless intentionally regenerated.

---

## Transcript

A plain-text transcript of the spoken narration.

Purpose:

* Search
* Accessibility
* Caption generation
* Indexing

No timestamps required.

---

## Timestamped Transcript

The transcript with readable timestamps.

Example:

```text
00:00  Welcome to today's broadcast...

00:08  Our top story today...

00:15  Let's begin...
```

Purpose:

* Editing
* Navigation
* Producer review

---

## Sentence Timeline

Each sentence must include:

* sentence_id
* sentence_text
* start_time
* end_time
* duration

Example:

```yaml
Sentence:

id: 14

text:
Today's top story...

start:
00:14.200

end:
00:20.950

duration:
6.75
```

The Sentence Timeline is the **primary timing source** used by the AI Presentation Director.

---

## Word Timeline

Each spoken word must include:

* word
* start_time
* end_time
* confidence_score

Example:

```yaml
word:
discipleship

start:
00:18.20

end:
00:18.82

confidence:
99.7%
```

Purpose:

* Word highlighting
* Precise animations
* Caption synchronization
* Accessibility
* Future lip-sync support

---

## Paragraph Timeline

Each paragraph includes:

* paragraph_id
* start_time
* end_time
* duration

Purpose:

* Slide planning
* Chapter markers
* Section transitions
* Presentation segmentation

---

## Pause Timeline

Detect meaningful pauses.

Each pause includes:

* pause_start
* pause_end
* duration
* pause_type

Supported pause types:

* Sentence Pause
* Paragraph Pause
* Dramatic Pause
* Natural Breath Pause

The AI Presentation Director should use pauses as opportunities for transitions and visual emphasis.

---

## Voice Metadata

Store:

* Voice ID
* Voice Name
* Voice Provider
* Language
* Accent
* Speaking Style
* Emotion
* Pitch
* Speed
* Generation Engine
* Generation Date

This metadata allows future regeneration using identical voice settings.

---

## Runtime Statistics

Automatically calculate:

* Total Runtime
* Total Words
* Total Sentences
* Total Paragraphs
* Words Per Minute
* Average Sentence Duration
* Average Pause Duration
* Reading Level

These values become part of the Production Package.

---

# Producer Systems That Use the Voice Package

The Voice Package becomes the official timing source for:

* AI Presentation Director
* Caption Generator
* Subtitle Generator
* Teleprompter
* Clip Generator
* Translation Engine
* Voice Dubbing
* Future AI Editing Systems

No downstream system should independently analyze narration audio when a Voice Package already exists.

---

# Synchronization Rule

All visual elements must synchronize to the Voice Package.

Examples:

* Text overlays
* Lower thirds
* Images
* Objects
* Animations
* Camera movement
* Ambient effects
* Slide transitions

The Voice Package controls presentation timing.

---

# Editing Rule

Whenever the producer changes:

* Teleprompter Script
* Voice
* Speaking Speed
* Voice Style
* Pronunciation

The Voice Package must automatically regenerate.

Any dependent timelines should automatically update.

---

# Storage Rule

Each Production Package contains one primary Voice Package.

Future alternate narrations may generate additional Voice Packages while preserving the original.

---

# Extensibility

Future enhancements may include:

* Multiple narrators
* Multiple languages
* Character voices
* Emotional narration analysis
* Pronunciation overrides
* Lip-sync metadata
* Facial animation metadata

The Voice Package must remain backward compatible.

---

# Acceptance Tests

The Voice Package is complete only when:

✓ Every narration generates a Voice Package.

✓ Transcript is generated.

✓ Timestamped Transcript is generated.

✓ Sentence Timeline is generated.

✓ Word Timeline is generated.

✓ Paragraph Timeline is generated.

✓ Pause Timeline is generated.

✓ Runtime Statistics are calculated.

✓ Voice Metadata is stored.

✓ Downstream systems use the Voice Package as the authoritative narration source.

---

# Final System Rule

The Voice Package is the heartbeat of every Producer presentation.

It defines the rhythm, pacing, and timing of the production.

Every narration-driven system should synchronize to the Voice Package rather than interpreting raw audio independently.

This guarantees that every presentation produced by Producer feels intentional, synchronized, editable, and professionally directed.

---

## End of Voice Package (VP) Core Specification v1.0