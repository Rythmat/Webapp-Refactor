// ── The editor's cloud project events ──────────────────────────────────────
//
// Window events the save and delete paths fire, for whatever shows cloud
// projects (the Projects dialog's list, the set-list prompt, collab's leave
// flow). The one place their names are written. No imports: the REST
// client, the save path and the shell all load this.

/**
 * Fires after every successful cloud save, from all save paths, with detail
 * {projectId, generation}: the project saved and the session it was saved in.
 */
export const PROJECT_SAVED_EVENT = 'ma-studio-project-saved';

/** Fires after a cloud project is deleted, from all delete paths: detail {id}. */
export const PROJECT_DELETED_EVENT = 'ma-studio-project-deleted';
