# Resource Library Entity Relationships

This diagram shows the Resource Library boundary designed from the Developer Guide. Existing Teaching Studio entities are shown only where the new tables reference them.

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ RESOURCE_ITEMS : owns
    USERS ||--o{ RESOURCE_ITEMS : creates
    RESOURCE_ITEMS ||--o{ RESOURCE_ITEM_VERSIONS : versions
    RESOURCE_ITEM_VERSIONS ||--o{ RESOURCE_BINDINGS : placed_as
    SLIDE_OBJECTS ||--o{ RESOURCE_BINDINGS : lesson_owner
    SLIDE_BRANCHES ||--o{ RESOURCE_BINDINGS : branch_owner

    RESOURCE_ITEMS ||--o{ RESOURCE_ACADEMIC_MAPPINGS : classified_by
    CURRICULUM_NODES ||--o{ RESOURCE_ACADEMIC_MAPPINGS : maps_subject_or_grade
    LEARNING_OBJECTIVES ||--o{ RESOURCE_ACADEMIC_MAPPINGS : maps_objective

    RESOURCE_COLLECTIONS ||--o{ RESOURCE_COLLECTION_ITEMS : contains
    RESOURCE_ITEMS ||--o{ RESOURCE_COLLECTION_ITEMS : listed_in
    MEMBERSHIPS ||--o{ RESOURCE_COLLECTIONS : owns
    MEMBERSHIPS ||--o{ RESOURCE_FAVORITES : saves
    RESOURCE_ITEMS ||--o{ RESOURCE_FAVORITES : favorited

    RESOURCE_ITEM_VERSIONS ||--o{ RESOURCE_REVIEW_DECISIONS : reviewed_by
    RESOURCE_ITEM_VERSIONS ||--o{ RESOURCE_HEALTH_CHECKS : checked_by
    RESOURCE_BINDINGS ||--o{ RESOURCE_ADOPTION_REQUESTS : proposes_change_for
    RESOURCE_ITEM_VERSIONS ||--o{ RESOURCE_ADOPTION_REQUESTS : current_version
    RESOURCE_ITEM_VERSIONS ||--o{ RESOURCE_ADOPTION_REQUESTS : proposed_version
```

## Important semantics

- `resource_items.id` is the permanent identity. Renaming an item does not change it.
- `resource_item_versions` are numbered under one item. Approved or withdrawn version payloads are immutable.
- A binding points to one exact approved version and exactly one owner: a lesson `slide_object` or a clarification `slide_branch`.
- Prompt, launch and fallback JSON belong to the binding. Reusing a version does not share placement instructions.
- Collections and favorites reference the stable item identity. They neither copy content nor grant access to it.
- Academic mappings are many-to-one with an item, allowing cross-subject and cross-grade discovery without duplicating the resource.
