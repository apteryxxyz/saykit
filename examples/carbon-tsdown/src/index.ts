import { Client } from '@buape/carbon';
import { createHandler } from '@buape/carbon/adapters/fetch';
import { CommandDataPlugin } from '@buape/carbon/command-data';
import { SayPlugin } from '@saykit/carbon';
import { AboutCommand, AboutModal } from './commands/about.js';
import { MathsCommand } from './commands/maths.js';
import { PingCommand } from './commands/ping.js';
import { RollAgainButton, RollCommand } from './commands/roll.js';
import say from './i18n.js';

const client = new Client(
  {
    baseUrl: process.env.BASE_URL,
    deploySecret: process.env.DEPLOY_SECRET,
    clientId: process.env.DISCORD_CLIENT_ID,
    publicKey: process.env.DISCORD_PUBLIC_KEY,
    token: process.env.DISCORD_BOT_TOKEN,
  },
  {
    commands: [
      new AboutCommand(say),
      new MathsCommand(say),
      new PingCommand(say),
      new RollCommand(say),
    ],
    components: [new RollAgainButton(say)],
  },
  [new SayPlugin(say), new CommandDataPlugin()],
);
for (const modal of [new AboutModal(say)])
  client.modalHandler.registerModal(modal);

const handler = createHandler(client);
export default { fetch: handler };

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BASE_URL: string;
      DEPLOY_SECRET: string;
      DISCORD_CLIENT_ID: string;
      DISCORD_PUBLIC_KEY: string;
      DISCORD_BOT_TOKEN: string;
    }
  }
}
