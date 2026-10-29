# Teacher Session Tracker

This folder contains the planning documents for the Teacher Session Tracker MVP.

Files:

- `WORKFLOW.md` - role-based working flow and ownership
- `DATABASE_PLAN.md` - database plan for the 9-table MVP design
- `FRONTEND_PLAN.md` - frontend pages, routes, components, and rollout plan
- `BACKEND_PLAN.md` - backend module structure, APIs, services, and rollout plan

MVP summary:

- `content_authorizer` uploads shared program-level planning assets
- `super_admin` enables tracker access for a client and grants program entitlement
- `client_admin` generates live sessions, assigns teacher access, and monitors client analytics
- `school_owner` monitors school-level analytics
- `teacher` updates assigned sessions and views personal analytics
