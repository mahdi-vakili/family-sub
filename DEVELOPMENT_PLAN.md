# Development Plan

## Phase 1: Foundation

### Goals

- Create the project structure
- Set up the Flask app skeleton
- Add configuration loading
- Set up SQLite integration
- Define the initial schema
- Add admin authentication basics

### Deliverables

- App entrypoint
- Config module
- Database initialization
- Core models/tables
- Login/logout flow
- Base layout template

### End-of-Phase Testing

- App starts locally without errors
- Database file is created correctly
- Required tables exist
- Admin login works with valid credentials
- Admin login fails with invalid credentials
- Protected admin routes redirect to login when unauthenticated
- Logout invalidates the session

## Phase 2: Config Management

### Goals

- Build config import and parsing
- Extract valid config URIs from noisy pasted text
- Normalize entries for deduplication
- Prevent duplicate inserts
- Support soft delete
- Support batch delete and single delete

### Deliverables

- Config parser module
- Config import service
- Config list page
- Single delete action
- Batch delete action
- Validation and error reporting in the UI

### End-of-Phase Testing

- Parser extracts valid config lines from mixed text
- Parser accepts all intended URI protocols
- Invalid lines are ignored or rejected according to the designed rule
- Duplicate configs are not inserted twice
- Soft-deleted configs remain in the database but are excluded from active results
- Single delete works
- Batch delete works
- Config list reflects active vs soft-deleted state correctly

## Phase 3: User Management and Subscription Delivery

### Goals

- Add user CRUD
- Generate unique subscription tokens
- Expose per-user subscription endpoints
- Return plain-text active configs
- Support per-user exclusion of individual configs
- Log each subscription request by timestamp and user

### Deliverables

- User list/create/update pages
- Subscription URL generation
- Public subscription endpoint
- Per-user config exclusion controls
- Subscription access logging

### End-of-Phase Testing

- Creating a user generates a unique token
- Subscription URL returns plain text only
- Output includes active configs by default
- Soft-deleted configs are excluded from subscription output
- User-specific excluded configs are omitted only for that user
- Two different users can receive different outputs based on exclusions
- Each subscription request creates exactly one access log entry
- Unknown or revoked tokens do not expose configs

## Phase 4: Admin Operations and Export

### Goals

- Add export actions
- Add access log views
- Add admin login logging
- Improve admin usability for routine operations

### Deliverables

- Export all configs endpoint/action
- Export enabled configs endpoint/action
- Access log page
- Admin login activity log
- Clear admin navigation across pages

### End-of-Phase Testing

- Export-all includes active and soft-deleted configs
- Export-enabled includes only active configs
- Export files use the expected plain-text format
- Subscription access logs show correct user and timestamp
- Admin login attempts are recorded with timestamp and result
- Admin UI navigation reaches all major screens successfully

## Phase 5: Deployment and Hardening

### Goals

- Containerize the app
- Add Docker Compose setup
- Prepare production configuration
- Document deployment on Ubuntu with HTTPS
- Tighten defaults for security and operability

### Deliverables

- `Dockerfile`
- `docker-compose.yml`
- Environment variable documentation
- Production startup command
- Reverse proxy guidance for domain + SSL
- Initial README

### End-of-Phase Testing

- App builds successfully in Docker
- App starts successfully via Docker Compose
- Persistent data survives container restart
- Environment variables override defaults correctly
- Admin login still works in containerized mode
- Subscription endpoint still returns expected output in containerized mode
- Deployment steps are reproducible on a clean Ubuntu server

## Phase 6: Final Validation

### Goals

- Verify the full end-to-end workflow
- Close gaps in tests and docs
- Clean up rough edges without widening scope

### Deliverables

- Final test pass
- Documentation pass
- Small UX polish pass

### End-of-Phase Testing

- Fresh setup works from zero
- Admin can log in, create a user, import configs, exclude one config for that user, and fetch the subscription successfully
- Export actions produce correct files
- Logs are visible and accurate
- No major route returns unhandled server errors in normal use
- Scope and README match actual implementation

## Suggested Execution Order

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6

## Definition of Done

The project is done when:

- the admin can manage configs and users through the UI
- each user has a working subscription URL
- subscription responses are plain-text config lines
- per-user config exclusions work
- exports work
- logs work
- the app is documented and deployable on Ubuntu with Docker Compose
