# AutoMessageSender Plugin

A Discord client mod plugin for Vencord that automatically sends a sequence of messages to a specific channel at regular intervals.

## Description

AutoMessageSender allows you to set up automated message sequences that will be sent repeatedly to your target Discord channel. Perfect for reminders, announcements, or regular updates. The plugin provides an intuitive interface directly integrated into Discord's context menus.

## Features

- **Automated Message Sequences**: Send up to three pre-configured messages in sequence
- **Customizable Intervals**: Set the time interval between message cycles (in seconds)
- **Easy Channel Selection**: Quick one-click channel assignment via context menu
- **Status Monitoring**: Real-time status display showing running state, target channel, and interval settings
- **Channel Navigation**: Quick jump to your target channel
- **Error Handling**: Automatic error notifications and graceful failure handling

## Installation

1. Install Vencord if you haven't already
2. Place this plugin in your Vencord plugins directory
3. Enable the plugin in Vencord settings

## Usage

### Quick Setup

1. Right-click on any Discord channel
2. Select "Auto Message Sender" → "📍 Set As Target Channel"
3. Open plugin settings and configure your messages and interval

### Configuration

Access the plugin settings to customize:

- **Channel ID**: The target channel where messages will be sent
- **Message 1, 2, 3**: The three messages to send in sequence
- **Interval Seconds**: Wait time (in seconds) between each message cycle

### Starting/Stopping

- Right-click any channel and select "Auto Message Sender" → "▶️ Start Auto Messages"
- To stop, select "✅ Stop Auto Messages" from the same menu
- Alternatively, use the context menu status option to view current running state

### Channel Management

- **Set As Target Channel**: Right-click channel → "Auto Message Sender" → "📍 Set As Target Channel"
- **Go To Target Channel**: Quickly navigate to your target channel via the context menu
- **View Status**: Check running state, target channel, and interval via the status option

## Plugin Details

| Property | Value |
|----------|-------|
| **Name** | AutoMessageSender |
| **License** | GPL-3.0-or-later |
| **Copyright** | Copyright (c) 2024 Vendicated and contributors |
| **Framework** | Vencord |

## Author Information

- **Primary Developer**: Vendicated
- **Contributors**: Vencord community contributors
- **Plugin Author**: Nobody (Devs.Nobody)

## Technical Details

- **Language**: TypeScript/JavaScript
- **Dependencies**: Vencord API, Discord Webpack modules
- **Message Format**: Supports standard Discord messages with nonce generation for authenticity

## How It Works

1. Plugin generates a unique nonce for each message to ensure authenticity
2. Messages are sent sequentially with a 500ms delay between each message
3. After completing a cycle, the plugin waits for the specified interval before repeating
4. All actions are logged to the console for debugging purposes

## Troubleshooting

**"Please set a channel ID in plugin settings!"**
- Go to plugin settings and enter a channel ID, or use the "Set As Target Channel" context menu option

**"No messages configured!"**
- Configure at least one message in the plugin settings

**"Failed to send message. Stopping plugin."**
- Check your network connection and ensure the target channel is still valid

## Logs

The plugin outputs detailed logs to the browser console with the `[AutoMessageSender]` prefix for debugging and monitoring purposes.

## License

This plugin is licensed under the GPL-3.0-or-later license. See the LICENSE file in the root Vencord directory for details.

## Support

For issues, questions, or feature requests, please refer to the official Vencord repository and community channels.

---

**Note**: Use this plugin responsibly and in accordance with Discord's Terms of Service. Excessive automated messaging may violate Discord policies.