const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

const ALBION_API_BASE = 'https://gameinfo.albiononline.com/api/gameinfo';
const ALBION_DATA_API = 'https://www.albion-online-data.com/api/v2/stats';
const RENDER_API = 'https://render.albiononline.com/v1';

class AlbionCommands {
    constructor(db) {
        this.db = db;
    }
    generateItemPatterns(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const patterns = [];
        
        // If user already provided an item ID, use it directly
        if (term.match(/^T[2-8]_/i)) {
            patterns.push(searchTerm.toUpperCase());
            return patterns;
        }
        
        // Common item mappings for popular searches
        const commonMappings = {
            // Resources
            'hide': ['T4_HIDE', 'T5_HIDE', 'T6_HIDE'],
            'leather': ['T4_LEATHER', 'T5_LEATHER', 'T6_LEATHER'],
            'cloth': ['T4_CLOTH', 'T5_CLOTH', 'T6_CLOTH'],
            'ore': ['T4_ORE', 'T5_ORE', 'T6_ORE'],
            'metal': ['T4_METALBAR', 'T5_METALBAR', 'T6_METALBAR'],
            'stone': ['T4_ROCK', 'T5_ROCK', 'T6_ROCK'],
            'wood': ['T4_WOOD', 'T5_WOOD', 'T6_WOOD'],
            'planks': ['T4_PLANKS', 'T5_PLANKS', 'T6_PLANKS'],
            'plank': ['T4_PLANKS', 'T5_PLANKS', 'T6_PLANKS'],
            
            // Weapons
            'sword': ['T4_SWORD', 'T5_SWORD', 'T6_SWORD', 'T7_SWORD', 'T8_SWORD'],
            'axe': ['T4_AXE', 'T5_AXE', 'T6_AXE'],
            'hammer': ['T4_HAMMER', 'T5_HAMMER', 'T6_HAMMER'],
            'bow': ['T4_BOW', 'T5_BOW', 'T6_BOW'],
            'crossbow': ['T4_CROSSBOW', 'T5_CROSSBOW', 'T6_CROSSBOW'],
            'dagger': ['T4_DAGGER', 'T5_DAGGER', 'T6_DAGGER'],
            'spear': ['T4_SPEAR', 'T5_SPEAR', 'T6_SPEAR'],
            
            // Armor
            'helmet': ['T4_HEAD_PLATE_SET1', 'T4_HEAD_LEATHER_SET1', 'T4_HEAD_CLOTH_SET1'],
            'armor': ['T4_ARMOR_PLATE_SET1', 'T4_ARMOR_LEATHER_SET1', 'T4_ARMOR_CLOTH_SET1'],
            'boots': ['T4_SHOES_PLATE_SET1', 'T4_SHOES_LEATHER_SET1', 'T4_SHOES_CLOTH_SET1'],
            
            // Consumables
            'potion': ['T4_POTION_HEAL', 'T5_POTION_HEAL', 'T6_POTION_HEAL'],
            'heal': ['T4_POTION_HEAL', 'T5_POTION_HEAL', 'T6_POTION_HEAL'],
            'food': ['T4_MEAL', 'T5_MEAL', 'T6_MEAL'],
            'bread': ['T3_BREAD', 'T4_BREAD', 'T5_BREAD'],
            
            // Mounts
            'horse': ['T4_MOUNT_HORSE', 'T5_MOUNT_HORSE', 'T6_MOUNT_HORSE'],
            'ox': ['T4_MOUNT_OX', 'T5_MOUNT_OX', 'T6_MOUNT_OX'],
            'mount': ['T4_MOUNT_HORSE', 'T4_MOUNT_OX'],
            
            // Special
            'premium': ['PREMIUM'],
            'gold': ['GOLD'],
            'silver': ['SILVER']
        };
        
        // Look for matches in common mappings
        for (const [key, values] of Object.entries(commonMappings)) {
            if (term.includes(key)) {
                patterns.push(...values);
            }
        }
        
        // Generate tier-based patterns if we detect tier keywords
        const tierMap = {
            'novice': 'T3', 'adept': 'T4', 'expert': 'T5', 
            'master': 'T6', 'grandmaster': 'T7', 'elder': 'T8'
        };
        
        let detectedTier = null;
        for (const [tierName, tierCode] of Object.entries(tierMap)) {
            if (term.includes(tierName)) {
                detectedTier = tierCode;
                break;
            }
        }
        
        // If we detected a tier, try specific patterns
        if (detectedTier) {
            if (term.includes('sword')) patterns.push(`${detectedTier}_SWORD`);
            if (term.includes('axe')) patterns.push(`${detectedTier}_AXE`);
            if (term.includes('hammer')) patterns.push(`${detectedTier}_HAMMER`);
            if (term.includes('bow')) patterns.push(`${detectedTier}_BOW`);
            // Add more specific patterns as needed
        }
        
        // If no patterns found, try the search term as-is (capitalized)
        if (patterns.length === 0) {
            patterns.push(term.toUpperCase().replace(/\s+/g, '_'));
        }
        
        return patterns;
    }
    
    async handlePrice(interaction) {
        const itemQuery = interaction.options.getString('item');
        await interaction.deferReply();
        
        try {
            const patterns = this.generateItemPatterns(itemQuery);
            let foundData = null;
            let usedPattern = null;
            
            // Try each pattern until we find market data
            for (const pattern of patterns) {
                const prices = await this.getItemPrices(pattern);
                
                // Check if we actually got market data (not all zeros)
                const hasRealData = prices.some(p => p.sell_price_min > 0 || p.buy_price_max > 0);
                
                if (hasRealData) {
                    foundData = prices;
                    usedPattern = pattern;
                    break;
                }
            }
            
            if (foundData) {
                const embed = this.createPriceEmbed(`${itemQuery} (${usedPattern})`, foundData);
                await interaction.editReply({ embeds: [embed] });
            } else {
                // No market data found, show helpful message
                const embed = new EmbedBuilder()
                    .setTitle('🔍 No Market Data Found')
                    .setDescription(`No recent market data found for "${itemQuery}".`)
                    .addFields(
                        { name: 'Try These Examples:', value: '• `/price T4_SWORD`\n• `/price healing potion`\n• `/price hide`\n• `/price expert sword`\n• `/price premium`', inline: false },
                        { name: 'Patterns Tried:', value: patterns.slice(0, 5).map(p => `\`${p}\``).join(', '), inline: false },
                        { name: 'Tip:', value: 'Use exact item IDs (like `T4_SWORD`) for best results, or check https://www.albiononline2d.com/en/item', inline: false }
                    )
                    .setColor(0xff9900);
                
                await interaction.editReply({ embeds: [embed] });
            }
            
        } catch (error) {
            console.error('Price command error:', error);
            await interaction.editReply('Error fetching price data');
        }
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