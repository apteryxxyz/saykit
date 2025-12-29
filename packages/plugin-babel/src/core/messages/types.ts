import type * as t from '@babel/types';
import { convertMessageToIcu } from './convert.js';
import { generateHash } from './hash.js';

abstract class Base {
  toICUString(this: Message) {
    return convertMessageToIcu(this);
  }

  toHashString(this: Message) {
    return generateHash(this.toICUString());
  }
}

export class LiteralMessage extends Base {
  constructor(public readonly text: string) {
    super();
  }
}

export class ArgumentMessage extends Base {
  constructor(
    public readonly identifier: string,
    public readonly expression: t.Expression,
  ) {
    super();
  }
}

export class ElementMessage extends Base {
  constructor(
    public readonly identifier: string,
    public readonly children: Message[],
    public readonly expression: t.Expression,
  ) {
    super();
  }
}

export class ChoiceMessage extends Base {
  constructor(
    public readonly kind: string,
    public readonly identifier: string,
    public readonly branches: { key: string; value: Message }[],
    public readonly expression: t.Expression,
  ) {
    super();
  }
}

export class CompositeMessage extends Base {
  constructor(
    public readonly descriptor: { id?: string; context?: string },
    public readonly comments: string[],
    public readonly references: string[],
    public readonly children: Message[],
    public readonly accessor: t.Expression,
  ) {
    super();
  }

  override toHashString() {
    return generateHash(this.toICUString(), this.descriptor.context);
  }
}

export type Message =
  | LiteralMessage
  | ArgumentMessage
  | ElementMessage
  | ChoiceMessage
  | CompositeMessage;
