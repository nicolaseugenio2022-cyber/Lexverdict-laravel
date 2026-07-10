# ADR-0002: Laravel-Owned Authentication

## Status

Accepted for M0 baseline.

## Decision

Laravel will own staff session authentication, CSRF protection, route middleware, policies, and authorization checks. Supabase is planned as managed PostgreSQL/storage infrastructure, not a browser-side authority for privileged case records.

## Rationale

Legal workflows require server-side role, ownership, assignment, and state checks. Keeping authentication and authorization inside Laravel avoids exposing privileged database credentials or relying on client-side role logic.

## Domain Preservation Impact

This decision changes security implementation, not business meaning. Exact legacy roles remain governed by the approved domain catalog.
