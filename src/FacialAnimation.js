// Independent indexed-texture compositor; no game assets or executable tables.
export class FacialAnimation {
  constructor(shp, atlas, atlasY, battleData = null) {
    this.shp = shp;
    this.atlas = atlas;
    this.atlasY = atlasY;
    this.base = shp.textureMap.textures.map((t) => t.image.data.slice());
    this.tables = null;
    if (battleData) {
      // USA SLUS-01040 BATTLE.PRG loaded at 0x80068800. Supplied by the user.
      const start = 0x800e909c - 0x80068800;
      const end = 0x800e916c - 0x80068800 + 32;
      if (battleData.length < end) throw new Error('BATTLE.PRG is too short');
      this.tables = [
        battleData.slice(start, start + 224),
        battleData.slice(0x800e916c - 0x80068800, end),
      ];
    }
  }
  reset() {
    this.shp.textureMap.textures.forEach((t, i) =>
      t.image.data.set(this.base[i]),
    );
  }
  copy(overlayIndex, x, y) {
    const shp = this.shp,
      tm = shp.textureMap;
    if (this.atlasY === 255) return;
    if (overlayIndex < 0 || overlayIndex >= 8)
      throw new Error('Invalid texture overlay');
    const packed = tm.version === 16;
    const divisor = packed ? 4 : 2; // SHP coordinates use PS1 texture-page units.
    const dx = Math.floor(shp.overlayX[overlayIndex] / divisor) * divisor;
    const width = Math.floor(shp.width[overlayIndex] / divisor) * divisor;
    const dy = shp.overlayY[overlayIndex],
      height = shp.height[overlayIndex];
    const sx = Math.floor(x / divisor) * divisor;
    const sy = y + this.atlasY;
    if (!width || !height) return;
    const tw = tm.getWidth();
    if (
      dx + width > tw ||
      dy + height > tm.height ||
      sx + width > (packed ? 256 : 128) ||
      sy + height > this.atlas.height
    )
      throw new Error(
        'This expression does not fit the selected model/atlas pair',
      );
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const index = this.atlas.pixel(sx + col, sy + row, packed);
        tm.textures.forEach((t, palette) => {
          const color = tm.palettes[palette].colors[index];
          t.image.data.set(
            color || [0, 0, 0, 0],
            ((dy + row) * tw + dx + col) * 4,
          );
        });
      }
    }
  }
  channel(index, frame, descriptor = null) {
    const d = descriptor || [
      index ? 7 : 5,
      ...this.shp.facialDefaults[index].slice(0, 3),
    ];
    const [overlay, x, y, columns] = d;
    if (!columns || !overlay) return;
    const part = overlay - 1;
    const divisor = this.shp.textureMap.version === 16 ? 4 : 2;
    const width = Math.floor(this.shp.width[part] / divisor) * divisor;
    this.copy(
      part,
      x + (frame % columns) * width,
      y + Math.floor(frame / columns) * this.shp.height[part],
    );
  }
  pattern(channel, id, tick) {
    if (!this.tables || !id) return 0;
    const stride = channel ? 16 : 56,
      table = this.tables[channel];
    const start = id * stride;
    if (start + stride > table.length) return 0;
    const frames = [];
    for (let i = start; i < start + stride && table[i]; i += 2)
      frames.push([table[i] - 1, table[i + 1] + 1]);
    const duration = frames.reduce((sum, f) => sum + f[1], 0);
    if (!duration) return 0;
    tick %= duration;
    for (const [frame, hold] of frames) {
      if (tick < hold) return frame;
      tick -= hold;
    }
    return 0;
  }
  render(frame, actions, manual = null) {
    this.reset();
    if (manual) {
      this.channel(0, manual[0]);
      this.channel(1, manual[1]);
    } else {
      const descriptors = [null, null];
      let blink = false,
        blinkStart = 0;
      for (const action of actions) {
        if (action.f > frame) continue;
        const p = action.params;
        if (action.opcode === 30 || action.opcode === 31)
          descriptors[action.opcode - 30] = p;
        if (action.opcode === 32) {
          blink = true;
          blinkStart = action.f;
        }
        if (action.opcode === 33) blink = false;
      }
      this.channel(0, 0, descriptors[0]);
      this.channel(
        1,
        blink ? this.pattern(1, 1, frame - blinkStart) : 0,
        descriptors[1],
      );
      // Direct texture-copy commands remain active until another command overwrites them.
      for (const action of actions) {
        if (action.f <= frame && action.opcode === 44)
          this.copy(action.params[0], action.params[1], action.params[2]);
      }
    }
    this.shp.textureMap.textures.forEach((t) => {
      t.needsUpdate = true;
    });
  }
}
