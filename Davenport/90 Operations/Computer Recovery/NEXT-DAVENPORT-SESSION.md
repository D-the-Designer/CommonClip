# Next Davenport Session

This is the short, visible queue for decisions and features to resume when work on Davenport continues. It is a planning list, not a record of completed system changes.

## Davenport Writer — proposed major capability

Build a local-first, modular AI-assisted word processor for manuscripts, notes, scripts, and mail drafts.

First version:

- portable authored files, not a proprietary database or model session as the only copy;
- selected-text commands for **Rewrite**, **Expand**, **Shorten**, **Continue**, **Describe**, **Dialogue**, **Change tone**, and custom instructions;
- a diff preview before applying AI output, with **Keep original**, **Replace**, **Insert below**, and **Try again**;
- immutable snapshots or reviewable revisions for every accepted AI change;
- explicit, inspectable context selection: current selection, scene, project/lore entries, and any Davenport references;
- local generation through KoboldAI/KoboldCpp or Ollama first, with an explicit opt-in route to cloud models only when desired.

Design boundary:

- Writer is an interface and composition module; Davenport remains the owner of canonical files, metadata, and history.
- Its feature modules—editor, lore/context, model provider, revision history, and export—must remain replaceable.

## Davenport Post — future handoff

Define a mail/delivery module that accepts a dragged or selected Writer draft as a reviewable copy or reference. It must not remove or silently alter the source manuscript. Recipient, account, and delivery data remain operational data, and sending must always require explicit user approval.

## Before building

1. Decide the initial portable source formats (Markdown first; DOCX and Fountain support strategy).
2. Choose the first local provider to test: KoboldCpp/KoboldAI or Ollama.
3. Sketch the first screen: project/lore panel, editor, AI command sidecar, and revision diff.
4. Define a small on-disk project layout and test it on one noncritical writing project.

See [WRITER-APP-UX-SPEC-0.1.md](WRITER-APP-UX-SPEC-0.1.md) for the UX/build specification and [DAVENPORT-STANDARD-0.1.md](DAVENPORT-STANDARD-0.1.md#10-davenport-writer-and-composition-modules) for the compatibility rules.
