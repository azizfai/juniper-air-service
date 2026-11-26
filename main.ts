// Juniper Air Service — entry packer.
// Copies the static game and its four screenshots into the output directory,
// then lets the kit helper write the dossier the judge reads.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

// The helper hands back the finished dossier; only serialise it if it is still an object.
const ready = typeof dossier === 'string' || dossier instanceof Uint8Array;
writeFileSync(join(out, 'dossier.json'), ready ? dossier : JSON.stringify(dossier));
