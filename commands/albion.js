const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

const ALBION_API_BASE = 'https://gameinfo.albiononline.com/api/gameinfo';
const ALBION_DATA_API = 'https://www.albion-online-data.com/api/v2/stats';
const RENDER_API = 'https://render.albiononline.com/v1';

class AlbionCommands {
    constructor(db, fuse, itemList) {
        this.db = db;
        this.fuse = fuse;
        this.itemList = itemList;
    }

    async handlePrice(interaction) {
        const itemQuery = interaction.options.getString('item');
        await interaction.deferReply();
        
        try {
            const searchResults = this.fuse.search(itemQuery);
            
            if (searchResults.length === 0) {
                await interaction.editReply(`No items found matching "${itemQuery}"`);
                return;
            }
            
            if (searchResults.length === 1 || searchResults[0].score < 0.1) {
                const item = searchResults[0].item;
                const prices = await this.getItemPrices(item.id);
                const embed = this.createPriceEmbed(item, prices);
                await interaction.editReply({ embeds: [embed] });
            } else {
                const options = searchResults.slice(0, 10).map((result, index) => 
                    `${index + 1}. **${result.item.name}** (T${result.item.tier}${result.item.enchantment > 0 ? `.${result.item.enchantment}` : ''})`
                ).join('\n');
                
                await interaction.editReply(`Did you mean:\n${options}\n\nPlease be more specific.`);
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

    async handleImage(interaction) {
        const itemQuery = interaction.options.getString('item');
        const quality = interaction.options.getInteger('quality') || 1;
        
        await interaction.deferReply();

        try {
            const searchResults = this.fuse.search(itemQuery);
            
            if (searchResults.length === 0) {
                await interaction.editReply(`No items found matching "${itemQuery}"`);
                return;
            }

            const item = searchResults[0].item;
            const imageUrl = `${RENDER_API}/item/${item.id}?quality=${quality}&size=217`;

            const embed = new EmbedBuilder()
                .setTitle(`🖼️ ${item.name}`)
                .setDescription(`Quality: ${quality} | Tier: ${item.tier}`)
                .setImage(imageUrl)
                .setColor(0x0099ff);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Image command error:', error);
            await interaction.editReply('Error generating item image');
        }
    }

    async handleRandomator(interaction) {
        await interaction.deferReply();

        try {
            // Random weapon categories
            const weaponCategories = ['sword', 'axe', 'hammer', 'spear', 'bow', 'crossbow', 'staff', 'dagger'];
            const randomCategory = weaponCategories[Math.floor(Math.random() * weaponCategories.length)];
            
            // Filter items by category
            const weapons = this.itemList.filter(item => 
                item.category.toLowerCase().includes(randomCategory) && 
                item.tier >= 4 && item.tier <= 8
            );
            
            if (weapons.length === 0) {
                await interaction.editReply('Could not generate random build');
                return;
            }

            const randomWeapon = weapons[Math.floor(Math.random() * weapons.length)];
            
            const embed = new EmbedBuilder()
                .setTitle('🎲 Random Build')
                .setColor(0x9932CC)
                .addFields(
                    { name: 'Weapon', value: randomWeapon.name, inline: true },
                    { name: 'Category', value: randomCategory.toUpperCase(), inline: true },
                    { name: 'Tier', value: `T${randomWeapon.tier}`, inline: true }
                )
                .setFooter({ text: 'Use /new-build to save this as a custom build!' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Randomator command error:', error);
            await interaction.editReply('Error generating random build');
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

    createPriceEmbed(item, prices) {
        const embed = new EmbedBuilder()
            .setTitle(`💰 ${item.name} Prices`)
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
}

module.exports = AlbionCommands;