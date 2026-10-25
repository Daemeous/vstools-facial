# VSTOOLS Facial Animation Viewer

A version of [Morris Brodersen's vstools](https://github.com/morris/vstools)
with Vagrant Story event animations, facial texture previews and ETM atlas PNG export.
This is an independent modification, not an official release by Morris or Square Enix.

## Run locally

Install Node.js 22 or newer, then run:

```sh
npm ci
npm run serve -- -a 127.0.0.1
```

Open http://127.0.0.1:8080 in Chrome, Edge or Firefox with WebGL enabled.
The viewer uses local dependencies. No game files are included or uploaded.
Supply extracted files from your own copy of the game. Facial support is tested
against the USA disc, SLUS-01040; other regions have not been verified.

## Show facial animation

1. Under **File**, choose a character's `OBJ/*.SHP` and click **Open**.
   A normal `.SEQ` can still be supplied in the second file input.
2. Under **Facial animation**, choose an `OBJ/E*.ESQ` and its matching
   `OBJ/E*.ETM`, for example `E001.ESQ` and `E001.ETM`.
3. Optionally supply the original USA `BATTLE/BATTLE.PRG` for the game's blink
   pattern timing. These tables are read from your file, not shipped here.
4. Click **Load facial animation**. Select the matching actor in the event.
   The viewer initially selects a matching SHP filename ID when one is present.
   Some event IDs are aliases, so this does not always select automatically.
5. Choose an animation with the existing animation number and arrow buttons.
   **Play** and the **Animation tick** slider control the event animation.
6. With **Manual expressions** checked, change **Mouth frame** and **Eye frame**.
   **Cycle expression frames** is a preview loop, not original dialogue timing.
   The default preview ranges are mouth 0-5 and eyes 0-3; actual available frames
   depend on the character/event. Invalid atlas regions produce a visible error.
7. Uncheck **Manual expressions** to apply the clip's facial descriptors,
   direct texture-copy commands and supported blink commands.
8. **Export atlas PNG** saves the ETM decoded with the selected SHP's first
   palette. A shared event atlas may contain other actors whose colours differ.

A verified starting combination is `01.SHP` + `E001.ESQ` + `E001.ETM`.
Use the actor labelled Model 01. The first clip is a short setup pose; select
other clips for longer body motions, or use the manual expression controls.

## Scope and limitations

This is a model/expression viewer, not a complete cutscene player. It does not
execute EVT scene scripts, dialogue cues, audio, scene lighting, root motion,
vertex morphs or all non-facial animation commands. Talking triggered by dialogue
requires manual preview here. Exact cutscene parity has not been established.
Scripted blinking requires the optional USA BATTLE.PRG; without it the neutral
frame is used for those blink commands. The inherited model/animation importer
still has limitations, including some models, base poses and animation tracks.

SHP, WEP, SEQ, ZUD, ZND, MPD and ARM viewing remain available. Maps require the
correct ZND. OBJ export retains the upstream geometry-only behaviour; facial
animation is not exported in OBJ or glTF.

## Tests

```sh
npm test
npm run lint
npm run test:disc -- /path/to/extracted/OBJ
```

The last command uses private local fixtures and does not copy them into the repo.
The original broad asset tests remain under `npm run test:legacy` and require
its original local `data/` and `debug/` setup.
See [FORMAT_NOTES.md](FORMAT_NOTES.md) for the implemented format and validation.

## Licence and credits

MIT, with the original Morris Brodersen copyright and permission notice preserved
in [LICENSE.md](LICENSE.md). The additional viewer code is also provided under MIT.
Game assets remain the property of their respective owners; the software licence
does not grant rights to redistribute them. No extracted game assets, expression
atlases or executable timing tables are committed.

- **Morris Brodersen**: original vstools, model parsers, viewer and animation code.
- **Daemeous**: this facial-animation viewer project.
- **ser-pounce and its other contributors**: [rood-reverse](https://github.com/ser-pounce/rood-reverse),
  the decompilation used to understand the loader and texture-copy behaviour.
- **noprompt**: [rood-boi](https://github.com/noprompt/rood-boi), whose readable
  native-port code was also consulted. Both repositories carry CC0 licences.
- Original vstools acknowledgments: **Michael Collins**, **Oliver Barraza**
  (weapon textures), and **korobetski** (vertex-coloured character models).

The facial compositor and ETM/ESQ directory readers are new JavaScript
implementations informed by the format and decompiled behaviour. Original
vstools history and notices are retained.
