# ONYX GRID Desktop (Windows, early beta)

This is a local-first Electron wrapper around the existing ONYX controller and overlays. It runs a loopback-only HTTP API on 127.0.0.1:3218 and opens the Producer Dock automatically. No Render/Vercel dependency. Config persists in Electron's userData/data/config.json across restarts.

## Build installer

Install Node.js LTS and Git once. Clone the repository (or pull the latest changes), then from the repo root run:

```powershell
npm install
npm run dist
```

Install the generated Windows installer from `dist`. After installation ONYX GRID launches from its desktop shortcut, without a terminal.

For development: `npm start`.

## OBS

In OBS 28+, open Tools > WebSocket Server Settings, enable the server on port 4455, and set a password. Open ONYX GRID's Producer Dock, configure OBS connection once and connect. The current Dock uses a direct browser WebSocket connection; OBS must be running. OBS connection credentials may be stored by existing Dock code; treat this as an early beta and do not share your Windows profile.

## Known limitations

- This is an **initial desktop package**, not a fully tested production release.
- The existing Dock's OBS integration is retained; **automatic OBS reconnection and credential persistence must be verified and improved**.
- Some original controller pages may expect remote-only endpoints or additional APIs.
- Local API is intentionally unauthenticated and bound to **127.0.0.1 only**. Do not expose/forward port 3218 to the internet or LAN.
- Tray uses a placeholder icon; branded icon and installer signing are pending.
- For LAN operators, use a separate authenticated gateway in a future release.
- Local port 3218 must be free. Closing the window hides it to the tray; Quit exits the server.
