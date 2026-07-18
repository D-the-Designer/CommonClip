# Computer Recovery and Production Setup

This folder is the home for computer recovery, storage planning, Davenport migration, and local-AI setup.

## Start here

### Current state

- The Mac is being converted into a reliable production machine.
- Terra is handling the first conservative storage cleanup in a separate task.
- Free space improved from approximately 6.3 GB to approximately 15 GB during the initial cleanup period.
- No Time Machine destination is configured.
- There is no verified external Davenport backup yet.
- A clean reinstall is an option, not the current recommendation.

### Current decision

First protect the work, then organize it, then build the AI workflow:

1. Finish and verify cleanup.
2. Establish external backup.
3. Build Davenport ingestion safely.
4. Benchmark the cleaned machine.
5. Establish local AI and Kimi workflows.
6. Reconsider a clean reinstall only if evidence supports it.

## Documents

- [ROADMAP.md](ROADMAP.md) — priorities, recovery strategy, Davenport architecture, and local-AI direction.
- [DAVENPORT-STANDARD-0.1.md](DAVENPORT-STANDARD-0.1.md) — filesystem-native rules for canonical originals, metadata, ingest, verification, reconciliation, and AI access.
- [NEXT-DAVENPORT-SESSION.md](NEXT-DAVENPORT-SESSION.md) — visible resume queue, including the Davenport Writer and future Davenport Post work.
- [WRITER-APP-UX-SPEC-0.1.md](WRITER-APP-UX-SPEC-0.1.md) — UX and product specification for the neutral, Davenport-compatible Writer application.
- [SYSTEM-JOURNAL.md](SYSTEM-JOURNAL.md) — dated technical evidence of what changed, measurements, validation, and rollback notes.

## How this differs from a changelog

The roadmap answers:

- Where are we going?
- What comes next?
- What decisions have we made?

The system journal answers:

- What actually changed?
- When did it change?
- What evidence do we have?
- How could we reverse or diagnose it?

Routine conversation and brainstorming should not be copied into the journal. Only decisions, meaningful system changes, measurements, incidents, and recovery information belong there.

## Future records

Create these only when the corresponding work begins:

- `BACKUP-INVENTORY.md`
- `DAVENPORT-MIGRATION.md`
- `LOCAL-AI-BASELINE.md`
- `RESTORE-CHECKLIST.md`
