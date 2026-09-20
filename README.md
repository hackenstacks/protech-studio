# ProTech Studio · LiVeWiRe

**The Forge Beyond the CoDe where the code becomes alive.**

A browser-based recording / streaming / broadcast studio for the NeXuS stack.
React 19 + Vite, three themes (TRON / MATRIX / STANDARD), and a slide-panel
**plugin dock** that overlays any tab without losing state.

Part of Na PH — the NeXuS Aether Production House.

---

## Tabs

| Tab | What it does |
|-----|--------------|
| **Studio** | Screen / audio / A-V capture via MediaRecorder |
| **Effects** | Live Web Audio effects rack + video filters |
| **Stream** | Broadcast/record controls |
| **Library** | Recordings — play, download, delete |
| **AI** | Provider-selectable assistant (via proxy) |
| **Image** | Image generation |
| **FFmpeg** | In-browser transcode (@ffmpeg/wasm) |
| **Terminal** | CRT terminal (SIM ⇄ LIVE PTY) |

## Plugin Dock

A permanent bottom dock toggles 13 panels that slide in from any edge and
**retain their state when closed**:

- **Board** (top) — broadcast cockpit: network toggles, AI Autopilot, soundboard, Forge Sessions launcher
- **Radio** (bottom overlay) — Icecast player + MPD transport + queue + volume; keeps playing across tabs
- **Fireside** (right) — mixed human + AI live chat, plus on-air persona interviews
- **Call-in** (right) — Murmur status + connect + live voice changer (robot / telephone / deep / pitch)
- **Notes**, **Vault** (top domains) — notepad + file store
- **Bookmarks**, **AI** (right) — quick links + chat
- **RSS**, **Spider** (left) — feed reader + web scraper/search
- **Networks**, **Platforms** (bottom strips) — dark-network + social quick-links
- **EQ** (bottom overlay) — 10-band spectrum + faders

## Broadcast layer → Aether

The broadcast panels talk to the NeXuS Web Server's `/api/nexus/aether/*` API,
which drives Aether Production House — MPD radio, Icecast, Murmur, and
multi-network broadcast (Tor / I2P / Yggdrasil / Nostr / Matrix / ActivityPub).

### Captain's Chair — AI authority

An **AI Autopilot** can run the board, but only within scopes *you* grant
(`radio` · `soundboard` · `chat` · `networks`) while the master switch is on.
Grants live server-side (`~/NeXuS/secrets/aether_ai_authority.json`, chmod 600).
You hold full authority and can revoke at any time. AI-origin calls are gated by
the `X-Nexus-Origin: ai` header + the granted scope; every shell-out is
whitelisted with args passed as a subprocess list (injection-safe).

## Develop

```sh
npm install
npm run dev      # vite dev server
npm run build    # → dist/  (served by NeXuS Web Server at /studio)
npm run lint
```

The built `dist/` is served at `https://localhost:8443/studio` via the app
registry entry `NEXUS_APP_STUDIO_static` in `~/NeXuS/secrets/nexus.env`.

### Runtime dependencies (for the broadcast layer)

- `doas apk add mpd mpc` — radio playback (Icecast + Murmur ship installed)
- `rc-service icecast start` / `murmur start` — stream + call-in
- `aichat --serve 3030` — fireside persona interviews

## Architecture notes

- `src/plugins/PluginEngine.jsx` — `PLUGIN_REGISTRY`, `usePluginState`, `DockBar`
- `src/plugins/SlidePanel.jsx` — animated shell (slideFrom top/left/right/bottom)
- `src/plugins/useVoiceChanger.js` — live Web Audio graph (ring-mod / bandpass / delay-line pitch shift)
- No hardcoded paths — everything resolves through the NeXuS Web Server / env.

---

*Sane · Simple · Secure · Stealthy · Sustainable · Beautiful*
Designer: **hackenstacks** · Element 11 Production · Na PH
