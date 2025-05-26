const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getData, setData, updateData } = require('../database/RTDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('case')
        .setDescription('Manage cases')
        .addSubcommand(subcommand =>
            subcommand
                .setName('new')
                .setDescription('Create a new case')
                .addStringOption(option =>
                    option
                        .setName('caseid')
                        .setDescription('The ID of the case')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the case')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit an existing case')
                .addStringOption(option =>
                    option
                        .setName('caseid')
                        .setDescription('The ID of the case')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('New reason for the case')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('void')
                .setDescription('Void an existing case')
                .addStringOption(option =>
                    option
                        .setName('caseid')
                        .setDescription('The ID of the case')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for voiding the case')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('seal')
                .setDescription('Seal an existing case')
                .addStringOption(option =>
                    option
                        .setName('caseid')
                        .setDescription('The ID of the case')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for sealing the case')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('assign')
                .setDescription('Assign a case to a user')
                .addStringOption(option =>
                    option
                        .setName('caseid')
                        .setDescription('The ID of the case')
                        .setRequired(true)
                )
                .addUserOption(option =>
                    option
                        .setName('assignee')
                        .setDescription('User to assign the case to')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const requiredRoleId = '1331818656996261898'; // Role ID to restrict access
        const member = interaction.member;

        // Check if the user has the required role
        if (!member.roles.cache.has(requiredRoleId)) {
            return interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true,
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const caseId = interaction.options.getString('caseid');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const assignee = interaction.options.getUser('assignee');
        const casePath = `cases/${caseId}`;
        const guildId = '1277002137330520094';
        const channelId = '1277077389691584522';

        try {
            switch (subcommand) {
                case 'new': {
                    const existingCase = await getData(casePath);
                    if (existingCase) {
                        return interaction.reply({
                            content: `Case with ID \`${caseId}\` already exists.`,
                            ephemeral: true,
                        });
                    }

                    const newCase = {
                        Status: 'Open',
                        Reason: reason,
                        Assigned: null,
                    };
                    await setData(casePath, newCase);

                    // Send an embed to the specified channel
                    const guild = interaction.client.guilds.cache.get(guildId);
                    if (guild) {
                        const channel = guild.channels.cache.get(channelId);
                        if (channel) {
                            const embed = new EmbedBuilder()
                                .setTitle('CASE OPEN NOTIFICATION')
                                .setDescription(
                                    `A new case has been opened. Updates will be disclosed in the public KIAD database.\n\n**Case Number**\n#${caseId}\n\nKIAD Helper • ${new Date().toLocaleString()}`
                                )
                                .setColor(0x00ff00)
                                .setTimestamp();

                            await channel.send({ embeds: [embed] });
                        } else {
                            console.warn(`Channel with ID ${channelId} not found.`);
                        }
                    } else {
                        console.warn(`Guild with ID ${guildId} not found.`);
                    }

                    return interaction.reply(`Case \`${caseId}\` created successfully.`);
                }

                case 'edit': {
                    const existingCase = await getData(casePath);
                    if (!existingCase) {
                        return interaction.reply({
                            content: `Case with ID \`${caseId}\` does not exist.`,
                            ephemeral: true,
                        });
                    }

                    await updateData(casePath, { Reason: reason });
                    return interaction.reply(`Case \`${caseId}\` updated successfully.`);
                }

                case 'void': {
                    const existingCase = await getData(casePath);
                    if (!existingCase) {
                        return interaction.reply({
                            content: `Case with ID \`${caseId}\` does not exist.`,
                            ephemeral: true,
                        });
                    }

                    await updateData(casePath, { Status: 'Void', Reason: reason });
                    return interaction.reply(`Case \`${caseId}\` has been voided.`);
                }

                case 'seal': {
                    const existingCase = await getData(casePath);
                    if (!existingCase) {
                        return interaction.reply({
                            content: `Case with ID \`${caseId}\` does not exist.`,
                            ephemeral: true,
                        });
                    }

                    await updateData(casePath, { Status: 'Sealed', Reason: reason });
                    return interaction.reply(`Case \`${caseId}\` has been sealed.`);
                }

                case 'assign': {
                    const existingCase = await getData(casePath);
                    if (!existingCase) {
                        return interaction.reply({
                            content: `Case with ID \`${caseId}\` does not exist.`,
                            ephemeral: true,
                        });
                    }

                    await updateData(casePath, { Assigned: assignee.id });
                    return interaction.reply(`Case \`${caseId}\` has been assigned to ${assignee.tag}.`);
                }

                default:
                    return interaction.reply({
                        content: 'Invalid subcommand specified.',
                        ephemeral: true,
                    });
            }
        } catch (error) {
            console.error(`Error handling /case command: ${error.message}`);
            return interaction.reply({
                content: 'An error occurred while processing your request.',
                ephemeral: true,
            });
        }
    },
};