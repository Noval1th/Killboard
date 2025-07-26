const axios = require('axios');

async function findGuildId() {
    try {
        console.log('🔍 Searching for Revenant Renegades guild...\n');
        
        const response = await axios.get('https://gameinfo.albiononline.com/api/gameinfo/search?q=Revenant%20Renegades');
        const searchResults = response.data;
        
        if (!searchResults.guilds || searchResults.guilds.length === 0) {
            console.log('❌ No guilds found with name "Revenant Renegades"');
            console.log('Try searching for partial names or check spelling');
            return;
        }
        
        console.log(`✅ Found ${searchResults.guilds.length} guild(s):\n`);
        
        searchResults.guilds.forEach((guild, index) => {
            console.log(`${index + 1}. Guild Name: ${guild.Name}`);
            console.log(`   Guild ID: ${guild.Id}`);
            console.log(`   Alliance: ${guild.AllianceName || 'None'}`);
            console.log(`   Members: ${guild.MemberCount || 'Unknown'}`);
            console.log(''); // Empty line
        });
        
        // Get detailed info for the first guild
        const guild = searchResults.guilds[0];
        console.log('📊 Getting detailed guild information...\n');
        
        const guildResponse = await axios.get(`https://gameinfo.albiononline.com/api/gameinfo/guilds/${guild.Id}`);
        const guildData = guildResponse.data;
        
        console.log('🏰 GUILD DETAILS:');
        console.log(`Name: ${guildData.Name}`);
        console.log(`ID: ${guildData.Id}`);
        console.log(`Founded: ${guildData.Founded}`);
        console.log(`Alliance: ${guildData.AllianceName || 'None'}`);
        console.log(`Member Count: ${guildData.MemberCount}`);
        console.log(`Fame: ${guildData.Fame?.toLocaleString() || 'Unknown'}`);
        
        console.log('\n👥 SAMPLE MEMBERS:');
        if (guildData.members && guildData.members.length > 0) {
            guildData.members.slice(0, 5).forEach((member, index) => {
                console.log(`${index + 1}. ${member.Name} (ID: ${member.Id})`);
            });
            
            if (guildData.members.length > 5) {
                console.log(`... and ${guildData.members.length - 5} more members`);
            }
        }
        
        console.log('\n🚀 FOR YOUR DISCORD BOT:');
        console.log(`GUILD_ID=${guild.Id}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data:`, error.response.data);
        }
    }
}

// Also test the events endpoint
async function testEventsEndpoint() {
    try {
        console.log('\n🔍 Testing recent events endpoint...\n');
        
        const response = await axios.get('https://gameinfo.albiononline.com/api/gameinfo/events?limit=3&offset=0');
        const events = response.data;
        
        if (events && events.length > 0) {
            console.log(`✅ Events endpoint working! Found ${events.length} recent events:`);
            
            events.forEach((event, index) => {
                console.log(`\n${index + 1}. Event ID: ${event.EventId}`);
                console.log(`   Killer: ${event.Killer?.Name || 'Unknown'}`);
                console.log(`   Victim: ${event.Victim?.Name || 'Unknown'}`);
                console.log(`   Time: ${new Date(event.TimeStamp).toLocaleString()}`);
                console.log(`   Fame: ${event.TotalVictimKillFame?.toLocaleString() || 'Unknown'}`);
            });
        } else {
            console.log('⚠️ No recent events found');
        }
        
    } catch (error) {
        console.error('❌ Events endpoint error:', error.message);
    }
}

async function main() {
    console.log('🎮 ALBION ONLINE GUILD & API TESTER');
    console.log('=' .repeat(50));
    
    await findGuildId();
    await testEventsEndpoint();
    
    console.log('\n✅ Testing complete!');
}

main();