import { readFile, rm, writeFile } from 'node:fs/promises';
import { defineConfig } from 'tsdown';

const CLIENT_IMPORT =
  '"use client"; import { useSay as GET_SAY } from "./client.mjs";';
const SERVER_IMPORT = 'import { getSay as GET_SAY } from "./server.mjs";';

export default defineConfig({
  entry: [
    'src/runtime/index.ts',
    'src/runtime/client.ts',
    'src/runtime/server.ts',
  ],
  target: 'es2020',
  async onSuccess() {
    const indexClientMjs = await readFile('dist/index.mjs', 'utf8');
    await writeFile('dist/index.client.mjs', CLIENT_IMPORT + indexClientMjs);
    const indexServerMjs = await readFile('dist/index.mjs', 'utf8');
    await writeFile('dist/index.server.mjs', SERVER_IMPORT + indexServerMjs);
    await rm('dist/index.mjs');
  },
});
