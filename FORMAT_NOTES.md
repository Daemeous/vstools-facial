# Facial texture formats and implementation notes

These notes describe behaviour checked against a USA SLUS-01040 disc, rather
than a general promise about every region or all event behaviour.

## ETM

An OBJ/E*.ETM begins with ASCII `E0`, followed by a little-endian 16-bit
height. The remaining image is 64 PS1 VRAM words (128 bytes) per row.
It has no CLUT. With an 8-bit indexed character texture this represents
128 pixels per row; with a packed 4-bit character texture it represents
256 pixels, low nibble first. The SHP supplies the colour palette.
This is a custom container, not a standard PlayStation TIM.

## ESQ

The file starts with a 32-bit actor count, followed by three arrays of
32-bit values: model IDs, per-actor ETM Y offsets, and record offsets.
Record offsets are relative to the end of those arrays. Each record contains
a SEQ-compatible animation set. Atlas Y value 255 means no facial atlas.
Some original files have unused invalid slot references; these are counted
rather than preventing valid animation clips from opening.

## Compositing

The SHP header has eight destination rectangles at file offset 0x0C.
The next eight bytes at 0x2C describe the default mouth and eye source layouts.
The viewer modifies indexed image regions using the loaded SHP palette,
including destination/source alignment to the original VRAM word boundaries.
It restores the original texture before evaluating a tick, so seeking and
looping do not retain expressions from a later frame.

Implemented animation commands: 0x1E/0x1F source-layout descriptors;
0x20/0x21 supported blink start/stop; 0x2C direct atlas-region copy.
Standard SEQ action streams also support the 0xFF extended-frame encoding.
The optional BATTLE.PRG supplies original blink frame/hold patterns at runtime.
Other commands are parsed for their lengths but are not necessarily executed.

## References and licences

- Morris Brodersen's vstools (MIT): https://github.com/morris/vstools
- ser-pounce and its other contributors' rood-reverse (CC0):
  https://github.com/ser-pounce/rood-reverse
- noprompt's rood-boi (CC0): https://github.com/noprompt/rood-boi

The consulted game routines include _loadSeq and _loadEtm in BATTLE/30DB0.c,
func_800AB098 and func_800AB358 in BATTLE/40564.c, and animation command
handling in BATTLE/44F14.c. These references describe behaviour; no original
binary code, game texture or timing-table payload is bundled.

## Validation

The private-disc sweep opens and builds all ESQ records, validates every ETM,
and exercises direct copy commands against directly matching SHP model IDs.
Alias IDs and exact scene timing need further game comparisons. Automated
unit tests cover packed indices, malformed files, palette application,
unchanged pixels and texture restoration. Browser checks exercise loading,
manual expressions, event scrubbing and PNG download.
