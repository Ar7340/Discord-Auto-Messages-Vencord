# AutoMessageSender — Vencord Plugin

> Automatically sends message sequences to multiple Discord channels with smart rotation, live alerts, and full customization.

**Developer:** Ar7340 | Discord ID: `1321782566763892748`  
**Repository:** https://github.com/Ar7340/Discord-Auto-Messages-Vencord  
**License:** GPL-3.0-or-later

---

## Features

- 📤 Send up to **10 custom messages** in sequence, on a random interval
- 📋 Target up to **10 channels** simultaneously with automatic rotation
- ⏱️ Live on-screen countdown timer showing next message & channel info
- 🚨 **Verification message detection** — auto-pauses and sounds an alarm
- 🎣 **Neon Catchlist detection** — alerts when a rare catch is listed
- 👤 **Other user detection** — alerts when a real user sends in your channel
- ⏸️ **Manual pause / resume** from the right-click menu
- 🔕 Two-stage alert dismissal (stop sound first, then resume)
- ✅ Per-channel enable/disable toggles — no need to remove channels

---

## Installation

1. Open your Vencord plugins folder
2. Drop `messageinchannel.tsx` inside
3. Restart Discord (or reload plugins)
4. Enable **AutoMessageSender** in `Settings → Vencord → Plugins`

---

## Quick Start

1. **Navigate to a channel** you want to send messages in
2. **Right-click the channel** in the sidebar
3. Go to `Auto Message Sender → 📋 Channels → ➕ Add Current Channel`
4. Click `▶️ Start Auto Messages`

That's it. The plugin will begin sending your configured messages on a random interval.

---

## Right-Click Menu

Right-click any channel in the sidebar to access the full control menu:

| Option | Description |
|---|---|
| ▶️ Start / ✅ Stop Auto Messages | Toggle the sender on or off |
| ⏸️ Pause / ▶️ Resume Auto Messages | Manually pause without stopping |
| 📋 Channels | Add, toggle, or navigate to configured channels |
| 🔄 Rotate Channel Now | Immediately switch to the next channel |
| 🔔 Test Verification Alert | Preview the alert system |
| ℹ️ Status | Show current run state, channels, and timing info |
| ⚙️ Open Settings | Jump straight to plugin settings |

---

## Settings

Open `Settings → Vencord → Plugins → AutoMessageSender` to configure everything.

### Channels (Slots 1–10)

Each slot has two fields:

- **Channel ID** — paste the channel's ID (or use ➕ Add from the right-click menu)
- **Enable toggle** — check/uncheck to include that channel in rotation without deleting it

**Channel Rotation** randomizes how often the plugin switches between enabled channels:

| Setting | Default | Description |
|---|---|---|
| Min rotation minutes | `10` | Minimum time on each channel |
| Max rotation minutes | `20` | Maximum time on each channel |

### Messages (1–10)

Up to 10 messages sent in order each cycle. Leave a slot blank to skip it.

| Setting | Default |
|---|---|
| Message 1 | `Hi` |
| Message 2 | `Hello` |
| Message 3 | `Yo` |
| Messages 4–10 | *(blank)* |

### Timing

| Setting | Default | Description |
|---|---|---|
| Min interval seconds | `20` | Shortest possible gap between cycles |
| Max interval seconds | `40` | Longest possible gap between cycles |

The actual wait is randomly chosen between min and max each cycle to appear more natural.

---

## Alert System

The plugin watches for three types of events in your active channel and **auto-pauses** when triggered. Each alert type has a distinct color and icon.

### 🔴 Verification Alert
Triggered when a bot sends a human-verification / captcha message targeting someone in the channel.

Detected patterns include:
- *"Are you a real human? Please use the link below…"*
- *"Please complete your captcha to verify that you are human (1/5)"*

### 🔵 Neon Catchlist Alert
Triggered when any message or embed contains:
> `Use "neon catchlist" to see a list of your rare catches`

Checks plain text content **and** all embed fields (description, title, footer, field values).

### 🟡 Other User Alert
Triggered when a **real, non-bot user** (other than you) sends a message in the channel that is **not** on your ignore list.

---

## Customizing the Other User Alert

### Ignored Messages

Go to **Settings → Other user ignore list** and add any messages you want to silently skip, separated by commas.

**Default ignore list:**
```
owo, owoh, owob, wh, wb, gh, gb, owo h, owo b, w h, w b,
wpiku, owopiku, wpup, owopup, owo hunt, owo battle,
owo gamble, owo fish, owo pray, owo run, owo zap, owo loot
```

To add more, just append to the list — no restart needed:
```
owo, wh, wb, my new command, another phrase
```

Matching is **case-insensitive** and **exact** (the full message must match the phrase).

### Ignored User IDs

Go to **Settings → Other user ignore user IDs** and add any Discord user IDs whose messages should never trigger an alert, separated by commas.

**Default ignored IDs:**
```
507962222132068362, 767671131032518687
```

To add more:
```
507962222132068362, 767671131032518687, 123456789012345678
```

This is useful for ignoring known bots that don't set the bot flag, trusted co-users, or any account you want silently excluded.

---

## Alert Dismissal (Two-Stage)

When an alert fires:

1. **First click** — stops the alarm sound. The button turns orange and stays on screen.
2. **Second click** — dismisses the alert and **resumes** auto-messages automatically.

This gives you time to handle the situation before the bot continues.

---

## Timer Display

A small overlay appears in the bottom-right corner while running:

```
⏱️ Next message in: 27s
  #fishing-grind (OWO Server)
  Channel 2/4 | Switch in: 8:33
```

Colors indicate state:

| Color | Meaning |
|---|---|
| Purple gradient | Running normally |
| Orange | Manually paused |
| Red/orange | Paused due to alert |

---

## Frequently Asked Questions

**Q: Will it alert on OWO bot responses?**  
A: No. Bots (with the bot flag) are automatically ignored by the other-user detector.

**Q: What if another real user types a normal ignored command like `owo`?**  
A: It won't alert. The message ignore list applies to all users, not just bots.

**Q: Can I use multiple channels without rotation?**  
A: Yes. If you only have one channel enabled, rotation is skipped automatically.

**Q: Does it stop completely when an alert fires?**  
A: No — it pauses. Once you dismiss the alert (two clicks), it resumes from where it left off.

**Q: How do I add a new ignored user mid-session?**  
A: Open plugin settings, add the ID to the ignore list, and save. No restart needed.

---

## Changelog

### Latest
- ➕ **Neon Catchlist detection** — alerts on rare catch messages/embeds
- ➕ **Other User detection** — alerts when a real user sends in your channel
- ➕ **Ignored user IDs** — per-user ID suppression list (configurable in settings)
- ➕ **Manual pause / resume** — right-click menu control without stopping the plugin
- ✏️ Alert button now shows distinct color + icon per alert type (🔴 verification, 🔵 neon, 🟡 other user)
- ✏️ All three detection systems work independently with their own enable toggles

---

*Made for Vencord. Use responsibly.*