import { describe, expect, it } from 'vitest';
import { crc32, zipStore, ZipWriter } from '../zip-store';

// ── Store-only ZIP writer (milestone 2.15) ─────────────────────────────────
// The stems export's archive, read back here with a small reader of our own:
// each local header, the central directory and the end record must agree on
// names, sizes, CRCs and offsets, or an unzip tool rejects the file.

const bytes = (text: string) => new TextEncoder().encode(text);
const text = (data: Uint8Array) => new TextDecoder().decode(data);

interface ReadEntry {
  name: string;
  flags: number;
  method: number;
  crc: number;
  size: number;
  offset: number;
  data: Uint8Array;
  time: number;
  date: number;
}

/** Reads a store-only archive through its central directory. */
function readZip(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  const all = new Uint8Array(buffer);
  const endAt = buffer.byteLength - 22;
  expect(view.getUint32(endAt, true)).toBe(0x06054b50);
  const end = {
    onDisk: view.getUint16(endAt + 8, true),
    total: view.getUint16(endAt + 10, true),
    centralSize: view.getUint32(endAt + 12, true),
    centralOffset: view.getUint32(endAt + 16, true),
    commentLength: view.getUint16(endAt + 20, true),
  };
  const entries: ReadEntry[] = [];
  let at = end.centralOffset;
  for (let i = 0; i < end.total; i++) {
    expect(view.getUint32(at, true)).toBe(0x02014b50);
    const nameLength = view.getUint16(at + 28, true);
    const offset = view.getUint32(at + 42, true);
    const central = {
      flags: view.getUint16(at + 8, true),
      method: view.getUint16(at + 10, true),
      time: view.getUint16(at + 12, true),
      date: view.getUint16(at + 14, true),
      crc: view.getUint32(at + 16, true),
      compressed: view.getUint32(at + 20, true),
      size: view.getUint32(at + 24, true),
      name: text(all.subarray(at + 46, at + 46 + nameLength)),
    };
    expect(central.compressed).toBe(central.size);

    // The local header repeats what the central directory says.
    expect(view.getUint32(offset, true)).toBe(0x04034b50);
    expect(view.getUint16(offset + 6, true)).toBe(central.flags);
    expect(view.getUint16(offset + 8, true)).toBe(central.method);
    expect(view.getUint32(offset + 14, true)).toBe(central.crc);
    expect(view.getUint32(offset + 18, true)).toBe(central.size);
    expect(view.getUint32(offset + 22, true)).toBe(central.size);
    const localName = view.getUint16(offset + 26, true);
    const extra = view.getUint16(offset + 28, true);
    expect(text(all.subarray(offset + 30, offset + 30 + localName))).toBe(
      central.name,
    );
    const dataAt = offset + 30 + localName + extra;
    entries.push({
      ...central,
      offset,
      data: all.slice(dataAt, dataAt + central.size),
    });
    at += 46 + nameLength;
  }
  expect(at - end.centralOffset).toBe(end.centralSize);
  return { end, entries };
}

describe('crc32', () => {
  it('matches the standard check values', () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
    expect(crc32(bytes('The quick brown fox jumps over the lazy dog'))).toBe(
      0x414fa339,
    );
    expect(crc32(bytes('123456789'))).toBe(0xcbf43926);
  });
});

describe('zipStore', () => {
  const date = new Date(2026, 9, 17, 14, 35, 42);
  const files = [
    { name: '01-bass.wav', data: bytes('low end') },
    { name: '02-voix-é.wav', data: bytes('the singer, louder') },
  ];

  it('writes an archive whose every entry reads back', async () => {
    const blob = zipStore(files, date);
    expect(blob.type).toBe('application/zip');
    const { end, entries } = readZip(await blob.arrayBuffer());

    expect(end).toMatchObject({ onDisk: 2, total: 2, commentLength: 0 });
    expect(entries.map((e) => e.name)).toEqual([
      '01-bass.wav',
      '02-voix-é.wav',
    ]);
    entries.forEach((entry, i) => {
      expect(entry.method).toBe(0);
      expect(entry.flags & 0x0800).toBe(0x0800);
      expect(entry.size).toBe(files[i].data.length);
      expect(entry.crc).toBe(crc32(files[i].data));
      expect(text(entry.data)).toBe(text(files[i].data));
    });

    // The first entry starts the file; the second follows its data.
    const firstName = new TextEncoder().encode(files[0].name).length;
    expect(entries[0].offset).toBe(0);
    expect(entries[1].offset).toBe(30 + firstName + files[0].data.length);
    // The central directory follows the last entry's data.
    const secondName = new TextEncoder().encode(files[1].name).length;
    expect(end.centralOffset).toBe(
      entries[1].offset + 30 + secondName + files[1].data.length,
    );
    expect(blob.size).toBe(end.centralOffset + end.centralSize + 22);
  });

  it("stamps each entry with the date's DOS time and date", async () => {
    const { entries } = readZip(await zipStore(files, date).arrayBuffer());
    for (const entry of entries) {
      expect(entry.time).toBe((14 << 11) | (35 << 5) | 21);
      expect(entry.date).toBe(((2026 - 1980) << 9) | (10 << 5) | 17);
    }
  });

  it('writes an empty archive as a lone end record', async () => {
    const blob = zipStore([], date);
    expect(blob.size).toBe(22);
    const { end, entries } = readZip(await blob.arrayBuffer());
    expect(entries).toEqual([]);
    expect(end).toMatchObject({ total: 0, centralSize: 0, centralOffset: 0 });
  });

  it('refuses an archive that would need ZIP64', () => {
    const many = Array.from({ length: 65536 }, (_, i) => ({
      name: `${i}`,
      data: new Uint8Array(0),
    }));
    expect(() => zipStore(many, date)).toThrow(/Too many files/);
  });
});

describe('ZipWriter', () => {
  const date = new Date(2026, 9, 17, 14, 35, 42);

  it('takes Blob entries with their CRC, referenced rather than copied', async () => {
    const take = bytes('a stem kept as a Blob');
    const writer = new ZipWriter(date);
    writer.add({ name: '01-bass.wav', data: bytes('bytes in memory') });
    writer.add({
      name: '02-keys.wav',
      data: new Blob([take]),
      crc: crc32(take),
      size: take.length,
    });
    expect(writer.count).toBe(2);
    const { entries } = readZip(await writer.finish().arrayBuffer());
    expect(entries.map((e) => text(e.data))).toEqual([
      'bytes in memory',
      'a stem kept as a Blob',
    ]);
    expect(entries[1].crc).toBe(crc32(take));
  });

  it('refuses a Blob without its CRC, or a size that is not its own', () => {
    const writer = new ZipWriter(date);
    expect(() =>
      writer.add({ name: 'a.wav', data: new Blob([bytes('abc')]) }),
    ).toThrow(/CRC-32/);
    expect(() =>
      writer.add({ name: 'b.wav', data: bytes('abc'), size: 4 }),
    ).toThrow(/size/);
    expect(writer.count).toBe(0);
  });

  it('refuses the entry that would pass 4 GiB as it arrives', () => {
    // A Blob that says it is nearly 4 GiB, without holding it.
    const huge = new Blob([]);
    Object.defineProperty(huge, 'size', { value: 0xffffff80 });
    const writer = new ZipWriter(date);
    writer.add({ name: 'small.wav', data: bytes('small') });
    expect(() => writer.add({ name: 'huge.wav', data: huge, crc: 0 })).toThrow(
      /too large/,
    );
    expect(writer.count).toBe(1);
  });

  it('refuses the 65536th entry as it arrives', () => {
    const writer = new ZipWriter(date);
    for (let i = 0; i < 65535; i++) {
      writer.add({ name: `${i}`, data: new Uint8Array(0) });
    }
    expect(() =>
      writer.add({ name: 'one-more', data: new Uint8Array(0) }),
    ).toThrow(/Too many files/);
  });
});
