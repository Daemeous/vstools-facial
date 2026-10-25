// Private disc fixtures are read in place and never copied into the repository.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { ESQ } from '../src/ESQ.js';
import { ETM } from '../src/ETM.js';
import { SHP } from '../src/SHP.js';
import { Reader } from '../src/Reader.js';
import { FacialAnimation } from '../src/FacialAnimation.js';
const dir = process.argv[2];
if (!dir) throw new Error('Usage: npm run test:disc -- /path/to/extracted/OBJ');
let events = 0,
  entries = 0,
  clips = 0,
  atlases = 0,
  directCopies = 0,
  models = 0;
const cached = new Map();
for (const name of fs.readdirSync(dir).filter((f) => /\.ETM$/i.test(f))) {
  new ETM(fs.readFileSync(path.join(dir, name)));
  atlases++;
}
for (const name of fs.readdirSync(dir).filter((f) => /\.ESQ$/i.test(f))) {
  const esq = new ESQ(fs.readFileSync(path.join(dir, name)));
  events++;
  const atlasName = path.join(dir, name.replace(/\.ESQ$/i, '.ETM'));
  const atlas = fs.existsSync(atlasName)
    ? new ETM(fs.readFileSync(atlasName))
    : null;
  for (let i = 0; i < esq.entries.length; i++) {
    const entry = esq.entries[i],
      seq = esq.sequence(i);
    entries++;
    seq.build();
    clips += seq.animations.length;
    const shpName = path.join(
      dir,
      entry.model.toString(16).toUpperCase().padStart(2, '0') + '.SHP',
    );
    if (!atlas || entry.atlasY === 255 || !fs.existsSync(shpName)) continue;
    let shp = cached.get(shpName);
    if (!shp) {
      shp = new SHP(new Reader(fs.readFileSync(shpName)));
      shp.read();
      shp.build();
      cached.set(shpName, shp);
      models++;
    }
    if (shp.numBones !== seq.numBones || !shp.textureMap.textures.length)
      continue;
    const compositor = new FacialAnimation(shp, atlas, entry.atlasY);
    compositor.render(0, [], [0, 0]);
    compositor.reset();
    for (const animation of seq.animations) {
      for (const action of animation.actions || []) {
        if (action.opcode !== 44) continue;
        compositor.reset();
        compositor.copy(...action.params);
        assert.equal(
          shp.textureMap.textures[0].image.data.length,
          compositor.base[0].length,
        );
        directCopies++;
      }
    }
    compositor.reset();
  }
}
console.log(
  JSON.stringify({ events, entries, clips, atlases, models, directCopies }),
);
