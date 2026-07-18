# Writer App UX Specification 0.1

**Status:** Product/UX draft
**Working name:** Writer
**Positioning:** A reskinnable, local-first writing application with modular AI assistance, portable projects, and optional Davenport compatibility.

## 1. Product promise

Writer is a word processor and composition workspace—not a chat interface with a text box. A person writes and owns a portable project; AI models propose text; accepted work is reviewable; exports and delivery workflows create copies rather than replacing the source.

```text
Writer owns the editing experience.
The user owns the source files.
Models propose text.
Exports and Post deliver copies.
```

## 2. Experience principles

1. **Writing stays primary.** The editor is the visual center of the application; AI is a command surface, not the main canvas.
2. **No invisible replacement.** Every AI transformation is previewed before it changes text.
3. **Context is visible.** A user can always see the model, operation, files/context sent, and whether the request stays local.
4. **A project survives the application.** Projects use ordinary, documented files; no database, chat session, or vendor account is the only copy.
5. **One app, many intelligences.** Local and cloud models are replaceable providers, selected per task.
6. **Neutral by default.** The core is reskinnable for a personal, client, worldbuilding, editorial, or Davenport-compatible presentation.

## 3. Core jobs

- Draft, edit, structure, and revise writing.
- Ask one or more AI models to generate, insert, rewrite, expand, continue, shorten, critique, or transform text.
- Maintain a project’s optional lore, style guide, outline, source notes, and reference files.
- Export the work in common formats.
- Later, hand a deliberate delivery copy to **Post** for email or other distribution.

## 4. Main workspace

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ File  Edit  View  Insert  Format  Tools  Help                 Project ▾      │
├──────────────────────────────────────────────────────────────────────────────┤
│ Undo Redo | Style ▾ Font ▾ Size ▾ | B I U Color | Align Lists Quote           │
│ ──────────────────────────────────────────────────────────────────────────── │
│ Rewrite ▾  Expand  Continue  Shorten | Insert from AI | Model: Local Qwen ▾  │
│ Context: Scene + Lore ▾ | Privacy: Local-only ▾ | Revisions ▾ | Export ▾     │
├────────────────┬───────────────────────────────────┬─────────────────────────┤
│ Project         │ Editor                            │ AI sidecar              │
│                 │                                   │                         │
│ Manuscript      │ Chapter / scene / document        │ Task / chat             │
│ Outline         │                                   │ Selected model          │
│ Lore & style    │                                   │ Context sent            │
│ Sources         │                                   │ Proposed output         │
│ Versions        │                                   │                         │
└────────────────┴───────────────────────────────────┴─────────────────────────┘
```

The project panel and AI sidecar may be collapsed. A minimal skin can show a familiar document editor; a power skin can expose context, model-routing, and revision controls continuously.

## 5. Format and AI command bar

The format bar has two stable layers.

### Standard editing layer

- undo / redo;
- document style, font, size, bold, italic, underline, color;
- paragraph alignment, lists, indentation, quotation, links, and comments;
- insert commands for headings, page breaks, images, tables, references, and attachments as formats mature.

### AI command layer

| Control | Default behavior |
| --- | --- |
| **Rewrite** | Improve selected text while preserving meaning unless a subtype is chosen. |
| **Expand** | Add material from a selected beat or passage while keeping POV, tense, and project constraints. |
| **Continue** | Generate after the cursor using selected context. |
| **Shorten** | Condense selected text while retaining the requested action, facts, and emotional turn. |
| **Insert from AI** | Open the sidecar/chat and insert a chosen response at the cursor or into a new document. |
| **Model** | Choose a provider/model or accept a suggested route; users can always override. |
| **Context** | Reveal and select exactly what is included in a request. |
| **Privacy** | Declare local-only, cloud-enabled, or hybrid scope before generation. |
| **Revisions** | Browse snapshots and compare accepted transformations. |
| **Export** | Export the current document or an explicitly selected delivery copy. |

## 6. AI interaction patterns

### 6.1 Rewrite, expand, shorten, and tone changes

1. User selects text and chooses an AI command.
2. Writer shows the operation, model, context, and privacy scope before submission; the user may adjust them.
3. The result opens in a diff preview.
4. The user chooses **Keep original**, **Replace**, **Insert below**, or **Try again**.
5. Any accepted change produces a revision record.

```text
Original                         Proposed
──────────────────              ──────────────────
Selected source text             AI result

[Keep original] [Replace] [Insert below] [Try again]
```

Rewrite subtypes may include clearer, stronger, more literary, simpler, change tone, dialogue pass, description pass, genre/voice preset, and custom instruction. Defaults must not claim to preserve a writer’s unique voice perfectly; the UI should say what was requested, not what is guaranteed.

### 6.2 Generate and chat

The AI sidecar supports ordinary chat, but a response is not part of the manuscript until the user deliberately inserts it. Insertion options are **At cursor**, **Below selection**, **New document**, and **Copy**.

The sidecar can work from the current selection, active scene, outline, lore cards, style guide, attached sources, or user-selected Davenport references. A collapsed summary always identifies the number and names of included context items.

### 6.3 Model routing

The app can suggest a route but never hides it:

| Task | Suggested starting route | Reason |
| --- | --- | --- |
| Private notes, summaries, outlines | Local Qwen/Ollama | Private and inexpensive. |
| Unconstrained creative variants | Local Kobold/Dolphin | Local exploratory work. |
| Broad cloud brainstorming and first-pass critique | Kimi | Low-cost cloud option. |
| Fine prose and developmental editing | Claude | Optional quality-focused pass. |
| Complex project analysis, implementation, and verification | GPT Sol/Codex | Optional high-reliability/tool-assisted pass. |

Suggestions are defaults, not claims of model superiority for every writer or genre. The model picker displays provider, model, expected scope, and whether any selected context leaves the device.

## 7. Project and file model

Writer projects should remain inspectable with ordinary file tools. Initial support:

- **Primary authored source:** Markdown and plain text.
- **Import/export:** Markdown, TXT, DOCX, PDF, and HTML.
- **Planned script support:** Fountain.
- **Project resources:** ordinary folders for outline, lore, notes, source material, attachments, and generated exports.
- **Revision data:** append-only snapshots/diffs stored separately from the current authored source.

A simple initial layout:

```text
My Project/
  manuscript/
  outline/
  lore/
  sources/
  revisions/
  exports/
  writer-project.json
```

`writer-project.json` is optional project metadata and must not be required to open or retain the text. It may record document order, display settings, linked references, and non-secret provider preferences. Secrets and cloud credentials must use the operating system’s secure storage, never the project folder.

## 8. Revisions and provenance

Writer records a revision on manual snapshots and on every accepted AI change. A revision must identify:

- source document and position/selection;
- operation and user instruction;
- provider/model/version when available;
- local-only, cloud-enabled, or hybrid scope;
- names/IDs of context items sent;
- timestamp and acceptance choice;
- before/after text or a reversible diff.

This record supports recovery, comparison, and later attribution without making a model’s chat history canonical.

## 9. Export and Davenport Post

**Export** produces a named output copy. It never silently converts or replaces the source document.

Future **Post** integration is a handoff, not a mail client embedded in the editor’s core:

1. User selects a draft or selection and chooses **Send to Post**.
2. Writer creates a reviewable copy/reference with source provenance.
3. Post adds subject, recipients, delivery formatting, and account-specific metadata.
4. Sending remains a separate explicit approval.
5. The original Writer document remains unchanged.

## 10. Davenport compatibility

Writer may be used independently. In a Davenport setup, it is compatible when it follows the Davenport Standard:

- authored files and exports remain portable;
- canonical source is never silently renamed, moved, overwritten, or deleted by AI;
- AI output and previews are derived/revision data, separated from originals;
- cloud context is explicitly selected and declared;
- linked Davenport references use stable identifiers when available;
- Writer and Post do not become the only path to open, copy, back up, or restore authored work.

The app is **Davenport-compatible**, not Davenport-branded. Themes, names, terminology, and modules may be reskinned without affecting these behaviors.

## 11. First release boundary

### Include

- one-project editor with Markdown/TXT source;
- standard formatting and basic document structure;
- project panel for documents, outline, lore, and sources;
- local model connection; one cloud-provider adapter behind explicit consent;
- chat, generate/insert, rewrite, expand, continue, and shorten;
- diff preview and revision snapshots;
- Markdown/TXT export plus one initial rich-format export;
- theme tokens and collapsible panels.

### Do not include yet

- automatic ingestion or bulk changes to Davenport;
- autonomous emailing or delivery;
- collaborative real-time editing;
- hidden automatic model routing;
- full desktop publishing, advanced page layout, or an embedded database as the primary storage layer.

## 12. Build decisions to make next

1. Pick the initial application form: native desktop, local web application, or editor extension.
2. Confirm the first rich-format representation and DOCX strategy.
3. Choose the first local provider integration: Ollama, KoboldCpp/KoboldAI, or both.
4. Define the revision file format and retention policy.
5. Create a clickable wireframe for the editor, context chooser, and diff preview before implementation.
