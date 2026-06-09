# AGENTS.md

## Purpose

This repository is intended to stay small, understandable, and safe to modify by both humans and coding agents. Optimize for maintainability over cleverness.

## Architecture Rules

- Keep the app modular. Do not place routing, data access, parsing, auth, and templates in one file.
- Prefer a thin route layer and move business logic into focused helper modules.
- Keep persistence logic close to the model layer, not embedded in templates or route handlers.
- Avoid introducing background workers, message queues, or extra infrastructure unless a concrete requirement appears.
- Use server-rendered pages unless a specific interaction clearly justifies JavaScript.

## File Size Guidelines

- Target file size: under 250 lines
- Soft limit: 350 lines
- If a file exceeds the soft limit, split it by concern before adding more behavior
- Keep templates focused; extract shared layout and repeated fragments

## Function and Class Guidelines

- Prefer short functions with a single responsibility
- Split complex conditionals into named helpers
- Keep route handlers focused on:
  - reading input
  - calling a service/helper
  - returning a response
- Avoid hidden side effects

## Data and Validation Rules

- Validate all admin input on the server
- Normalize config text before duplicate checks
- Never trust client-side filtering or UI-only constraints
- Use explicit allowlists for supported admin actions

## Security Rules

- Store admin credentials as hashes only
- Protect all admin routes with authentication
- Use POST for state-changing actions
- Add CSRF protection to admin forms
- Avoid logging secrets, session values, or raw passwords
- Treat subscription tokens as secrets

## Database Rules

- Keep schema simple and explicit
- Use foreign keys and uniqueness constraints where appropriate
- Prefer additive schema changes
- If schema complexity grows, introduce a migration workflow instead of startup-only table creation

## UI Rules

- Prioritize clarity over decoration
- Keep admin screens task-oriented:
  - manage users
  - manage configs
  - inspect logs
- Avoid heavy frontend frameworks for simple CRUD pages

## Testing Rules

- Add or update tests for every behavior change
- Cover parsing, auth guards, subscription output, and per-user exclusions
- Prefer fast unit/integration tests over brittle browser tests

## Dependency Rules

- Minimize dependencies
- Prefer standard library or existing project utilities before adding packages
- Every new dependency must have a clear justification

## Documentation Rules

- Update `README.md` when setup, env vars, or workflows change
- Update `PROJECT_SCOPE.md` if product behavior changes
- Keep docs aligned with actual behavior, not intended behavior

## Coding Style

- Use descriptive names
- Avoid overly abstract base classes or generic utility dumping grounds
- Add comments only where intent is not obvious from code
- Prefer explicit code paths over magic

## Change Workflow For Agents

Before making changes:

- read the relevant files fully
- understand the current flow
- check whether the change fits the project scope

When making changes:

- keep edits small and localized
- preserve backward behavior unless the task requires a change
- avoid incidental refactors unless they unblock the task

Before finishing:

- run relevant tests
- verify the main user flow affected by the change
- note any risks or follow-up work
