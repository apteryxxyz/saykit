import { Guild } from '@buape/carbon';
import type { Say } from 'saykit';
import { kSay } from '~/constants.js';

declare module '@buape/carbon' {
  interface Guild {
    get say(): Say;
    [kSay]: Say;
  }
}

export function applyGuildExtension() {
  Object.defineProperty(Guild.prototype, 'say', {
    get(this: Guild) {
      const say = Reflect.get(globalThis, kSay) as Say;
      if (!say) throw new Error('No `say` instance available');

      this[kSay] ??= say.clone();
      const locale = this[kSay].match([this.rawData.preferred_locale]);
      this[kSay].activate(locale);
      return this[kSay];
    },
  });

  return () => {
    Object.defineProperty(Guild.prototype, 'say', {
      value: undefined,
    });
  };
}
