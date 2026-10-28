# Server-side authorization using the existing permission system

Local implementation date: 14 October 2026. [Handbook](README.md)

TSK-008 extends the existing OS `role_permissions` and `user_permissions` system. It does not introduce a second RBAC policy engine.

## Authorization layers

Protected curriculum requests use the existing middleware and service layers:

```text
authenticateToken
  -> requireRole for absolute role boundaries
  -> attachClientContext
  -> loadPermissions
  -> checkPermission('curriculum.*')
  -> curriculum service ownership and assignment checks
  -> controller operation
```

- `authenticateToken` establishes a valid active identity.
- `requireRole` prevents teachers/students from crossing canonical write boundaries even if a permission is accidentally granted.
- `loadPermissions` combines role defaults with user-specific overrides.
- `checkPermission` returns 403 when the effective permission is not granted.
- The curriculum service validates platform, client, school, assignment and record ownership from database data.

## Current curriculum permissions

The existing permission catalog now includes:

| Permission | Purpose |
|---|---|
| `curriculum.read` | List or read programs, grades, subjects, chapters and topics |
| `curriculum.create` | Create a curriculum record |
| `curriculum.update` | Update a curriculum record |
| `curriculum.delete` | Delete/deactivate a curriculum record |
| `curriculum.authorize` | Reserved for a future explicit approval step that can promote reviewed curriculum; it is separate from ordinary editing and is not used by a route yet |

Default seed intent:

| Existing role | Read | Create | Update | Delete | Authorize |
|---|---:|---:|---:|---:|---:|
| `super_admin` | Allow + built-in bypass | Allow + built-in bypass | Allow + built-in bypass | Allow + built-in bypass | Allow + built-in bypass |
| `content_authorizer` | Allow | Allow | Allow | Allow | Allow |
| `client_admin` | Allow | Deny | Deny | Deny | Deny |
| `school_owner` | Allow | Deny | Deny | Deny | Deny |
| `teacher` | Allow | Deny | Deny | Deny | Deny |
| `student` | Allow | Deny | Deny | Deny | Deny |

The seed stores explicit `false` values for every read-only role's write actions. Canonical mutations also require `super_admin` or `content_authorizer`, so a user override cannot elevate Client Admin, School Owner, Teacher or Student to canonical curriculum writes.

## Terms in the current repository

### Curriculum

Curriculum is a separate LMS module for the normalized academic hierarchy already stored in LMS tables:

```text
Board -> Program -> Grade -> Subject -> Chapter -> Topic -> Subtopic
```

The APIs in `backend/routes/curriculum.routes.js` create, list, update and delete these records. They are shared academic structure, not questions and not an individual Studio lesson. Question Bank remains a separate module using `questions.*`; Curriculum now has its own `curriculum.*` permission namespace in the same existing permission system.

### Studio session

Digital Studio sessions are normalized records under a subtopic. A subtopic can have multiple ordered sessions. Session Plan and Screen Script originals and their revision metadata are stored separately from the session identity.

### Screen

The Day 3 schema includes normalized `screens`, `screen_elements`, `screen_tags` and `screen_branches` entities. Their dedicated API permission namespace should be added when those route contracts are implemented; the current `curriculum.*` permissions apply only to the curriculum routes described above.

## Current effect and deployment boundary

- Current curriculum routes now use their own `curriculum.*` permissions instead of temporarily reusing Question Bank-specific `questions.*` permissions.
- Client Admins, School Owners, Teachers and Students retain scoped curriculum reads after the new seed is applied, but receive 403 for curriculum mutations.
- Existing curriculum service scope enforcement remains unchanged.
- The permission catalog and seed file changed. Every environment must run the permission seed as part of rollout; repository changes alone do not populate an already-running database.
- Deploy/preview rollout must seed platform permissions and each intended tenant before deploying routes that require them, then invalidate or wait out permission caches.
- The append-only Resource versioning migration is part of the Supabase migration chain. Production deployment remains a separate, reviewed operation.

## Future student delivery boundary

Students should not call raw Studio project APIs. A future published student projection must use its own permission and serializer that removes teacher notes, answers, internal rationale, drafts and review metadata. Permission checks decide whether an endpoint may be called; they do not perform field-level redaction.
