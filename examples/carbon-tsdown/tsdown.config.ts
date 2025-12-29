import { defineConfig } from 'tsdown';
import saykit from 'unplugin-saykit/rolldown';

export default defineConfig({
  entry: ['src/entry.ts'],
  plugins: [saykit()],
});
