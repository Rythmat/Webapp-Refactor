// ── Store-only ZIP writer (milestone 2.15) ─────────────────────────────────
//
// A stems export hands the student one file instead of one download per
// track (which Chrome would stop at with its "multiple downloads" prompt).
// Audio is already as small as it gets, so nothing is compressed: each entry
// is stored (method 0) with its CRC-32, which every unzip tool and the
// operating systems' own archive viewers open. Names are UTF-8 (general
// purpose bit 11), so a track named in any language keeps its name. There is
// no ZIP64: an archive past 4 GiB or 65535 entries is refused, far beyond
// any classroom song.
//
// The archive is a Blob of parts: each entry's data goes in as it came (a
// Blob is referenced, not copied), so a stems export never holds every stem
// in one buffer and the browser can keep large parts on disk. ZipWriter
// takes entries one at a time and checks the limits as they arrive, so an
// export that would overflow stops at once rather than after the last render.

export interface ZipEntry {
  name: string;
  /** The entry's bytes. A Blob's CRC-32 must be given (it can't be read
   *  synchronously): compute it from the bytes before wrapping them. */
  data: Uint8Array | Blob;
  /** CRC-32 of the data; computed for a Uint8Array when left out. */
  crc?: number;
  /** Byte length of the data; checked against it when given. */
  size?: number;
}

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const END_RECORD = 0x06054b50;
const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const END_RECORD_SIZE = 22;
// Version 2.0, the one every reader understands.
const ZIP_VERSION = 20;
// General purpose bit 11: the name is UTF-8.
const UTF8_FLAG = 0x0800;
const MAX_ENTRIES = 0xffff;
const MAX_BYTES = 0xffffffff;

let crcTable: Uint32Array | null = null;

/** The CRC-32 lookup table (polynomial 0xEDB88320), built on first use. */
function table(): Uint32Array {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c >>> 0;
  }
  return crcTable;
}

/** The CRC-32 of `data`, as ZIP (and PNG, gzip) define it. */
export function crc32(data: Uint8Array): number {
  const t = table();
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = t[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** `date` as MS-DOS local time and date words (two-second steps, 1980–2107). */
function dosDateTime(date: Date): { time: number; date: number } {
  const year = date.getFullYear();
  if (year < 1980) return { time: 0, date: (1 << 5) | 1 };
  if (year > 2107) {
    return {
      time: (23 << 11) | (59 << 5) | 29,
      date: (127 << 9) | (12 << 5) | 31,
    };
  }
  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/**
 * Builds a store-only ZIP archive one entry at a time, every entry stamped
 * with `date`. `add` throws as soon as the archive would need ZIP64 (over
 * 65535 entries or 4 GiB); `finish` returns the archive.
 */
export class ZipWriter {
  private readonly stamp: { time: number; date: number };
  private readonly encoder = new TextEncoder();
  private readonly parts: Array<Uint8Array | Blob> = [];
  private readonly central: Uint8Array[] = [];
  // Bytes of local headers and data so far: where the next entry starts.
  private offset = 0;
  private centralSize = 0;

  constructor(date: Date = new Date()) {
    this.stamp = dosDateTime(date);
  }

  /** The number of entries added so far. */
  get count(): number {
    return this.central.length;
  }

  add(entry: ZipEntry): void {
    const { data } = entry;
    let size: number;
    let crc: number;
    if (data instanceof Uint8Array) {
      size = data.length;
      crc = entry.crc ?? crc32(data);
    } else {
      if (entry.crc === undefined) {
        throw new Error(`${entry.name} needs its CRC-32 to go in a ZIP`);
      }
      size = data.size;
      crc = entry.crc;
    }
    if (entry.size !== undefined && entry.size !== size) {
      throw new Error(`The size given for ${entry.name} is not its own`);
    }
    if (this.central.length >= MAX_ENTRIES) {
      throw new Error('Too many files for one ZIP archive');
    }
    const name = this.encoder.encode(entry.name);
    const total =
      this.offset +
      this.centralSize +
      LOCAL_HEADER_SIZE +
      CENTRAL_HEADER_SIZE +
      2 * name.length +
      size +
      END_RECORD_SIZE;
    if (total > MAX_BYTES) {
      throw new Error('The files are too large for one ZIP archive');
    }
    const stamp = this.stamp;

    const local = new Uint8Array(LOCAL_HEADER_SIZE + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, LOCAL_HEADER, true);
    lv.setUint16(4, ZIP_VERSION, true);
    lv.setUint16(6, UTF8_FLAG, true);
    lv.setUint16(8, 0, true); // method: stored
    lv.setUint16(10, stamp.time, true);
    lv.setUint16(12, stamp.date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true); // compressed size
    lv.setUint32(22, size, true); // uncompressed size
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true); // extra field length
    local.set(name, LOCAL_HEADER_SIZE);

    const record = new Uint8Array(CENTRAL_HEADER_SIZE + name.length);
    const cv = new DataView(record.buffer);
    cv.setUint32(0, CENTRAL_HEADER, true);
    cv.setUint16(4, ZIP_VERSION, true); // made by (MS-DOS attributes)
    cv.setUint16(6, ZIP_VERSION, true); // needed to extract
    cv.setUint16(8, UTF8_FLAG, true);
    cv.setUint16(10, 0, true); // method: stored
    cv.setUint16(12, stamp.time, true);
    cv.setUint16(14, stamp.date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, name.length, true);
    // Extra field, comment, disk number, internal and external attributes
    // (30–41) stay zero.
    cv.setUint32(42, this.offset, true); // where the local header starts
    record.set(name, CENTRAL_HEADER_SIZE);

    this.parts.push(local, data);
    this.central.push(record);
    this.offset += local.length + size;
    this.centralSize += record.length;
  }

  /** The archive: the entries, the central directory and the end record. */
  finish(): Blob {
    const end = new Uint8Array(END_RECORD_SIZE);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, END_RECORD, true);
    // Disk numbers (4–7) stay zero: one archive, one disk.
    ev.setUint16(8, this.count, true); // entries on this disk
    ev.setUint16(10, this.count, true); // entries in all
    ev.setUint32(12, this.centralSize, true);
    ev.setUint32(16, this.offset, true); // where the central directory starts
    ev.setUint16(20, 0, true); // comment length
    return new Blob([...this.parts, ...this.central, end] as BlobPart[], {
      type: 'application/zip',
    });
  }
}

/**
 * The `files` as one store-only ZIP archive, every entry stamped with `date`.
 * Throws when the archive would need ZIP64 (over 65535 entries or 4 GiB).
 */
export function zipStore(
  files: readonly ZipEntry[],
  date: Date = new Date(),
): Blob {
  const writer = new ZipWriter(date);
  for (const file of files) writer.add(file);
  return writer.finish();
}
