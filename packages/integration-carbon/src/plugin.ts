import { Plugin } from '@buape/carbon';
import type { Say } from 'saykit';
import { kSay } from './constants.js';
import { applyBaseInteractionExtension } from './extensions/base-interaction.js';
import { applyGuildExtension } from './extensions/guild.js';

/**
 * A Carbon plugin that provides a singleton {@link Say} instance.
 *
 * `SayPlugin` registers a {@link Say} instance globally and
 * applies interaction and guild-level extensions so that commands and
 * other handlers can access localisation utilities directly.
 *
 * @example
 * ```ts
 * const say = new Say({ ... });
 * const client = new Client({ ... }, { ... }, [new SayPlugin(say)]);
 * ```
 */
export class SayPlugin extends Plugin {
  id = 'saykit';

  constructor(say: Say) {
    super();
    Reflect.set(globalThis, kSay, say);
    applyBaseInteractionExtension();
    applyGuildExtension();
  }
}
