# AGENTS.md

# LexVerdict AI Engineering Contract

This document defines the permanent execution rules for AI coding agents working on the LexVerdict repository.

Unless the user explicitly overrides these rules, follow this document.

---

Version: 1.0

Last Updated: 2026-07-29

---

# Default Execution Mode

Use **Master Developer Col** as the primary engineering agent.

Do not instantiate reviewer agents automatically.

Only use specialized reviewer agents when the user explicitly requests them or when the task genuinely requires expertise outside the Master Developer role.

---

# Project

LexVerdict is a modernization of the Office of the Provincial Prosecutor Case Management System.

Technology Stack

- Laravel
- React
- Inertia.js
- TypeScript
- PostgreSQL

The existing implementation, approved architecture, and established business rules are authoritative.

---

# Stable Project Architecture

## Architecture

- Laravel backend
- React + Inertia frontend
- PostgreSQL relational database
- Server-driven pages through Inertia
- Role-based authorization
- Service-oriented domain logic
- Presentation separated from business logic

Business logic belongs in the backend.

Frontend code is responsible for presentation, interaction, and accessibility only.

---

## Domain Principles

Business rules are authoritative.

Presentation helpers may derive labels for display, but they must never invent or alter business meaning.

Examples:

- Area labels
- Target Type labels
- Report Scope summaries

must always be deterministic and derived from existing data.

---

## Reporting

Reports are generated from approved report services.

Do not:

- change calculations
- invent metrics
- invent KPIs
- change aggregation rules

Presentation improvements are acceptable.

Calculation changes require explicit approval.

---

## Audit History

Audit records are append-only evidence.

Never:

- infer missing values
- hide raw identifiers
- alter audit meaning

Derived presentation labels must remain deterministic.

Raw stored values remain authoritative.

---

## Authorization

Authorization is enforced by the backend.

Frontend improvements must never weaken:

- Policies
- Gates
- Permissions
- Administrator-only functionality

---

# Engineering Philosophy

Prioritize:

- Correctness
- Maintainability
- Accessibility
- Deterministic behavior
- Incremental delivery
- Evidence-based improvements

Do not create work simply because a roadmap exists.

If inspection shows an area already satisfies enterprise requirements, explicitly recommend no implementation.

---

# Standard Development Workflow

Unless instructed otherwise:

1. Inspect
2. Plan
3. Implement
4. Verify
5. Report

Large work should be divided into small acceptance slices.

Avoid unrelated improvements.

---

# Business Rules

Never invent:

- Legal terminology
- DOJ workflows
- Authorization rules
- Case statuses
- Report calculations
- Domain concepts
- Business processes

Preserve canonical terminology.

Presentation improvements must never alter business behavior.

If business behavior must change, stop and request confirmation.

---

# Backend Protection

Frontend-only work must not modify:

- Controllers
- Form Requests
- Policies
- Gates
- Domain Services
- Business Logic
- Routes
- Database Schema
- Migrations
- Seeders
- Contracts
- API Interfaces

If implementation requires backend changes, stop and report before proceeding.

---

# Frontend Principles

Prefer:

- Deterministic helper functions
- Presentation-only derived values
- Semantic HTML
- Accessible components
- Reusable local utilities
- Existing design tokens
- Existing component patterns

Avoid redesigning pages when targeted improvements are sufficient.

Do not introduce dependencies unless explicitly requested.

---

# Browser Behavior

Preserve:

- Browser history
- URL behavior
- GET parameter names
- GET serialization
- Pagination
- Filtering
- Sorting
- Scroll behavior
- Export URLs

Local component state must never change submitted server state until the user explicitly submits.

---

# Accessibility

Maintain or improve accessibility.

Prefer:

- Semantic HTML
- Keyboard-first interaction
- Visible focus indicators
- Appropriate ARIA usage
- Responsive layouts

Never reduce existing accessibility.

---

# Performance

Do not optimize speculatively.

Performance improvements require evidence.

Avoid unnecessary rendering, requests, or complexity.

---

# Verification

Choose verification proportional to the scope.

Typical frontend verification includes:

- Targeted formatting
- ESLint
- TypeScript
- Production build
- Relevant PHPUnit tests
- Relevant PostgreSQL tests
- Focused Playwright tests
- Cross-role Playwright regression when warranted
- Accessibility checks
- Responsive verification
- git diff --check

Frontend-only work should confirm protected backend files remain unchanged when appropriate.

---

# Execution Reporting

Keep progress updates concise.

Only report:

- Material decisions
- Scope deviations
- Blocking issues
- Final verification

Final implementation reports should include:

- Changed
- Verification
- Deviations
- Remaining Risks

Do not narrate routine file reads or successful intermediate commands.

---

# Source of Truth

The existing implementation is authoritative.

Do not infer missing data.

Do not fabricate values.

Use deterministic presentation helpers and neutral fallbacks instead of guessing.

---

# Git

Unless explicitly instructed:

- Do not commit.
- Do not push.
- Do not create pull requests.
- Do not modify unrelated files.
- Preserve the current dirty working tree.

---

# Scope Control

Stay within the approved scope.

Do not expand implementations beyond the approved acceptance slice.

If completing the requested work requires:

- backend changes
- business rule changes
- contract changes
- shared architectural changes
- dependency changes
- database schema changes
- fixture changes

stop immediately.

Explain why.

Do not expand scope without explicit approval.

---

# Documentation

Do not modify documentation unless explicitly requested.

Do not modify Commands, AI Context, or Business Rules maintained outside this repository.

---

# External Vault Usage

An external Obsidian AI Development Vault may be available alongside this repository.

Do not read or rely on the external vault unless it is available in the current workspace and the current task requires it.

When external vault knowledge is needed:

- Load only the smallest relevant note or section.
- Do not scan the entire vault.
- Do not load unrelated folders.
- Reuse already-loaded context instead of re-reading unchanged notes during the same task.

Known vault organization (load only when required):

- Knowledge/
- Commands/
- AI Context/
- Business Rules/

Use the external vault primarily for:

- reusable engineering knowledge
- architecture guidance
- coding standards
- shared development workflows
- updating shared knowledge

Do not use the external vault to override:

- repository-specific business rules
- implementation decisions
- explicit user instructions

If the required vault information cannot be identified confidently, request clarification or inspect only the smallest likely set of notes.

---

# Context Loading Strategy

Minimize context usage.

Prefer the following order of authority:

1. Current user instructions
2. Existing repository implementation
3. AGENTS.md
4. Project-local documentation
5. One specific relevant vault note
6. Additional vault notes only when required

Do not:

- preload the external vault
- scan entire vault folders
- repeatedly reload unchanged context
- expand context beyond the current task

Only load additional context when it materially improves correctness or when explicitly requested.

---

# Prompt Interpretation

Unless explicitly overridden by the user:

- Treat this AGENTS.md as the authoritative execution contract for the repository.
- Apply the Standard Development Workflow automatically.
- Apply the appropriate Verification requirements automatically based on the implementation scope.
- Do not repeat permanent rules in implementation plans or responses.
- Focus prompts on phase-specific objectives, scope, acceptance criteria, and unique constraints.
- Keep progress updates concise and report only material decisions, deviations, blockers, and final verification.

---

# Guiding Principle

Make the smallest correct change that satisfies the approved requirements while preserving:

- architecture
- business rules
- accessibility
- performance
- maintainability
- backward compatibility

When multiple valid implementations exist:

- prefer the least invasive solution
- preserve existing patterns
- minimize regression risk
- avoid speculative improvements

Do not manufacture work.

If inspection shows the current implementation already satisfies enterprise requirements, explicitly recommend no implementation.