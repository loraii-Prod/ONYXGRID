# ONYX GRID Remote Beta
The original static preview stays at https://onyxgrid-overlays.onrender.com. Remote controls use a separate Render **web service** at https://onyxgrid-remote-control.onrender.com.

## Render configuration (required before it can start)
In the new Render web service, Environment, add three **secret** variables:
- ONYX_ADMIN_PASSWORD: choose a unique password at least 12 characters.
- ONYX_BRIDGE_KEY: choose a unique random key at least 24 characters (same value in Windows bridge).
- ONYX_SESSION_SECRET: choose a different random key at least 32 characters.
Do not commit these values to GitHub. Redeploy after saving.
Build command: echo ONYX remote backend ready
Start command: node remote-server.js

## Windows OBS bridge
1. Install Node.js LTS, open a terminal in a directory containing onyx-obs-bridge.cjs.
2. Run: npm install ws
3. In OBS: Tools > WebSocket Server Settings > Enable WebSocket server; keep it on 127.0.0.1:4455, set a password.
4. In PowerShell (replace placeholders):
   $env:ONYX_REMOTE_URL="https://onyxgrid-remote-control.onrender.com"
   $env:ONYX_BRIDGE_KEY="YOUR_RENDER_BRIDGE_KEY"
   $env:OBS_WS_PASSWORD="YOUR_OBS_WEBSOCKET_PASSWORD"
   node .\onyx-obs-bridge.cjs
Never expose OBS WebSocket port 4455 to the public internet.

## Pages
- /login.html: sign in
- /remote.html: new remote director controls
- /dock.html, /director.html, /hub.html: original panels; some OBS controls still assume local WebSocket and are not yet fully migrated
- /overlay.html?scene=starting and ?scene=live: remote-synced overlay
- /api/health: readiness and bridge connection state

## Known beta limitations
Render free service has ephemeral disk; config and guest list reset on restart. OBS bridge processes queued commands while online, but has no persistent queue or command acknowledgements. Original OBS scene builder and audio manager are not yet migrated. The local bridge needs to stay running on Windows. Do not treat this as a production-ready release yet.
