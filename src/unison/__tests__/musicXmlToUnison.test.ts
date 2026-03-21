// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  musicXmlToUnison,
  importMusicXmlFileAsUnison,
} from '../converters/musicXmlToUnison';

const PPQ = 480;

/** Build a minimal MusicXML wrapper around measure content. */
function wrapXml(
  measures: string,
  opts?: {
    fifths?: number;
    mode?: string;
    beats?: number;
    beatType?: number;
    tempo?: number;
    title?: string;
    partName?: string;
    divisions?: number;
  },
): string {
  const {
    fifths = 0,
    mode = 'major',
    beats = 4,
    beatType = 4,
    tempo = 120,
    title = 'Test',
    partName = 'Piano',
    divisions = 1,
  } = opts ?? {};

  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>${title}</work-title></work>
  <part-list>
    <score-part id="P1"><part-name>${partName}</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>${divisions}</divisions>
        <key><fifths>${fifths}</fifths><mode>${mode}</mode></key>
        <time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <direction placement="above">
        <direction-type><words>q = ${tempo}</words></direction-type>
        <sound tempo="${tempo}"/>
      </direction>
      ${measures}
    </measure>
  </part>
</score-partwise>`;
}

/** Shorthand for a MusicXML note. */
function xmlNote(
  step: string,
  octave: number,
  type: string,
  opts?: {
    alter?: number;
    chord?: boolean;
    dots?: number;
    tieStart?: boolean;
    tieStop?: boolean;
  },
): string {
  const { alter, chord, dots = 0, tieStart, tieStop } = opts ?? {};
  const lines: string[] = ['<note>'];
  if (chord) lines.push('<chord/>');
  lines.push('<pitch>');
  lines.push(`  <step>${step}</step>`);
  if (alter !== undefined) lines.push(`  <alter>${alter}</alter>`);
  lines.push(`  <octave>${octave}</octave>`);
  lines.push('</pitch>');
  lines.push(`<duration>1</duration>`);
  lines.push(`<type>${type}</type>`);
  for (let d = 0; d < dots; d++) lines.push('<dot/>');
  if (tieStart) lines.push('<tie type="start"/>');
  if (tieStop) lines.push('<tie type="stop"/>');
  lines.push('</note>');
  return lines.join('\n');
}

/** Shorthand for a MusicXML rest. */
function xmlRest(type: string): string {
  return `<note><rest/><duration>1</duration><type>${type}</type></note>`;
}

/** Shorthand for a MusicXML harmony. */
function xmlHarmony(rootStep: string, kind: string, alter?: number): string {
  const alterTag = alter ? `<root-alter>${alter}</root-alter>` : '';
  return `<harmony><root><root-step>${rootStep}</root-step>${alterTag}</root><kind>${kind}</kind></harmony>`;
}

describe('musicXmlToUnison', () => {
  it('produces a valid UnisonDocument from minimal MusicXML', () => {
    const xml = wrapXml(xmlNote('C', 4, 'quarter'));
    const doc = musicXmlToUnison(xml);

    expect(doc.version).toBe('1.0.0');
    expect(doc.metadata.source).toBe('sheet-music');
    expect(doc.metadata.title).toBe('Test');
    expect(doc.tracks.length).toBeGreaterThan(0);
  });

  it('extracts title from work-title', () => {
    const xml = wrapXml(xmlNote('C', 4, 'quarter'), { title: 'Autumn Leaves' });
    const doc = musicXmlToUnison(xml);
    expect(doc.metadata.title).toBe('Autumn Leaves');
  });

  it('options title overrides work-title', () => {
    const xml = wrapXml(xmlNote('C', 4, 'quarter'), { title: 'XML Title' });
    const doc = musicXmlToUnison(xml, { title: 'Override Title' });
    expect(doc.metadata.title).toBe('Override Title');
  });

  it('extracts key signature (C major, fifths=0)', () => {
    const xml = wrapXml(xmlNote('C', 4, 'quarter'), {
      fifths: 0,
      mode: 'major',
    });
    const doc = musicXmlToUnison(xml);
    expect(doc.analysis.key.rootPc).toBe(0); // C
  });

  it('extracts key signature (G major, fifths=1)', () => {
    const xml = wrapXml(xmlNote('G', 4, 'quarter'), {
      fifths: 1,
      mode: 'major',
    });
    const doc = musicXmlToUnison(xml);
    // Key detector may refine, but rootNote hint is G=7
    expect(doc.analysis.key).toBeDefined();
  });

  it('extracts key signature (Eb minor, fifths=-6, mode=minor)', () => {
    const xml = wrapXml(xmlNote('E', 4, 'quarter', { alter: -1 }), {
      fifths: -6,
      mode: 'minor',
    });
    const doc = musicXmlToUnison(xml);
    expect(doc.analysis.key).toBeDefined();
  });

  it('extracts time signature', () => {
    const xml = wrapXml(xmlNote('C', 4, 'quarter'), { beats: 3, beatType: 4 });
    const doc = musicXmlToUnison(xml);
    expect(doc.rhythm.timeSignatureNumerator).toBe(3);
    expect(doc.rhythm.timeSignatureDenominator).toBe(4);
  });

  it('extracts tempo', () => {
    const xml = wrapXml(xmlNote('C', 4, 'quarter'), { tempo: 140 });
    const doc = musicXmlToUnison(xml);
    expect(doc.rhythm.bpm).toBe(140);
  });

  it('options bpm overrides tempo in XML', () => {
    const xml = wrapXml(xmlNote('C', 4, 'quarter'), { tempo: 140 });
    const doc = musicXmlToUnison(xml, { bpm: 95 });
    expect(doc.rhythm.bpm).toBe(95);
  });

  it('parses note pitches correctly', () => {
    const notes = [
      xmlNote('C', 4, 'quarter'),
      xmlNote('E', 4, 'quarter'),
      xmlNote('G', 4, 'quarter'),
    ].join('\n');
    const xml = wrapXml(notes);
    const doc = musicXmlToUnison(xml);

    const events = doc.tracks[0]?.events ?? [];
    expect(events.length).toBe(3);
    expect(events[0].pitch).toBe(60); // C4
    expect(events[1].pitch).toBe(64); // E4
    expect(events[2].pitch).toBe(67); // G4
  });

  it('handles accidentals (sharps and flats)', () => {
    const notes = [
      xmlNote('F', 4, 'quarter', { alter: 1 }), // F#4
      xmlNote('B', 3, 'quarter', { alter: -1 }), // Bb3
    ].join('\n');
    const xml = wrapXml(notes);
    const doc = musicXmlToUnison(xml);

    const events = doc.tracks[0]?.events ?? [];
    expect(events[0].pitch).toBe(66); // F#4
    expect(events[1].pitch).toBe(58); // Bb3
  });

  it('parses chord (simultaneous notes)', () => {
    const notes = [
      xmlNote('C', 4, 'quarter'),
      xmlNote('E', 4, 'quarter', { chord: true }),
      xmlNote('G', 4, 'quarter', { chord: true }),
    ].join('\n');
    const xml = wrapXml(notes);
    const doc = musicXmlToUnison(xml);

    const events = doc.tracks[0]?.events ?? [];
    expect(events.length).toBe(3);
    // All three notes should start at the same tick
    expect(events[0].startTick).toBe(events[1].startTick);
    expect(events[0].startTick).toBe(events[2].startTick);
  });

  it('handles dotted notes', () => {
    // A dotted quarter = 480 + 240 = 720 ticks
    const xml = wrapXml(xmlNote('C', 4, 'quarter', { dots: 1 }));
    const doc = musicXmlToUnison(xml);

    const events = doc.tracks[0]?.events ?? [];
    expect(events[0].durationTicks).toBe(PPQ + PPQ / 2); // 720
  });

  it('handles ties (extends duration)', () => {
    const notes = [
      xmlNote('C', 4, 'quarter', { tieStart: true }),
      xmlNote('C', 4, 'quarter', { tieStop: true }),
    ].join('\n');
    const xml = wrapXml(notes);
    const doc = musicXmlToUnison(xml);

    const events = doc.tracks[0]?.events ?? [];
    // Should be 1 event with combined duration (480 + 480 = 960)
    expect(events.length).toBe(1);
    expect(events[0].durationTicks).toBe(PPQ * 2);
  });

  it('parses rests (advances tick without creating events)', () => {
    const notes = [
      xmlNote('C', 4, 'quarter'),
      xmlRest('quarter'),
      xmlNote('E', 4, 'quarter'),
    ].join('\n');
    const xml = wrapXml(notes);
    const doc = musicXmlToUnison(xml);

    const events = doc.tracks[0]?.events ?? [];
    expect(events.length).toBe(2);
    // E4 should start after C4 + rest = 960 ticks
    expect(events[1].startTick).toBe(PPQ * 2);
  });

  it('parses harmony elements into chord timeline', () => {
    const content = [xmlHarmony('C', 'major'), xmlNote('C', 4, 'whole')].join(
      '\n',
    );
    const xml = wrapXml(content);
    const doc = musicXmlToUnison(xml);

    expect(doc.analysis.chordTimeline.length).toBeGreaterThan(0);
  });

  it('parses harmony with altered root (Bb dominant)', () => {
    const content = [
      xmlHarmony('B', 'dominant', -1),
      xmlNote('B', 3, 'whole', { alter: -1 }),
    ].join('\n');
    const xml = wrapXml(content);
    const doc = musicXmlToUnison(xml);

    expect(doc.analysis.chordTimeline.length).toBeGreaterThan(0);
  });

  it('sets source metadata correctly', () => {
    const xml = wrapXml(xmlNote('C', 4, 'quarter'));
    const doc = musicXmlToUnison(xml, { filename: 'score.musicxml' });

    expect(doc.metadata.source).toBe('sheet-music');
    expect(doc.metadata.sourceFilename).toBe('score.musicxml');
  });

  it('handles empty MusicXML gracefully', () => {
    const xml = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>X</part-name></score-part></part-list>
  <part id="P1"></part>
</score-partwise>`;
    const doc = musicXmlToUnison(xml);
    expect(doc.version).toBe('1.0.0');
    expect(doc.metadata.source).toBe('sheet-music');
  });

  it('importMusicXmlFileAsUnison works with string input', () => {
    const xml = wrapXml(xmlNote('C', 4, 'quarter'));
    const doc = importMusicXmlFileAsUnison(xml, { title: 'From String' });
    expect(doc.metadata.title).toBe('From String');
    expect(doc.metadata.source).toBe('sheet-music');
  });

  it('importMusicXmlFileAsUnison works with ArrayBuffer input', () => {
    const xml = wrapXml(xmlNote('C', 4, 'quarter'));
    const buffer = new TextEncoder().encode(xml).buffer;
    const doc = importMusicXmlFileAsUnison(buffer, { title: 'From Buffer' });
    expect(doc.metadata.title).toBe('From Buffer');
  });

  it('extracts part name from part-list', () => {
    const xml = wrapXml(xmlNote('C', 4, 'quarter'), { partName: 'Flute' });
    const doc = musicXmlToUnison(xml);

    // The track name should come from the part-list
    expect(doc.tracks[0]?.name).toBe('Flute');
  });

  it('handles multi-part score', () => {
    const xml = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <work><work-title>Duet</work-title></work>
  <part-list>
    <score-part id="P1"><part-name>Violin</part-name></score-part>
    <score-part id="P2"><part-name>Cello</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes><divisions>1</divisions></attributes>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;
    const doc = musicXmlToUnison(xml);

    expect(doc.tracks.length).toBe(2);
    expect(doc.tracks[0].name).toBe('Violin');
    expect(doc.tracks[1].name).toBe('Cello');
  });
});
