import 'server-only';

import { cache, createElement, type ReactNode } from 'react';
import { type ReadonlySay, Say } from 'saykit';

type SayRef = { current: ReadonlySay | null };
const serverContext = cache<() => SayRef>(() => ({ current: null }));

/**
 * Set the current {@link Say} **server** instance.
 * Must be called before any {@link getSay} calls.
 *
 * @param say The current {@link Say} instance
 */
export function setSay(say: ReadonlySay | (() => ReadonlySay)): void {
  const ref = serverContext();
  if (say instanceof Say) ref.current = say as ReadonlySay;
  else ref.current = (say as () => ReadonlySay)();
}

/**
 * Get the current {@link Say} **server** instance.
 * Must only be called after any {@link setSay} calls.
 *
 * @returns The current {@link Say} instance
 * @throws If no {@link Say} instance has been set
 */
export function getSay(): ReadonlySay {
  const ref = serverContext();
  if (!ref.current)
    throw new Error(
      'Attempt to access the server-only Say instance before initialisation',
      {
        cause: new Error("'getSay' must be called after 'setSay'"),
      },
    );
  return ref.current;
}

/**
 * Create a {@link withSay} higher-order component factory bound to a specific {@link Say} instance.
 *
 * @param say The {@link Say} instance to bind into the server context
 *
 * @returns A {@link withSay} higher-order component factory
 */
export function unstable_createWithSay(say: Say) {
  /**
   * Wrap a server component so that a {@link Say} instance is initialised before render.
   */
  return function withSay<P extends object>(
    Component: (
      props: P & { locale: string; messages: Say.Messages },
    ) => ReactNode,
    getLocale: (props: P) => string | Promise<string>,
  ) {
    return async function WithSay(props: P) {
      const locale = await getLocale(props);
      await say.load(locale);
      say.activate(locale);
      setSay(say);

      return createElement(Component, {
        ...props,
        locale: say.locale,
        messages: say.messages,
      });
    };
  };
}
