/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, ChannelStore, Menu, NavigationRouter, showToast, Toasts } from "@webpack/common";

const MessageActions = findByPropsLazy("sendMessage");

let intervalId: NodeJS.Timeout | null = null;
let isRunning = false;

function generateNonce(): string {
    return (Date.now() * 4194304).toString();
}

const settings = definePluginSettings({
    channelId: {
        type: OptionType.STRING,
        description: "Channel ID to send messages to (Right-click channel → Copy ID, or use 'Set Current Channel' button)",
        default: ""
    },
    message1: {
        type: OptionType.STRING,
        description: "First message",
        default: "Hi"
    },
    message2: {
        type: OptionType.STRING,
        description: "Second message",
        default: "Hello"
    },
    message3: {
        type: OptionType.STRING,
        description: "Third message",
        default: "Yo"
    },
    intervalSeconds: {
        type: OptionType.NUMBER,
        description: "Seconds to wait between message cycles",
        default: 10
    }
});

async function sendMessages() {
    const channelId = settings.store.channelId;
    
    if (!channelId) {
        showToast("Please set a channel ID in plugin settings!", Toasts.Type.FAILURE);
        stopMessageLoop();
        return;
    }

    const messages = [
        settings.store.message1,
        settings.store.message2,
        settings.store.message3
    ].filter(msg => msg && msg.trim() !== "");

    if (messages.length === 0) {
        showToast("No messages configured!", Toasts.Type.FAILURE);
        stopMessageLoop();
        return;
    }

    console.log("[AutoMessageSender] Sending message sequence...");
    
    for (const message of messages) {
        try {
            await MessageActions.sendMessage(
                channelId,
                {
                    content: message,
                    tts: false,
                    invalidEmojis: [],
                    validNonShortcutEmojis: []
                },
                undefined,
                {
                    nonce: generateNonce()
                }
            );
            console.log(`[AutoMessageSender] Sent: "${message}"`);
            
            // Small delay between messages (500ms)
            if (message !== messages[messages.length - 1]) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error("[AutoMessageSender] Error sending message:", error);
            showToast("Failed to send message. Stopping plugin.", Toasts.Type.FAILURE);
            stopMessageLoop();
            return;
        }
    }
    
    console.log(`[AutoMessageSender] Sequence complete. Next cycle in ${settings.store.intervalSeconds} seconds.`);
}

function startMessageLoop() {
    if (intervalId || isRunning) {
        showToast("Auto message sender is already running!", Toasts.Type.MESSAGE);
        return;
    }

    isRunning = true;
    
    // Send immediately on start
    sendMessages();
    
    // Then repeat every N seconds
    intervalId = setInterval(() => {
        sendMessages();
    }, settings.store.intervalSeconds * 1000);
    
    showToast("Auto message sender started!", Toasts.Type.SUCCESS);
    console.log("[AutoMessageSender] Plugin started");
}

function stopMessageLoop() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    
    isRunning = false;
    showToast("Auto message sender stopped!", Toasts.Type.MESSAGE);
    console.log("[AutoMessageSender] Plugin stopped");
}

function setCurrentChannel() {
    const currentChannel = ChannelStore.getChannel(ChannelStore.getLastSelectedChannelId());
    
    if (!currentChannel) {
        showToast("No channel selected!", Toasts.Type.FAILURE);
        return;
    }
    
    settings.store.channelId = currentChannel.id;
    showToast(`Channel set to: ${currentChannel.name || "DM"}`, Toasts.Type.SUCCESS);
    console.log(`[AutoMessageSender] Channel set to: ${currentChannel.name} (${currentChannel.id})`);
}

export default definePlugin({
    name: "AutoMessageSender",
    description: "Automatically sends a sequence of messages to a specific channel at regular intervals",
    authors: [Devs.Nobody],
    settings,
    
    start() {
        console.log("[AutoMessageSender] Plugin loaded!");
        console.log("[AutoMessageSender] Right-click any channel to see Auto Message options");
    },
    
    stop() {
        stopMessageLoop();
        console.log("[AutoMessageSender] Plugin unloaded");
    },
    
    // Add context menu to channels
    contextMenus: {
        "channel-context"(children, props) {
            const channel = ChannelStore.getChannel(props.channel.id);
            if (!channel) return;
            
            children.push(
                <Menu.MenuItem
                    label="Auto Message Sender"
                    id="auto-message-sender"
                >
                    <Menu.MenuItem
                        id="auto-message-start"
                        label={isRunning ? "✅ Stop Auto Messages" : "▶️ Start Auto Messages"}
                        action={() => {
                            if (isRunning) {
                                stopMessageLoop();
                            } else {
                                startMessageLoop();
                            }
                        }}
                    />
                    <Menu.MenuItem
                        id="auto-message-set-channel"
                        label="📍 Set As Target Channel"
                        action={() => {
                            settings.store.channelId = channel.id;
                            showToast(`Target channel set to: ${channel.name || "DM"}`, Toasts.Type.SUCCESS);
                        }}
                    />
                    <Menu.MenuItem
                        id="auto-message-goto-channel"
                        label="🔗 Go To Target Channel"
                        disabled={!settings.store.channelId}
                        action={() => {
                            const targetChannel = ChannelStore.getChannel(settings.store.channelId);
                            if (!targetChannel) {
                                showToast("Target channel not found!", Toasts.Type.FAILURE);
                                return;
                            }
                            
                            // Navigate to the channel
                            const guildId = targetChannel.guild_id;
                            if (guildId) {
                                NavigationRouter.transitionTo(`/channels/${guildId}/${settings.store.channelId}`);
                            } else {
                                // DM channel
                                NavigationRouter.transitionTo(`/channels/@me/${settings.store.channelId}`);
                            }
                            
                            showToast(`Navigating to: ${targetChannel.name || "DM"}`, Toasts.Type.SUCCESS);
                        }}
                    />
                    <Menu.MenuItem
                        id="auto-message-status"
                        label={`Status: ${isRunning ? "🟢 Running" : "🔴 Stopped"}`}
                        action={() => {
                            const targetChannel = ChannelStore.getChannel(settings.store.channelId);
                            const targetName = targetChannel ? (targetChannel.name || "DM") : "Not set";
                            showToast(
                                `Status: ${isRunning ? "Running" : "Stopped"}\nTarget: ${targetName}\nInterval: ${settings.store.intervalSeconds}s`,
                                Toasts.Type.MESSAGE
                            );
                        }}
                    />
                    <Menu.MenuSeparator />
                    <Menu.MenuItem
                        id="auto-message-settings"
                        label="⚙️ Open Settings"
                        action={() => {
                            // Open Vencord settings
                            const settingsButton = document.querySelector('[aria-label="User Settings"]') as HTMLElement;
                            settingsButton?.click();
                            setTimeout(() => {
                                const vencordTab = Array.from(document.querySelectorAll('[class*="item"]'))
                                    .find(el => el.textContent === "Vencord") as HTMLElement;
                                vencordTab?.click();
                                setTimeout(() => {
                                    const pluginsTab = Array.from(document.querySelectorAll('[class*="item"]'))
                                        .find(el => el.textContent === "Plugins") as HTMLElement;
                                    pluginsTab?.click();
                                }, 100);
                            }, 100);
                        }}
                    />
                </Menu.MenuItem>
            );
        }
    }
});