/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { showToast, Toasts } from "@webpack/common";

const MessageActions = findByPropsLazy("sendMessage");

let intervalId: NodeJS.Timeout | null = null;
let isRunning = false;

function generateNonce(): string {
    return (Date.now() * 4194304).toString();
}

const settings = definePluginSettings({
    channelId: {
        type: OptionType.STRING,
        description: "Channel ID to send messages to (Right-click channel → Copy ID)",
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
    },
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable auto message sender",
        default: false,
        onChange: (value: boolean) => {
            if (value) {
                startMessageLoop();
            } else {
                stopMessageLoop();
            }
        }
    }
});

async function sendMessages() {
    const channelId = settings.store.channelId;
    
    if (!channelId) {
        showToast("Please set a channel ID in plugin settings!", Toasts.Type.FAILURE);
        settings.store.enabled = false;
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
        settings.store.enabled = false;
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
            settings.store.enabled = false;
            stopMessageLoop();
            return;
        }
    }
    
    console.log(`[AutoMessageSender] Sequence complete. Next cycle in ${settings.store.intervalSeconds} seconds.`);
}

function startMessageLoop() {
    if (intervalId || isRunning) {
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

export default definePlugin({
    name: "AutoMessageSender",
    description: "Automatically sends a sequence of messages to a specific channel at regular intervals",
    authors: [Devs.Nobody],
    settings,
    
    start() {
        console.log("[AutoMessageSender] Plugin loaded!");
        console.log("[AutoMessageSender] Configure in: Settings → Vencord → Plugins → AutoMessageSender");
        
        // If enabled in settings, start automatically
        if (settings.store.enabled) {
            startMessageLoop();
        }
    },
    
    stop() {
        stopMessageLoop();
        console.log("[AutoMessageSender] Plugin unloaded");
    }
});