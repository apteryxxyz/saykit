import 'server-only';

import { unstable_createWithSay } from '@saykit/react/server';
import { Say } from 'saykit';

const say = new Say({
  locales: ['en', 'fr'],
  messages: {
    en: await import('./locales/en/messages.json').then((m) => m.default),
    fr: await import('./locales/fr/messages.json').then((m) => m.default),
  },
});

export const withSay = unstable_createWithSay(say);

export default say;
