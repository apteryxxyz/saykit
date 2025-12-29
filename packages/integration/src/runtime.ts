import { mf1ToMessage } from '@messageformat/icu-messageformat-1';
import type {
  Disallow,
  NumeralOptions,
  SelectOptions,
  Tuple,
} from './types.js';

export namespace Say {
  export type Messages = { [key: string]: string };

  export type Loader<Locale extends string> = (
    locale: Locale,
  ) => Messages | Promise<Messages>;

  export type Options<
    Locale extends string,
    Loader extends Say.Loader<Locale> | undefined,
  > = {
    locales: Locale[];
  } & (
    | { messages: Record<Locale, Messages>; loader?: Loader }
    | { messages?: Partial<Record<Locale, Messages>>; loader: Loader }
  );
}

export interface Say {
  // ===== Macros ===== //

  /**
   * Define a message.
   *
   * @example
   * ```ts
   * say`Hello, ${name}!`
   * ```
   *
   * @remark This is a macro and must be used with the relevant saykit plugin
   */
  (strings: TemplateStringsArray, ...placeholders: unknown[]): string;

  /**
   * Provide a custom id or context for the message, the latter used to disambiguate
   * identical strings that have different meanings depending on usage.
   *
   * @example
   * ```ts
   * say({ context: 'direction' })`Right`
   * say({ context: 'correctness' })`Right`
   * ```
   *
   * @param descriptor Object containing optional `id` and `context` properties
   * @remark This is a macro and must be used with the relevant saykit plugin
   */
  (descriptor: { id?: string; context?: string }): Say;
}

export type ReadonlySay<
  Locale extends string = string,
  Loader extends Say.Loader<Locale> | undefined =
    | Say.Loader<Locale>
    | undefined,
> = Omit<Say<Locale, Loader>, 'activate' | 'load' | 'assign'>;

export class Say<
  Locale extends string = string,
  Loader extends Say.Loader<Locale> | undefined =
    | Say.Loader<Locale>
    | undefined,
> {
  #locales: Locale[];
  #loader?: Loader;
  #messages: Map<Locale, Say.Messages>;
  #active: Locale | undefined;

  constructor(options: Say.Options<Locale, Loader>) {
    this.#locales = options.locales;
    this.#loader = options.loader;
    this.#messages = new Map();
    if (options.messages) this.assign(options.messages);
  }

  /**
   * The currently active locale.
   *
   * @throws If no locale is active
   */
  get locale() {
    if (!this.#active) throw new Error('No active locale');
    return this.#active;
  }

  /**
   * All available messages mapped by locale.
   *
   * @throws If no locale is active
   * @throws If no messages are available for the active locale
   */
  get messages() {
    if (!this.#messages.has(this.locale))
      throw new Error('No messages loaded for locale');
    return this.#messages.get(this.locale)!;
  }

  /**
   * Loads messages for the given locales.
   * If no locales are provided, all available locales are loaded.
   * Requires a {@link Say.Loader} to be provided.
   * If `loader` returns a promise, so will this method.
   *
   * @param locales Locales to load messages for, defaults to {@link Say.locales}
   * @returns This
   */
  load(...locales: Locale[]) {
    if (Object.isFrozen(this))
      throw new Error('Cannot load messages on a frozen Say');
    if (locales.length === 0) locales = this.#locales;

    const tasks: Promise<unknown>[] = [];
    for (const locale of locales) {
      if (this.#messages.has(locale)) continue;
      if (!this.#loader)
        throw new Error('No loader provided, cannot load messages');

      const result = this.#loader(locale);
      if (result instanceof Promise) {
        const task = result.then((m) => this.assign(locale, m));
        tasks.push(task);
      } else {
        this.assign(locale, result);
      }
    }

    return tasks.length > 0 ? Promise.all(tasks).then(() => this) : this;
  }

  /**
   * Manually bulk assign messages.
   *
   * @param messages Messages map to assign
   */
  assign(messages: Partial<Record<Locale, Say.Messages>>): this;
  /**
   * Manually assign messages to a locale.
   *
   * @param locale Locale to assign messages to
   * @param messages Messages to assign
   * @returns This
   */
  assign(locale: Locale, messages: Say.Messages): this;
  assign(
    localeOrMessages: Locale | Partial<Record<Locale, Say.Messages>>,
    maybeMessages?: Say.Messages,
  ) {
    if (Object.isFrozen(this))
      throw new Error('Cannot assign messages on a frozen Say');
    if (typeof localeOrMessages === 'string') {
      this.#messages.set(localeOrMessages, maybeMessages!);
    } else {
      for (const locale in localeOrMessages)
        this.#messages.set(locale, localeOrMessages[locale]!);
    }
    return this;
  }

  /**
   * Set the active locale.
   *
   * @param locale Locale to set
   * @returns This
   * @throws If locale is not available
   */
  activate(locale: Locale) {
    if (Object.isFrozen(this))
      throw new Error('Cannot activate locale on a frozen Say');
    if (!this.#messages.has(locale))
      throw new Error('No messages loaded for locale');
    // const currentLocale = this.#active;
    this.#active = locale;
    // this.emit('localeChange', locale, currentLocale);
    return this;
  }

  /**
   * Creates a clone of the Say instance, with the same locales and messages.
   *
   * @returns A clone of the Say instance
   */
  clone() {
    return new Say({
      locales: this.#locales,
      messages: Object.fromEntries(this.#messages) as any,
      loader: this.#loader,
    }) as unknown as this;
  }

  freeze() {
    return Object.freeze(this) as ReadonlySay<Locale, Loader>;
  }

  /**
   * Calls a defined callback function on each locale, passing the Say instance and locale to the callback.
   *
   * @param callback Callback function to call on each locale
   */
  map<T>(
    callbackfn: (
      value: [this, Locale],
      index: number,
      array: [this, Locale][],
    ) => T,
  ) {
    return this.#locales
      .map((l) => [this.clone().activate(l), l] satisfies Tuple)
      .map(callbackfn);
  }

  /**
   * Calls the specified callback function for all the elements in an array, passing the Say instance and locale to the callback.
   *
   * @param callback Callback function to call for each element
   * @param initial Initial value to use as the first argument to the first call of the callback
   */
  reduce<T>(
    callbackfn: (
      previousValue: T,
      currentValue: [this, Locale],
      currentIndex: number,
      array: [this, Locale][],
    ) => T,
    initialValue: T,
  ) {
    return this.#locales
      .map((l) => [this.clone().activate(l), l] satisfies Tuple)
      .reduce(callbackfn, initialValue);
  }

  *[Symbol.iterator]() {
    for (const l of this.#locales) {
      yield [this.clone().activate(l), l] as const;
    }
  }

  /**
   * Matches the best locale from a list of guesses.
   *
   * @param guesses List of locale guesses
   *
   * @returns The best matching locale, or the first locale if no matches are found
   */
  match(guesses: string[]) {
    for (const guess of guesses) {
      if (this.#locales.includes(guess as Locale)) return guess;
    }

    for (const guess of guesses) {
      const prefix = guess.split('-')[0]!;
      const match = this.#locales.find((l) => l.startsWith(prefix));
      if (match) return match;
    }

    return this.#locales[0]!;
  }

  /**
   * Get the translation for a descriptor.
   *
   * @param descriptor Descriptor to get the translation for
   * @returns The translation string for the descriptor
   * @throws If no locale is active
   * @throws If no messages are available for the active locale
   * @throws If descriptor id is not found
   */
  call(descriptor: { id: string; [match: string | number]: unknown }) {
    return this.#call(this.locale, this.messages, descriptor);
  }

  #call(
    locale: Locale,
    messages: Record<string, string>,
    descriptor: { id: string; [match: string | number]: unknown },
  ) {
    const message = messages[descriptor.id];
    if (typeof message !== 'string')
      throw new Error(`Message for ${descriptor.id} is not a string`);

    const format = mf1ToMessage(locale, message);
    return String(format.format(descriptor));
  }

  [Symbol.for('nodejs.util.inspect.custom')](
    _depth: number,
    context: import('node:util').InspectContext,
    inspect: typeof import('node:util').inspect,
  ) {
    if (this.#active)
      return `${this.constructor.name}<${inspect(this.#active, context)}> {}`;
    else return `${this.constructor.name} {}`;
  }

  // ===== Macros ===== //

  /**
   * Define a pluralised message.
   *
   * @example
   * ```ts
   * say.plural(count, {
   *   one: 'You have 1 item',
   *   other: 'You have # items',
   * })
   * ```
   *
   * The `#` symbol inside options is replaced with the numeric value.
   * @param _ Number to determine the plural form of
   * @param options Pluralisation rules keyed by CLDR categories or specific numbers
   * @returns The plural form of the number
   * @remark This is a macro and must be used with the relevant saykit plugin
   */
  plural(
    _: number,
    options: Disallow<NumeralOptions, 'id' | 'context'>,
  ): string {
    void _;
    void options;
    throw new Error(
      "'Say#plural' is a macro and must be used with the relevant saykit plugin",
    );
  }

  /**
   * Define an ordinal message (e.g. "1st", "2nd", "3rd").
   * The `#` symbol inside options is replaced with the numeric value.
   *
   * @example
   * ```ts
   * say.ordinal(position, {
   *   1: '#st',
   *   2: '#nd',
   *   3: '#rd',
   *   other: '#th',
   * })
   * ```
   *
   * @param _ Number to determine the ordinal form of
   * @param options Ordinal rules keyed by CLDR categories or specific numbers
   * @returns The ordinal form of the number
   * @remark This is a macro and must be used with the relevant saykit plugin
   */
  ordinal(
    _: number,
    options: Disallow<NumeralOptions, 'id' | 'context'>,
  ): string {
    void _;
    void options;
    throw new Error(
      "'Say#ordinal' is a macro and must be used with the relevant saykit plugin",
    );
  }

  /**
   * Define a select message, useful for handling gender, status, or other categories.
   *
   * @example
   * ```ts
   * say.select(gender, {
   *   male: 'He',
   *   female: 'She',
   *   other: 'They',
   * })
   * ```
   *
   * @param _ Selector value to determine which option is chosen
   * @param options A mapping of possible selector values to message strings
   * @returns The select form of the value
   * @remark This is a macro and must be used with the relevant saykit plugin
   */
  select(
    _: string,
    options: Disallow<SelectOptions, 'id' | 'context'>,
  ): string {
    void _;
    void options;
    throw new Error(
      "'Say#select' is a macro and must be used with the relevant saykit plugin",
    );
  }
}

export * from './types.js';
