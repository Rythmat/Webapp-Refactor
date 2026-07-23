// Minimal CBOR decoder (RFC 8949 subset): ints, floats, strings, byte
// strings, arrays, maps, tags, simple values. Enough for Serum 2's data
// model (definite lengths only — Serum never emits indefinite).

export type CborValue =
  | number
  | bigint
  | string
  | boolean
  | null
  | Uint8Array
  | CborValue[]
  | { [key: string]: CborValue };

class Reader {
  pos = 0;
  private view: DataView;

  constructor(view: DataView) {
    this.view = view;
  }

  u8(): number {
    return this.view.getUint8(this.pos++);
  }
  uint(bytes: 1 | 2 | 4 | 8): number {
    const v = this.view;
    let out: number;
    if (bytes === 1) out = v.getUint8(this.pos);
    else if (bytes === 2) out = v.getUint16(this.pos);
    else if (bytes === 4) out = v.getUint32(this.pos);
    else out = Number(v.getBigUint64(this.pos));
    this.pos += bytes;
    return out;
  }
  f16(): number {
    const h = this.view.getUint16(this.pos);
    this.pos += 2;
    const sign = h & 0x8000 ? -1 : 1;
    const exp = (h >> 10) & 0x1f;
    const frac = h & 0x3ff;
    if (exp === 0) return sign * frac * 2 ** -24;
    if (exp === 31) return frac === 0 ? sign * Infinity : NaN;
    return sign * (1 + frac / 1024) * 2 ** (exp - 15);
  }
  f32(): number {
    const out = this.view.getFloat32(this.pos);
    this.pos += 4;
    return out;
  }
  f64(): number {
    const out = this.view.getFloat64(this.pos);
    this.pos += 8;
    return out;
  }
  bytes(n: number): Uint8Array {
    const out = new Uint8Array(
      this.view.buffer,
      this.view.byteOffset + this.pos,
      n,
    );
    this.pos += n;
    return out;
  }
}

const utf8 = new TextDecoder();

function readLength(r: Reader, info: number): number {
  if (info < 24) return info;
  if (info === 24) return r.uint(1);
  if (info === 25) return r.uint(2);
  if (info === 26) return r.uint(4);
  if (info === 27) return r.uint(8);
  throw new Error(`indefinite/reserved CBOR length (info=${info})`);
}

function decodeItem(r: Reader): CborValue {
  const ib = r.u8();
  const major = ib >> 5;
  const info = ib & 0x1f;

  switch (major) {
    case 0:
      return readLength(r, info);
    case 1:
      return -1 - readLength(r, info);
    case 2:
      return r.bytes(readLength(r, info));
    case 3:
      return utf8.decode(r.bytes(readLength(r, info)));
    case 4: {
      const n = readLength(r, info);
      const arr: CborValue[] = [];
      for (let i = 0; i < n; i++) arr.push(decodeItem(r));
      return arr;
    }
    case 5: {
      const n = readLength(r, info);
      const map: { [key: string]: CborValue } = {};
      for (let i = 0; i < n; i++) {
        const key = decodeItem(r);
        map[String(key)] = decodeItem(r);
      }
      return map;
    }
    case 6:
      readLength(r, info); // tag number — skip, decode payload
      return decodeItem(r);
    default: {
      // major 7: floats + simple values
      if (info === 20) return false;
      if (info === 21) return true;
      if (info === 22 || info === 23) return null;
      if (info === 25) return r.f16();
      if (info === 26) return r.f32();
      if (info === 27) return r.f64();
      throw new Error(`unhandled CBOR simple value (info=${info})`);
    }
  }
}

export function decodeCbor(buf: Uint8Array): CborValue {
  const reader = new Reader(
    new DataView(buf.buffer, buf.byteOffset, buf.byteLength),
  );
  return decodeItem(reader);
}
