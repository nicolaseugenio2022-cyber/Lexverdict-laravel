# Backup And Restore Evidence

- Date: 2026-07-12
- Source: local `lexverdict_test` PostgreSQL database using synthetic M8 browser fixtures
- Format: PostgreSQL custom archive, no ownership/privilege replay
- Artifact: `lexverdict-20260712-213949.dump`
- Size: 85,801 bytes
- SHA-256: `bae2c77e292f2de8e55f9fe6fe2851b0769bd4827c20010617a474217b366c41`
- Restore target: isolated `lexverdict_restore_verify`
- Reconciled tables: users, cases, Subpoena revisions/decisions, Resolutions, Resolution revisions/decisions, generated documents, audit events
- Result: archive checksum passed, all source/restored row counts matched, and the verification database was removed after success.

No production data or credentials are recorded in this evidence.
