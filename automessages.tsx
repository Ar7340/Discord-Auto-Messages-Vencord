/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, ChannelStore, GuildStore, Menu, NavigationRouter, showToast, Toasts } from "@webpack/common";

const MessageActions = findByPropsLazy("sendMessage");

let intervalId: NodeJS.Timeout | null = null;
let countdownId: NodeJS.Timeout | null = null;
let channelRotationId: NodeJS.Timeout | null = null;
let isRunning = false;
let remainingTime: number = 0;
let timerElement: HTMLElement | null = null;
let currentChannelIndex: number = 0;
let channelRotationTimer: number = 0;
let channelRotationCountdownId: NodeJS.Timeout | null = null;

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

function getRandomChannelRotationInterval(): number {
    const min = settings.store.minChannelRotationMinutes * 60;
    const max = settings.store.maxChannelRotationMinutes * 60;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getActiveChannels(): string[] {
    const channels = [
        { id: settings.store.channelId1, enabled: settings.store.channel1Enabled },
        { id: settings.store.channelId2, enabled: settings.store.channel2Enabled },
        { id: settings.store.channelId3, enabled: settings.store.channel3Enabled },
        { id: settings.store.channelId4, enabled: settings.store.channel4Enabled },
        { id: settings.store.channelId5, enabled: settings.store.channel5Enabled }
    ];
    
    return channels
        .filter(ch => ch.enabled && ch.id && ch.id.trim() !== "")
        .map(ch => ch.id);
}

function getChannelDisplayName(channelId: string): string {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return channelId;
    
    const channelName = channel.name || "DM";
    const guildId = channel.guild_id;
    
    if (guildId) {
        const guild = GuildStore.getGuild(guildId);
        const guildName = guild ? guild.name : "Unknown Server";
        return `${channelName} (${guildName})`;
    }
    
    return channelName;
}

function getCurrentChannelId(): string {
    const channels = getActiveChannels();
    if (channels.length === 0) return "";
    return channels[currentChannelIndex % channels.length];
}

function rotateChannel() {
    const channels = getActiveChannels();
    if (channels.length <= 1) return; // No rotation needed for 0 or 1 channel
    
    currentChannelIndex = (currentChannelIndex + 1) % channels.length;
    const newChannelId = getCurrentChannelId();
    const displayName = getChannelDisplayName(newChannelId);
    
    console.log(`[AutoMessageSender] 🔄 Rotated to channel ${currentChannelIndex + 1}/${channels.length}: ${displayName}`);
    showToast(`🔄 Switched to: ${displayName}`, Toasts.Type.MESSAGE);
    
    // Schedule next rotation
    scheduleChannelRotation();
}

function scheduleChannelRotation() {
    if (channelRotationId) {
        clearTimeout(channelRotationId);
    }
    
    if (channelRotationCountdownId) {
        clearInterval(channelRotationCountdownId);
    }
    
    const channels = getActiveChannels();
    if (channels.length <= 1) return; // No rotation needed
    
    const rotationSeconds = getRandomChannelRotationInterval();
    channelRotationTimer = rotationSeconds;
    
    console.log(`[AutoMessageSender] Next channel rotation in ${Math.floor(rotationSeconds / 60)} minutes ${rotationSeconds % 60} seconds`);
    
    // Start countdown for channel rotation
    channelRotationCountdownId = setInterval(() => {
        if (channelRotationTimer > 0) {
            channelRotationTimer--;
        }
    }, 1000);
    
    channelRotationId = setTimeout(() => {
        rotateChannel();
    }, rotationSeconds * 1000);
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
            const channels = getActiveChannels();
            const currentChannelId = getCurrentChannelId();
            const displayName = getChannelDisplayName(currentChannelId);
            
            // Format channel rotation time
            const rotationMinutes = Math.floor(channelRotationTimer / 60);
            const rotationSeconds = channelRotationTimer % 60;
            const rotationTime = channels.length > 1 
                ? `${rotationMinutes}:${rotationSeconds.toString().padStart(2, '0')}`
                : "N/A";
            
            timerDiv.innerHTML = `
                ⏱️ Next message in: ${remainingTime}s<br>
                <span style="font-size: 12px; opacity: 0.8;">${displayName}</span><br>
                <span style="font-size: 11px; opacity: 0.7;">Channel ${currentChannelIndex + 1}/${channels.length} | Switch in: ${rotationTime}</span>
            `;
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
    channelId1: {
        type: OptionType.STRING,
        description: "Channel ID 1 (Right-click channel → Copy ID)",
        default: ""
    },
    channel1Enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Channel 1",
        default: true
    },
    channelId2: {
        type: OptionType.STRING,
        description: "Channel ID 2 (Optional)",
        default: ""
    },
    channel2Enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Channel 2",
        default: true
    },
    channelId3: {
        type: OptionType.STRING,
        description: "Channel ID 3 (Optional)",
        default: ""
    },
    channel3Enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Channel 3",
        default: true
    },
    channelId4: {
        type: OptionType.STRING,
        description: "Channel ID 4 (Optional)",
        default: ""
    },
    channel4Enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Channel 4",
        default: true
    },
    channelId5: {
        type: OptionType.STRING,
        description: "Channel ID 5 (Optional)",
        default: ""
    },
    channel5Enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Channel 5",
        default: true
    },
    minChannelRotationMinutes: {
        type: OptionType.NUMBER,
        description: "Minimum minutes before rotating to next channel",
        default: 10
    },
    maxChannelRotationMinutes: {
        type: OptionType.NUMBER,
        description: "Maximum minutes before rotating to next channel",
        default: 20
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
    const channelId = getCurrentChannelId();
    
    if (!channelId) {
        showToast("No enabled channels configured!", Toasts.Type.FAILURE);
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

    const displayName = getChannelDisplayName(channelId);
    console.log(`[AutoMessageSender] Sending message sequence to: ${displayName}...`);
    
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
            console.log(`[AutoMessageSender] ✓ Sent to ${displayName}: "${message}"`);
            
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

    const channels = getActiveChannels();
    if (channels.length === 0) {
        showToast("Please enable at least one channel!", Toasts.Type.FAILURE);
        return;
    }

    isRunning = true;
    currentChannelIndex = 0;
    
    const timerDiv = createTimerDisplay();
    timerDiv.style.display = "block";
    
    // Send immediately on start
    sendMessages();
    
    // Schedule channel rotation if multiple channels
    if (channels.length > 1) {
        scheduleChannelRotation();
    }
    
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
    
    const channelList = channels.map((id, i) => {
        return `${i + 1}. ${getChannelDisplayName(id)}`;
    }).join(", ");
    
    showToast(`Auto sender started! ${channels.length} enabled channel(s)`, Toasts.Type.SUCCESS);
    console.log(`[AutoMessageSender] Plugin started with ${channels.length} enabled channels: ${channelList}`);
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
    
    if (channelRotationId) {
        clearTimeout(channelRotationId);
        channelRotationId = null;
    }
    
    if (channelRotationCountdownId) {
        clearInterval(channelRotationCountdownId);
        channelRotationCountdownId = null;
    }
    
    removeTimerDisplay();
    isRunning = false;
    showToast("Auto message sender stopped!", Toasts.Type.MESSAGE);
    console.log("[AutoMessageSender] Plugin stopped");
}

function setCurrentChannel(channelNumber: number) {
    const currentChannel = ChannelStore.getChannel(ChannelStore.getLastSelectedChannelId());
    
    if (!currentChannel) {
        showToast("No channel selected!", Toasts.Type.FAILURE);
        return;
    }
    
    const settingKey = `channelId${channelNumber}` as keyof typeof settings.store;
    settings.store[settingKey] = currentChannel.id;
    
    const displayName = getChannelDisplayName(currentChannel.id);
    showToast(`Channel ${channelNumber} set to: ${displayName}`, Toasts.Type.SUCCESS);
    console.log(`[AutoMessageSender] Channel ${channelNumber} set to: ${displayName} (${currentChannel.id})`);
}

function toggleChannel(channelNumber: number) {
    const enableKey = `channel${channelNumber}Enabled` as keyof typeof settings.store;
    const channelIdKey = `channelId${channelNumber}` as keyof typeof settings.store;
    const channelId = settings.store[channelIdKey] as string;
    
    if (!channelId || channelId.trim() === "") {
        showToast(`Channel ${channelNumber} is not configured!`, Toasts.Type.FAILURE);
        return;
    }
    
    const currentValue = settings.store[enableKey] as boolean;
    settings.store[enableKey] = !currentValue;
    
    const displayName = getChannelDisplayName(channelId);
    const status = !currentValue ? "enabled" : "disabled";
    showToast(`Channel ${channelNumber} ${status}: ${displayName}`, Toasts.Type.SUCCESS);
    console.log(`[AutoMessageSender] Channel ${channelNumber} ${status}: ${displayName}`);
}

export default definePlugin({
    name: "AutoMessageSender",
    description: "Automatically sends a sequence of messages to multiple channels with rotation and verification detection",
    longDescription: "AutoMessageSender allows you to set up automatic message sequences that are sent to up to 5 target Discord channels with automatic rotation every 10-20 minutes. Includes verification message detection with sound alerts and individual channel enable/disable toggles.",
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
            
            // Monitor all configured channels for verification messages
            const channels = getActiveChannels();
            if (channels.includes(message.channel_id)) {
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
        console.log("[AutoMessageSender] Supports up to 5 channels with enable/disable toggles");
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
                    <Menu.MenuSeparator />
                    <Menu.MenuItem
                        id="auto-message-set-channel-1"
                        label="📍 Set As Channel 1"
                        action={() => setCurrentChannel(1)}
                    />
                    <Menu.MenuItem
                        id="auto-message-toggle-channel-1"
                        label={`${settings.store.channel1Enabled ? "✅" : "❌"} Toggle Channel 1`}
                        disabled={!settings.store.channelId1}
                        action={() => toggleChannel(1)}
                    />
                    <Menu.MenuItem
                        id="auto-message-set-channel-2"
                        label="📍 Set As Channel 2"
                        action={() => setCurrentChannel(2)}
                    />
                    <Menu.MenuItem
                        id="auto-message-toggle-channel-2"
                        label={`${settings.store.channel2Enabled ? "✅" : "❌"} Toggle Channel 2`}
                        disabled={!settings.store.channelId2}
                        action={() => toggleChannel(2)}
                    />
                    <Menu.MenuItem
                        id="auto-message-set-channel-3"
                        label="📍 Set As Channel 3"
                        action={() => setCurrentChannel(3)}
                    />
                    <Menu.MenuItem
                        id="auto-message-toggle-channel-3"
                        label={`${settings.store.channel3Enabled ? "✅" : "❌"} Toggle Channel 3`}
                        disabled={!settings.store.channelId3}
                        action={() => toggleChannel(3)}
                    />
                    <Menu.MenuItem
                        id="auto-message-set-channel-4"
                        label="📍 Set As Channel 4"
                        action={() => setCurrentChannel(4)}
                    />
                    <Menu.MenuItem
                        id="auto-message-toggle-channel-4"
                        label={`${settings.store.channel4Enabled ? "✅" : "❌"} Toggle Channel 4`}
                        disabled={!settings.store.channelId4}
                        action={() => toggleChannel(4)}
                    />
                    <Menu.MenuItem
                        id="auto-message-set-channel-5"
                        label="📍 Set As Channel 5"
                        action={() => setCurrentChannel(5)}
                    />
                    <Menu.MenuItem
                        id="auto-message-toggle-channel-5"
                        label={`${settings.store.channel5Enabled ? "✅" : "❌"} Toggle Channel 5`}
                        disabled={!settings.store.channelId5}
                        action={() => toggleChannel(5)}
                    />
                    <Menu.MenuSeparator />
                    <Menu.MenuItem
                        id="auto-message-goto-channel-1"
                        label="🔗 Go To Channel 1"
                        disabled={!settings.store.channelId1}
                        action={() => {
                            const targetChannel = ChannelStore.getChannel(settings.store.channelId1);
                            if (!targetChannel) {
                                showToast("Channel 1 not found!", Toasts.Type.FAILURE);
                                return;
                            }
                            
                            const guildId = targetChannel.guild_id;
                            if (guildId) {
                                NavigationRouter.transitionTo(`/channels/${guildId}/${settings.store.channelId1}`);
                            } else {
                                NavigationRouter.transitionTo(`/channels/@me/${settings.store.channelId1}`);
                            }
                            
                            showToast(`Navigating to: ${getChannelDisplayName(settings.store.channelId1)}`, Toasts.Type.SUCCESS);
                        }}
                    />
                    <Menu.MenuItem
                        id="auto-message-goto-channel-2"
                        label="🔗 Go To Channel 2"
                        disabled={!settings.store.channelId2}
                        action={() => {
                            const targetChannel = ChannelStore.getChannel(settings.store.channelId2);
                            if (!targetChannel) {
                                showToast("Channel 2 not found!", Toasts.Type.FAILURE);
                                return;
                            }
                            
                            const guildId = targetChannel.guild_id;
                            if (guildId) {
                                NavigationRouter.transitionTo(`/channels/${guildId}/${settings.store.channelId2}`);
                            } else {
                                NavigationRouter.transitionTo(`/channels/@me/${settings.store.channelId2}`);
                            }
                            
                            showToast(`Navigating to: ${getChannelDisplayName(settings.store.channelId2)}`, Toasts.Type.SUCCESS);
                        }}
                    />
                    <Menu.MenuItem
                        id="auto-message-goto-channel-3"
                        label="🔗 Go To Channel 3"
                        disabled={!settings.store.channelId3}
                        action={() => {
                            const targetChannel = ChannelStore.getChannel(settings.store.channelId3);
                            if (!targetChannel) {
                                showToast("Channel 3 not found!", Toasts.Type.FAILURE);
                                return;
                            }
                            
                            const guildId = targetChannel.guild_id;
                            if (guildId) {
                                NavigationRouter.transitionTo(`/channels/${guildId}/${settings.store.channelId3}`);
                            } else {
                                NavigationRouter.transitionTo(`/channels/@me/${settings.store.channelId3}`);
                            }
                            
                            showToast(`Navigating to: ${getChannelDisplayName(settings.store.channelId3)}`, Toasts.Type.SUCCESS);
                        }}
                    />
                    <Menu.MenuItem
                        id="auto-message-goto-channel-4"
                        label="🔗 Go To Channel 4"
                        disabled={!settings.store.channelId4}
                        action={() => {
                            const targetChannel = ChannelStore.getChannel(settings.store.channelId4);
                            if (!targetChannel) {
                                showToast("Channel 4 not found!", Toasts.Type.FAILURE);
                                return;
                            }
                            
                            const guildId = targetChannel.guild_id;
                            if (guildId) {
                                NavigationRouter.transitionTo(`/channels/${guildId}/${settings.store.channelId4}`);
                            } else {
                                NavigationRouter.transitionTo(`/channels/@me/${settings.store.channelId4}`);
                            }
                            
                            showToast(`Navigating to: ${getChannelDisplayName(settings.store.channelId4)}`, Toasts.Type.SUCCESS);
                        }}
                    />
                    <Menu.MenuItem
                        id="auto-message-goto-channel-5"
                        label="🔗 Go To Channel 5"
                        disabled={!settings.store.channelId5}
                        action={() => {
                            const targetChannel = ChannelStore.getChannel(settings.store.channelId5);
                            if (!targetChannel) {
                                showToast("Channel 5 not found!", Toasts.Type.FAILURE);
                                return;
                            }
                            
                            const guildId = targetChannel.guild_id;
                            if (guildId) {
                                NavigationRouter.transitionTo(`/channels/${guildId}/${settings.store.channelId5}`);
                            } else {
                                NavigationRouter.transitionTo(`/channels/@me/${settings.store.channelId5}`);
                            }
                            
                            showToast(`Navigating to: ${getChannelDisplayName(settings.store.channelId5)}`, Toasts.Type.SUCCESS);
                        }}
                    />
                    <Menu.MenuSeparator />
                    <Menu.MenuItem
                        id="auto-message-status"
                        label={`Status: ${isRunning ? "🟢 Running" : "🔴 Stopped"}`}
                        action={() => {
                            const channels = getActiveChannels();
                            const channelList = channels.map((id, i) => {
                                return `${i + 1}. ${getChannelDisplayName(id)}`;
                            }).join("\n");
                            
                            const allChannels = [
                                { id: settings.store.channelId1, enabled: settings.store.channel1Enabled, num: 1 },
                                { id: settings.store.channelId2, enabled: settings.store.channel2Enabled, num: 2 },
                                { id: settings.store.channelId3, enabled: settings.store.channel3Enabled, num: 3 },
                                { id: settings.store.channelId4, enabled: settings.store.channel4Enabled, num: 4 },
                                { id: settings.store.channelId5, enabled: settings.store.channel5Enabled, num: 5 }
                            ].filter(ch => ch.id && ch.id.trim() !== "");
                            
                            const statusList = allChannels.map(ch => {
                                const status = ch.enabled ? "✅" : "❌";
                                return `${status} Ch ${ch.num}: ${getChannelDisplayName(ch.id)}`;
                            }).join("\n");
                            
                            showToast(
                                `Status: ${isRunning ? "Running" : "Stopped"}\n\n${statusList || "No channels configured"}\n\nMessage Delay: ${settings.store.minIntervalSeconds}s - ${settings.store.maxIntervalSeconds}s\nRotation: ${settings.store.minChannelRotationMinutes}-${settings.store.maxChannelRotationMinutes} min\nVerification Detection: ${settings.store.enableVerificationDetection ? "ON" : "OFF"}`,
                                Toasts.Type.MESSAGE
                            );
                        }}
                    />
                    <Menu.MenuItem
                        id="auto-message-rotate-now"
                        label="🔄 Rotate Channel Now"
                        disabled={!isRunning || getActiveChannels().length <= 1}
                        action={() => {
                            rotateChannel();
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