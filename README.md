# AutoMessageSender — Vencord Plugin

**Author:** Ar7340 | Discord ID: `1321782566763892748`
**Repository:** https://github.com/Ar7340/Discord-Auto-Messages-Vencord
**License:** GPL-3.0-or-later

---

## What Is This?

AutoMessageSender is a [Vencord](https://vencord.dev/) plugin that automatically sends a repeating sequence of messages to up to **10 Discord channels** on a randomized timer. It rotates between channels, shows a live countdown timer on screen, and has a built-in **verification alert system** that detects when a bot sends a verification/captcha message in the channel you're sending to — and immediately pauses your messages so you can deal with it safely.

---

## Installation

1. Place `messageinchannel.tsx` inside your Vencord `src/userplugins/` folder.
2. Rebuild Vencord (`pnpm build` or `pnpm inject`).
3. Go to **User Settings → Vencord → Plugins** and enable **AutoMessageSender**.
4. Configure your messages and channels in the plugin settings panel.

---

## Quick Start

1. Enable the plugin in Vencord settings.
2. Set up your messages in the **Settings panel** (up to 10 messages).
3. **Right-click any channel** → **Auto Message Sender** → **📋 Channels** → **➕ Add Current Channel** to add it as a target.
4. Right-click any channel → **Auto Message Sender** → **▶️ Start Auto Messages**.
5. Done — the plugin will start sending your message sequence on a random timer.

---

## Features

### ▶️ Auto Message Sending
- Sends a **sequence of up to 10 messages** in order, one after another, with a 500ms gap between each message.
- After the full sequence is sent, it waits a **random delay** (between your configured min/max seconds) before sending again.
- Randomized timing makes the behavior less predictable and more natural-looking.

### 📋 Up to 10 Target Channels
- You can add up to **10 Discord channels** as targets (server channels or DMs both work).
- Each slot can be individually **enabled or disabled** without removing the channel.
- Right-click any channel and use **➕ Add Current Channel** to fill the next empty slot automatically — no need to copy-paste IDs manually.

### 🔄 Automatic Channel Rotation
- When you have **2 or more active channels**, the plugin automatically **rotates** between them.
- Rotation happens on a **random timer** (between your configured min/max rotation minutes).
- You can also trigger a rotation manually at any time from the right-click menu.
- The live timer widget shows which channel is currently active and how long until the next switch.

### ⏱️ Live Timer Widget
- A small overlay widget appears in the **bottom-right corner of your screen** while the plugin is running.
- Shows:
  - How many seconds until the next message is sent.
  - The name of the channel currently being sent to.
  - Which slot you're on out of how many (e.g. `Channel 2/5`).
  - How long until the next channel rotation (e.g. `Switch in: 7:23`).
- Turns **red/orange and says "⏸️ PAUSED"** when a verification alert fires.

### ⚠️ Verification Alert System
- While running, the plugin monitors the **currently active sending channel** for verification/captcha messages from bots.
- It detects two specific patterns:
  - **Human check:** `⚠️ | @User, are you a real human? Please use the link below...` + `complete this within X minutes or it may result in a ban`
  - **Captcha check:** `Please complete your captcha to verify that you are human! (1/5)` through `(5/5)`
- When detected, it:
  - **Pauses** your auto-messages (does not fully stop them).
  - Plays a **repeating audio alert** using your system's Web Audio API.
  - Shows a large **red alert popup** in the center of your screen.
  - Displays the **username and user ID** of whoever received the verification message.
  - Shows a **toast notification** at the top of Discord.

#### Alert Popup — Two-Click Dismiss
The alert popup requires **two clicks** to fully dismiss — this is intentional so you don't accidentally skip it:

| Click | What happens |
|-------|-------------|
| **1st click** | Sound stops immediately. Button turns **orange** and shows "✅ Sound stopped — click again to resume". The popup stays visible so you know to take action. |
| **2nd click** | Popup closes. Auto-messages **resume automatically** from where they left off. |

---

## Right-Click Menu

Right-click **any channel** in Discord's channel list to access the **Auto Message Sender** submenu. It contains:

| Option | Description |
|--------|-------------|
| **▶️ Start Auto Messages** / **✅ Stop Auto Messages** | Starts or fully stops the plugin. |
| **📋 Channels** | Opens a submenu listing all configured channel slots. |
| — ✅/❌ Slot N: #channel-name | Click to toggle that slot on or off. |
| — ➕ Add Current Channel (X/10) | Adds the channel you right-clicked to the next empty slot. Shows how many slots are filled. Greyed out when all 10 are full. |
| **🔗 Go To Channel** | Opens a submenu to quickly navigate to any of your configured channels. Only shows slots that have a channel set. |
| **Status: 🟢/🔴/⏸️** | Click to see a full status toast: which channels are enabled, current timing settings, and verification detection status. |
| **🔄 Rotate Channel Now** | Immediately switches to the next channel. Only available while running with 2+ active channels. |
| **🔔 Test Verification Alert** | Triggers the alert popup and sound so you can see how it works without waiting for a real detection. |
| **⚙️ Open Settings** | Navigates you to the Vencord Plugins settings page. |

---

## Settings Panel

Access via **User Settings → Vencord → Plugins → AutoMessageSender → ⚙️**.

### Channel Slots (1–10)
Each slot has two fields:

- **Channel ID N** — The raw Discord channel ID. You can fill this in manually (right-click a channel → Copy Channel ID with Developer Mode on), or use the **➕ Add Current Channel** option in the right-click menu which fills it automatically.
- **Enable Channel N** — Toggle switch. When off, that channel is skipped entirely but its ID is still saved.

### Message Sequence (1–10)
- **Message 1 through Message 10** — The messages sent in order each cycle.
- Leave any field **blank** to skip that message.
- Default messages are `Hi`, `Hello`, `Yo` on slots 1–3. All others are blank.

### Timing
| Setting | Default | Description |
|---------|---------|-------------|
| **Min Interval Seconds** | `20` | Minimum wait time between message cycles. |
| **Max Interval Seconds** | `40` | Maximum wait time. The actual delay is a random number between min and max. |
| **Min Channel Rotation Minutes** | `10` | Minimum time before rotating to the next channel. |
| **Max Channel Rotation Minutes** | `20` | Maximum time before rotating. Again, randomized between min and max. |

### Verification Detection
- **Enable Verification Detection** — Master toggle for the alert system. When off, no monitoring happens and no alerts will fire.

---

## How Channel Rotation Works

When you have **2 or more enabled channels**, the plugin does not send all messages to all channels at once. Instead it sends the full sequence to **one channel at a time**, then after a random number of minutes it **switches** to the next channel in your list and sends there instead.

Example with 3 channels configured:
```
[Start] → Send to Slot 1 → [10–20 min] → Switch to Slot 2 → [10–20 min] → Switch to Slot 3 → [10–20 min] → Back to Slot 1 → ...
```

If you only have **1 channel**, rotation is skipped and it just keeps sending to that one channel forever.

---

## How Verification Detection Works

The plugin listens to all incoming Discord messages using Vencord's flux system. It only checks messages that arrive in the **exact channel that's currently being sent to** — not all channels, not all configured slots, just the one actively in use at that moment.

When a message arrives in that channel, it is scanned (after stripping zero-width characters and hidden Unicode that bots sometimes use to break keyword detection) for two patterns:

**Pattern 1 — Human check bot:**
Must contain all of:
- A `⚠️` warning emoji
- The phrase `are you a real human`
- The phrase `please use the link below`
- Either `complete this within` or `may result in a ban`

**Pattern 2 — Captcha bot:**
Must contain all of:
- `please complete your captcha`
- `verify that you are human`
- A fraction like `(1/5)`, `(2/5)`, up to `(5/5)`

If either pattern matches, the plugin:
1. Extracts the mentioned user's **Discord ID** from the `<@ID>` mention in the message.
2. Extracts the mentioned user's **display name / username** from the message author metadata.
3. Fires the alert with that information.

---

## Important Notes

- **This plugin sends messages on your behalf.** Make sure you understand the rules of any server you're using it in.
- The verification detector only watches the channel **currently being sent to**. If you're rotating between channels and a verification fires in a channel you're not currently on, it will not be detected.
- When the plugin is **paused** (alert active), the timer widget stays on screen showing the paused state. It resumes and goes back to its normal countdown display after you dismiss the alert.
- If you **Stop** the plugin (not just dismiss an alert), it fully clears all timers and you'll need to Start it again manually.
- The plugin saves your channel IDs and settings persistently via Vencord's settings system — they will still be there after restarting Discord.

---

## Troubleshooting

**Messages aren't sending**
- Make sure at least one channel slot is configured and enabled (✅).
- Check that the plugin is started (right-click menu should show "✅ Stop Auto Messages").
- Check the browser console (Ctrl+Shift+I) for `[AutoMessageSender]` log lines.

**Channel rotation isn't happening**
- Rotation only occurs with **2 or more enabled channels**.
- Check the timer widget — it shows "Switch in: N:NN" if rotation is scheduled. If it shows "N/A", only one channel is active.

**Verification alert isn't triggering**
- Make sure **Enable Verification Detection** is ON in settings.
- The plugin only detects messages in the **currently active sending channel** — if the bot sends the verification in a different channel it won't fire.
- Use **🔔 Test Verification Alert** in the right-click menu to confirm the alert system itself is working.
- Check that the bot message matches one of the two patterns described above.

**Alert sound keeps playing after 1st click**
- The first click sets `isAlertActive = false` which stops the beep loop. If it seems to keep going briefly, that's the last scheduled beep finishing — it stops within 400ms.

---

## Developer Info

```
Plugin:     AutoMessageSender
Author:     Ar7340
Discord ID: 1321782566763892748
Repo:       https://github.com/Ar7340/Discord-Auto-Messages-Vencord
License:    GPL-3.0-or-later
Framework:  Vencord (https://vencord.dev/)
```