# The `studio_lesson` content kind

The Studio's Production lessons, as the console's lesson editor writes them (`/console/studio-lessons`). Today they are repo files: the dev server writes `src/curriculum/data/studioLessons/<id>.json` (`scripts/vite/devContentWriter.ts`, `PUT`/`DELETE /__dev/studio-lessons/:id`), and committing a file ships it. This page is what the content API needs to take the kind over.

## Identity

- **Kind:** `studio_lesson`
- **Identity field:** `id` (kebab-case, `^[a-z0-9][a-z0-9-]*$`), which is also the slug.
- **Schema:** `src/content/studioLessons/schemas.ts` (`studioLessonSchema`, zod). It is strict: unknown keys are refused.

## Body

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | The lesson's id. When it matches a code lesson's id (`TUTORIAL_CATALOG` in `src/daw/components/Tutorial/tutorialCatalog.ts`), this lesson replaces that one. |
| `title`, `subtitle` | string | The tile's text. |
| `difficulty` | `Beginner` \| `Intermediate` \| `Advanced` | |
| `estMinutes` | int, 1–60 | |
| `requiresPremium` | boolean | Written by the editor from the steps: true when a step is in Prism. The app works it out again from the steps and doesn't trust this field. |
| `course`, `courseOrder` | `studio-basics`, int ≥ 1 | Both or neither. |
| `seed` | string? | The demo song a cold start opens on. |
| `status` | `draft` \| `live` | Students get `live` lessons only. The console's preview also shows drafts. |
| `steps` | array, ≥ 1 | Step ids are unique within a lesson. |

A step:

| Field | Type | Notes |
| --- | --- | --- |
| `id`, `stage`, `instruction` | string | `instruction` supports `**bold**`. |
| `hint` | string? | |
| `target` | string \| string[] | Anchor ids (`data-tutorial-id`). When there are several, the first one on screen wins. The editor's list is `src/content/studioLessons/anchors.json`. |
| `rack` | `track` \| `master` \| `return:<X>` | Only for `fx-add-*` targets. |
| `requires` | object | `view`, `libraryOpen`, `channelStripTab` (or `null`), `clearClipSelection`, `automationParam`, `effectsLibrary`, `soundsOpen`, `mixRack` (`{kind:'master'}` or `{kind:'return', id:'A'\|'B'}`). |
| `check` | object? | `{kind:'code', lesson, step}`: a code lesson step's check, by reference. `{kind:'named', name, params}`: a ready-made check from `src/content/studioLessons/checkCatalog.ts`. Leave it out and the step advances on Next. |
| `demo` | object? | `{kind:'code', lesson, step}`: a code step's "watch me" demo. |

## What the API needs

1. Accept the kind with the schema above. Validate with the shared zod schema, or a JSON Schema generated from it.
2. Serve it in a bundle (`studio_lessons`) that the app reads at startup. The one module to change is `src/curriculum/engine/studioLessons/registry.ts`: it reads the repo files today and would read the bundle instead, falling back to the files.
3. Treat an editor-role save as a proposal for review, as with Music Literacy. The console's save path is `src/features/admin/drumGrooves/instrumentStore.ts`, and it switches to the API automatically once `/capabilities` lists the kind.
4. Deleting a lesson whose id matches a code lesson makes the app fall back to the code lesson ("Revert" in the console).
