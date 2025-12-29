import { defineConfig } from '@saykit/config';

export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'fr'],
  buckets: [
    {
      include: ['src/**/*.{ts,tsx}'],
      output: 'src/locales/{locale}/messages.{extension}',
    },
  ],
});
