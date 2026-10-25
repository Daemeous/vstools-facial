import { ESQ } from '../ESQ.js';
import { ETM } from '../ETM.js';
import { FacialAnimation } from '../FacialAnimation.js';
import { exportPng } from '../VSTOOLS.js';
import { TimeScale } from '../VSTOOLS.js';

export function facialPanel(getModel, setSequence, setTime) {
  const panel = document.querySelector('.app-facial');
  const field = (name) => panel.querySelector('.' + name);
  let esq,
    atlas,
    battle,
    compositor,
    sequence,
    elapsed = 0,
    lastFrame = -1;
  const status = (text) => {
    field('status').textContent = text;
  };
  const report = (error) => {
    field('playing').checked = false;
    status(error.message);
  };
  field('load-facial').addEventListener('click', async () => {
    try {
      const shp = getModel();
      if (!shp) throw new Error('Open a character SHP or ZUD first.');
      const e = field('esq-file').files[0],
        t = field('etm-file').files[0];
      if (!e || !t) throw new Error('Choose both an ESQ and its matching ETM.');
      if (
        e.name.replace(/\.esq$/i, '').toLowerCase() !==
        t.name.replace(/\.etm$/i, '').toLowerCase()
      )
        throw new Error('ESQ and ETM filenames must have the same stem.');
      esq = new ESQ(new Uint8Array(await e.arrayBuffer()));
      atlas = new ETM(new Uint8Array(await t.arrayBuffer()));
      const b = field('battle-file').files[0];
      battle = b ? new Uint8Array(await b.arrayBuffer()) : null;
      field('actor').replaceChildren(
        ...esq.entries.map((entry, i) => {
          const option = document.createElement('option');
          option.value = i;
          option.textContent =
            'Model ' +
            entry.model.toString(16).toUpperCase().padStart(2, '0') +
            (entry.atlasY === 255
              ? ' (no facial atlas)'
              : ' / atlas row ' + entry.atlasY);
          return option;
        }),
      );
      const match = esq.entries.findIndex(
        (entry) => entry.model === shp.modelId,
      );
      field('actor').selectedIndex = match < 0 ? 0 : match;
      select();
    } catch (error) {
      report(error);
    }
  });
  field('export-atlas').addEventListener('click', () => {
    try {
      const shp = getModel();
      if (!compositor || !shp) throw new Error('Load an event texture first.');
      const packed = shp.textureMap.version === 16;
      const width = packed ? 256 : 128;
      const rgba = new Uint8Array(width * atlas.height * 4);
      const colors = shp.textureMap.palettes[0].colors;
      for (let y = 0; y < atlas.height; y++)
        for (let x = 0; x < width; x++)
          rgba.set(
            colors[atlas.pixel(x, y, packed)] || [0, 0, 0, 0],
            ((atlas.height - y - 1) * width + x) * 4,
          );
      const link = document.createElement('a');
      link.download = field('etm-file').files[0].name + '.png';
      link.href = exportPng(rgba, width, atlas.height);
      link.click();
    } catch (error) {
      report(error);
    }
  });
  function select() {
    try {
      const shp = getModel();
      if (!shp || !esq) return;
      if (compositor) compositor.reset();
      const entry = esq.entries[Number(field('actor').value)];
      sequence = esq.sequence(Number(field('actor').value));
      if (!shp.textureMap.textures.length)
        throw new Error(
          'The original importer cannot decode this model texture. Choose a supported SHP.',
        );
      if (sequence.numBones !== shp.numBones)
        throw new Error(
          'This ESQ actor has a different skeleton. Select the matching actor.',
        );
      sequence.build();
      compositor = new FacialAnimation(shp, atlas, entry.atlasY, battle);
      setSequence(sequence);
      elapsed = 0;
      lastFrame = -1;
      status(
        entry.atlasY === 255
          ? 'This actor has no facial atlas in this event.'
          : 'Loaded. Manual previews work independently of the clip. ' +
              (battle
                ? 'Original blink timing available.'
                : 'Add USA BATTLE.PRG for scripted blink timing.'),
      );
    } catch (error) {
      compositor = null;
      report(error);
    }
  }
  field('actor').addEventListener('change', select);
  field('tick').addEventListener('input', () => {
    field('playing').checked = false;
    elapsed = Number(field('tick').value) * TimeScale;
    lastFrame = -1;
  });
  panel.addEventListener('change', () => {
    lastFrame = -1;
  });
  return {
    clear() {
      if (compositor) {
        compositor.reset();
        compositor.shp.textureMap.textures.forEach((t) => {
          t.needsUpdate = true;
        });
      }
      compositor = null;
      status('Open a character, then load its event ESQ/ETM pair.');
    },
    update(delta, animation) {
      if (!compositor || !animation) return;
      try {
        const length = Math.max(1, animation.length);
        if (field('playing').checked) elapsed += delta;
        const frame = Math.floor(elapsed / TimeScale) % length;
        if (lastFrame === frame) return;
        const manual = field('manual').checked;
        let mouth = Number(field('mouth').value),
          eyes = Number(field('eyes').value);
        if (manual && field('cycle').checked) {
          mouth = Math.floor(elapsed * 8) % 6;
          eyes = Math.floor(elapsed * 4) % 4;
          field('mouth').value = mouth;
          field('eyes').value = eyes;
        }
        compositor.render(
          frame,
          animation.actions || [],
          manual ? [mouth, eyes] : null,
        );
        setTime(frame * TimeScale);
        field('tick').max = length - 1;
        field('tick').value = frame;
        field('frame-label').textContent = frame + ' / ' + (length - 1);
        lastFrame = frame;
      } catch (error) {
        report(error);
      }
    },
    restart() {
      elapsed = 0;
      lastFrame = -1;
    },
  };
}
