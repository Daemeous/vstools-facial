import { SEQ } from './SEQ.js';
import { Reader } from './Reader.js';

// An ESQ directory has three parallel arrays: model IDs, atlas Y offsets,
// and offsets relative to the end of the directory. Each record is a SEQ.
export class ESQ {
  constructor(data) {
    this.data = data;
    const r = new Reader(data);
    const count = r.u32();
    if (!count || count > 17 || 4 + count * 12 > data.length)
      throw new Error('Invalid ESQ directory');
    const ids = Array.from({ length: count }, () => r.u32());
    const rows = Array.from({ length: count }, () => r.u32());
    const offsets = Array.from({ length: count }, () => r.u32());
    const base = r.pos;
    this.entries = ids.map((model, i) => {
      const offset = base + offsets[i];
      if (offset < base || offset + 16 > data.length)
        throw new Error('Invalid ESQ record offset');
      return { model, atlasY: rows[i], offset };
    });
  }
  sequence(index) {
    const entry = this.entries[index];
    if (!entry) throw new Error('Select an ESQ actor');
    const reader = new Reader(this.data);
    reader.seek(entry.offset);
    const seq = new SEQ(reader);
    seq.read();
    return seq;
  }
}
