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
let countdownId: NodeJS.Timeout | null = null;
let isRunning = false;
let remainingTime: number = 0;
let timerElement: HTMLElement | null = null;

function generateNonce(): string {
    return (Date.now() * 4194304).toString();
}

function getRandomInterval(): number {
    const min = settings.store.minIntervalSeconds;
    const max = settings.store.maxIntervalSeconds;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createTimerDisplay() {
    if (timerElement) return timerElement;
    
    const div = document.createElement("div");
    div.id = "auto-message-timer";
    div.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        font-weight: bold;
        font-size: 16px;
        z-index: 9999;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        border: 2px solid rgba(255, 255, 255, 0.3);
        display: none;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;
    document.body.appendChild(div);
    timerElement = div;
    return div;
}

function removeTimerDisplay() {
    if (timerElement) {
        timerElement.remove();
        timerElement = null;
    }
}

function startCountdown(totalSeconds: number) {
    if (countdownId) clearInterval(countdownId);
    
    remainingTime = totalSeconds;
    const timerDiv = createTimerDisplay();
    timerDiv.style.display = "block";
    
    const updateTimer = () => {
        if (timerDiv) {
            timerDiv.textContent = `⏱️ Next message in: ${remainingTime}s`;
            timerDiv.style.opacity = remainingTime <= 5 ? "1" : "0.8";
        }
        
        if (remainingTime <= 0) {
            clearInterval(countdownId!);
            countdownId = null;
        } else {
            remainingTime--;
        }
    };
    
    updateTimer();
    countdownId = setInterval(updateTimer, 1000);
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
    minIntervalSeconds: {
        type: OptionType.NUMBER,
        description: "Minimum seconds to wait between message cycles",
        default: 20
    },
    maxIntervalSeconds: {
        type: OptionType.NUMBER,
        description: "Maximum seconds to wait between message cycles",
        default: 40
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
    
    console.log(`[AutoMessageSender] Sequence complete. Next cycle in ${settings.store.minIntervalSeconds}-${settings.store.maxIntervalSeconds} seconds (random).`);
}

function startMessageLoop() {
    if (intervalId || isRunning) {
        showToast("Auto message sender is already running!", Toasts.Type.MESSAGE);
        return;
    }

    isRunning = true;
    const timerDiv = createTimerDisplay();
    timerDiv.style.display = "block";
    
    // Send immediately on start
    sendMessages();
    
    // Then repeat with random interval
    function scheduleNext() {
        const randomDelay = getRandomInterval();
        console.log(`[AutoMessageSender] Next message in ${randomDelay} seconds...`);
        startCountdown(randomDelay);
        
        intervalId = setTimeout(() => {
            sendMessages();
            scheduleNext();
        }, randomDelay * 1000);
    }
    
    scheduleNext();
    
    showToast("Auto message sender started!", Toasts.Type.SUCCESS);
    console.log("[AutoMessageSender] Plugin started");
}

function stopMessageLoop() {
    if (intervalId) {
        clearTimeout(intervalId);
        intervalId = null;
    }
    
    if (countdownId) {
        clearInterval(countdownId);
        countdownId = null;
    }
    
    removeTimerDisplay();
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
    longDescription: "AutoMessageSender allows you to set up automatic message sequences that are sent to a target Discord channel at customizable intervals. Perfect for scheduled announcements, reminders, or automated responses.",
    authors: [
        {
            name: "Ar7340",
            id: "1321782566763892748"
        }
    ],
    settings,
    
    // Plugin metadata
    meta: {
        authors: [
            {
                name: "Ar7340",
                id: "1321782566763892748"
            }
        ],
        description: "Automatically sends a sequence of messages to a specific channel at regular intervals",
        version: "1.0.0",
        source: "https://github.com/Ar7340/Discord-Auto-Messages-Vencord",
        changelog: [
            {
                title: "Version 1.0.0",
                body: "Initial release of AutoMessageSender plugin"
            }
        ]
    },
    
    start() {
        console.log("[AutoMessageSender] Plugin loaded!");
        console.log("[AutoMessageSender] Right-click any channel to see Auto Message options");
        console.log("[AutoMessageSender] Developer: Ar7340 | Discord ID: 1321782566763892748");
        console.log("[AutoMessageSender] Repository: https://github.com/Ar7340/Discord-Auto-Messages-Vencord");
    },
    
    stop() {
        stopMessageLoop();
        removeTimerDisplay();
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
                                `Status: ${isRunning ? "Running" : "Stopped"}\nTarget: ${targetName}\nDelay Range: ${settings.store.minIntervalSeconds}s - ${settings.store.maxIntervalSeconds}s`,
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