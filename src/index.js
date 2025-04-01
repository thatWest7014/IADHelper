const { Client, IntentsBitField, ActivityType, Collection, MessageFlags, WebhookClient } = require('discord.js');
const client = require('./globals/Client');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();
require('./autoresponses');
const pkg = require('../package.json')
const { execSync } = require('child_process');
const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
const startTime = new Date()

//Stats
const firebaseVersion = require('firebase/package.json').version || 'No Version Found';
const axiosVersion = require('axios/package.json').version || 'No Version Found';
let cloudflareVersion = 'No Version Found';
try {
    const cloudflarePackagePath = require.resolve('cloudflare');
    const cloudflarePackageJsonPath = path.join(cloudflarePackagePath, '../package.json');
    if (fs.existsSync(cloudflarePackageJsonPath)) {
        cloudflareVersion = require(cloudflarePackageJsonPath).version;
    } else {
        console.warn('Cloudflare package.json not found.');
    }
} catch (error) {
    console.error('Error loading Cloudflare version:', error.message);
}
const wsVersion = require('ws/package.json').version || 'No Version Found';
const expressVersion = require('express/package.json').version || 'No Version Found';
const licensePath = path.join(__dirname, '..', 'LICENSE');
const requiredLicense = 'Mozilla Public License Version 2.0';
let licenseName = "Null"

try {
    if (!fs.existsSync(licensePath)) {
        console.error('LICENSE file is missing. The application cannot run without it.');
        process.exit(1); // Exit the application
    }

    const licenseContent = fs.readFileSync(licensePath, 'utf8');
    licenseName = licenseContent.split('\n')[0].trim(); // Get the first line of the license

    if (licenseName !== requiredLicense) {
        process.exit(1); // Exit the application
    }

    console.log('LICENSE file is valid.');
} catch (error) {
    console.error('Error verifying LICENSE file:', error.message);
    process.exit(1); // Exit the application
}


//Logging
const webhookURL = 'https://ptb.discord.com/api/webhooks/1356091266043220042/BMIv8LuKUCry7yKVM4kquyq0FJkUs-QPzTMs1YFcYkiwcsCKDZgU1jjtSVdxlehMWyWB'
const webhookClient= new WebhookClient({ url: webhookURL});

client.on('shardDisconnect', () => {
    if (process.send) {
        process.send({ type: 'shardDisconnect', shardId: client.shard.ids[0] });
    }
});

client.on('shardReconnecting', () => {
    if (process.send) {
        process.send({ type: 'shardReconnecting', shardId: client.shard.ids[0] });
    }
});

// Define the commands path
const commandsPath = path.join(__dirname, '..', 'commands'); 
const ctxtmenuPath = path.join(__dirname, '..', 'contextmenu'); 
console.log('Commands directory path:', commandsPath);

// Recursive function to get all .js files from a directory and its subdirectories
function getCommandFiles(dir) {
    let files = [];
    fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            files = files.concat(getCommandFiles(filePath)); // Recurse into subdirectories
        } else if (file.endsWith('.js')) {
            files.push(filePath); // Collect .js files
        }
    });
    return files;
}

try {
    const commandFiles = getCommandFiles(commandsPath);

    // Log the files found for verification
    console.log('Command files found:', commandFiles);

    for (const file of commandFiles) {
        const command = require(file);
        if (command?.data?.name) {
            client.commands.set(command.data.name, command);
        } else {
            console.warn(`Invalid command file: ${file}`);
        }
    }
} catch (err) {
    console.error('Error reading commands directory:', err);
}

try {
    // Get all command files from the ctxtmenu directory
    const ctxtmenuFiles = fs.readdirSync(ctxtmenuPath).filter(file => file.endsWith('.js'));

    // Log the files found for verification
    console.log('Context Menu Command files found:', ctxtmenuFiles);

    for (const file of ctxtmenuFiles) {
        const filePath = path.join(ctxtmenuPath, file);
        const ctxtcommand = require(filePath);

        if (ctxtcommand?.data?.name) {
            client.commands.set(ctxtcommand.data.name, ctxtcommand);
            console.log(`Loaded context menu command: ${ctxtcommand.data.name}`);
        } else {
            console.warn(`Invalid command file: ${file}`);
        }
    }
} catch (err) {
    console.error('Error reading context menu commands directory:', err);
}

// Create a rate limit map
const rateLimitMap = new Map();
const COMMAND_LIMIT = 4; // Maximum commands per minute
const TIME_WINDOW = 10 * 1000; // 10 seconds in milliseconds

// Client Event Execution Handler
client.on('interactionCreate', async (interaction) => {
    try {
        // Log the interaction type and IDs for debugging
        console.log(`Interaction Type: ${interaction.type}`);
        if (interaction.isCommand()) {
            console.log(`Command Name: ${interaction.commandName}`);
        } else if (interaction.isModalSubmit()) {
            console.log(`Modal Custom ID: ${interaction.customId}`);
        } else if (interaction.isButton()) {
            console.log(`Button Custom ID: ${interaction.customId}`);
        } else if (interaction.isStringSelectMenu()) {
            console.log(`Select Menu Custom ID: ${interaction.customId}`);
        }

        // Handle Slash Commands
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                await interaction.reply({
                    content: 'Command not found!',
                    flags: MessageFlags.Ephemeral,
                });
                console.warn(`Command not found: ${interaction.commandName}`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing command ${interaction.commandName}:`, error);
                await interaction.reply({
                    content: 'There was an error executing this command!',
                    flags: MessageFlags.Ephemeral,
                });
            }
        }

        // Handle Modal Submissions (Dynamic Handling)
        else if (interaction.isModalSubmit()) {
            // Dynamically find the command based on the modal's customId
            const modalHandlerCommand = client.commands.find(cmd => cmd.modalHandler && interaction.customId.startsWith(cmd.data.name));
            if (modalHandlerCommand?.modalHandler) {
                try {
                    await modalHandlerCommand.modalHandler(interaction);
                } catch (error) {
                    console.error(`Error handling modal interaction for ${modalHandlerCommand.data.name}:`, error);
                    await interaction.reply({
                        content: 'There was an error while processing the modal!',
                        ephemeral: true,
                    });
                }
            } else {
                console.warn(`Unhandled modal interaction: ${interaction.customId}`);
            }
        }

        // Handle Button Interactions
        else if (interaction.isButton()) {
            const buttonHandlerCommand = client.commands.find(cmd => cmd.buttonHandler && interaction.customId.startsWith(cmd.data.name));
            if (buttonHandlerCommand?.buttonHandler) {
                try {
                    await buttonHandlerCommand.buttonHandler(interaction);
                } catch (error) {
                    console.error(`Error handling button interaction for ${buttonHandlerCommand.data.name}:`, error);
                    await interaction.reply({
                        content: 'There was an error processing this button interaction!',
                        flags: MessageFlags.Ephemeral,
                    });
                }
            } else {
                console.warn(`Unhandled button interaction: ${interaction.customId}`);
            }
        }

        // Handle Context Menu Commands
        else if (interaction.isUserContextMenuCommand()) {
            const ctxtCommand = client.commands.get(interaction.commandName);
            if (!ctxtCommand) {
                await interaction.reply({
                    content: 'Context menu command not found!',
                    flags: MessageFlags.Ephemeral,
                });
                console.warn(`Context menu command not found: ${interaction.commandName}`);
                return;
            }

            try {
                await ctxtCommand.execute(interaction);
            } catch (error) {
                console.error(`Error executing context menu command ${interaction.commandName}:`, error);
                await interaction.reply({
                    content: 'There was an error executing this context menu command!',
                    flags: MessageFlags.Ephemeral,
                });
            }
        }

        // Handle Dropdown Menu (Select Menu) Interactions
        else if (interaction.isStringSelectMenu()) {
            const selectMenuCommand = client.commands.find(cmd => cmd.selectMenuHandler && interaction.customId.startsWith(cmd.data.name));
            if (selectMenuCommand?.selectMenuHandler) {
                try {
                    await selectMenuCommand.selectMenuHandler(interaction);
                } catch (error) {
                    console.error(`Error handling select menu interaction for ${selectMenuCommand.data.name}:`, error);
                    await interaction.reply({
                        content: 'There was an error processing this select menu!',
                        flags: MessageFlags.Ephemeral,
                    });
                }
            } else {
                console.warn(`Unhandled select menu interaction: ${interaction.customId}`);
            }
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        if (interaction.isRepliable()) {
            await interaction.reply({
                content: 'An unexpected error occurred!',
                flags: MessageFlags.Ephemeral,
            });
        }
    }
});
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('An error occured while logging in: ', error.message);
});
console.log(`
███████████████████████████████████████████████████████████████████████████████████████████████╗
╚══════════════════════════════════════════════════════════════════════════════════════════════╝

██╗  ██╗██╗ █████╗ ██████╗     ██╗  ██╗███████╗██╗     ██████╗ ███████╗██████╗ 
██║ ██╔╝██║██╔══██╗██╔══██╗    ██║  ██║██╔════╝██║     ██╔══██╗██╔════╝██╔══██╗
█████╔╝ ██║███████║██║  ██║    ███████║█████╗  ██║     ██████╔╝█████╗  ██████╔╝
██╔═██╗ ██║██╔══██║██║  ██║    ██╔══██║██╔══╝  ██║     ██╔═══╝ ██╔══╝  ██╔══██╗
██║  ██╗██║██║  ██║██████╔╝    ██║  ██║███████╗███████╗██║     ███████╗██║  ██║
╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═════╝     ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝
                                                                                                
                                                                                                
                                                                                                
█████╗█████╗█████╗█████╗█████╗█████╗█████╗█████╗█████╗█████╗█████╗█████╗█████╗█████╗█████╗█████╗
╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝
███████████████████████████████████████████████████████████████████████████████████████████████╗
╚══════════════════════════════════════════════════════════════════════════════════════════════╝
█████╗█████╗█████╗█████╗█████╗█████╗█████╗█████╗█████╗█████╗█████╗█████╗█████╗█████╗█████╗█████╗
╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝╚════╝
                                                                                                
██╗    ██╗██████╗ ██╗████████╗████████╗███████╗███╗   ██╗    ██╗███╗   ██╗         ██╗███████╗  
██║    ██║██╔══██╗██║╚══██╔══╝╚══██╔══╝██╔════╝████╗  ██║    ██║████╗  ██║         ██║██╔════╝  
██║ █╗ ██║██████╔╝██║   ██║      ██║   █████╗  ██╔██╗ ██║    ██║██╔██╗ ██║         ██║███████╗  
██║███╗██║██╔══██╗██║   ██║      ██║   ██╔══╝  ██║╚██╗██║    ██║██║╚██╗██║    ██   ██║╚════██║  
╚███╔███╔╝██║  ██║██║   ██║      ██║   ███████╗██║ ╚████║    ██║██║ ╚████║    ╚█████╔╝███████║  
 ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═══╝    ╚═╝╚═╝  ╚═══╝     ╚════╝ ╚══════╝       

 ██╗ ██████╗██╗     ██╗    ██╗███████╗███████╗████████╗███████╗ ██████╗  ██╗██╗  ██╗     ██████╗  ██████╗ ██████╗ ███████╗ 
██╔╝██╔════╝╚██╗    ██║    ██║██╔════╝██╔════╝╚══██╔══╝╚════██║██╔═████╗███║██║  ██║     ╚════██╗██╔═████╗╚════██╗██╔════╝ 
██║ ██║      ██║    ██║ █╗ ██║█████╗  ███████╗   ██║       ██╔╝██║██╔██║╚██║███████║      █████╔╝██║██╔██║ █████╔╝███████╗ 
██║ ██║      ██║    ██║███╗██║██╔══╝  ╚════██║   ██║      ██╔╝ ████╔╝██║ ██║╚════██║     ██╔═══╝ ████╔╝██║██╔═══╝ ╚════██║ 
╚██╗╚██████╗██╔╝    ╚███╔███╔╝███████╗███████║   ██║      ██║  ╚██████╔╝ ██║     ██║     ███████╗╚██████╔╝███████╗███████║ 
 ╚═╝ ╚═════╝╚═╝      ╚══╝╚══╝ ╚══════╝╚══════╝   ╚═╝      ╚═╝   ╚═════╝  ╚═╝     ╚═╝     ╚══════╝ ╚═════╝ ╚══════╝╚══════╝ 

███████████████████████████████████████████████████████████████████████████████████████████████╗
╚══════════════════════════════════════════════════════════════════════════════════════════════╝
`);
client.once('ready', () => {
webhookClient.send(`
\`\`\`
\u200B
\`\`\`
# **${client.user.username} v**${pkg.version}
## **Description: **${pkg.description}
### **Author: **${pkg.author.name}
### **License: **${licenseName}
\`\`\`
\u200B
\`\`\`
## **Open-Source Software Used:**
- <https://github.com/Nirmini/NovaBot>
- <https://github.com/TicketsBot>
- <https://github.com/Discordjs>
\`\`\`
\u200B
\`\`\`
**Node.js env version: **${process.version}
**NPM version: **${npmVersion}
**Discord.js version: **${require('discord.js').version}
**Firebase version: **${firebaseVersion}
**Axios version: **${axiosVersion}
**Cloudflare version: **${cloudflareVersion}
**WS version: **${wsVersion}
**Express version: **${expressVersion}
**Start Time: **${startTime.toISOString()}
\`\`\`
\u200B
\`\`\`
`);
});
module.exports = {licensePath, licenseName, commandsPath, ctxtmenuPath}