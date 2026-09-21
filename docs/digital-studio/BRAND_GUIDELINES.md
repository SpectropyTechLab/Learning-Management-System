# Spectropy Studio brand consistency

[Handbook](README.md). Version 1 · Phase 1 follow-up, 19 September 2026. Deployed 21 September 2026; signed-in live welcome and draft presentation checked.

## Source of truth

Use the existing Spectropy OS as the visual reference. Its standard dashboard theme is defined in `frontend/src/components/layout/dashboardTheme.ts`; global brand colors are in `frontend/src/assets/index.css`. Studio inherits the host font instead of loading a competing font. The client-specific amber dashboard variant is outside the current Content Authorizer pilot.

| Purpose | Studio token / treatment | OS reference |
|---|---|---|
| Brand illustration | `--ds-brand: #0b285d` | Global maincolor |
| Primary action / selected navigation | `--ds-primary: #1e3a8a` | Standard dashboard blue-900 |
| Primary hover | `--ds-primary-hover: #1d4ed8` | Dashboard blue-700 |
| Focus / selection outline | `--ds-accent: #2563eb` | Blue family; visible keyboard focus |
| Soft selection / guidance | `--ds-soft: #eff6ff` | Dashboard blue-50 |
| Text / secondary text | Slate-900 / gray-600 | Dashboard headings and descriptions |
| Panels / borders | White / gray-200 | Dashboard surfaces |
| Typography | Inherit OS sans-serif; bold UI headings | Host font and heading hierarchy |

Buttons, forms, project cards, steps, editor chrome, AI review, notices and presentation controls follow this palette. Warning colors keep their semantic meaning. Use restrained rounded corners and shadows. Avoid adding unrelated green accents or serif interface headings.

## Authored content and scope

Slide artwork is content, distinct from the application interface. This change preserves existing slide rendering, authored colors, text and elements; it does not rewrite stored projects or immutable releases. Lesson templates still have their original presentation typography and palette. A future Spectropy slide theme should be an explicit author choice, with preview and no silent conversion of saved lessons.

Only Studio styles and local preview scaffolding changed. The real OS shell, backend, permissions, database and AI configuration remain unchanged. Studio styles remain scoped by their existing `ds-` classes. Canonical CSS is `Digital_Teaching_Classroom/application/frontend/studio.css`; synchronize its deployable copy with `scripts/sync-os.mjs`.

## Review and maintenance

Check welcome, brief, editor, review dialog and presentation controls at desktop and narrow widths. Verify keyboard focus and text readability, alongside save/present behavior. The local preview approximates the OS shell; final visual acceptance must also occur inside the actual OS after deployment. Current checks are not a full accessibility audit.

When OS branding changes, compare these mappings and update Studio in the same task. Token values currently mirror OS classes; they are not automatically generated from the dashboard theme.
