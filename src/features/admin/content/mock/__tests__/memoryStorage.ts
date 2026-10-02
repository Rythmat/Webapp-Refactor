/** A Storage double, so quota and corruption can be staged. */
export class MemoryStorage implements Storage {
  data = new Map<string, string>();
  failWith: unknown = null;
  writes = 0;
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.writes += 1;
    if (this.failWith) throw this.failWith;
    this.data.set(key, value);
  }
}
