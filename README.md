# Pilar

Lightweight pixel-art MMO as a Farcaster mini app.

Core loop
- Each FID gets an obelisk and a small home plot.
- Players expand their plot, then travel the shared map to visit others.
- Mail is in-app only; no DM notifications, but optional in-app toasts.

Project layout
- apps/web: static canvas client
- apps/server: node server (http + ws), in-memory state

Running
1. npm install
2. npm run dev
3. open http://localhost:3000/?fid=1234

Notes
- State is in memory and resets on restart.
- FID is read from the query string for now.
