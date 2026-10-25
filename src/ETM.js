// ETM stores 64 VRAM words per row, without a palette. SHP supplies the CLUT.
export class ETM {
  constructor(data) {
    if (data.length < 4 || data[0] !== 0x45 || data[1] !== 0x30)
      throw new Error('Not an E0 ETM texture atlas');
    this.height = data[2] | (data[3] << 8);
    if (
      !this.height ||
      this.height > 256 ||
      data.length < 4 + 128 * this.height
    )
      throw new Error('Truncated or invalid ETM atlas');
    this.data = data.slice(4, 4 + 128 * this.height);
  }
  pixel(x, y, packed) {
    const width = packed ? 256 : 128;
    if (x < 0 || x >= width || y < 0 || y >= this.height)
      throw new Error('Facial frame falls outside the ETM atlas');
    const value = this.data[y * 128 + (packed ? x >> 1 : x)];
    return packed ? (value >> ((x & 1) * 4)) & 15 : value;
  }
}
