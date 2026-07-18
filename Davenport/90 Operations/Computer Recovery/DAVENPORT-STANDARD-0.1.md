# Davenport Standard 0.1

**Status:** Draft for pilot use

## 1. Purpose and scope

Davenport is a human-operable, filesystem-native library for documents, media, project context, and creative canon. This standard defines the minimum structure and safety behavior required before larger-scale ingestion.

It applies to the canonical library and its metadata. It does not prescribe an application, database, shell, cloud provider, or AI model.

## 2. Core rules

1. A person can find, open, copy, move, and restore canonical files using ordinary filesystem tools.
2. A canonical original is never renamed, moved, overwritten, or deleted solely by an AI, contact-sheet, catalog, or deduplication process.
3. Every ingest begins as a copy. Source deletion is a separate, explicit, post-verification decision.
4. AI-generated descriptions, thumbnails, embeddings, summaries, and indexes are derived data. They are replaceable and rebuildable.
5. Filesystem changes made outside a Davenport tool remain valid. Reconciliation must detect and report changes rather than treating the library as corrupt.
6. No cloud provider, model, or proprietary application is required to read the canonical library.

## 3. Library structure

The target top-level layout is:

```text
Davenport/
  00 Inbox/
  10 Projects/
  20 Worlds and IP/
  30 Clients and Partnerships/
  40 Knowledge/
  50 Media Library/
  60 Brand Systems/
  70 Exports and Deliverables/
  80 Archives/
  90 Operations/
```

`00 Inbox` is the only default destination for unclassified ingest. Classification is a reviewed operation, not an automatic side effect of upload, scanning, or AI analysis.

`90 Operations` contains manifests, ingest reports, audit logs, generated catalogs, contact sheets, and documentation. It must not be the only location of a canonical original.

## 4. Canonical, metadata, and derived data

| Class | Definition | Preservation rule |
| --- | --- | --- |
| Canonical original | The user-designated source file or directory retained as the authoritative copy in Davenport. | Preserve bytes and provenance; deliberate user-approved changes only. |
| Portable metadata | Human- and machine-readable facts that travel with a canonical item. | Store as a JSON sidecar where practical; never make the original unreadable without it. |
| Operational record | Ingest reports, manifests, audit entries, and reconciliation results. | Store under `90 Operations`; append or version rather than silently replace. |
| Derived data | Thumbnails, previews, OCR, summaries, embeddings, contact sheets, and AI suggestions. | Keep separate from originals; rebuildable and disposable. |
| Cache | Local performance data created by a tool. | Never treat as canonical or backup material. |

## 5. Identity and metadata

### Stable ID

Each ingested item receives a stable Davenport ID in the form `dvn_<UUIDv7>`. The ID is not derived from the filename or location.

The first ingest record binds the ID to:

- SHA-256 checksum of a file, or a deterministic directory manifest checksum;
- original host path, exactly as observed;
- ingest date and operator;
- source context, such as Downloads, Desktop, a cloud location, or an external volume.

If an item is renamed or moved, its ID remains unchanged. If a file changes bytes, it becomes a new version or a new item; the prior checksum must remain in history.

### Sidecars

For a single canonical file, the portable sidecar convention is:

```text
<filename>.<extension>.davenport.json
```

For a canonical directory, use:

```text
<directory>/.davenport.collection.json
```

Sidecars should contain only durable facts: stable ID, checksums, provenance, rights/sensitivity notes, human-authored description, approved tags, and relationships. They must not contain credentials, API keys, model sessions, or private prompts.

Sidecars may be missing during early pilot ingest. Their absence is a reconciliation condition, not permission to alter or discard an original.

## 6. Required operations

| Operation | Required behavior |
| --- | --- |
| `ingest` | Copy source into `00 Inbox`; calculate manifest/checksum; record source path; never delete source. |
| `verify` | Compare source and destination byte checksums or deterministic directory manifests; report pass, failure, and unreadable paths. |
| `move` | Move a verified canonical item only after a dry-run report identifies the stable ID, old path, new path, and collision result. |
| `reconcile` | Scan the filesystem and report moved, renamed, missing, changed, and untracked items. Never silently rewrite canonical metadata. |
| `catalog` | Generate an index or contact sheet from canonical files and metadata; write only derived data under `90 Operations`. |
| `archive` | Produce a verified copy plus manifest; record destination and checksum. Archive is not deletion. |
| `restore` | Restore a copy to a new location, verify checksums, and report any conflicts. |

Every operation must support a dry run before a material change, emit a human-readable report, and preserve the original observed path in its audit record.

## 7. Collisions, duplicates, and versions

- A filename collision never authorizes overwrite.
- An exact checksum match is an **exact duplicate candidate**, not an automatic deletion.
- Similar media, alternate exports, resized images, and transcoded audio/video are **related-version candidates**, not duplicates by default.
- When a destination name collides, retain both files with a deterministic disambiguator and flag the item for review.
- The user decides which item is canonical, which is a version, and which—if any—may be retired.

## 8. AI access boundary

Every AI workflow declares one of three scopes:

- **Local-only:** files and derived data remain on the Mac.
- **Cloud-enabled:** only named collections and approved derivative/context data may leave the Mac.
- **Hybrid:** local extraction/cataloging with explicitly selected cloud requests.

AI may read in-scope originals and write proposals or derived data. AI must not directly rename, move, overwrite, delete, or reclassify canonical originals without an explicit reviewed operation.

Human corrections are durable metadata. Model output is attributed with model, date, prompt purpose, collection scope, and review state.

## 9. Portability requirements

- Use UTF-8 names where supported; preserve original filenames in metadata.
- Do not assume case-sensitive filesystems, POSIX paths, extended attributes, resource forks, symlinks, or a particular cloud mount.
- Prefer SHA-256 manifests and JSON sidecars to platform-specific identifiers.
- Record unsupported attributes or failed copies in the report; do not silently omit them.
- The library must remain usable on macOS, Linux, and Windows with ordinary file tools.

## 10. Davenport Writer and composition modules

**Davenport Writer** is a proposed local-first composition application, not a replacement for the canonical library. It may use a local model (including KoboldAI/KoboldCpp or Ollama) and, only through an explicit cloud-enabled request, a cloud model. It is designed for manuscripts, notes, scripts, mail drafts, and other authored text.

Its minimum safeguards are:

- authored source remains an ordinary, portable file in Davenport or in a user-selected working location; the application must not make a model session or proprietary database the only copy;
- every AI rewrite, expansion, continuation, or transformation shows a proposed result before acceptance, with options to keep the original, replace the selection, insert the result, or try again;
- accepted AI output creates a reviewable revision or snapshot; no AI action silently overwrites authored text;
- the exact source/context items sent to an AI are inspectable, including the selected text, project/lore references, model, date, operation, and local/cloud scope;
- context selection is explicit. Canonical Davenport material is never automatically sent to a cloud model;
- features are modular and replaceable: editor, project/lore context, generation provider, revision history, and export/delivery integrations do not own the canonical source.

### Davenport Post boundary

**Davenport Post** is a future delivery/composition module. Davenport Writer may pass or drag a selected draft into Post, but the handoff must create a reviewable copy or reference; it must not remove or mutate the Writer source. Post may add recipient, delivery, and account-specific data, which is operational data rather than canonical manuscript content. Sending mail always remains a separate explicit user-approved action.

## 11. Minimum pilot exit tests

M3 may begin when a small collection can demonstrate all of the following:

1. Ingest copied the sample without deleting the source.
2. A manifest verified the copy.
3. A normal Finder/Terminal rename or move was detected by reconciliation.
4. A generated catalog or contact sheet linked back to the correct original.
5. The same collection could be inspected by two different AI models without modifying canonical originals.
6. A restore copy passed checksum verification.

## 12. Compatibility decision

A tool, script, application, or AI workflow is Davenport-compatible only if it follows the core rules, preserves canonical originals, separates derived data, emits reviewable results, and allows recovery from ordinary filesystem copies plus manifests.
