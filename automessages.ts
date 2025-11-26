/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { showToast, Toasts } from "@webpack/common";

const MessageActions = findByPropsLazy("sendMessage");

interface PluginSettings {
    channelId: string;
    messages: string[];
    intervalSeconds: number;
    isRunning: boolean;
}

let intervalId: NodeJS.Timeout | null = null;
let settings: PluginSettings = {
    channelId: "YOUR_CHANNEL_ID_HERE", // Replace with your channel ID
    messages: ["Hi", "Hello", "Yo"],
    intervalSeconds: 10,
    isRunning: false
};

function generateNonce(): string {
    return (Date.now() * 4194304).toString();
}

async function sendMessages() {
    if (!settings.channelId || settings.channelId === "YOUR_CHANNEL_ID_HERE") {
        showToast("Please set a valid channel ID in the plugin settings!", Toasts.Type.FAILURE);
        stopMessageLoop();
        return;
    }

    console.log("[AutoMessageSender] Sending message sequence...");
    
    for (const message of settings.messages) {
        try {
            await MessageActions.sendMessage(
                settings.channelId,
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
            if (message !== settings.messages[settings.messages.length - 1]) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error("[AutoMessageSender] Error sending message:", error);
            showToast("Failed to send message. Check console for details.", Toasts.Type.FAILURE);
        }
    }
    
    console.log(`[AutoMessageSender] Sequence complete. Next cycle in ${settings.intervalSeconds} seconds.`);
}

function startMessageLoop() {
    if (intervalId) {
        showToast("Auto message sender is already running!", Toasts.Type.MESSAGE);
        return;
    }

    settings.isRunning = true;
    
    // Send immediately on start
    sendMessages();
    
    // Then repeat every N seconds
    intervalId = setInterval(() => {
        sendMessages();
    }, settings.intervalSeconds * 1000);
    
    showToast("Auto message sender started!", Toasts.Type.SUCCESS);
    console.log("[AutoMessageSender] Plugin started");
}

function stopMessageLoop() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    
    settings.isRunning = false;
    showToast("Auto message sender stopped!", Toasts.Type.MESSAGE);
    console.log("[AutoMessageSender] Plugin stopped");
}

export default definePlugin({
    name: "AutoMessageSender",
    description: "Automatically sends a sequence of messages to a specific channel at regular intervals",
    authors: [Devs.Nobody],
    
    start() {
        console.log("[AutoMessageSender] Plugin loaded. Use commands to control:");
        console.log("  - startAutoMessages() to start");
        console.log("  - stopAutoMessages() to stop");
        console.log("  - setChannelId('channelId') to set target channel");
        console.log("  - setMessages(['msg1', 'msg2', 'msg3']) to customize messages");
        console.log("  - setMessageInterval(seconds) to change delay between cycles");
        
        // Expose functions globally for easy access via console
        (window as any).startAutoMessages = startMessageLoop;
        (window as any).stopAutoMessages = stopMessageLoop;
        (window as any).setChannelId = (id: string) => {
            settings.channelId = id;
            console.log(`[AutoMessageSender] Channel ID set to: ${id}`);
            showToast(`Channel ID updated!`, Toasts.Type.SUCCESS);
        };
        (window as any).setMessages = (messages: string[]) => {
            settings.messages = messages;
            console.log(`[AutoMessageSender] Messages updated:`, messages);
            showToast(`Messages updated!`, Toasts.Type.SUCCESS);
        };
        (window as any).setMessageInterval = (seconds: number) => {
            settings.intervalSeconds = seconds;
            console.log(`[AutoMessageSender] Interval set to: ${seconds} seconds`);
            showToast(`Interval updated to ${seconds}s!`, Toasts.Type.SUCCESS);
        };
    },
    
    stop() {
        stopMessageLoop();
        
        // Clean up global functions
        delete (window as any).startAutoMessages;
        delete (window as any).stopAutoMessages;
        delete (window as any).setChannelId;
        delete (window as any).setMessages;
        delete (window as any).setMessageInterval;
        
        console.log("[AutoMessageSender] Plugin unloaded");
    }
});