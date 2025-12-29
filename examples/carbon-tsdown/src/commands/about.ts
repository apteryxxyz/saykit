import {
  Command,
  type CommandInteraction,
  Label,
  Modal,
  type ModalInteraction,
  TextInput,
  TextInputStyle,
} from '@buape/carbon';
import { withSay } from '@saykit/carbon';
import type { Say } from 'saykit';

export class AboutCommand extends withSay(Command) {
  constructor(say: Say) {
    super(say, (say) => ({
      name: say`about`,
      description: say`Tell me about yourself!`,
    }));
  }

  async run(interaction: CommandInteraction) {
    await interaction.showModal(new AboutModal(interaction.say));
  }
}

export class AboutModal extends withSay(Modal) {
  customId = 'about';

  constructor(say: Say) {
    super({
      title: say`About You`,
      components: [new NameLabel(say)],
    });
  }

  async run(interaction: ModalInteraction) {
    const name = interaction.fields.getText('name', true);

    return interaction.reply({
      content: interaction.say`Your name is ${name}!`,
    });
  }
}

class NameLabel extends withSay(Label) {
  constructor(say: Say) {
    super({ label: say`Name` }, new NameTextInput(say));
  }
}

class NameTextInput extends withSay(TextInput) {
  customId = 'name';
  constructor(say: Say) {
    super({
      placeholder: say`Your name`,
    });
  }
  override style = TextInputStyle.Short;
  override required = true;
}
