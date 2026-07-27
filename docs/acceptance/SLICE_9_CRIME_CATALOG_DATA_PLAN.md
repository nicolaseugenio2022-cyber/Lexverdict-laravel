# Slice 9 Philippine Crime Catalog Data Plan

## Purpose And Limitation

Slice 9 adds a reviewed initial Crime catalog derived from the current amended Revised Penal Code (RPC). It is an operational starting catalog, not legal advice and not a representation that every offense under Philippine law is included. Special penal laws are excluded unless a later owner-approved, source-reviewed catalog expansion adds them.

The catalog requires review and validation by the project owner and the responsible legal office before production use.

## Authoritative Sources

The source hierarchy is:

1. Supreme Court E-Library publication of Act No. 3815, Book Two, for the base RPC article headings and offense names: <https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/28/20426>
2. Supreme Court E-Library publications of amendatory or repealing laws, including:
   - Republic Act No. 6968 (coup d'etat): <https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/1485>
   - Republic Act No. 8353 (rape moved to Articles 266-A and 266-B): <https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/4301>
   - Republic Act No. 10158 (vagrancy decriminalized; Article 202 retained for prostitution): <https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/37489>
   - Republic Act No. 10655 (Article 351 repealed): <https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/61160>
   - Republic Act No. 10951 (RPC value and fine adjustments): <https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/78880>
   - Republic Act No. 11594 (Articles 183 and 184): <https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/93879>
   - Republic Act No. 11648 (Article 266-A): <https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/94255>
   - Republic Act No. 11926 (Articles 155 and 254): <https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/95589>
   - Republic Act No. 7659 (Article 320 Destructive Arson): <https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/1787>
   - Presidential Decree No. 1613 (repeal of Articles 321 to 326-B): <https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/26/14872>
   - Batas Pambansa Blg. 186 (Article 341): <https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/14712>

Arbitrary websites, model recollection, unverified compilations, and scraped offense lists are not sources.

## Inclusion Boundary

- Include Book Two RPC offenses with an identifiable offense heading or expressly punishable conduct.
- Use the statutory heading as the Crime Name where it is a usable catalog label.
- Split clearly distinct offenses in one article only when the statute itself names those distinct offenses.
- Include amended RPC offenses under their current article and current statutory name.
- Exclude Book One general provisions, penalty-only provisions, definitions that do not create an offense, civil provisions, and repealed offenses.
- Exclude special-law offenses from this initial seed, even when commonly prosecuted, until their own authoritative-source review is approved.
- Do not infer offense variants, qualifying circumstances, compound crimes, or colloquial aliases as separate catalog entries.

## Record Fields

Each reviewable source record contains:

| Field | Meaning |
| --- | --- |
| `canonical_key` | Stable lowercase key, normally `rpc:<article>:<slug>`, independent of the database UUID |
| `name` | Current statutory Crime Name used by the application |
| `law_reference` | Act No. 3815 article reference and applicable amendatory law |
| `source_url` | Authoritative Supreme Court E-Library source |
| `source_note` | Amendment, repeal, grouping, or inclusion note needed for review |

The seed preserves existing UUIDs. It first matches a persisted canonical key, then may adopt an exact case-insensitive existing name. Uncertain matches are left unchanged and are reported instead of renamed or deleted.

## Amendment, Repeal, Duplicate, And Compound Handling

- **Amended:** use the current statutory name and cite the amendatory law in `law_reference` and `source_note`.
- **Piracy:** Article 122 uses the Republic Act No. 7659 heading that includes Philippine waters.
- **Repealed:** omit the offense from the active seed. Article 351 is explicitly excluded under Republic Act No. 10655.
- **Arson:** retain Article 320 under Republic Act No. 7659 and omit repealed Articles 321 to 326-B under Presidential Decree No. 1613.
- **Partial repeal:** include only the conduct still criminalized. Article 202 is represented as `Prostitutes`, not `Vagrancy`.
- **Moved offense:** use the current location. Rape is represented under Article 266-A, not former Article 335.
- **Duplicate:** one canonical key owns one catalog entry. Existing exact-name entries and explicitly reviewed legacy aliases such as `Estafa` keep their UUID and are linked to that key.
- **Compound or qualified conduct:** retain the statutory article-level label unless the statute expressly establishes separately named offenses.
- **Uncertain:** do not seed the entry until a cited source and owner/legal-office review resolve it.

## Idempotent Import Behavior

The importer runs in a transaction and upserts by `canonical_key`. Existing exact-name or explicitly reviewed legacy-alias records without a key are adopted without changing their UUID. Multiple recognized matches, conflicting canonical keys, and likely near-matches stop the import with the unresolved names. Existing uncertain records are not renamed, deleted, or merged automatically. Successful command-line imports report inserted, adopted, updated, and unresolved counts. Re-running the importer produces no duplicate canonical records.

Administrator edits detach the record from its canonical source metadata. This prevents an office-edited name or Law Reference from continuing to claim provenance from a statutory source that no longer matches the stored values.

The importer never deletes entries that are absent from a later source file. Removal or replacement requires a separately reviewed catalog change so existing Case references and historical labels remain intact.

## Maintenance Process

1. Identify a new or amendatory law in an authoritative government source.
2. Record the source and proposed catalog changes in this plan or a successor review note.
3. Update the separate reviewable seed dataset, preserving canonical keys for unchanged concepts.
4. Add tests for idempotency, UUID preservation, amendment handling, and conflicting existing records.
5. Obtain project-owner and legal-office validation before production import.
6. Run the importer first in a non-production database and review its inserted, adopted, updated, and unresolved counts.

## Slice 9 Review Boundary

The Slice 9 dataset is limited to the source-verifiable RPC entries described above. It does not claim completeness across special penal laws. Any unresolved entry is omitted and documented rather than guessed.
