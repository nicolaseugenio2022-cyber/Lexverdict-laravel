# ADR-0005: Private Document Storage

## Status

Accepted for M0 baseline.

## Decision

Generated legal documents will be private, versioned, checksummed, and served only after Laravel authorization through streaming or short-lived URLs.

## Rationale

Subpoena PDFs and reports contain legal and personal data. Private storage prevents direct public access and supports auditability.

## Domain Preservation Impact

This changes storage and access control only. Document names, wording, signature/seal requirements, and print layouts remain blocked until approved legal samples are provided.
