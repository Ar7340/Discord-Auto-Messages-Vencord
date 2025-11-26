# AutoMessageSender - Vencord Plugin

A powerful Discord bot plugin for Vencord that automatically sends customizable message sequences to your target channels at randomized intervals.

## Features

✨ **Automated Message Sequences** - Send up to 10 custom messages automatically
⏱️ **Smart Countdown Timer** - Visual display showing remaining time until next message
🎲 **Random Intervals** - Configurable random delays between 20-40 seconds (fully customizable)
🛑 **Easy Control** - Start/stop the plugin with one click
📍 **Channel Management** - Easily set and navigate to target channels
⚙️ **Flexible Configuration** - Customize all settings in the plugin panel
🎯 **Blank Message Filtering** - Leave messages blank to skip them

## Installation

1. Open Vencord settings
2. Navigate to **Plugins** → **Browse community plugins**
3. Search for **AutoMessageSender**
4. Click **Install**
5. Enable the plugin

Or manually:
```bash
git clone https://github.com/Ar7340/Discord-Auto-Messages-Vencord ~/.config/Vencord/plugins/AutoMessageSender
```

## Usage

### Quick Start

1. **Set Target Channel:**
   - Right-click any channel in your server
   - Select `Auto Message Sender` → `📍 Set As Target Channel`
   - Or use the `Set Current Channel` option in settings

2. **Configure Messages:**
   - Open Vencord Settings → Plugins → AutoMessageSender
   - Enter your messages in message fields (1-10 available)
   - Leave blank fields empty - they'll be ignored
   - You can use up to 10 messages

3. **Set Delay Range:**
   - Set `Minimum Interval` (default: 20 seconds)
   - Set `Maximum Interval` (default: 40 seconds)
   - Messages will be sent at random intervals within this range

4. **Start Sending:**
   - Right-click your target channel
   - Select `Auto Message Sender` → `▶️ Start Auto Messages`
   - Watch the countdown timer in the bottom-right corner

### Context Menu Options

Right-click any channel to access:

- **▶️ Start Auto Messages** - Begin sending message sequences
- **✅ Stop Auto Messages** - Stop the current sequence
- **📍 Set As Target Channel** - Set this channel as your target
- **🔗 Go To Target Channel** - Navigate to your target channel
- **Status** - View current status and settings
- **⚙️ Open Settings** - Access the plugin configuration panel

## Configuration

### Plugin Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Channel ID | String | Empty | Target channel ID (auto-filled with "Set Current Channel") |
| Message 1-10 | String | Varies | Your custom messages (leave blank to skip) |
| Minimum Interval | Number | 20 | Minimum seconds between message cycles |
| Maximum Interval | Number | 40 | Maximum seconds between message cycles |

### Message Configuration

- **Up to 10 messages** - Configure as many as you need
- **Flexible** - Leave fields blank to skip them
- **500ms delay** - Automatic 500ms delay between each message in the sequence
- **Auto-filtering** - Blank or whitespace-only messages are automatically ignored

### Delay Settings

- **Random Intervals** - Messages sent at random times between your min and max values
- **Customizable Range** - Set any range you want (e.g., 10-50 seconds, 5-15 seconds)
- **Live Countdown** - See exactly when the next message will be sent

## Timer Display

The plugin shows a beautiful countdown timer in the bottom-right corner of your screen:

- **Real-time Updates** - Updates every second
- **Auto-hide** - Appears only when running
- **Visibility** - Becomes more visible when time is under 5 seconds

## Examples

### Example 1: Simple Greeting Sequence
```
Message 1: Hello everyone! 👋
Message 2: How's it going?
Message 3: Let me know!
Interval: 30-60 seconds
```

### Example 2: Announcement Bot
```
Message 1: 📢 ANNOUNCEMENT
Message 2: Daily reminder about our server rules
Message 3: Please follow all guidelines
Message 4: Thanks for keeping it civil!
Interval: 20-40 seconds
```

### Example 3: Partial Messages (Blank Filtering)
```
Message 1: First message
Message 2: (blank - will be skipped)
Message 3: Third message
Message 4: (blank - will be skipped)
Message 5: Fifth message
```

## Troubleshooting

**Plugin not sending messages?**
- Ensure you've set a target channel ID
- Check that your messages aren't blank
- Verify the bot has permission to send messages in the target channel

**Channel ID not saving?**
- Use the "Set Current Channel" button in settings
- Or manually enter the channel ID (right-click channel → Copy ID)

**Timer not showing?**
- Ensure the plugin is running
- Check browser console for errors

**Messages not appearing?**
- Verify your Discord connection
- Check that you have message send permissions in the channel
- Ensure the plugin is enabled in Vencord

## Developer

**Author:** Ar7340  
**Discord ID:** 1321782566763892748  
**Repository:** [GitHub](https://github.com/Ar7340/Discord-Auto-Messages-Vencord)

## Support

Found a bug? Have a feature request? 

- Open an issue on [GitHub](https://github.com/Ar7340/Discord-Auto-Messages-Vencord/issues)
- Contact the developer on Discord
- Check the [GitHub discussions](https://github.com/Ar7340/Discord-Auto-Messages-Vencord/discussions)

## License

This plugin is licensed under the GPL-3.0 License - see the LICENSE file for details.

## Disclaimer

⚠️ **Important:** Use this plugin responsibly. Do not use it to spam channels or violate Discord's Terms of Service. The developer is not responsible for account bans or server restrictions resulting from misuse.

## Changelog

### Version 1.0.0
- Initial release of AutoMessageSender plugin
- Support for up to 10 custom messages
- Random interval delays
- Live countdown timer
- Context menu integration
- Full plugin settings panel

---

**Happy automating! 🚀**
