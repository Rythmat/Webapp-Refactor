# Backend brief — Classroom announcements (teacher → student)

**For:** the backend developer on the Music Atlas **classroom API**
(`VITE_MUSIC_ATLAS_API_URL`, same host + auth as the other `/classrooms/*` endpoints).
**Status:** the web client is already built to call the read endpoint below and
**degrades to an empty list until it exists** — shipping it "lights up" teacher
announcements in the Home dashboard's Announcements row with no further frontend work.

## Context — what and why

The Home dashboard now has an **Announcements** top row that aggregates several
sources (new challenges, app updates, and **teacher posts**). Challenges and app
updates are handled entirely client-side. Teacher posts need a real backend: a
teacher writes an announcement for a class, and every enrolled student sees it.

The client already knows the user's classrooms (`GET /classrooms` → the list the
student belongs to) and calls the read endpoint below **once per classroom**, then
merges the results. See `src/lib/announcements/api.ts` and
`src/features/announcements/useTeacherAnnouncements.ts`.

## Auth

Identical to the existing `/classrooms/*` endpoints: `Authorization: Bearer <JWT>`;
the token's `sub` is the user id. Everything is per-authenticated-user.

---

## 1) `GET /api/classrooms/:classroomId/announcements` — student reads (REQUIRED)

Returns the active announcements for a classroom the caller is **enrolled in**
(server must 403/empty if the caller isn't an active member).

**Response `200`:** an array (or `{ "announcements": [...] }`) of:

```jsonc
{
  "id": "string", // stable id — client dedupes/dismisses by `teacher:<id>`
  "classroomId": "string",
  "teacherName": "string", // display name; the classroom LIST only exposes teacherId,
  // so include the name here for the student view
  "title": "string", // short headline, e.g. "Practice for Friday's quiz"
  "body": "string | null", // optional detail
  "createdAt": "ISO-8601", // used for recency sorting
  "priority": 0, // optional; higher shows first (default 0)
}
```

**Errors:** `401` unauth · `403`/empty if not an active member.

## 2) `POST /api/classrooms/:classroomId/announcements` — teacher creates (REQUIRED for authoring)

Only the classroom's **teacher/owner** may post.
**Body:** `{ "title": string, "body?": string, "priority?": number, "expiresAt?": ISO-8601 }`
**Response `200/201`:** the created announcement (shape as above).
**Errors:** `400` invalid · `401` unauth · `403` not the teacher.

_(Optional later: `DELETE …/:announcementId` to retract, and an `expiresAt` filter so
past-dated announcements drop out of the read endpoint automatically.)_

---

## How the client uses these (reference)

- Read: `announcementsApi.listForClassrooms(token, classroomIds)` fans out one GET per
  classroom, `catch → []` per classroom, and flattens. A missing endpoint is inert.
- Each item becomes an `Announcement` with `id: "teacher:<id>"`, title `"{teacherName}: {title}"`,
  and `body`. Dismissals persist client-side (`music-atlas-dismissed-announcements`).
- Client code: `src/lib/announcements/api.ts`,
  `src/features/announcements/useTeacherAnnouncements.ts`.

## Still needed on the frontend (follow-up, not in this build)

- A **teacher-side "create announcement" UI** (calls endpoint #2) so teachers can author posts.
- Optionally feed the unread count into the stubbed notification bell in
  `src/components/ClassroomLayout/TopRail.tsx` (`NOTIFICATION_COUNT`).

## Acceptance criteria

1. Teacher `POST`s an announcement to class X; every active student in X sees it via `GET`.
2. A student not enrolled in X gets `403`/empty for X's announcements.
3. A non-teacher `POST` is rejected `403`.
4. `createdAt` ordering and optional `priority` are respected by the client's sort.
