# ADR-0005: Private Document Storage

## Status

Accepted for M0 baseline.

## Decision

Generated legal documents will be private, versioned, checksummed, and served only after Laravel authorization through streaming or short-lived URLs.

## Rationale

Subpoena PDFs and reports contain legal and personal data. Private storage prevents direct public access and supports auditability.

## Domain Preservation Impact

This changes storage and access control only. The project owner approved the validated legacy Python subpoena template and the official assets under `C:\Projects\LexVerdict\static` as the canonical M6 legal sample. Laravel must preserve its document name, wording, structure, field placement, layout, date formatting, return section, and behavior without redesign.
