import type { PathLike, WatchOptionsWithStringEncoding } from 'node:fs';
import {
  type FileChangeInfo,
  glob,
  mkdir,
  readFile,
  watch,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { Command } from '@commander-js/extra-typings';
import {
  extractMessages as extract,
  generateHash,
} from '@saykit/babel-plugin/core';
import pm from 'picomatch';
import type { output } from 'zod';
import { resolveConfig } from '~/loader/resolve.js';
import Logger, { loggerStorage } from '~/logger.js';
import type { Bucket, Configuration, Formatter } from '~/shapes.js';

export default new Command()
  .name('extract')
  .description('Extract messages from source files into translation buckets.')
  .option('-v, --verbose', 'enable verbose logging', false)
  .option('-q, --quiet', 'suppress all logging', false)
  .option('-w, --watch', 'watch source files for changes', false)
  .action(async (options) => {
    const config = await resolveConfig();
    const logger = new Logger(options.quiet, options.verbose);
    loggerStorage.enterWith(logger);

    logger.header('🛠 Extracting Messages');

    const watchers = [];
    for (const bucket of config.buckets) {
      const watcher = await processBucket(bucket, config, options);
      watchers.push(watcher());
    }
    await Promise.allSettled(watchers);
  });

async function processBucket(
  bucket: output<typeof Bucket>,
  config: output<typeof Configuration>,
  options: { watch: boolean },
) {
  const logger = loggerStorage.getStore()!;
  logger.info(`Processing bucket: ${bucket.include}`);

  //

  const paths = await globBucket(bucket);
  logger.step(`Found ${paths.length} file(s)`);

  //

  const indexedMessages = new Map<string, Formatter.Message[]>();
  async function processPath(path: string) {
    logger.step(`Processing ${relative(process.cwd(), path)}`);

    const messages = await extractMessages(path);
    if (!messages.length) return false;

    indexedMessages.set(path, messages);
    logger.step(
      `Found ${messages.length} message(s) in ${relative(process.cwd(), path)}`,
    );
    return true;
  }

  for (const path of paths) await processPath(path);
  const currentMessages = () => [...indexedMessages.values()].flat();
  logger.info(`Extracted ${currentMessages().length} message(s)`);

  //

  async function writeAllMessages() {
    for (const locale of config.locales) {
      logger.step(`Writing locale file for ${locale}`);
      const messages = mapMessages(...currentMessages());
      await writeMessages(bucket, locale, config.locales[0], messages);
    }
  }

  await writeAllMessages();
  logger.success(`Wrote locale files`);

  return async () => {
    if (options.watch) {
      logger.log(`👀 Watching for changes to ${bucket.include}`);
      const matcher = pm(bucket.include, { ignore: bucket.exclude });

      for await (const event of watchDebounce(process.cwd(), {
        recursive: true,
      })) {
        if (!event.filename || !matcher(event.filename)) continue;

        logger.info(`Detected change in ${event.filename}`);
        const done = await processPath(event.filename);
        if (done) await writeAllMessages();
      }
    }
  };
}

async function globBucket(bucket: output<typeof Bucket>) {
  const paths: string[] = [];
  for await (const file of glob(bucket.include, {
    exclude: bucket.exclude,
    withFileTypes: true,
  }))
    if (file.isFile()) paths.push(join(file.parentPath, file.name));
  return paths;
}

export async function* watchDebounce(
  path: PathLike,
  options?: WatchOptionsWithStringEncoding,
) {
  const debounceTimers = new Map<string, NodeJS.Timeout>();
  const pendingEvents = new Map<string, Promise<FileChangeInfo<string>>>();
  const resolvers = new Map<string, (value: FileChangeInfo<string>) => void>();

  (async () => {
    for await (const event of watch(path, options)) {
      const key = event.filename ?? '__unknown__';

      if (debounceTimers.has(key)) clearTimeout(debounceTimers.get(key)!);

      if (!pendingEvents.has(key))
        pendingEvents.set(key, new Promise((r) => resolvers.set(key, r)));

      debounceTimers.set(
        key,
        setTimeout(() => {
          resolvers.get(key)?.(event);
          debounceTimers.delete(key);
          resolvers.delete(key);
        }, 300),
      );
    }
  })();

  while (true) {
    if (pendingEvents.size) {
      const next = await Promise.race(pendingEvents.values());
      pendingEvents.delete(next.filename ?? '__unknown__');
      yield next;
    } else {
      // avoid busy loop, yield control briefly
      await new Promise((r) => setTimeout(r, 10));
    }
  }
}

async function extractMessages(path: string) {
  const code = await readFile(path, 'utf8').catch(() => '');
  const messages = extract(path, code);

  return messages.map((message) => ({
    message: message.toICUString(),
    translation: message.toICUString(),
    id: message.descriptor.id,
    context: message.descriptor.context,
    comments: message.comments,
    references: message.references //
      .map((ref) => relative(process.cwd(), ref).replaceAll('\\', '/')),
  })) satisfies Formatter.Message[];
}

function mapMessages(...messages: Formatter.Message[]) {
  const mappedMessages = new Map<string, Formatter.Message>();

  for (const message of messages) {
    const id = message.id ?? generateHash(message.message, message.context);
    const existingMessage = mappedMessages.get(id);

    if (existingMessage) {
      for (const comment of message.comments ?? [])
        if (!existingMessage.comments.includes(comment))
          existingMessage.comments.push(comment);
      for (const reference of message.references ?? [])
        if (!existingMessage.references.includes(reference))
          existingMessage.references.push(reference);
    } else {
      mappedMessages.set(id, message);
    }
  }

  return Object.fromEntries(mappedMessages);
}

export function resolveOutputFilePath(
  bucket: output<typeof Bucket>,
  locale: string,
  extension = bucket.formatter.extension,
) {
  return resolve(
    bucket.output
      .replaceAll('{locale}', locale)
      .replaceAll('{extension}', extension),
  );
}

export async function readMessages(
  bucket: output<typeof Bucket>,
  locale: string,
  path = resolveOutputFilePath(bucket, locale),
) {
  const content = await readFile(path, 'utf8').catch(() => undefined);
  const messages =
    (content && (await bucket.formatter.parse(content, { locale }))) || [];
  return [content, mapMessages(...messages)] as const;
}

function updateMessages(
  existingMessages: Record<string, Formatter.Message>,
  newMessages: Record<string, Formatter.Message>,
) {
  const mergedMessages = new Map<string, Formatter.Message>();

  for (const [id, newMessage] of Object.entries(newMessages)) {
    const existingMessage = existingMessages[id];

    mergedMessages.set(id, {
      message: newMessage.message,
      translation: undefined,
      ...existingMessage,
      id: newMessage.id,
      context: newMessage.context,
      comments: newMessage.comments,
      references: newMessage.references,
    });
  }

  return Object.fromEntries(mergedMessages);
}

async function writeMessages(
  bucket: output<typeof Bucket>,
  locale: string,
  sourceLocale: string,
  newMessages: Record<string, Formatter.Message>,
) {
  const [existingContent, existingMessages] = //
    await readMessages(bucket, locale);

  const messages =
    locale !== sourceLocale
      ? updateMessages(existingMessages, newMessages)
      : newMessages;
  const content = await bucket.formatter.stringify(Object.values(messages), {
    locale,
    previousContent: existingContent,
  });

  const outputPath = resolveOutputFilePath(bucket, locale);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content);
}
