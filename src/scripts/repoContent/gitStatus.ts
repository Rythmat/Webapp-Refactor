import { execFile } from 'node:child_process';

/**
 * What git says about the repo's data files (design B, "The Publishing page
 * in repo mode"): which of them changed since the last commit, for the
 * console's "Commit and deploy" view and for `/overview`'s
 * `changedSincePublish`, which in repo mode counts the files git has not
 * committed yet.
 *
 * It runs `git status --porcelain` over the paths it is given and nothing
 * else: git is only read here, never written. Where there is no git (a
 * scratch copy that is not a repository, or no git on the PATH) the answer
 * says so instead of failing, and lists nothing.
 *
 * Node only, with nothing from Vite, like the rest of the store.
 */

/** How a file differs from the last commit, in words. */
export type GitChange =
  | 'modified'
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'untracked'
  | 'conflicted';

/** One changed file, as `git status --porcelain` reports it. */
export interface GitFileStatus {
  /** Repo-relative, with `/`. */
  path: string;
  /** Git's two status letters (`XY`), e.g. ` M`, `A `, `??`. */
  code: string;
  change: GitChange;
}

/** A run of `git status`, or why there was none. */
export interface GitStatusRead {
  /** Whether git answered for this directory. */
  git: boolean;
  /** The checked-out branch; null when detached or unknown. */
  branch: string | null;
  files: GitFileStatus[];
  /** Why git did not answer; null when it did. */
  error: string | null;
}

/** Runs git with some arguments in a directory and gives back its output. */
export type GitRunner = (
  args: readonly string[],
  cwd: string,
) => Promise<string>;

/** The real git: `execFile`, no shell, a time limit, a generous buffer. */
export const runGit: GitRunner = (args, cwd) =>
  new Promise((resolve, reject) => {
    execFile(
      'git',
      [...args],
      { cwd, timeout: 15_000, maxBuffer: 32 * 1024 * 1024, encoding: 'utf8' },
      (error, stdout, stderr) => {
        if (error) {
          const said = String(stderr ?? '')
            .trim()
            .split('\n')[0];
          reject(new Error(said || error.message));
          return;
        }
        resolve(String(stdout));
      },
    );
  });

const changeOf = (code: string): GitChange => {
  if (code === '??') return 'untracked';
  const [x, y] = code;
  if (x === 'U' || y === 'U' || code === 'AA' || code === 'DD')
    return 'conflicted';
  if (x === 'R' || y === 'R' || x === 'C') return 'renamed';
  if (x === 'D' || y === 'D') return 'deleted';
  if (x === 'A') return 'added';
  return 'modified';
};

/**
 * `git status --porcelain=v1 -z` output, read: one entry per changed file,
 * each `XY path`, and a rename followed by the path it came from, which is
 * skipped (the new path is the one that holds the data now).
 */
export function parsePorcelain(output: string): GitFileStatus[] {
  const parts = output.split('\0');
  const files: GitFileStatus[] = [];
  for (let at = 0; at < parts.length; at++) {
    const entry = parts[at];
    if (entry.length < 4) continue;
    const code = entry.slice(0, 2);
    files.push({ path: entry.slice(3), code, change: changeOf(code) });
    if (code[0] === 'R' || code[0] === 'C') at += 1;
  }
  return files;
}

/**
 * The changed files among `paths` (files or folders, repo-relative) in the
 * repository at `root`, untracked files included one by one, and the
 * branch. Never throws: a directory git does not know, or no git at all,
 * comes back as `{ git: false, error }`.
 */
export async function readGitStatus(
  root: string,
  paths: readonly string[],
  run: GitRunner = runGit,
): Promise<GitStatusRead> {
  try {
    const [status, branch] = await Promise.all([
      run(
        [
          'status',
          '--porcelain=v1',
          '-z',
          '--untracked-files=all',
          '--',
          ...paths,
        ],
        root,
      ),
      run(['rev-parse', '--abbrev-ref', 'HEAD'], root).catch(() => ''),
    ]);
    const name = branch.trim();
    return {
      git: true,
      branch: name && name !== 'HEAD' ? name : null,
      files: parsePorcelain(status).sort((a, b) =>
        a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
      ),
      error: null,
    };
  } catch (error) {
    return {
      git: false,
      branch: null,
      files: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
