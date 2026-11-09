/**
 * Dev-server-only endpoints that let the console's Drum Grooves designer,
 * Bass Lines editor, Parts Library and Music Literacy editor write repo
 * files: groove JSON, custom kit JSON, bass line JSON, instrumental part
 * JSON, Music Literacy lesson JSON and uploaded drum samples.
 * Commit
 * the files to ship them. `apply: 'serve'` keeps all of this out of builds, so
 * a deployed console has no way to write and the designer says so.
 *
 *   PUT    /__dev/drum-grooves/:id     body: groove JSON
 *   DELETE /__dev/drum-grooves/:id
 *   PUT    /__dev/drum-kits/:id        body: custom kit JSON
 *   PUT    /__dev/bass-lines/:id       body: bass line JSON
 *   DELETE /__dev/bass-lines/:id
 *   PUT    /__dev/parts/:id            body: instrumental part JSON
 *   DELETE /__dev/parts/:id
 *   PUT    /__dev/feels/:id            body: feel profile JSON
 *   PUT    /__dev/music-literacy/:id   body: Music Literacy lesson JSON
 *   DELETE /__dev/music-literacy/:id
 *   PUT    /__dev/lesson-fingers/:id   body: a lesson level → its fingers
 *          written into the lesson files (src/scripts/lessonFingers), the
 *          rest of each file untouched → { files, changed, skipped }
 *   PUT    /__dev/synth-patches/:id    body: Oracle Synth preset JSON
 *   PUT    /__dev/bands/:id            body: band JSON
 *   DELETE /__dev/bands/:id
 *   PUT    /__dev/players/:id          body: player JSON
 *   DELETE /__dev/players/:id
 *   PUT    /__dev/sample-instruments/:id  body: sampled instrument JSON
 *   DELETE /__dev/drum-kits/:id
 *   GET    /__dev/drum-samples         → { samples: string[] }  (public URLs)
 *   POST   /__dev/drum-samples?name=x  body: raw audio → { url }
 *   GET    /__dev/instrument-samples   → { samples: string[] }  (pitched)
 *   POST   /__dev/instrument-samples?name=x  body: raw audio → { url },
 *          its leading silence trimmed (with ffmpeg, when installed)
 */

import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { format } from 'prettier';
import type { Plugin } from 'vite';
import { writeLessonFingers } from '../../src/scripts/lessonFingers/writeLessonFingers';
import { repoPrettierOptions } from '../../src/scripts/repoContent/tsWrite';
import { refusalFor } from './repoContentPlugin';

const ROOT = process.cwd();
const GROOVE_DIR = path.join(ROOT, 'src/curriculum/data/drumGrooves');
const KIT_DIR = path.join(ROOT, 'src/daw/instruments/customDrumKits');
const BASS_LINE_DIR = path.join(ROOT, 'src/curriculum/data/bassLines');
const CHORD_COMPING_DIR = path.join(ROOT, 'src/curriculum/data/chordComping');
const BAND_DIR = path.join(ROOT, 'src/curriculum/data/bands');
const PLAYER_DIR = path.join(ROOT, 'src/curriculum/data/players');
const SAMPLE_INSTRUMENT_DIR = path.join(
  ROOT,
  'src/daw/instruments/sampleInstruments',
);
const LESSON_PAIRING_DIR = path.join(
  ROOT,
  'src/curriculum/data/lessonPairings',
);
const PART_DIR = path.join(ROOT, 'src/curriculum/data/parts');
const FEEL_DIR = path.join(ROOT, 'src/curriculum/data/feels');
const MUSIC_LITERACY_DIR = path.join(ROOT, 'src/curriculum/data/musicLiteracy');
const PATCH_DIR = path.join(ROOT, 'src/daw/oracle-synth/store/presets/atlas');
const SAMPLE_DIR = path.join(ROOT, 'public/daw-assets/samples/drums/uploads');
const SAMPLE_URL = '/daw-assets/samples/drums/uploads/';
/** Pitched recordings for sampled instruments, apart from the drum hits. */
const INSTRUMENT_SAMPLE_DIR = path.join(
  ROOT,
  'public/daw-assets/samples/instruments/uploads',
);
const INSTRUMENT_SAMPLE_URL = '/daw-assets/samples/instruments/uploads/';

const SAMPLE_FOLDERS: Record<string, { dir: string; url: string }> = {
  'drum-samples': { dir: SAMPLE_DIR, url: SAMPLE_URL },
  'instrument-samples': {
    dir: INSTRUMENT_SAMPLE_DIR,
    url: INSTRUMENT_SAMPLE_URL,
  },
};

/**
 * A pitched sample without the silence before its note: the sampler plays
 * from the file's first frame, so 40 ms of air there makes every note late.
 * Uses ffmpeg when it is installed; without it the file is kept as sent.
 */
async function trimLeadingSilence(file: string): Promise<void> {
  const tmp = path.join(os.tmpdir(), `trim-${Date.now()}${path.extname(file)}`);
  const ok = await new Promise<boolean>((resolve) =>
    execFile(
      'ffmpeg',
      [
        '-y',
        '-loglevel',
        'error',
        '-i',
        file,
        '-af',
        'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.003',
        ...(/\.mp3$/i.test(file) ? ['-b:a', '192k'] : []),
        tmp,
      ],
      (err) => resolve(!err),
    ),
  );
  if (ok) await fs.rename(tmp, file).catch(() => fs.rm(tmp, { force: true }));
}

const ID = /^[a-z0-9][a-z0-9_-]*$/;
const AUDIO_EXT = /\.(wav|mp3|ogg|aif|aiff|flac)$/i;
const MAX_SAMPLE_BYTES = 5 * 1024 * 1024;
const MAX_JSON_BYTES = 2 * 1024 * 1024;

function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error(`Over ${Math.round(limit / 1024 / 1024)}MB.`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const exists = (file: string) =>
  fs.access(file).then(
    () => true,
    () => false,
  );

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

/**
 * The JSON as the repo lays it out: indented, then through prettier with the
 * repo's options, exactly as repo mode writes these files
 * (sources/instrumentContent.ts) — so a save here and one there give the
 * same bytes, and `npm run lint` stays quiet.
 */
const pretty = async (value: unknown) =>
  format(JSON.stringify(value, null, 2), {
    ...(await repoPrettierOptions()),
    parser: 'json',
  });

async function writeJson(
  dir: string,
  id: string,
  req: IncomingMessage,
  res: ServerResponse,
) {
  const parsed = JSON.parse(
    (await readBody(req, MAX_JSON_BYTES)).toString('utf8'),
  ) as { id?: string };
  if (parsed.id !== id) {
    return send(res, 400, { error: 'Body id does not match the URL.' });
  }
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${id}.json`), await pretty(parsed));
  send(res, 200, { ok: true });
}

export function devContentWriter(): Plugin {
  return {
    name: 'music-atlas-dev-content-writer',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__dev', async (req, res, next) => {
        try {
          const url = new URL(req.url ?? '/', 'http://localhost');
          const [kind, id] = url.pathname.split('/').filter(Boolean);
          const method = req.method ?? 'GET';

          // The repo content server's transport checks (loopback, no proxy,
          // this host, same origin, JSON writes) — these endpoints write repo
          // files too. A sample upload is raw audio, so it is checked as JSON
          // would be and must then say it is audio.
          const upload = kind in SAMPLE_FOLDERS && method === 'POST';
          const refusal = refusalFor({
            method,
            remoteAddress: req.socket.remoteAddress,
            headers: upload
              ? { ...req.headers, 'content-type': 'application/json' }
              : req.headers,
          });
          if (refusal) return send(res, refusal.status, refusal);
          if (
            upload &&
            !/^(audio\/|application\/octet-stream)/i.test(
              req.headers['content-type'] ?? '',
            )
          ) {
            return send(res, 415, { error: 'Upload an audio file.' });
          }

          // A lesson level's fingers, into the lesson files.
          if (kind === 'lesson-fingers') {
            if (method !== 'PUT')
              return send(res, 405, { error: 'PUT a lesson level.' });
            if (!id || !ID.test(id)) {
              return send(res, 400, { error: `Bad id "${id ?? ''}".` });
            }
            const level = JSON.parse(
              (await readBody(req, MAX_JSON_BYTES)).toString('utf8'),
            ) as { id?: string };
            if (level.id !== id) {
              return send(res, 400, {
                error: 'Body id does not match the URL.',
              });
            }
            return send(res, 200, await writeLessonFingers(ROOT, level));
          }

          const JSON_DIRS: Record<string, string> = {
            'drum-grooves': GROOVE_DIR,
            'drum-kits': KIT_DIR,
            'bass-lines': BASS_LINE_DIR,
            'lesson-pairings': LESSON_PAIRING_DIR,
            'chord-comping': CHORD_COMPING_DIR,
            bands: BAND_DIR,
            players: PLAYER_DIR,
            'sample-instruments': SAMPLE_INSTRUMENT_DIR,
            parts: PART_DIR,
            feels: FEEL_DIR,
            'music-literacy': MUSIC_LITERACY_DIR,
            'synth-patches': PATCH_DIR,
          };
          if (kind && kind in JSON_DIRS) {
            const dir = JSON_DIRS[kind];
            if (!id || !ID.test(id)) {
              return send(res, 400, { error: `Bad id "${id ?? ''}".` });
            }
            // The Studio's imported grooves live one folder down; an edit to
            // one is written back where it came from.
            const target =
              kind === 'drum-grooves' &&
              (await exists(path.join(dir, 'studio', `${id}.json`)))
                ? path.join(dir, 'studio')
                : dir;
            if (method === 'PUT') return await writeJson(target, id, req, res);
            if (method === 'DELETE') {
              await fs.rm(path.join(target, `${id}.json`), { force: true });
              return send(res, 200, { ok: true });
            }
          }

          if (kind && kind in SAMPLE_FOLDERS) {
            const folder = SAMPLE_FOLDERS[kind];
            if (method === 'GET') {
              await fs.mkdir(folder.dir, { recursive: true });
              const names = (await fs.readdir(folder.dir))
                .filter((n) => AUDIO_EXT.test(n))
                .sort()
                .reverse();
              return send(res, 200, {
                samples: names.map((n) => `${folder.url}${n}`),
              });
            }
            if (method === 'POST') {
              const name = url.searchParams.get('name') ?? '';
              // Keep the human name, lose anything that makes a messy path.
              const safe = name
                .replace(/[^\w.\- ]+/g, '')
                .replace(/\s+/g, '-')
                .toLowerCase();
              if (!AUDIO_EXT.test(safe)) {
                return send(res, 400, {
                  error: 'Upload a .wav, .mp3, .ogg, .aif or .flac file.',
                });
              }
              const file = `${Date.now().toString(36)}-${safe}`;
              const body = await readBody(req, MAX_SAMPLE_BYTES);
              await fs.mkdir(folder.dir, { recursive: true });
              await fs.writeFile(path.join(folder.dir, file), body);
              if (kind === 'instrument-samples')
                await trimLeadingSilence(path.join(folder.dir, file));
              return send(res, 200, { url: `${folder.url}${file}` });
            }
          }

          next();
        } catch (err) {
          send(res, 500, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });
    },
  };
}
