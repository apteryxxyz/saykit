import {
  cloneElement,
  createElement,
  isValidElement,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { Disallow, NumeralOptions, SelectOptions } from 'saykit';
import { Renderer } from '~/components/renderer.js';
import { type PropsWithJSXSafeKeys, resolveJsxSafePropKeys } from '~/types.js';

declare function GET_SAY(): import('saykit').ReadonlySay;

/**
 * Render the translation for a descriptor.
 *
 * @param descriptor Descriptor to render the translation for
 * @returns The translation node for the descriptor
 * @remark This is a macro and must be used with the relevant saykit plugin
 */
// @ts-expect-error macro
export function Say(
  props: PropsWithChildren<Disallow<{ context?: string }, 'id'>>,
): ReactElement;
export function Say(props: { id: string; [match: string]: unknown }) {
  if (!('id' in props))
    throw new Error(
      "'Say' is a macro and must be used with the relevant saykit plugin",
      {
        cause: new Error("The 'id' property is required for a descriptor"),
      },
    );

  const say = GET_SAY();
  const descriptor = resolveJsxSafePropKeys(props);

  return createElement(Renderer, {
    html: say.call(descriptor),
    components(tag?: string) {
      if (tag && tag in descriptor && isValidElement(descriptor[tag])) {
        const element = descriptor[tag]! as ReactElement;
        return (props) =>
          cloneElement(element, { ...(element.props ?? {}), ...props });
      } else {
        return tag;
      }
    },
  });
}

export namespace Say {
  // ===== Macros ===== //

  /**
   * Define a pluralised message.
   *
   * @example
   * ```tsx
   * <Say.Plural
   *   _={count}
   *   one="You have 1 item"
   *   other="You have # items"
   * />
   * ```
   *
   * @param props._ Number to determine the plural form of
   * @param props Options pluralisation rules keyed by CLDR categories or specific numbers
   * @returns The plural form of the number, as a React node
   * @remark This is a macro and must be used with the relevant saykit plugin
   */
  export function Plural(
    props: { _: number } & PropsWithJSXSafeKeys<
      Disallow<NumeralOptions, 'id' | 'context'>
    >,
  ): ReactNode {
    void props;
    throw new Error(
      "'Say.Plural' is a macro and must be used with the relevant saykit plugin",
    );
  }

  /**
   * Define an ordinal message (e.g. "1st", "2nd", "3rd").
   *
   * @example
   * ```tsx
   * <Say.Ordinal
   *   _={position}
   *   1="#st"
   *   2="#nd"
   *   3="#rd"
   *   other="#th"
   * />
   * ```
   *
   * @param props._ Number to determine the ordinal form of
   * @param props Options ordinal rules keyed by CLDR categories or specific numbers
   * @returns The ordinal form of the number, as a React node
   * @remark This is a macro and must be used with the relevant saykit plugin
   */
  export function Ordinal(
    props: { _: number } & PropsWithJSXSafeKeys<
      Disallow<NumeralOptions, 'id' | 'context'>
    >,
  ): ReactNode {
    void props;
    throw new Error(
      "'Say.Ordinal' is a macro and must be used with the relevant saykit plugin",
    );
  }

  /**
   * Define a select message, useful for handling gender, status, or other categories.
   *
   * @example
   * ```tsx
   * <Say.Select
   *   _={gender}
   *   male="He"
   *   female="She"
   *   other="They"
   * />
   * ```
   *
   * @param props._ Selector value to determine which option is chosen
   * @param props Options a mapping of possible selector values to message strings
   * @returns The select form of the value, as a React node
   * @remark This is a macro and must be used with the relevant saykit plugin
   */
  export function Select(
    props: { _: string } & PropsWithJSXSafeKeys<
      Disallow<SelectOptions, 'id' | 'context'>
    >,
  ): ReactNode {
    void props;
    throw new Error(
      "'Say.Select' is a macro and must be used with the relevant saykit plugin",
    );
  }
}
