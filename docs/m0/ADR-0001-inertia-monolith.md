# ADR-0001: Laravel Inertia Modular Monolith

## Status

Accepted for M0 baseline.

## Decision

LexVerdict will use a Laravel modular monolith with Inertia, React, TypeScript, Vite, and Tailwind CSS.

## Rationale

This keeps authentication, authorization, CSRF protection, validation, and privileged database access inside Laravel while allowing a modern React staff interface.

## Domain Preservation Impact

This is an implementation architecture decision only. It does not rename, merge, split, or reinterpret any legacy business concept, status, verdict, role, document, interaction, or workflow.
