import { readFile } from 'node:fs/promises';
export async function load(url, context, next) {
  if (url.includes('/node_modules/three/') && url.endsWith('.js'))
    return {
      format: 'module',
      source: await readFile(new URL(url), 'utf8'),
      shortCircuit: true,
    };
  return next(url, context);
}
