/**
 * Where the Home prompt bar's Go goes (promptRouting.ts): a suggestion taken
 * or typed out opens its route; other text the assistant's keyword match in
 * the destination picked; else the destination's own way in.
 */
import { describe, expect, it, vi } from 'vitest';
import type { MatchResult } from '../../dashboard/assistant/types';
import {
  areaOf,
  globeQuery,
  intentOf,
  onInstrument,
  resolvePromptRoute,
} from '../promptRouting';
import { GUITAR_SUGGESTIONS, PROMPT_SUGGESTIONS } from '../promptSuggestions';

const entry = (route: string): MatchResult => ({
  entry: {
    label: route,
    description: '',
    route,
    keywords: [],
    category: 'genre',
  },
  score: 10,
});
const none = () => [];

/** A matcher finding a jazz course, then a jazz ear game. */
const jazzThenChroma = () => [
  entry('/learn/keyboard/genre/jazz'),
  entry('/arcade/chroma'),
];

describe('resolvePromptRoute', () => {
  const studioPick = PROMPT_SUGGESTIONS.find((s) => s.target === 'studio')!;

  it('opens a taken suggestion’s route', () => {
    expect(
      resolvePromptRoute({
        text: `${studioPick.text} `,
        target: null,
        accepted: studioPick,
        match: none,
      }),
    ).toBe(studioPick.route);
  });

  it('opens a suggestion typed out, whatever the case', () => {
    const globe = PROMPT_SUGGESTIONS.find((s) => s.target === 'globe')!;
    expect(
      resolvePromptRoute({
        text: globe.text.toUpperCase(),
        target: null,
        accepted: null,
        match: none,
      }),
    ).toBe(globe.route);
  });

  it('makes a song idea of an edited song suggestion', () => {
    const text = `${studioPick.text} but funkier`;
    expect(
      resolvePromptRoute({
        text,
        target: null,
        accepted: studioPick,
        match: none,
      }),
    ).toBe(`/studio?prompt=${encodeURIComponent(text)}`);
  });

  it('leaves an edited question to the matcher', () => {
    const learnPick = PROMPT_SUGGESTIONS.find((s) => s.target === 'learn')!;
    const match = vi.fn(() => [entry('/learn/keyboard/genre/funk')]);
    expect(
      resolvePromptRoute({
        text: `${learnPick.text} please`,
        target: null,
        accepted: learnPick,
        match,
      }),
    ).toBe('/learn/keyboard/genre/funk');
  });

  it('opens the Studio on a song idea for a song prompt, or anything sent to the Studio', () => {
    const go = (
      text: string,
      target: Parameters<typeof resolvePromptRoute>[0]['target'] = null,
    ) =>
      resolvePromptRoute({
        text,
        target,
        accepted: null,
        match: () => [entry('/learn/keyboard/genre/funk')],
      });
    expect(go('make a funk beat')).toBe(
      '/studio?prompt=make%20a%20funk%20beat',
    );
    expect(go('funk in E at 100 bpm')).toMatch(/^\/studio\?prompt=/);
    expect(go('teach me funk')).toBe('/learn/keyboard/genre/funk');
    expect(go('teach me funk', 'studio')).toBe(
      '/studio?prompt=teach%20me%20funk',
    );
  });

  it('keeps a match to the destination picked', () => {
    const match = jazzThenChroma;
    expect(
      resolvePromptRoute({
        text: 'jazz ear game',
        target: 'arcade',
        accepted: null,
        match,
      }),
    ).toBe('/arcade/chroma');
  });

  it('falls back to each destination’s way in', () => {
    const go = (target: Parameters<typeof resolvePromptRoute>[0]['target']) =>
      resolvePromptRoute({
        text: 'polka & yodel',
        target,
        accepted: null,
        match: none,
      });
    expect(go('studio')).toBe('/studio?prompt=polka%20%26%20yodel');
    expect(go('globe')).toBe('/globe?q=polka%20%26%20yodel');
    expect(go('arcade')).toBe('/arcade');
    expect(go('learn')).toBe('/search?q=polka%20%26%20yodel');
    expect(go(null)).toBe('/search?q=polka%20%26%20yodel');
  });
});

describe('a prompt’s first word', () => {
  const go = (
    text: string,
    target: Parameters<typeof resolvePromptRoute>[0]['target'] = null,
    match: (text: string) => MatchResult[] = none,
  ) => resolvePromptRoute({ text, target, accepted: null, match });

  it('names the destination: Make, Teach, Show, How or Play', () => {
    expect(intentOf('Make me a lofi beat in D minor')).toBe('studio');
    expect(intentOf('  teach me how to play funk guitar')).toBe('learn');
    expect(intentOf('Show me the history of jazz')).toBe('globe');
    expect(intentOf('How did hip-hop start?')).toBe('globe');
    expect(intentOf('Play a rhythm game')).toBe('arcade');
    expect(intentOf('Makeover my song')).toBeNull();
    expect(intentOf('jazz')).toBeNull();
  });

  it('“Make” makes a Studio project from the prompt', () => {
    expect(go('Make me a lofi beat in D minor')).toBe(
      '/studio?prompt=Make%20me%20a%20lofi%20beat%20in%20D%20minor',
    );
  });

  it('“Teach” opens a lesson the matcher finds there', () => {
    const match = () => [
      entry('/arcade/foli'),
      entry('/learn/keyboard/genre/funk'),
    ];
    expect(go('Teach me how to play funk guitar', null, match)).toBe(
      '/learn/keyboard/genre/funk',
    );
  });

  it('“Show” and “How” search the Globe for the topic', () => {
    expect(go('Show me the history of bossa nova')).toBe(
      '/globe?q=bossa%20nova',
    );
    expect(go('How did reggae start?')).toBe('/globe?q=reggae');
  });

  it('“Play” opens the game the matcher finds, else the Arcade', () => {
    const match = jazzThenChroma;
    expect(go('Play a jazz ear game', null, match)).toBe('/arcade/chroma');
    expect(go('Play something fun')).toBe('/arcade');
  });

  it('gives way to the destination picked under the bar', () => {
    expect(go('Show me a rhythm game', 'arcade')).toBe('/arcade');
  });
});

describe('globeQuery', () => {
  it('keeps the topic, drops the lead-in', () => {
    expect(globeQuery('Show me the history of jazz')).toBe('jazz');
    expect(globeQuery('Show me Bob Marley')).toBe('Bob Marley');
    expect(globeQuery('How did K-pop rise?')).toBe('K-pop');
    expect(globeQuery('show me')).toBe('show me');
  });
});

describe('areaOf', () => {
  it('knows each destination’s paths', () => {
    expect(areaOf('/studio?new=1')).toBe('studio');
    expect(areaOf('/songs/superstition')).toBe('learn');
    expect(areaOf('/learn/keyboard/genre/jazz')).toBe('learn');
    expect(areaOf('/globe?era=postwar')).toBe('globe');
    expect(areaOf('/arcade/foli')).toBe('arcade');
    expect(areaOf('/search?q=x')).toBeNull();
  });
});

describe('the Learn page’s bar, on an instrument', () => {
  it('opens one of its own suggestions typed out', () => {
    const song = GUITAR_SUGGESTIONS.find(
      (s) => s.route === '/songs/wonderwall',
    )!;
    expect(
      resolvePromptRoute({
        text: song.text.toUpperCase(),
        target: null,
        accepted: null,
        match: none,
        suggestions: GUITAR_SUGGESTIONS,
        instrument: 'guitar',
      }),
    ).toBe('/songs/wonderwall');
  });

  it('on guitar, opens a Theory lesson the matcher finds on guitar', () => {
    const route = (instrument?: 'piano' | 'guitar') =>
      resolvePromptRoute({
        text: 'Teach me dorian',
        target: null,
        accepted: null,
        match: () => [entry('/learn/keyboard/dorian')],
        instrument,
      });
    expect(route('guitar')).toBe('/learn/guitar/dorian');
    expect(route('piano')).toBe('/learn/keyboard/dorian');
    expect(route()).toBe('/learn/keyboard/dorian');
  });

  it('moves only Theory lessons guitar teaches', () => {
    expect(onInstrument('/learn/keyboard/ionian/g', 'guitar')).toBe(
      '/learn/guitar/ionian/g',
    );
    expect(onInstrument('/learn/keyboard/relative/c', 'guitar')).toBe(
      '/learn/keyboard/relative/c',
    );
    expect(onInstrument('/learn/guitar/dorian', 'guitar')).toBe(
      '/learn/guitar/dorian',
    );
    expect(onInstrument('/songs/jolene', 'guitar')).toBe('/songs/jolene');
    expect(onInstrument('/learn/keyboard/dorian', 'piano')).toBe(
      '/learn/keyboard/dorian',
    );
  });
});
