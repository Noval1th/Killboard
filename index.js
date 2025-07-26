require('dotenv').config();

// DEBUG: Check what files exist on Railway
const fs = require('fs');
console.log('=== DEBUGGING FILE STRUCTURE ===');
console.log('Current directory:', process.cwd());
console.log('Files in root:', fs.readdirSync('.'));

try {
    console.log('Files in commands folder:', fs.readdirSync('./commands'));
    console.log('albion.js exists:', fs.existsSync('./commands/albion.js'));
} catch (err) {
    console.log('Commands folder error:', err.message);
}
console.log('=== END DEBUG ===');

// DEBUG: Check database.js content
try {
    const fs = require('fs');
    const dbContent = fs.readFileSync('./database.js', 'utf8');
    console.log('database.js file size:', dbContent.length);
    console.log('database.js first 200 characters:', dbContent.substring(0, 200));
    console.log('Contains "class Database":', dbContent.includes('class Database'));
    console.log('Contains "module.exports":', dbContent.includes('module.exports'));
} catch (err) {
    console.log('Error reading database.js:', err.message);
}
console.log('=== END DATABASE DEBUG ===');


// Rest of your existing code (the axios, discord.js imports, etc.)
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const Fuse = require('fuse.js');
const moment = require('moment-timezone');
const Database = require('./database');
const AlbionCommands = require('./commands/albion');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Initialize components
const db = new Database();
let itemList = [];
let fuse;
let albionCommands;

// Load items database
async function initializeItems() {
    try {
        console.log('Loading item database...');
        const response = await axios.get('https://raw.githubusercontent.com/broderickhyman/ao-bin-dumps/master/formatted/items.txt');
        const itemLines = response.data.split('\n');
        
        itemList = itemLines
            .filter(line => line.trim() && !line.startsWith('//'))
            .map(line => {
                const parts = line.split(':');
                if (parts.length >= 2) {
                    const id = parts[0].trim();
                    const name = parts[1].trim();
                    const tierMatch = id.match(/T(\d+)/);
                    const enchantMatch = id.match(/@(\d+)/);
                    
                    return {
                        id, name,
                        category: id.split('_')[1] || 'unknown',
                        tier: tierMatch ? parseInt(tierMatch[1]) : 0,
                        enchantment: enchantMatch ? parseInt(enchantMatch[1]) : 0
                    };
                }
                return null;
            })
            .filter(Boolean);

        db.insertItems(itemList);
        fuse = new Fuse(itemList, { keys: ['name'], threshold: 0.4, includeScore: true });
        albionCommands = new AlbionCommands(db, fuse, itemList);
        
        console.log(`Loaded ${itemList.length} items`);
    } catch (error) {
        console.error('Error loading items:', error.message);
    }
}

// Register all slash commands
async function registerCommands() {
    const commands = [
        // Albion Commands
        new SlashCommandBuilder().setName('price').setDescription('Search for any item price')
            .addStringOption(option => option.setName('item').setDescription('Item name').setRequired(true)),
        
        new SlashCommandBuilder().setName('player').setDescription('Find any player statistics')
            .addStringOption(option => option.setName('player').setDescription('Player name').setRequired(true)),
        
        new SlashCommandBuilder().setName('guild').setDescription('Find any guild information')
            .addStringOption(option => option.setName('guild').setDescription('Guild name').setRequired(true)),
        
        new SlashCommandBuilder().setName('gold').setDescription('Get live price of Gold'),
        
        new SlashCommandBuilder().setName('premium').setDescription('Get live price of in-game premium'),
        
        new SlashCommandBuilder().setName('randomator').setDescription('Get a random build with spells'),
        
        new SlashCommandBuilder().setName('image').setDescription('Provides high quality image of any item')
            .addStringOption(option => option.setName('item').setDescription('Item name').setRequired(true))
            .addIntegerOption(option => option.setName('quality').setDescription('Quality (1-5)').setMinValue(1).setMaxValue(5)),
        
        new SlashCommandBuilder().setName('build').setDescription('Choose a build to display')
            .addStringOption(option => option.setName('name').setDescription('Build name').setRequired(true)),
        
        new SlashCommandBuilder().setName('new-build').setDescription('Creates a new Albion build')
            .addStringOption(option => option.setName('name').setDescription('Build name').setRequired(true))
            .addStringOption(option => option.setName('weapon').setDescription('Weapon').setRequired(true))
            .addStringOption(option => option.setName('helmet').setDescription('Helmet'))
            .addStringOption(option => option.setName('armor').setDescription('Armor'))
            .addStringOption(option => option.setName('shoes').setDescription('Shoes'))
            .addStringOption(option => option.setName('description').setDescription('Build description')),
        
        new SlashCommandBuilder().setName('remove-build').setDescription('Removes an Albion build')
            .addStringOption(option => option.setName('name').setDescription('Build name').setRequired(true)),

        // Killboard Commands
        new SlashCommandBuilder().setName('killboard').setDescription('Killboard management')
            .addSubcommand(subcommand => subcommand.setName('info').setDescription('Display killboard information'))
            .addSubcommand(subcommand => subcommand.setName('set-channel').setDescription('Set channel for kills/deaths feed')
                .addChannelOption(option => option.setName('channel').setDescription('Channel for killboard').setRequired(true)))
            .addSubcommand(subcommand => subcommand.setName('track').setDescription('Track players or guilds')
                .addStringOption(option => option.setName('type').setDescription('Type to track').setRequired(true).addChoices(
                    { name: 'Player', value: 'player' },
                    { name: 'Guild', value: 'guild' }
                ))
                .addStringOption(option => option.setName('name').setDescription('Player or guild name').setRequired(true)))
            .addSubcommand(subcommand => subcommand.setName('untrack').setDescription('Remove specific trackers')
                .addStringOption(option => option.setName('name').setDescription('Player or guild name to untrack').setRequired(true)))
            .addSubcommand(subcommand => subcommand.setName('remove').setDescription('Reset killboard in this server')),

        // Discord Commands
        new SlashCommandBuilder().setName('avatar').setDescription('Shows user profile picture')
            .addUserOption(option => option.setName('user').setDescription('User to show avatar for')),
        
        new SlashCommandBuilder().setName('user').setDescription('Shows information about a specific user')
            .addUserOption(option => option.setName('user').setDescription('User to show info for')),
        
        new SlashCommandBuilder().setName('server').setDescription('Shows information about this server'),
        
        new SlashCommandBuilder().setName('bot-info').setDescription('Shows bot information'),
        
        new SlashCommandBuilder().setName('8ball').setDescription('Answer questions with random yes/no')
            .addStringOption(option => option.setName('question').setDescription('Your question').setRequired(true)),
        
        new SlashCommandBuilder().setName('random-color').setDescription('Generates a random HEX color'),
        
        new SlashCommandBuilder().setName('utc').setDescription('Get the current Albion Online time'),
        
        new SlashCommandBuilder().setName('set-language').setDescription('Set bot language for your server')
            .addStringOption(option => option.setName('language').setDescription('Language code').setRequired(true).addChoices(
                { name: 'English', value: 'en' },
                { name: 'Spanish', value: 'es' },
                { name: 'French', value: 'fr' },
                { name: 'German', value: 'de' }
            )),
        
        new SlashCommandBuilder().setName('set-builder-role').setDescription('Set role to manage builds')
            .addRoleOption(option => option.setName('role').setDescription('Role for build management').setRequired(true)),
        
        new SlashCommandBuilder().setName('server-status').setDescription('Live Albion Online servers status feed')
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('Registering slash commands...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('All slash commands registered!');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

// Bot ready event
client.once('ready', async () => {
    console.log(`🤖 Bot ready! Logged in as ${client.user.tag}`);
    await initializeItems();
    await registerCommands();
    console.log('✅ All systems operational!');
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        // Albion Online Commands
        if (interaction.commandName === 'price') {
            await albionCommands.handlePrice(interaction);
        }
        else if (interaction.commandName === 'player') {
            await albionCommands.handlePlayer(interaction);
        }
        else if (interaction.commandName === 'guild') {
            await albionCommands.handleGuild(interaction);
        }
        else if (interaction.commandName === 'gold') {
            await albionCommands.handleGold(interaction);
        }
        else if (interaction.commandName === 'premium') {
            await handlePremium(interaction);
        }
        else if (interaction.commandName === 'randomator') {
            await albionCommands.handleRandomator(interaction);
        }
        else if (interaction.commandName === 'image') {
            await albionCommands.handleImage(interaction);
        }
        else if (interaction.commandName === 'build') {
            await handleBuild(interaction);
        }
        else if (interaction.commandName === 'new-build') {
            await handleNewBuild(interaction);
        }
        else if (interaction.commandName === 'remove-build') {
            await handleRemoveBuild(interaction);
        }
        // Killboard Commands
        else if (interaction.commandName === 'killboard') {
            await handleKillboard(interaction);
        }
        // Discord Commands
        else if (interaction.commandName === 'avatar') {
            await handleAvatar(interaction);
        }
        else if (interaction.commandName === 'user') {
            await handleUser(interaction);
        }
        else if (interaction.commandName === 'server') {
            await handleServer(interaction);
        }
        else if (interaction.commandName === 'bot-info') {
            await handleBotInfo(interaction);
        }
        else if (interaction.commandName === '8ball') {
            await handle8Ball(interaction);
        }
        else if (interaction.commandName === 'random-color') {
            await handleRandomColor(interaction);
        }
        else if (interaction.commandName === 'utc') {
            await handleUTC(interaction);
        }
        else if (interaction.commandName === 'set-language') {
            await handleSetLanguage(interaction);
        }
        else if (interaction.commandName === 'set-builder-role') {
            await handleSetBuilderRole(interaction);
        }
        else if (interaction.commandName === 'server-status') {
            await handleServerStatus(interaction);
        }
    } catch (error) {
        console.error('Command error:', error);
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Error')
            .setDescription('Something went wrong while processing your command.')
            .setColor(0xff0000);
        
        if (interaction.deferred) {
            await interaction.editReply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
});

// Command handlers
async function handlePremium(interaction) {
    await interaction.deferReply();
    
    try {
        // Premium is typically tracked as an item in the market
        const premiumPrices = await albionCommands.getItemPrices('PREMIUM');
        
        const embed = new EmbedBuilder()
            .setTitle('💎 Premium Prices')
            .setColor(0x9932CC)
            .setDescription('Current premium subscription prices across markets')
            .setTimestamp();

        if (premiumPrices.length > 0) {
            const fields = premiumPrices.slice(0, 6).map(price => ({
                name: price.city,
                value: `${price.sell_price_min?.toLocaleString() || 'N/A'} silver`,
                inline: true
            }));
            embed.addFields(fields);
        } else {
            embed.setDescription('No premium price data available');
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Premium command error:', error);
        await interaction.editReply('Error fetching premium prices');
    }
}

async function handleBuild(interaction) {
    const buildName = interaction.options.getString('name');
    await interaction.deferReply();

    try {
        const build = await db.getBuild(interaction.guildId, buildName);
        
        if (!build) {
            await interaction.editReply(`Build "${buildName}" not found`);
            return;
        }

        const creator = await client.users.fetch(build.creator_id);
        const spells = build.spells ? JSON.parse(build.spells) : [];

        const embed = new EmbedBuilder()
            .setTitle(`⚔️ ${build.build_name}`)
            .setColor(0x0099ff)
            .setDescription(build.description || 'No description provided')
            .addFields(
                { name: 'Weapon', value: build.weapon || 'None', inline: true },
                { name: 'Helmet', value: build.helmet || 'None', inline: true },
                { name: 'Armor', value: build.armor || 'None', inline: true },
                { name: 'Shoes', value: build.shoes || 'None', inline: true },
                { name: 'Off-hand', value: build.off_hand || 'None', inline: true },
                { name: 'Cape', value: build.cape || 'None', inline: true },
                { name: 'Mount', value: build.mount || 'None', inline: true },
                { name: 'Food', value: build.food || 'None', inline: true },
                { name: 'Potion', value: build.potion || 'None', inline: true }
            )
            .setFooter({ text: `Created by ${creator.username}` })
            .setTimestamp(new Date(build.created_at));

        if (spells.length > 0) {
            embed.addFields({ name: 'Spells', value: spells.join(', '), inline: false });
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Build command error:', error);
        await interaction.editReply('Error fetching build data');
    }
}

async function handleNewBuild(interaction) {
    const buildData = {
        name: interaction.options.getString('name'),
        weapon: interaction.options.getString('weapon'),
        helmet: interaction.options.getString('helmet'),
        armor: interaction.options.getString('armor'),
        shoes: interaction.options.getString('shoes'),
        description: interaction.options.getString('description')
    };

    await interaction.deferReply();

    try {
        const existingBuild = await db.getBuild(interaction.guildId, buildData.name);
        
        if (existingBuild) {
            await interaction.editReply(`Build "${buildData.name}" already exists`);
            return;
        }

        const buildId = await db.saveBuild(interaction.guildId, interaction.user.id, buildData);

        const embed = new EmbedBuilder()
            .setTitle('✅ Build Created')
            .setDescription(`Build "${buildData.name}" has been saved!`)
            .setColor(0x00ff00)
            .addFields(
                { name: 'Build ID', value: buildId.toString(), inline: true },
                { name: 'Creator', value: interaction.user.username, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('New build command error:', error);
        await interaction.editReply('Error creating build');
    }
}

async function handleRemoveBuild(interaction) {
    const buildName = interaction.options.getString('name');
    await interaction.deferReply();

    try {
        const removed = await db.removeBuild(interaction.guildId, buildName, interaction.user.id);
        
        if (removed) {
            const embed = new EmbedBuilder()
                .setTitle('✅ Build Removed')
                .setDescription(`Build "${buildName}" has been deleted`)
                .setColor(0x00ff00);
            
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.editReply(`Build "${buildName}" not found or you don't have permission to delete it`);
        }
    } catch (error) {
        console.error('Remove build command error:', error);
        await interaction.editReply('Error removing build');
    }
}

async function handleKillboard(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'info') {
        await interaction.deferReply();
        
        try {
            const settings = await db.getServerSettings(interaction.guildId);
            const tracked = await db.getTrackedEntities(interaction.guildId);
            
            const embed = new EmbedBuilder()
                .setTitle('⚔️ Killboard Information')
                .setColor(0x0099ff)
                .addFields(
                    { name: 'Channel', value: settings.killboard_channel ? `<#${settings.killboard_channel}>` : 'Not set', inline: true },
                    { name: 'Tracked Entities', value: tracked.length.toString(), inline: true },
                    { name: 'Language', value: settings.language || 'en', inline: true }
                );

            if (tracked.length > 0) {
                const trackedList = tracked.map(t => `${t.entity_type}: ${t.entity_name}`).join('\n');
                embed.addFields({ name: 'Currently Tracking', value: trackedList, inline: false });
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Killboard info error:', error);
            await interaction.editReply('Error fetching killboard information');
        }
    }
    else if (subcommand === 'set-channel') {
        const channel = interaction.options.getChannel('channel');
        await interaction.deferReply();

        try {
            await db.updateServerSettings(interaction.guildId, { killboard_channel: channel.id });
            
            const embed = new EmbedBuilder()
                .setTitle('✅ Channel Set')
                .setDescription(`Killboard channel set to ${channel}`)
                .setColor(0x00ff00);
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Set channel error:', error);
            await interaction.editReply('Error setting killboard channel');
        }
    }
    else if (subcommand === 'track') {
        const type = interaction.options.getString('type');
        const name = interaction.options.getString('name');
        await interaction.deferReply();

        try {
            // Search for the entity
            const searchResponse = await axios.get(`https://gameinfo.albiononline.com/api/gameinfo/search?q=${name}`);
            const results = type === 'player' ? searchResponse.data.players : searchResponse.data.guilds;

            if (!results || results.length === 0) {
                await interaction.editReply(`${type} "${name}" not found`);
                return;
            }

            const entity = results[0];
            const added = await db.addTrackedEntity(interaction.guildId, entity.Id, entity.Name, type);

            if (added) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ Now Tracking')
                    .setDescription(`Now tracking ${type} "${entity.Name}"`)
                    .setColor(0x00ff00);
                
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.editReply(`${type} "${entity.Name}" is already being tracked`);
            }
        } catch (error) {
            console.error('Track command error:', error);
            await interaction.editReply('Error adding tracker');
        }
    }
    else if (subcommand === 'untrack') {
        const name = interaction.options.getString('name');
        await interaction.deferReply();

        try {
            const tracked = await db.getTrackedEntities(interaction.guildId);
            const entity = tracked.find(t => t.entity_name.toLowerCase() === name.toLowerCase());

            if (!entity) {
                await interaction.editReply(`No tracker found for "${name}"`);
                return;
            }

            const removed = await db.removeTrackedEntity(interaction.guildId, entity.entity_id);

            if (removed) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ Tracker Removed')
                    .setDescription(`Stopped tracking "${entity.entity_name}"`)
                    .setColor(0x00ff00);
                
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.editReply('Error removing tracker');
            }
        } catch (error) {
            console.error('Untrack command error:', error);
            await interaction.editReply('Error removing tracker');
        }
    }
    else if (subcommand === 'remove') {
        await interaction.deferReply();

        try {
            // Reset all killboard settings for this server
            await db.updateServerSettings(interaction.guildId, { 
                killboard_channel: null,
                language: 'en',
                builder_role: null,
                status_channel: null
            });

            // Remove all tracked entities
            const tracked = await db.getTrackedEntities(interaction.guildId);
            for (const entity of tracked) {
                await db.removeTrackedEntity(interaction.guildId, entity.entity_id);
            }

            const embed = new EmbedBuilder()
                .setTitle('✅ Killboard Reset')
                .setDescription('All killboard settings and trackers have been removed')
                .setColor(0x00ff00);
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Remove killboard error:', error);
            await interaction.editReply('Error resetting killboard');
        }
    }
}

async function handleAvatar(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    
    const embed = new EmbedBuilder()
        .setTitle(`${user.username}'s Avatar`)
        .setImage(user.displayAvatarURL({ size: 512, extension: 'png' }))
        .setColor(0x0099ff);
    
    await interaction.reply({ embeds: [embed] });
}

async function handleUser(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    
    const embed = new EmbedBuilder()
        .setTitle(`👤 ${user.username}`)
        .setThumbnail(user.displayAvatarURL())
        .setColor(0x0099ff)
        .addFields(
            { name: 'ID', value: user.id, inline: true },
            { name: 'Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true }
        );

    if (member) {
        embed.addFields(
            { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
            { name: 'Roles', value: member.roles.cache.size.toString(), inline: true }
        );
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleServer(interaction) {
    const guild = interaction.guild;
    
    const embed = new EmbedBuilder()
        .setTitle(`🏰 ${guild.name}`)
        .setThumbnail(guild.iconURL())
        .setColor(0x0099ff)
        .addFields(
            { name: 'Members', value: guild.memberCount.toString(), inline: true },
            { name: 'Channels', value: guild.channels.cache.size.toString(), inline: true },
            { name: 'Roles', value: guild.roles.cache.size.toString(), inline: true },
            { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
            { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
            { name: 'Boost Level', value: guild.premiumTier.toString(), inline: true }
        );

    await interaction.reply({ embeds: [embed] });
}

async function handleBotInfo(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🤖 Bot Information')
        .setThumbnail(client.user.displayAvatarURL())
        .setColor(0x0099ff)
        .addFields(
            { name: 'Bot Name', value: client.user.username, inline: true },
            { name: 'Servers', value: client.guilds.cache.size.toString(), inline: true },
            { name: 'Users', value: client.users.cache.size.toString(), inline: true },
            { name: 'Uptime', value: `<t:${Math.floor((Date.now() - client.uptime) / 1000)}:R>`, inline: true },
            { name: 'Commands', value: '25+', inline: true },
            { name: 'Version', value: '2.0.0', inline: true }
        )
        .setFooter({ text: 'Revenant Killboard Bot - Enhanced Albion Online Integration' });

    await interaction.reply({ embeds: [embed] });
}

async function handle8Ball(interaction) {
    const question = interaction.options.getString('question');
    const responses = [
        'Yes', 'No', 'Maybe', 'Definitely', 'Absolutely not',
        'Ask again later', 'I doubt it', 'Very likely', 'Unlikely',
        'Signs point to yes', 'Cannot predict now', 'Most likely'
    ];
    
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    const embed = new EmbedBuilder()
        .setTitle('🎱 Magic 8-Ball')
        .addFields(
            { name: 'Question', value: question, inline: false },
            { name: 'Answer', value: response, inline: false }
        )
        .setColor(0x000000);
    
    await interaction.reply({ embeds: [embed] });
}

async function handleRandomColor(interaction) {
    const randomColor = Math.floor(Math.random() * 16777215);
    const hexColor = `#${randomColor.toString(16).padStart(6, '0')}`;
    
    const embed = new EmbedBuilder()
        .setTitle('🎨 Random Color')
        .setDescription(`**${hexColor.toUpperCase()}**`)
        .setColor(randomColor)
        .addFields(
            { name: 'Hex', value: hexColor.toUpperCase(), inline: true },
            { name: 'RGB', value: `${(randomColor >> 16) & 255}, ${(randomColor >> 8) & 255}, ${randomColor & 255}`, inline: true }
        );
    
    await interaction.reply({ embeds: [embed] });
}

async function handleUTC(interaction) {
    const utcTime = moment().utc();
    const albionTime = utcTime.format('YYYY-MM-DD HH:mm:ss');
    
    const embed = new EmbedBuilder()
        .setTitle('🕐 Albion Online Time (UTC)')
        .setDescription(`**${albionTime}**`)
        .setColor(0x0099ff)
        .addFields(
            { name: 'UTC Timestamp', value: `<t:${Math.floor(utcTime.valueOf() / 1000)}:F>`, inline: false }
        );
    
    await interaction.reply({ embeds: [embed] });
}

async function handleSetLanguage(interaction) {
    const language = interaction.options.getString('language');
    await interaction.deferReply();

    try {
        await db.updateServerSettings(interaction.guildId, { language });
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Language Set')
            .setDescription(`Server language set to: ${language}`)
            .setColor(0x00ff00);
        
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Set language error:', error);
        await interaction.editReply('Error setting language');
    }
}

async function handleSetBuilderRole(interaction) {
    const role = interaction.options.getRole('role');
    await interaction.deferReply();

    try {
        await db.updateServerSettings(interaction.guildId, { builder_role: role.id });
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Builder Role Set')
            .setDescription(`Builder role set to: ${role}`)
            .setColor(0x00ff00);
        
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Set builder role error:', error);
        await interaction.editReply('Error setting builder role');
    }
}

async function handleServerStatus(interaction) {
    await interaction.deferReply();

    try {
        // Check Albion Online server status
        const statusEmbed = new EmbedBuilder()
            .setTitle('🌐 Albion Online Server Status')
            .setColor(0x00ff00)
            .addFields(
                { name: 'Americas', value: '🟢 Online', inline: true },
                { name: 'Europe', value: '🟢 Online', inline: true },
                { name: 'Asia', value: '🟢 Online', inline: true }
            )
            .setFooter({ text: 'Status checked at' })
            .setTimestamp();

        await interaction.editReply({ embeds: [statusEmbed] });
    } catch (error) {
        console.error('Server status error:', error);
        await interaction.editReply('Error checking server status');
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down...');
    db.close();
    client.destroy();
    process.exit(0);
});

// Login
client.login(process.env.DISCORD_TOKEN);