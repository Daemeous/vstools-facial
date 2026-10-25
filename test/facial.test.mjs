import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ETM } from '../src/ETM.js';
import { ESQ } from '../src/ESQ.js';
import { FacialAnimation } from '../src/FacialAnimation.js';
import { SEQAnimation } from '../src/SEQAnimation.js';
import { Reader } from '../src/Reader.js';

test('event action streams support extended frames and facial descriptors', () => {
  const animation = new SEQAnimation(new Reader(new Uint8Array([
    0, 30, 5, 0, 12, 4,
    255, 5, 44, 4, 32, 16,
    255, 6, 0,
  ])), {});
  animation.length = 300;
  animation.readActions();
  assert.deepEqual(animation.actions.map(a => [a.f, a.opcode, a.params]), [
    [0, 30, [5, 0, 12, 4]], [260, 44, [4, 32, 16]],
  ]);
});

test('ETM validates headers, decodes both indexed formats and rejects out-of-range pixels', () => {
  const data = new Uint8Array(132);
  data.set([0x45, 0x30, 1, 0, 0x21]);
  const atlas = new ETM(data);
  assert.equal(atlas.pixel(0, 0, false), 33);
  assert.equal(atlas.pixel(0, 0, true), 1);
  assert.equal(atlas.pixel(1, 0, true), 2);
  assert.throws(() => atlas.pixel(256, 0, true));
  assert.throws(() => new ETM(data.slice(0, 130)));
  assert.throws(() => new ETM(new Uint8Array(132)));
});
test('invalid ESQ directories fail before dereferencing records', () => {
  assert.throws(() => new ESQ(new Uint8Array(4)));
  const data = new Uint8Array(20);
  data[0] = 1;
  data[12] = 200;
  assert.throws(() => new ESQ(data));
});
test('frame copies preserve unrelated pixels, use the SHP palette and restore on seek', () => {
  const data = new Uint8Array(132);
  data.set([0x45, 0x30, 1, 0, 1, 2, 3, 4]);
  const image = { width: 4, height: 2, data: new Uint8Array(32).fill(99) };
  const colors = [
    [0, 0, 0, 0],
    [10, 20, 30, 255],
    [40, 50, 60, 255],
    [70, 80, 90, 255],
    [100, 110, 120, 255],
  ];
  const shp = {
    facialDefaults: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    overlayX: [0],
    overlayY: [1],
    width: [2],
    height: [1],
    textureMap: {
      version: 1,
      height: 2,
      getWidth: () => 4,
      textures: [{ image }],
      palettes: [{ colors }],
    },
  };
  const f = new FacialAnimation(shp, new ETM(data), 0);
  f.render(4, [{ f: 4, opcode: 44, params: [0, 2, 0] }]);
  assert.deepEqual(
    [...image.data.slice(16, 24)],
    [70, 80, 90, 255, 100, 110, 120, 255],
  );
  assert.equal(image.data[0], 99);
  f.reset();
  assert.ok(image.data.every((x) => x === 99));
});
