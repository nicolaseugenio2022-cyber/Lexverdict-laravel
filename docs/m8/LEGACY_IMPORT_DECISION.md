# Legacy Import Decision

The project owner confirmed that the identified legacy data is mock data only and should not be migrated:

- 119 Subpoenas
- 106 Resolutions
- 10 denial comments
- 687 audit log rows

The approved approach is a clean PostgreSQL production database and new mock data only after system completion. M8 therefore does not create or rehearse an import command. This avoids inventing mappings for unavailable legacy SQL views and prevents mock legal history from entering production.
