const axios = require('axios');

// Albion Online API base URL
const ALBION_API_BASE = 'https://gameinfo.albiononline.com/api/gameinfo';

// Helper function to safely display any value
function displayValue(value, fieldName = '') {
    if (value === null || value === undefined) {
        return 'N/A';
    }
    if (value === '') {
        return 'Empty';
    }
    if (Array.isArray(value)) {
        return value.length === 0 ? 'Empty Array' : `Array (${value.length} items)`;
    }
    if (typeof value === 'object') {
        return Object.keys(value).length === 0 ? 'Empty Object' : 'Object (see nested data below)';
    }
    return value.toString();
}

// Recursive function to print object structure with proper indentation
function printObjectStructure(obj, indent = 0, parentKey = '') {
    const spaces = '  '.repeat(indent);
    
    if (typeof obj !== 'object' || obj === null) {
        console.log(`${spaces}${parentKey}: ${displayValue(obj, parentKey)}`);
        return;
    }
    
    if (Array.isArray(obj)) {
        console.log(`${spaces}${parentKey}: Array with ${obj.length} items`);
        if (obj.length > 0) {
            console.log(`${spaces}  Sample item structure:`);
            printObjectStructure(obj[0], indent + 2, '[0]');
        }
        return;
    }
    
    // Handle objects
    const keys = Object.keys(obj);
    if (keys.length === 0) {
        console.log(`${spaces}${parentKey}: Empty Object`);
        return;
    }
    
    if (parentKey) {
        console.log(`${spaces}${parentKey}: Object with ${keys.length} properties`);
    }
    
    keys.forEach(key => {
        const value = obj[key];
        if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                console.log(`${spaces}  ${key}: Array (${value.length} items)`);
                if (value.length > 0) {
                    console.log(`${spaces}    Sample item:`);
                    printObjectStructure(value[0], indent + 3);
                }
            } else {
                console.log(`${spaces}  ${key}: Object`);
                printObjectStructure(value, indent + 2);
            }
        } else {
            console.log(`${spaces}  ${key}: ${displayValue(value, key)}`);
        }
    });
}

// Function to explore recent kill events
async function exploreKillEvents() {
    try {
        console.log('🔍 EXPLORING RECENT KILL EVENTS');
        console.log('=' .repeat(50));
        
        // Try different event endpoints based on the research
        const eventEndpoints = [
            '/events?limit=1&offset=0',
            '/events/battle?limit=1&offset=0', 
            '/battles?sort=recent&limit=1&offset=0'
        ];
        
        for (const endpoint of eventEndpoints) {
            try {
                console.log(`Trying endpoint: ${endpoint}`);
                const response = await axios.get(`${ALBION_API_BASE}${endpoint}`);
                const events = response.data;
                
                if (events && events.length > 0) {
                    console.log(`✅ Success! Found ${events.length} event(s). Analyzing first event:\n`);
                    printObjectStructure(events[0]);
                    return;
                } else {
                    console.log('No events found at this endpoint');
                }
            } catch (error) {
                console.log(`❌ Failed: ${error.response?.status} ${error.response?.statusText || error.message}`);
            }
        }
        
    } catch (error) {
        console.error('Error exploring kill events:', error.message);
    }
}

// Function to explore guild data
async function exploreGuildData(guildName = 'Revenant Renegades') {
    try {
        console.log('\n🏰 EXPLORING GUILD DATA');
        console.log('=' .repeat(50));
        
        // First search for the guild
        const searchResponse = await axios.get(`${ALBION_API_BASE}/search?q=${guildName}`);
        const searchResults = searchResponse.data;
        
        if (!searchResults.guilds || searchResults.guilds.length === 0) {
            console.log('No guilds found with that name');
            return;
        }
        
        const guildId = searchResults.guilds[0].Id;
        console.log(`Found guild: ${searchResults.guilds[0].Name} (ID: ${guildId})\n`);
        
        // Get detailed guild info
        const guildResponse = await axios.get(`${ALBION_API_BASE}/guilds/${guildId}`);
        const guildData = guildResponse.data;
        
        console.log('GUILD STRUCTURE:');
        printObjectStructure(guildData);
        
    } catch (error) {
        console.error('Error fetching guild data:', error.message);
    }
}

// Function to explore player data
async function explorePlayerData(playerName = 'Tryskelly') {
    try {
        console.log('\n👤 EXPLORING PLAYER DATA');
        console.log('=' .repeat(50));
        
        // Search for player
        console.log(`Searching for player: ${playerName}`);
        try {
            const searchResponse = await axios.get(`${ALBION_API_BASE}/search?q=${playerName}`);
            const searchResults = searchResponse.data;
            
            console.log('Search results structure:');
            printObjectStructure(searchResults);
            
            if (!searchResults.players || searchResults.players.length === 0) {
                console.log('No players found with that name');
                return;
            }
            
            const playerId = searchResults.players[0].Id;
            console.log(`\nFound player: ${searchResults.players[0].Name} (ID: ${playerId})`);
            
            // Try different player event endpoints
            const playerEventEndpoints = [
                `/players/${playerId}/events?limit=1&offset=0`,
                `/events/playerevents/${playerId}?limit=1&offset=0`,
                `/players/${playerId}`
            ];
            
            for (const endpoint of playerEventEndpoints) {
                try {
                    console.log(`\nTrying player endpoint: ${endpoint}`);
                    const response = await axios.get(`${ALBION_API_BASE}${endpoint}`);
                    const data = response.data;
                    
                    console.log('✅ Success! Player data structure:');
                    printObjectStructure(data);
                    return;
                } catch (error) {
                    console.log(`❌ Failed: ${error.response?.status} ${error.response?.statusText || error.message}`);
                }
            }
            
        } catch (error) {
            console.log(`❌ Search failed: ${error.response?.status} ${error.response?.statusText || error.message}`);
        }
        
    } catch (error) {
        console.error('Error in player exploration:', error.message);
    }
}

// Function to explore search results structure
async function exploreSearchResults(query = 'Revenant Renegades') {
    try {
        console.log('\n🔎 EXPLORING SEARCH RESULTS STRUCTURE');
        console.log('=' .repeat(50));
        
        const response = await axios.get(`${ALBION_API_BASE}/search?q=${query}`);
        const searchData = response.data;
        
        console.log('SEARCH RESULTS STRUCTURE:');
        printObjectStructure(searchData);
        
    } catch (error) {
        console.error('Error fetching search results:', error.message);
    }
}

// Main function to run all explorations
async function exploreAlbionAPI() {
    console.log('🎮 ALBION ONLINE API EXPLORER');
    console.log('=' .repeat(50));
    console.log('This script will explore different endpoints and show you all available data fields.\n');
    
    // Add delays between requests to be respectful to the API
    await exploreKillEvents();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    await exploreGuildData('Revenant Renegades'); // Using your guild
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    await explorePlayerData('Tryskelly'); // Using Tryskelly as requested player
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    await exploreSearchResults('Revenant Renegades');
    
    console.log('\n✅ API exploration complete!');
    console.log('💡 You can modify the guild/player names in the script to explore different data.');
    console.log('🏰 Current settings: Guild="Revenant Renegades", Player="Tryskelly"');
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Run the exploration
exploreAlbionAPI();