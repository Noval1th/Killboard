# Revenant Killboard - Albion Online Discord Bot

A comprehensive Discord bot for Albion Online guilds featuring kill/death tracking, market price lookups, build management, and utility commands.

![Discord](https://img.shields.io/badge/Discord-Bot-blue?logo=discord)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)
![Railway](https://img.shields.io/badge/Deploy-Railway-purple?logo=railway)
![Albion Online](https://img.shields.io/badge/Game-Albion_Online-orange)

## Features

### ⚔️ Killboard System
- **Real-time monitoring** of guild member kills and deaths
- **Automatic notifications** posted to designated Discord channels
- **Kill/death statistics** tracking and display
- **Multi-entity tracking** - monitor specific players or entire guilds
- **Persistent database** storage of all events

### 🎮 Albion Online Commands
- `/price` - Item market price lookups across all cities ⚠️ *Currently incomplete - pending better search implementation*
- `/player` - Player statistics and information lookup
- `/guild` - Guild information and member data
- `/gold` - Live gold market prices
- `/premium` - Live premium subscription prices
- `/randomator` - Random build generator
- `/image` - High-quality item images with quality selection

### 🛠️ Build Management
- `/build` - Display saved custom builds
- `/new-build` - Create and save builds with full equipment loadouts
- `/remove-build` - Delete builds (creator permissions)
- **Role-based permissions** for build management

### 🤖 Discord Utilities
- `/avatar` - Display user profile pictures
- `/user` - Detailed user information
- `/server` - Server statistics and information
- `/bot-info` - Bot status and information
- `/8ball` - Magic 8-ball responses
- `/random-color` - Generate random hex colors
- `/utc` - Current Albion Online time (UTC)
- `/set-language` - Server language configuration
- `/set-builder-role` - Set build management permissions
- `/server-status` - Live Albion Online server status

### 📊 Killboard Management
- `/killboard info` - Display current killboard configuration
- `/killboard set-channel` - Set channel for kill/death notifications
- `/killboard track` - Track specific players or guilds
- `/killboard untrack` - Remove entity tracking
- `/killboard remove` - Reset entire killboard configuration

## Installation & Setup

### Prerequisites
- Node.js 18+ installed
- Discord bot token from [Discord Developer Portal](https://discord.com/developers/applications)
- Railway account for hosting (optional)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/revenant-killboard.git
   cd revenant-killboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment configuration**
   
   Create a `.env` file:
   ```env
   DISCORD_TOKEN=your_discord_bot_token
   GUILD_ID=your_albion_guild_id
   CHANNEL_ID=your_discord_channel_id
   POLL_INTERVAL=30000
   DATABASE_URL=./killboard.db
   ```

4. **Get your Albion Guild ID**
   ```bash
   # Replace with your guild name
   curl "https://gameinfo.albiononline.com/api/gameinfo/search?q=Your%20Guild%20Name"
   ```

5. **Run the bot**
   ```bash
   npm start
   ```

### Railway Deployment

1. **Connect your GitHub repository** to Railway
2. **Set environment variables** in Railway dashboard:
   - `DISCORD_TOKEN`
   - `GUILD_ID`
   - `CHANNEL_ID` 
   - `POLL_INTERVAL`
3. **Deploy** - Railway will automatically build and deploy

## Configuration

### Discord Bot Setup
1. Create application at [Discord Developer Portal](https://discord.com/developers/applications)
2. Enable **Message Content Intent** under Privileged Gateway Intents
3. Generate invite URL with permissions: `Send Messages`, `Read Message History`, `Use Slash Commands`

### Guild Configuration
```bash
# Find your guild ID
/guild Your Guild Name

# Set up killboard
/killboard set-channel #your-channel
/killboard track type:guild name:Your Guild Name
```

## Dependencies

### Core Dependencies
- **discord.js** - Discord API integration
- **axios** - HTTP requests for Albion Online API
- **sqlite3** - Local database storage
- **moment-timezone** - Time handling for UTC display
- **dotenv** - Environment variable management

### Development Dependencies
- **nodemon** - Development auto-restart

## API Integration

### Albion Online APIs Used
- **Game Info API**: `https://gameinfo.albiononline.com/api/gameinfo/`
  - Player/guild searches and statistics
  - Kill/death event monitoring
- **Albion Data Project**: `https://www.albion-online-data.com/api/v2/`
  - Market price data ⚠️ *Implementation pending improvements*
- **Render Service**: `https://render.albiononline.com/v1/`
  - High-quality item images

## Database Schema

The bot uses SQLite with the following tables:
- `kill_events` - Stores all kill/death events
- `guild_members` - Cached guild member data
- `server_settings` - Per-server configuration
- `tracked_entities` - Players/guilds being monitored
- `builds` - Custom build storage

## Known Issues & Limitations

### ⚠️ Price Command Limitations
The `/price` command is currently incomplete and has limited functionality:
- **Limited item coverage** - Only handles common items and patterns
- **Inconsistent results** - Some items may not return market data
- **Search functionality** - No fuzzy search or "did you mean" suggestions

**Planned Improvements:**
- Integration with comprehensive item database
- Better search algorithms and suggestions
- More reliable market data fetching
- Support for enchanted items and quality levels

### Other Limitations
- Kill/death monitoring requires guild members to be active in PvP
- Market data depends on Albion Data Project availability
- Some API endpoints may have rate limits

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## File Structure

```
revenant-killboard/
├── index.js              # Main bot file
├── database.js           # Database operations
├── commands/
│   └── albion.js         # Albion Online specific commands
├── package.json          # Dependencies and scripts
├── .env                  # Environment variables (not in repo)
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## Commands Reference

### Albion Online
| Command | Description | Usage |
|---------|-------------|--------|
| `/price` | Market prices ⚠️ | `/price T4_SWORD` |
| `/player` | Player stats | `/player PlayerName` |
| `/guild` | Guild info | `/guild GuildName` |
| `/gold` | Gold prices | `/gold` |
| `/premium` | Premium prices | `/premium` |
| `/randomator` | Random build | `/randomator` |
| `/image` | Item images | `/image chestnut planks` |

### Builds
| Command | Description | Usage |
|---------|-------------|--------|
| `/build` | Display build | `/build BuildName` |
| `/new-build` | Create build | `/new-build name:PvP weapon:T6_SWORD` |
| `/remove-build` | Delete build | `/remove-build BuildName` |

### Killboard
| Command | Description | Usage |
|---------|-------------|--------|
| `/killboard info` | Show config | `/killboard info` |
| `/killboard set-channel` | Set channel | `/killboard set-channel #kills` |
| `/killboard track` | Track entity | `/killboard track type:guild name:GuildName` |
| `/killboard untrack` | Remove tracker | `/killboard untrack GuildName` |

## Support

- **Issues**: Report bugs via [GitHub Issues](https://github.com/yourusername/revenant-killboard/issues)
- **Discussions**: Feature requests and general discussion
- **Discord**: Join our development server (link if applicable)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Albion Online** by Sandbox Interactive
- **Albion Data Project** for market data API
- **Discord.js** community for excellent documentation
- **Railway** for hosting platform

---

**Note**: This bot is not affiliated with or endorsed by Sandbox Interactive or Albion Online. All game-related trademarks are property of their respective owners.