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

// Alert system variables
let alertAudio: { stop: () => void } | null = null;
let alertButton: HTMLElement | null = null;
let isAlertActive = false;

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

function createAlertButton() {
    if (alertButton) return alertButton;
    
    const button = document.createElement("div");
    button.id = "verification-alert-button";
    button.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
        color: white;
        padding: 30px 50px;
        border-radius: 15px;
        font-weight: bold;
        font-size: 24px;
        z-index: 99999;
        box-shadow: 0 8px 30px rgba(255, 0, 0, 0.5);
        border: 3px solid rgba(255, 255, 255, 0.5);
        cursor: pointer;
        display: none;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        text-align: center;
        animation: pulse 1s infinite;
        user-select: none;
    `;
    
    button.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
        <div style="margin-bottom: 10px;">VERIFICATION ALERT!</div>
        <div style="font-size: 18px; margin-bottom: 5px;">Someone received a verification message!</div>
        <div style="font-size: 16px; opacity: 0.9;">Click to Stop Sound</div>
    `;
    
    // Add pulsing animation
    const style = document.createElement("style");
    style.textContent = `
        @keyframes pulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.05); }
        }
    `;
    document.head.appendChild(style);
    
    button.addEventListener("click", stopAlert);
    
    document.body.appendChild(button);
    alertButton = button;
    return button;
}

function removeAlertButton() {
    if (alertButton) {
        alertButton.remove();
        alertButton = null;
    }
}

function playAlertSound() {
    // Create an alert sound using Web Audio API that loops continuously
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    let currentOscillator: OscillatorNode | null = null;
    
    const playBeep = () => {
        if (!isAlertActive) return;
        
        // Create new oscillator for each beep
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800; // High-pitched alert
        oscillator.type = "sine";
        
        const now = audioContext.currentTime;
        const beepDuration = 0.2;
        
        // Fade in and out for smoother sound
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, now + beepDuration);
        
        oscillator.start(now);
        oscillator.stop(now + beepDuration);
        
        currentOscillator = oscillator;
        
        // Schedule next beep - will continue indefinitely until manually stopped
        if (isAlertActive) {
            setTimeout(playBeep, 400); // 200ms beep + 200ms pause = 400ms total
        }
    };
    
    // Start the beeping loop
    playBeep();
    
    // Return a stop function
    return {
        stop: () => {
            isAlertActive = false;
            if (currentOscillator) {
                try {
                    currentOscillator.stop();
                } catch (e) {
                    // Already stopped
                }
            }
        }
    };
}

function triggerAlert() {
    if (isAlertActive) return; // Don't trigger multiple alerts
    
    console.log("[AutoMessageSender] 🚨 VERIFICATION MESSAGE DETECTED IN CHANNEL! 🚨");
    console.log("[AutoMessageSender] Someone in the channel received a verification warning!");
    
    isAlertActive = true;
    
    // Stop auto message sender
    if (isRunning) {
        stopMessageLoop();
        console.log("[AutoMessageSender] Auto-messages stopped due to verification alert");
    }
    
    // Play alert sound (loops continuously until manually stopped)
    alertAudio = playAlertSound();
    
    // Show alert button
    const button = createAlertButton();
    button.style.display = "block";
    
    // Show toast notification
    showToast("⚠️ VERIFICATION DETECTED! Click the alert button to stop sound.", Toasts.Type.FAILURE);
}

function stopAlert() {
    if (!isAlertActive) return;
    
    console.log("[AutoMessageSender] Alert manually stopped by user");
    
    isAlertActive = false;
    
    // Stop sound using the stop function
    if (alertAudio && typeof alertAudio.stop === 'function') {
        alertAudio.stop();
        alertAudio = null;
    }
    
    // Hide alert button
    if (alertButton) {
        alertButton.style.display = "none";
    }
    
    showToast("Alert dismissed. Please complete verification!", Toasts.Type.MESSAGE);
}

function checkForVerificationMessage(message: any): boolean {
    if (!message.content) return false;
    
    const content = message.content.toLowerCase();
    // Remove zero-width spaces, special unicode characters, and extra spaces
    const cleanContent = content.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ");
    
    // Check for the specific verification message patterns
    const verificationPhrases = [
        "are you a real human",
        "please use the link below so i can check",
        "please complete this within",
        "minutes or it may result in a ban",
        "may result in a ban"
    ];
    
    // Check for warning indicators
    const hasWarningEmoji = content.includes("⚠️") || content.includes("⚠") || content.includes("warning");
    
    // Check if message mentions someone and asks about being human
    const mentionPattern = /<@[!&]?\d+>/; // Discord mention pattern
    const hasMention = mentionPattern.test(content);
    const asksAboutHuman = cleanContent.includes("are you a real human") || 
                           cleanContent.includes("are you areal human") ||
                           cleanContent.includes("areyou a real human");
    
    // Check for "Verify" button/link indicator
    const hasVerifyButton = content.includes("verify") || cleanContent.includes("verify");
    
    // Check if at least 2 verification phrases are present
    const phraseMatches = verificationPhrases.filter(phrase => 
        cleanContent.includes(phrase.replace(/\s+/g, ""))
    ).length;
    
    // Strong indicators of verification message:
    // 1. Has warning emoji AND asks about being human
    // 2. Has warning emoji AND multiple verification phrases
    // 3. Has mention AND asks about human AND has warning
    const isVerificationMessage = 
        (hasWarningEmoji && asksAboutHuman) ||
        (hasWarningEmoji && phraseMatches >= 2) ||
        (hasMention && asksAboutHuman && hasWarningEmoji) ||
        (hasWarningEmoji && cleanContent.includes("complete this within") && cleanContent.includes("minutes"));
    
    return isVerificationMessage;
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
        description: "Message 1 (leave blank to skip)",
        default: "Hi"
    },
    message2: {
        type: OptionType.STRING,
        description: "Message 2 (leave blank to skip)",
        default: "Hello"
    },
    message3: {
        type: OptionType.STRING,
        description: "Message 3 (leave blank to skip)",
        default: "Yo"
    },
    message4: {
        type: OptionType.STRING,
        description: "Message 4 (leave blank to skip)",
        default: ""
    },
    message5: {
        type: OptionType.STRING,
        description: "Message 5 (leave blank to skip)",
        default: ""
    },
    message6: {
        type: OptionType.STRING,
        description: "Message 6 (leave blank to skip)",
        default: ""
    },
    message7: {
        type: OptionType.STRING,
        description: "Message 7 (leave blank to skip)",
        default: ""
    },
    message8: {
        type: OptionType.STRING,
        description: "Message 8 (leave blank to skip)",
        default: ""
    },
    message9: {
        type: OptionType.STRING,
        description: "Message 9 (leave blank to skip)",
        default: ""
    },
    message10: {
        type: OptionType.STRING,
        description: "Message 10 (leave blank to skip)",
        default: ""
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
    },
    enableVerificationDetection: {
        type: OptionType.BOOLEAN,
        description: "Enable automatic detection of verification messages",
        default: true
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
        settings.store.message3,
        settings.store.message4,
        settings.store.message5,
        settings.store.message6,
        settings.store.message7,
        settings.store.message8,
        settings.store.message9,
        settings.store.message10
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
    description: "Automatically sends a sequence of messages to a specific channel at regular intervals with verification detection",
    longDescription: "AutoMessageSender allows you to set up automatic message sequences that are sent to a target Discord channel at customizable intervals. Includes automatic detection of verification messages with sound alerts.",
    authors: [
        {
            name: "Ar7340",
            id: "1321782566763892748"
        }
    ],
    settings,
    
    flux: {
        MESSAGE_CREATE({ message }: { message: any }) {
            if (!settings.store.enableVerificationDetection) return;
            
            // Monitor the target channel for ANY verification messages (not just for the user)
            if (message.channel_id === settings.store.channelId) {
                if (checkForVerificationMessage(message)) {
                    console.log("[AutoMessageSender] Verification message detected in channel:");
                    console.log(`[AutoMessageSender] From: ${message.author?.username || "Unknown"}`);
                    console.log(`[AutoMessageSender] Content: ${message.content}`);
                    triggerAlert();
                }
            }
        }
    },
    
    start() {
        console.log("[AutoMessageSender] Plugin loaded!");
        console.log("[AutoMessageSender] Verification detection enabled");
        console.log("[AutoMessageSender] Right-click any channel to see Auto Message options");
        console.log("[AutoMessageSender] Developer: Ar7340 | Discord ID: 1321782566763892748");
        console.log("[AutoMessageSender] Repository: https://github.com/Ar7340/Discord-Auto-Messages-Vencord");
        
        // Create alert button (hidden by default)
        createAlertButton();
    },
    
    stop() {
        stopMessageLoop();
        removeTimerDisplay();
        stopAlert();
        removeAlertButton();
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
                            
                            const guildId = targetChannel.guild_id;
                            if (guildId) {
                                NavigationRouter.transitionTo(`/channels/${guildId}/${settings.store.channelId}`);
                            } else {
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
                                `Status: ${isRunning ? "Running" : "Stopped"}\nTarget: ${targetName}\nDelay Range: ${settings.store.minIntervalSeconds}s - ${settings.store.maxIntervalSeconds}s\nVerification Detection: ${settings.store.enableVerificationDetection ? "ON" : "OFF"}`,
                                Toasts.Type.MESSAGE
                            );
                        }}
                    />
                    <Menu.MenuSeparator />
                    <Menu.MenuItem
                        id="auto-message-test-alert"
                        label="🔔 Test Verification Alert"
                        action={() => {
                            triggerAlert();
                        }}
                    />
                    <Menu.MenuItem
                        id="auto-message-settings"
                        label="⚙️ Open Settings"
                        action={() => {
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