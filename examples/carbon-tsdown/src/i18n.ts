import { Say } from 'saykit';

const say = new Say({
  locales: ['en', 'fr'],
  messages: {
    en: await import('./locales/en/messages.json').then((m) => m.default),
    fr: await import('./locales/fr/messages.json').then((m) => m.default),
  },
});

say.load();
say.activate('en');

export default say;
