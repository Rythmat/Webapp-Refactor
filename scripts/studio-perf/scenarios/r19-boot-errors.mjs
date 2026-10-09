/* eslint-env node */
/**
 * R19 boot errors and the Opening overlay (milestone 1.4, E9/E14). Every
 * scenario starts from the kitchen sink, written to its draft.
 *
 * Fast:
 * - projectSlow: a cloud project whose GET takes 3 s, opened in the editor:
 *   the Opening overlay shows (overlayShown), blocks the editor under it
 *   (overlayBlocksInput: every other child of .daw-root inert, and a real
 *   click on the File menu opens nothing), and is gone once the project is
 *   ready, with nothing left inert or busy (overlayGoneWhenReady).
 * - project500: a project the API fails on (500): the error panel shows
 *   (errorPanelShown) and its "Back to my work" leaves the sink as it was,
 *   in its own draft (backToMyWorkIdentical).
 * - practiceModeGrooveFails: a Theory practice link whose groove download
 *   fails. The groove is fetched while preparing, before anything is kept
 *   (the critique: so the spec's failAfterResetRestores cannot come from
 *   here). The critique expected a refusal; the product instead builds the
 *   track on an empty Drums clip (loadGrooveEvents resolves null on a
 *   failed fetch, buildBeatClip falls back). Either way nothing may be
 *   lost: refused with nothing changed, or opened with the sink kept once,
 *   whole (grooveFailLosesNothing; checks.grooveFailure says which).
 * - badPayload: a failure after the switch: a project whose payload the
 *   loader rejects. The open must end 'failed' with restored 'kept' (a
 *   refusal before keeping would test nothing new): the sink was kept and
 *   is reopened (the same draft), and the panel says so
 *   (failAfterResetRestores).
 *
 * Full:
 * - staleCompletion: a slow project open superseded by File ▸ New never
 *   lands (staleOpenNeverApplied).
 * - params: a cold link with utm_* and MSP keys (and one the app does not
 *   know): only the link's own keys leave the address bar, for an open
 *   and for a refused one (onlyConsumedParamsStripped).
 * - collabStub: a joiner's ?collab=<code> in the editor, with every
 *   PartyKit socket closed (harness.mjs guardPartyKit), so the room never
 *   connects: the sink is kept before the join (keptBeforeJoin), and the
 *   failed join (outcome 'failed', restored 'kept') gives it back, out of
 *   any room, as the session's own draft again, unkept
 *   (joinFailureRestores). A
 *   working room (and the critique's remoteTakeUploaded) needs a PartyKit
 *   server, which this check does not run.
 */
import SuperJSON from 'superjson';
import {
  fullTierOnly,
  REOPEN_CLASSES,
  withoutLessonResume,
  workHash,
} from './_shared.mjs';

export const flags = {
  overlayShown: { goal: true, text: 'a slow open showed the Opening overlay' },
  overlayBlocksInput: {
    goal: true,
    text: 'the overlay blocked the editor under it (inert, a click opened nothing)',
  },
  overlayGoneWhenReady: {
    goal: true,
    text: 'once ready, the overlay was gone and nothing stayed inert or busy',
  },
  errorPanelShown: {
    goal: true,
    text: 'a server failure showed the error panel',
  },
  backToMyWorkIdentical: {
    goal: true,
    text: '"Back to my work" left the work and its draft as they were',
  },
  grooveFailLosesNothing: {
    goal: true,
    text: 'a practice link whose groove failed lost nothing: refused with nothing changed, or opened with the work it replaced kept whole',
  },
  failAfterResetRestores: {
    goal: true,
    text: 'a failure after the switch gave the kept work back, in its own draft, with the panel',
  },
  staleOpenNeverApplied: {
    goal: true,
    text: 'a slow open superseded by another never landed',
  },
  onlyConsumedParamsStripped: {
    goal: true,
    text: 'only the link’s own keys left the address bar (utm_*, MSP and unknown keys stayed)',
  },
  keptBeforeJoin: {
    goal: true,
    text: 'the work was kept before joining a room',
  },
  joinFailureRestores: {
    goal: true,
    text: 'a failed join gave the kept work back, out of any room',
  },
};

const projectPath = (id) => `/api/studio/projects/${id}`;

/** An in-editor navigation to `/studio/editor<query>` (the editor stays). */
const navigateInEditor = (kit, page, query) =>
  kit.spaNavigate(page, `/studio/editor${query}`);

/** What the overlay blocks while it is up. */
const overlayBlocking = (page) =>
  page.evaluate(() => {
    const overlay = document.querySelector('[data-testid="opening-overlay"]');
    const root = document.querySelector('.daw-root');
    if (!overlay || !root) return null;
    const others = [...root.children].filter(
      (child) => child !== overlay && !child.contains(overlay),
    );
    return {
      mode: overlay.getAttribute('data-mode'),
      othersInert:
        others.length > 0 && others.every((c) => c.hasAttribute('inert')),
      busy: root.getAttribute('aria-busy'),
    };
  });

/** The page's draft and project, compared with the sink's. */
async function sameAsSink(kit, run, page, { draft, snapshot }) {
  const got = await kit.fingerprint(page);
  const now = await kit.draftNow(page);
  const text = await kit.readDraftBody(page, draft.draftId);
  const diffs = kit.compareFingerprints(snapshot, got, {
    classes: REOPEN_CLASSES,
    defaults: run.defaults,
  });
  return {
    got,
    diffs,
    same:
      withoutLessonResume(diffs).length === 0 &&
      now.draftId === draft.draftId &&
      workHash(text) === workHash(draft.text),
    draftId: now.draftId,
  };
}

async function projectSlow(kit, run) {
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  // The sink's guitar clip plays an asset this mock must hold.
  const assetId = kit.seedSample(api);
  const projectId = api.seedProject({
    name: 'Slow Project',
    tracks: [],
    bpm: 101,
  });
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      await kit.applySink(page, run, { assetId });
      const slow = api.fault({
        method: 'GET',
        path: projectPath(projectId),
        delayMs: 3000,
        times: 1,
      });
      let blocking = null;
      let menuOpened = null;
      try {
        await navigateInEditor(kit, page, `?project=${projectId}`);
        await page
          .waitForSelector(
            '[data-testid="opening-overlay"][data-mode="full"]',
            {
              timeout: 10_000,
            },
          )
          .catch(() => {});
        blocking = await overlayBlocking(page);
        if (blocking) {
          const box = await page
            .locator('[data-tutorial-id="file-menu"]')
            .boundingBox();
          if (box) {
            await page.mouse.click(
              box.x + box.width / 2,
              box.y + box.height / 2,
            );
            await kit.sleep(300);
            menuOpened =
              (await page.locator('[role=menu][data-state=open]').count()) > 0;
          }
        }
      } finally {
        slow();
      }
      const state = await kit.waitForEditor(page);
      if (state !== 'ready') return kit.crashed(state);
      const settle = await kit.settle(page, 'after the slow project');
      const left = await page.evaluate(() => ({
        overlay: Boolean(
          document.querySelector('[data-testid="opening-overlay"]'),
        ),
        inert: document.querySelectorAll('.daw-root [inert]').length,
        busy:
          document.querySelector('.daw-root')?.getAttribute('aria-busy') ??
          null,
        name: window.__MA_STORE__.getState().projectName,
      }));
      return {
        diffs: [],
        extraLosses: [],
        flags: {
          overlayShown: blocking?.mode === 'full',
          overlayBlocksInput:
            Boolean(blocking?.othersInert) && menuOpened === false,
          overlayGoneWhenReady:
            !left.overlay &&
            left.inert === 0 &&
            left.busy !== 'true' &&
            left.name === 'Slow Project',
        },
        checks: {
          overlayWhileUp: blocking,
          menuOpened,
          afterReady: left,
          settle: [settle],
        },
        after: await kit.fingerprint(page),
      };
    },
    api,
  );
}

async function project500(kit, run) {
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  // The sink's guitar clip plays an asset this mock must hold.
  const assetId = kit.seedSample(api);
  const projectId = api.seedProject({ name: 'Failing Project' });
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      const sink = await kit.applySink(page, run, { assetId });
      const fail = api.fault({
        method: 'GET',
        path: projectPath(projectId),
        status: 500,
      });
      let panel = null;
      try {
        await navigateInEditor(kit, page, `?project=${projectId}`);
        panel = await page
          .waitForSelector('[data-testid="open-error"]', { timeout: 30_000 })
          .then(
            () => kit.openErrorText(page),
            () => null,
          );
        if (panel) {
          await page
            .locator('[data-testid="open-error"]')
            .getByRole('button', { name: 'Back to my work' })
            .click();
          await page
            .waitForSelector('[data-testid="open-error"]', {
              state: 'detached',
              timeout: 10_000,
            })
            .catch(() => {});
        }
      } finally {
        fail();
      }
      const settle = await kit.settle(page, 'after Back to my work');
      const back = await sameAsSink(kit, run, page, sink);
      return {
        diffs: back.diffs,
        extraLosses: [],
        flags: {
          errorPanelShown: Boolean(panel),
          backToMyWorkIdentical: back.same,
        },
        checks: {
          panel,
          url: await page.evaluate(() => location.search),
          settle: [settle],
        },
        after: back.got,
      };
    },
    api,
  );
}

async function grooveFails(kit, run) {
  return kit.withSession(run, '?new=1', async ({ page }) => {
    const sink = await kit.applySink(page, run);
    const draftsBefore = await kit.listDrafts(page);
    await page.route('**/daw-assets/samples/midi/drum/**', (route) =>
      route.fulfill({ status: 500, body: 'groove unavailable' }),
    );
    const since = await kit.pageNow(page);
    await navigateInEditor(kit, page, '?practiceMode=dorian&practiceRoot=d');
    const state = await kit.waitForEditor(page);
    if (state !== 'ready' && state !== 'open-error') return kit.crashed(state);
    const toast = await kit.waitForToast(page, {
      since,
      type: 'error',
      timeout: 5000,
    });
    const panel = await kit.openErrorText(page);
    if (panel) {
      await page
        .locator('[data-testid="open-error"]')
        .getByRole('button', { name: 'Back to my work' })
        .click()
        .catch(() => {});
    }
    await page.unroute('**/daw-assets/samples/midi/drum/**');
    const settle = await kit.settle(page, 'after the practice link');
    const now = await page.evaluate(() => {
      const s = window.__MA_STORE__.getState();
      const drums = s.tracks.find((t) => t.name === 'Drums');
      return {
        view: s.currentView,
        practice: s.practiceSession != null,
        drumNotes: drums
          ? drums.midiClips.reduce((n, c) => n + (c.events?.length ?? 0), 0)
          : null,
      };
    });
    const draftsAfter = await kit.listDrafts(page);
    const refused = !now.practice;
    // Refused (nothing changed) or, as the product does today, opened on a
    // drumless fallback: then the sink must have been kept once, whole.
    let lossless;
    let back = null;
    if (refused) {
      back = await sameAsSink(kit, run, page, sink);
      lossless =
        Boolean(toast || panel) &&
        back.same &&
        draftsAfter.every((m) =>
          draftsBefore.some((b) => b.draftId === m.draftId),
        );
    } else {
      const kept = draftsAfter.find((m) => m.draftId === sink.draft.draftId);
      const keptText = kept
        ? await kit.readDraftBody(page, kept.draftId)
        : null;
      lossless =
        kept?.origin === 'kept' &&
        workHash(keptText) === workHash(sink.draft.text);
    }
    const after = await kit.fingerprint(page);
    return {
      diffs: back?.diffs ?? [],
      extraLosses: [],
      flags: { grooveFailLosesNothing: lossless },
      checks: {
        grooveFailure: { refused, ...now },
        toasts: await kit.readToasts(page, since),
        panel,
        settle: [settle],
      },
      after,
    };
  });
}

async function badPayload(kit, run) {
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  // The sink's guitar clip plays an asset this mock must hold.
  const assetId = kit.seedSample(api);
  const projectId = api.seedProject({ name: 'Broken Payload' });
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      const sink = await kit.applySink(page, run, { assetId });
      const broken = {
        id: projectId,
        name: 'Broken Payload',
        composerName: null,
        bpm: 120,
        prism: { rootNote: null, rhythmName: '', genre: '', swing: 0 },
        tracks: 'not a list of tracks',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await page.route(
        (url) => url.pathname === projectPath(projectId),
        (route) =>
          route.request().method() === 'GET'
            ? route.fulfill({
                status: 200,
                headers: {
                  'content-type': 'application/json',
                  'access-control-allow-origin': '*',
                },
                body: SuperJSON.stringify(broken),
              })
            : route.fallback(),
      );
      const since = await kit.pageNow(page);
      await navigateInEditor(kit, page, `?project=${projectId}`);
      const state = await kit.waitForEditor(page);
      if (state !== 'ready' && state !== 'open-error')
        return kit.crashed(state);
      const panel = await page
        .waitForSelector('[data-testid="open-error"]', { timeout: 15_000 })
        .then(
          () => kit.openErrorText(page),
          () => null,
        );
      const outcome = await page.evaluate(
        () => window.__MA_SESSION__.getState().lastOutcome ?? null,
      );
      if (panel) {
        await page
          .locator('[data-testid="open-error"]')
          .getByRole('button', { name: 'Back to my work' })
          .click()
          .catch(() => {});
      }
      const settle = await kit.settle(page, 'after the failed open');
      const back = await sameAsSink(kit, run, page, sink);
      return {
        diffs: back.diffs,
        extraLosses: [],
        flags: {
          // A failure AFTER the switch (status failed, the kept work
          // reopened), never a refusal before keeping: that would make this
          // a second project500 and leave the unkeep path untested.
          failAfterResetRestores:
            Boolean(panel) &&
            back.same &&
            outcome?.status === 'failed' &&
            outcome.restored === 'kept',
        },
        checks: {
          panel,
          outcome: outcome
            ? { status: outcome.status, restored: outcome.restored ?? null }
            : null,
          toasts: await kit.readToasts(page, since),
          settle: [settle],
        },
        after: back.got,
      };
    },
    api,
  );
}

async function staleCompletion(kit, run) {
  fullTierOnly(run);
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  // The sink's guitar clip plays an asset this mock must hold.
  const assetId = kit.seedSample(api);
  const projectId = api.seedProject({
    name: 'Stale Project',
    tracks: [
      {
        name: 'Stale Keys',
        type: 'midi',
        instrument: 'piano-sampler',
        color: '#5a189a',
        mute: false,
        solo: false,
        volume: 0.7,
        pan: 0,
        activeEffects: [],
        settings: null,
        midiClips: [],
        audioClips: [],
      },
    ],
  });
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      await kit.applySink(page, run, { assetId });
      const slow = api.fault({
        method: 'GET',
        path: projectPath(projectId),
        delayMs: 3000,
        times: 1,
      });
      let sawStale = false;
      try {
        await navigateInEditor(kit, page, `?project=${projectId}`);
        await kit.sleep(600);
        await navigateInEditor(kit, page, '?new=1');
        const deadline = Date.now() + 6000;
        while (Date.now() < deadline) {
          sawStale ||= await page.evaluate(() =>
            window.__MA_STORE__
              .getState()
              .tracks.some((t) => t.name === 'Stale Keys'),
          );
          await kit.sleep(100);
        }
      } finally {
        slow();
      }
      const state = await kit.waitForEditor(page);
      if (state !== 'ready') return kit.crashed(state);
      await kit.settle(page, 'after the newer open');
      const now = await page.evaluate(() => ({
        name: window.__MA_STORE__.getState().projectName,
        projectId: window.__MA_STORE__.getState().projectId,
        tracks: window.__MA_STORE__.getState().tracks.length,
      }));
      return {
        diffs: [],
        extraLosses: [],
        flags: {
          staleOpenNeverApplied:
            !sawStale && now.projectId !== projectId && now.tracks === 0,
        },
        checks: { now, sawStale },
        after: await kit.fingerprint(page),
      };
    },
    api,
  );
}

const MSP_AND_UTM = {
  utm_source: 'rt',
  utm_campaign: 'r19',
  interactionId: 'i-1',
  enrollmentId: 'e-1',
  module: 'm-1',
  activityRef: 'a-1',
  expects: 'x',
  msp: '1',
  rtUnknown: 'kept',
};

async function params(kit, run) {
  fullTierOnly(run);
  const extra = new URLSearchParams(MSP_AND_UTM).toString();
  const cases = [
    { query: `?template=project-pop&${extra}`, consumed: ['template'] },
    { query: `?demo=bogus-id&${extra}`, consumed: ['demo'] },
  ];
  const seen = [];
  for (const c of cases) {
    await kit.withSession(
      run,
      c.query,
      async ({ page }) => {
        await kit.sleep(1500);
        const left = new URLSearchParams(
          await page.evaluate(() => location.search),
        );
        seen.push({
          query: c.query,
          left: [...left.keys()],
          ok:
            c.consumed.every((k) => !left.has(k)) &&
            Object.keys(MSP_AND_UTM).every(
              (k) => left.get(k) === MSP_AND_UTM[k],
            ),
        });
      },
      run.api,
      { allowCrash: true },
    );
  }
  return {
    diffs: [],
    extraLosses: [],
    flags: { onlyConsumedParamsStripped: seen.every((s) => s.ok) },
    checks: { params: seen },
  };
}

async function collabStub(kit, run) {
  fullTierOnly(run);
  return kit.withSession(run, '?new=1', async ({ page }) => {
    const sink = await kit.applySink(page, run);
    const since = await kit.pageNow(page);
    // A joiner's link (not ?collab=new, whose host opens at once): it waits
    // for the room, which never connects here.
    await navigateInEditor(kit, page, '?collab=rt-stub-room');
    // Kept before the join: the sink's draft turns 'kept' while the room is
    // being joined.
    let keptSeen = false;
    const deadline = Date.now() + 60_000;
    for (;;) {
      const metas = await kit.listDrafts(page).catch(() => []);
      keptSeen ||= metas.some(
        (m) => m.draftId === sink.draft.draftId && m.origin === 'kept',
      );
      const phase = await page.evaluate(
        () => window.__MA_SESSION__.getState().phase,
      );
      if (phase === 'ready' || phase === 'failed' || phase === 'idle') break;
      if (Date.now() > deadline) break;
      await kit.sleep(250);
    }
    const panel = await kit.openErrorText(page);
    const outcome = await page.evaluate(
      () => window.__MA_SESSION__.getState().lastOutcome ?? null,
    );
    if (panel) {
      await page
        .locator('[data-testid="open-error"]')
        .getByRole('button', { name: 'Back to my work' })
        .click()
        .catch(() => {});
    }
    const settle = await kit.settle(page, 'after the failed join');
    const back = await sameAsSink(kit, run, page, sink);
    const roomId = await page.evaluate(
      () => window.__MA_STORE__.getState().roomId ?? null,
    );
    // Given back means unkept: the sink's draft is the session's again,
    // not a kept draft beside it.
    const sinkMeta = (await kit.listDrafts(page)).find(
      (m) => m.draftId === sink.draft.draftId,
    );
    const sessionDraft = await page.evaluate(
      () => window.__MA_SESSION__.getState().draftId,
    );
    return {
      diffs: back.diffs,
      extraLosses: [],
      flags: {
        keptBeforeJoin: keptSeen,
        joinFailureRestores:
          back.same &&
          !roomId &&
          outcome?.status === 'failed' &&
          outcome.restored === 'kept' &&
          sessionDraft === sink.draft.draftId &&
          Boolean(sinkMeta) &&
          sinkMeta.origin !== 'kept',
      },
      checks: {
        panel,
        outcome: outcome
          ? { status: outcome.status, restored: outcome.restored ?? null }
          : null,
        roomId,
        sinkDraft: sinkMeta
          ? {
              origin: sinkMeta.origin,
              isSession: sessionDraft === sinkMeta.draftId,
            }
          : 'gone',
        toasts: await kit.readToasts(page, since),
        settle: [settle],
      },
      after: back.got,
    };
  });
}

const SCENARIOS = [
  [
    'projectSlow',
    'A slow cloud project opened in the editor: the overlay',
    projectSlow,
  ],
  [
    'project500',
    'A project the API fails on: the panel, then Back to my work',
    project500,
  ],
  [
    'practiceModeGrooveFails',
    'A practice link whose groove fails is refused with nothing changed',
    grooveFails,
  ],
  [
    'badPayload',
    'A failure after the switch gives the kept work back',
    badPayload,
  ],
  [
    'staleCompletion',
    '(full) A slow open superseded by ?new=1 never lands',
    staleCompletion,
  ],
  ['params', '(full) Only a link’s own keys leave the address bar', params],
  [
    'collabStub',
    '(full) ?collab=new with no PartyKit: kept, then given back',
    collabStub,
  ],
];

export const scenarios = (kit) =>
  SCENARIOS.map(([key, title, fn]) => ({
    group: 'R19',
    key,
    id: `R19-boot-errors:${key}`,
    title,
    run: (run) => fn(kit, run),
  }));
