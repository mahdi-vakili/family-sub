# Project Scope

## Goal

Build a small self-hosted subscription service for family use. Client devices call a per-user URL and receive plain-text config lines such as `vless://...`. An authenticated admin panel is used to manage users, import configs, soft-delete configs, export configs, and review access activity.

## In Scope

- Public subscription endpoint that returns plain-text config lines
- Unique subscription URL per user
- SQLite-backed storage
- Admin panel with username/password authentication
- HTTPS-ready deployment on Ubuntu via Docker Compose
- Batch config import from pasted text, including mixed text with non-config content
- Protocol-agnostic parsing for URI-style config lines
- Validation of imported configs
- Duplicate prevention
- Soft delete for configs
- Per-user exclusion of specific configs
- Export of:
  - all configs
  - enabled configs only
- Logging of:
  - subscription access by user and timestamp
  - admin login attempts

## Default Behavior

- All active configs are included for all users by default
- A user can have individual configs excluded without affecting other users
- Soft-deleted configs are excluded from subscriptions
- Export "enabled" means active and not soft-deleted
- Export "all" includes active and soft-deleted configs

## Out of Scope

- Multi-admin support
- Billing, quotas, or payments
- Device fingerprinting
- Usage analytics beyond basic logs
- Automatic backups
- Config reachability tests
- Full role-based access control
- Native mobile or desktop apps
- Real-time updates or websockets
- Large-scale performance work beyond family-scale usage

## Operational Assumptions

- Maximum expected scale is about 10 users
- One admin account is sufficient
- The service will be deployed behind HTTPS on a domain when possible
- Reverse proxy configuration may vary by server, but the app must be container-friendly

## Acceptance Criteria

- Admin can log in and manage the system through a browser
- Admin can paste a noisy text blob and import valid config URIs from it
- Duplicate configs are not inserted
- Admin can soft-delete one config or multiple configs
- Admin can create a user and get a unique subscription URL
- Client calling a user URL receives only allowed active configs as plain text
- Each subscription request creates a user access log entry
- Admin can export all configs and enabled configs separately
