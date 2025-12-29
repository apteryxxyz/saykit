import { Command, type CommandInteraction } from '@buape/carbon';
import { DiscordSnowflake } from '@sapphire/snowflake';
import { withSay } from '@saykit/carbon';
import type { Say } from 'saykit';

export class PingCommand extends withSay(Command) {
  constructor(say: Say) {
    super(say, (say) => ({
      name: say`ping`,
      description: say`Ping the bot!`,
    }));
  }

  async run(interaction: CommandInteraction) {
    const flake = DiscordSnowflake.deconstruct(interaction.rawData.id);
    const latency = Date.now() - Number(flake.timestamp);

    await interaction.reply({
      content: interaction.say`Pong! Latency is ${latency}ms.`,
    });
  }
}
