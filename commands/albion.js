const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

const ALBION_API_BASE = 'https://gameinfo.albiononline.com/api/gameinfo';
const ALBION_DATA_API = 'https://www.albion-online-data.com/api/v2/stats';
const RENDER_API = 'https://render.albiononline.com/v1';

class AlbionCommands {
    constructor(db) {
        this.db = db;
    }

    // Common Albion Online items database
    getItemDatabase() {
        return {
            // Resources - Wood/Planks
            'chestnut planks': 'T3_PLANKS_LEVEL1@1',
            'pine planks': 'T4_PLANKS_LEVEL1@1', 
            'cedar planks': 'T5_PLANKS_LEVEL1@1',
            'bloodoak planks': 'T6_PLANKS_LEVEL1@1',
            'ashenbark planks': 'T7_PLANKS_LEVEL1@1',
            'elderwood planks': 'T8_PLANKS_LEVEL1@1',
            
            // Resources - Logs
            'rough logs': 'T2_WOOD',
            'birch logs': 'T3_WOOD',
            'chestnut logs': 'T4_WOOD',
            'pine logs': 'T5_WOOD',
            'cedar logs': 'T6_WOOD',
            'bloodoak logs': 'T7_WOOD',
            'ashenbark logs': 'T8_WOOD',
            
            // Resources - Stone
            'rough stone': 'T2_ROCK',
            'limestone': 'T3_ROCK',
            'sandstone': 'T4_ROCK',
            'travertine': 'T5_ROCK',
            'granite': 'T6_ROCK',
            'slate': 'T7_ROCK',
            'basalt': 'T8_ROCK',
            
            // Resources - Hide/Leather
            'raw hide': 'T2_HIDE',
            'scrapped hide': 'T3_HIDE',
            'rugged hide': 'T4_HIDE',
            'thick hide': 'T5_HIDE',
            'resilient hide': 'T6_HIDE',
            'robust hide': 'T7_HIDE',
            'superior hide': 'T8_HIDE',
            
            // Weapons - Swords
            'novice sword': 'T3_SWORD',
            'adept sword': 'T4_SWORD',
            'expert sword': 'T5_SWORD',
            'master sword': 'T6_SWORD',
            'grandmaster sword': 'T7_SWORD',
            'elder sword': 'T8_SWORD',
            
            'broadsword': 'T4_SWORD',
            'claymore': 'T4_2H_CLAYMORE',
            'dual swords': 'T4_2H_DUALSWORD',
            
            // Weapons - Axes
            'battle axe': 'T4_AXE',
            'greataxe': 'T4_2H_AXE',
            'halberd': 'T4_2H_HALBERD',
            
            // Weapons - Hammers
            'war hammer': 'T4_HAMMER',
            'great hammer': 'T4_2H_HAMMER',
            'polehammer': 'T4_2H_POLEHAMMER',
            
            // Weapons - Bows
            'bow': 'T4_BOW',
            'warbow': 'T4_BOW_LONGBOW',
            'crossbow': 'T4_CROSSBOW',
            'heavy crossbow': 'T4_CROSSBOW_CANNON',
            
            // Armor - Cloth
            'scholar cowl': 'T4_HEAD_CLOTH_SET1',
            'scholar robe': 'T4_ARMOR_CLOTH_SET1',
            'scholar sandals': 'T4_SHOES_CLOTH_SET1',
            
            // Armor - Leather  
            'mercenary hood': 'T4_HEAD_LEATHER_SET1',
            'mercenary jacket': 'T4_ARMOR_LEATHER_SET1',
            'mercenary shoes': 'T4_SHOES_LEATHER_SET1',
            
            // Armor - Plate
            'soldier helmet': 'T4_HEAD_PLATE_SET1',
            'soldier armor': 'T4_ARMOR_PLATE_SET1',
            'soldier boots': 'T4_SHOES_PLATE_SET1',
            
            // Consumables
            'minor healing potion': 'T3_POTION_HEAL',
            'healing potion': 'T4_POTION_HEAL',
            'major healing potion': 'T5_POTION_HEAL',
            'pork pie': 'T3_MEAL',
            'goose pie': 'T4_MEAL',
            'pork omelette': 'T5_MEAL',
            
            // Mount
            'riding horse': 'T3_MOUNT_HORSE',
            'armored horse': 'T4_MOUNT_HORSE',
            'heavy war horse': 'T5_MOUNT_HORSE',
            'ox': 'T4_MOUNT_OX',
            'giant stag': 'T5_MOUNT_STAG',
            
            // Premium
            'premium': 'PREMIUM'
        };
    }

    findItemId(searchTerm) {
        const itemDb = this.getItemDatabase();
        const lowerTerm = searchTerm.toLowerCase();
        
        // Try exact match first
        if (itemDb[lowerTerm]) {
            return itemDb[lowerTerm];
        }
        
        // Try direct item ID
        if (searchTerm.match(/^T[2-8]_/)) {
            return searchTerm;
        }
        
        return null;
    }

    findItemSuggestions(searchTerm) {
        const itemDb = this.getItemDatabase();
        const lowerTerm = searchTerm.toLowerCase();
        const suggestions = [];
        
        // Find partial matches
        for (const [name, id] of Object.entries(itemDb)) {
            if (name.includes(lowerTerm)) {
                suggestions.push({ name: name, id: id });
            }
        }
        
        return suggestions.slice(0, 10); // Limit to 10 suggestions
    }

    async getItemPrices(itemId, locations = ['Caerleon', 'Bridgewatch', 'Lymhurst', 'Martlock', 'Thetford', 'Fort Sterling']) {
        try {
            const locationStr = locations.join(',');
            const response = await axios.get(`${ALBION_DATA_API}/prices/${itemId}?locations=${locationStr}`);
            return response.data || [];
        } catch (error) {
            console.error(`Error fetching prices for ${itemId}:`, error.message);
            return [];
        }
    }

    createPriceEmbed(itemName, prices) {
        const embed = new EmbedBuilder()
            .setTitle(`💰 ${itemName} Prices`)
            .setColor(0x0099ff)
            .setTimestamp();

        if (prices.length === 0) {
            embed.setDescription('No recent price data available');
            return embed;
        }

        const sortedPrices = prices
            .filter(p => p.sell_price_min > 0)
            .sort((a, b) => a.sell_price_min - b.sell_price_min);

        if (sortedPrices.length > 0) {
            const fields = sortedPrices.slice(0, 6).map(price => ({
                name: price.city,
                value: `Sell: ${price.sell_price_min.toLocaleString()}\nBuy: ${price.buy_price_max.toLocaleString()}\nUpdated: <t:${Math.floor(new Date(price.sell_price_min_date).getTime() / 1000)}:R>`,
                inline: true
            }));
            
            embed.addFields(fields);
        } else {
            embed.setDescription('No current market orders found');
        }

        return embed;
    }

    async handlePrice(interaction) {
        const itemQuery = interaction.options.getString('item');
        await interaction.deferReply();
        
        try {
            // First, try to find the exact item ID
            const itemId = this.findItemId(itemQuery);
            
            if (itemId) {
                // We found a match, get prices
                const prices = await this.getItemPrices(itemId);
                const embed = this.createPriceEmbed(itemQuery, prices);
                await interaction.editReply({ embeds: [embed] });
            } else {
                // No exact match, show suggestions
                const suggestions = this.findItemSuggestions(itemQuery);
                
                if (suggestions.length > 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('🔍 Did you mean?')
                        .setDescription(`Multiple items found matching "${itemQuery}":\n\n${suggestions.map((item, index) => `${index + 1}. **${item.name}** (\`${item.id}\`)`).join('\n')}\n\nTry using the exact name: \`/price ${suggestions[0].name}\``)
                        .setColor(0x0099ff);
                    
                    await interaction.editReply({ embeds: [embed] });
                } else {
                    await interaction.editReply(`No items found matching "${itemQuery}". Try searching for common items like:\n- \`/price chestnut planks\`\n- \`/price T4_SWORD\`\n- \`/price healing potion\`\n\nOr check item names at https://www.albiononline2d.com/en/item`);
                }
            }
        } catch (error) {
            console.error('Price command error:', error);
            await interaction.editReply('Error fetching price data');
        }
    }

    async handlePlayer(interaction) {
        const playerName = interaction.options.getString('player');
        await interaction.deferReply();

        try {
            // Search for player
            const searchResponse = await axios.get(`${ALBION_API_BASE}/search?q=${playerName}`);
            const players = searchResponse.data.players;

            if (!players || players.length === 0) {
                await interaction.editReply(`Player "${playerName}" not found`);
                return;
            }

            const player = players[0];
            
            // Get player details
            const playerResponse = await axios.get(`${ALBION_API_BASE}/players/${player.Id}`);
            const playerData = playerResponse.data;

            const embed = new EmbedBuilder()
                .setTitle(`👤 ${playerData.Name}`)
                .setColor(0x0099ff)
                .addFields(
                    { name: 'Guild', value: playerData.GuildName || 'None', inline: true },
                    { name: 'Alliance', value: playerData.AllianceName || 'None', inline: true },
                    { name: 'Kill Fame', value: playerData.KillFame?.toLocaleString() || '0', inline: true },
                    { name: 'Death Fame', value: playerData.DeathFame?.toLocaleString() || '0', inline: true },
                    { name: 'Fame Ratio', value: playerData.FameRatio?.toFixed(2) || '0', inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Player command error:', error);
            await interaction.editReply('Error fetching player data');
        }
    }

    async handleGuild(interaction) {
        const guildName = interaction.options.getString('guild');
        await interaction.deferReply();

        try {
            const searchResponse = await axios.get(`${ALBION_API_BASE}/search?q=${guildName}`);
            const guilds = searchResponse.data.guilds;

            if (!guilds || guilds.length === 0) {
                await interaction.editReply(`Guild "${guildName}" not found`);
                return;
            }

            const guild = guilds[0];
            const guildResponse = await axios.get(`${ALBION_API_BASE}/guilds/${guild.Id}`);
            const guildData = guildResponse.data;

            const embed = new EmbedBuilder()
                .setTitle(`🏰 ${guildData.Name}`)
                .setColor(0x0099ff)
                .addFields(
                    { name: 'Alliance', value: guildData.AllianceName || 'None', inline: true },
                    { name: 'Members', value: guildData.MemberCount?.toString() || '0', inline: true },
                    { name: 'Founded', value: new Date(guildData.Founded).toLocaleDateString(), inline: true },
                    { name: 'Fame', value: guildData.Fame?.toLocaleString() || '0', inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Guild command error:', error);
            await interaction.editReply('Error fetching guild data');
        }
    }

    async handleGold(interaction) {
        await interaction.deferReply();

        try {
            const response = await axios.get(`${ALBION_DATA_API}/gold?date=2024-01-01`);
            const goldData = response.data;

            if (!goldData || goldData.length === 0) {
                await interaction.editReply('No gold price data available');
                return;
            }

            const latest = goldData[goldData.length - 1];
            
            const embed = new EmbedBuilder()
                .setTitle('💰 Live Gold Price')
                .setColor(0xFFD700)
                .addFields(
                    { name: 'Current Price', value: `${latest.price} silver`, inline: true },
                    { name: 'Last Updated', value: `<t:${Math.floor(new Date(latest.timestamp).getTime() / 1000)}:R>`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Gold command error:', error);
            await interaction.editReply('Error fetching gold price');
        }
    }

    async handlePremium(interaction) {
        await interaction.deferReply();
        
        try {
            const premiumPrices = await this.getItemPrices('PREMIUM');
            
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

    async handleRandomator(interaction) {
        await interaction.deferReply();

        try {
            const weaponTypes = ['SWORD', 'AXE', 'HAMMER', 'SPEAR', 'BOW', 'CROSSBOW', 'FIRESTAFF', 'FROSTSTAFF', 'HOLYSTAFF', 'ARCANESTAFF', 'CURSESTAFF', 'NATURESTAFF', 'DAGGER'];
            const tiers = ['T4', 'T5', 'T6', 'T7', 'T8'];
            const enchantments = ['', '@1', '@2', '@3'];
            
            const randomWeapon = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
            const randomTier = tiers[Math.floor(Math.random() * tiers.length)];
            const randomEnchant = enchantments[Math.floor(Math.random() * enchantments.length)];
            
            const weaponId = `${randomTier}_${randomWeapon}${randomEnchant}`;
            
            const embed = new EmbedBuilder()
                .setTitle('🎲 Random Build Generator')
                .setColor(0x9932CC)
                .addFields(
                    { name: 'Weapon', value: weaponId, inline: true },
                    { name: 'Type', value: randomWeapon, inline: true },
                    { name: 'Tier', value: randomTier, inline: true }
                )
                .setFooter({ text: 'Use /new-build to save this as a custom build!' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Randomator command error:', error);
            await interaction.editReply('Error generating random build');
        }
    }

    async handleImage(interaction) {
        const itemQuery = interaction.options.getString('item');
        const quality = interaction.options.getInteger('quality') || 1;
        
        await interaction.deferReply();

        try {
            const itemId = this.findItemId(itemQuery);
            
            if (!itemId) {
                await interaction.editReply(`Item "${itemQuery}" not found. Try using exact item names like "chestnut planks" or item IDs like "T4_SWORD".`);
                return;
            }

            const imageUrl = `${RENDER_API}/item/${itemId}?quality=${quality}&size=217`;

            const embed = new EmbedBuilder()
                .setTitle(`🖼️ ${itemQuery}`)
                .setDescription(`Quality: ${quality} | Item ID: ${itemId}`)
                .setImage(imageUrl)
                .setColor(0x0099ff);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Image command error:', error);
            await interaction.editReply('Error generating item image');
        }
    }
}

module.exports = AlbionCommands;