# Pilar

Lightweight pixel-art Farcaster mini app with a realtime shared world.

Technical highlights
- FID-scoped home plot seeded with an obelisk tile cluster.
- Client: vanilla canvas renderer + HUD; no framework.
- Server: Node.js HTTP + WebSocket with in-memory world, mail, notifications.
- Mail is in-app only; optional in-app toasts.

Project layout
- public: static canvas client (Firebase Hosting root)
- apps/server: node server (http + ws), in-memory state

Running
1. npm install
2. npm run dev
3. open http://localhost:3000/?fid=1234

Notes
- State is in memory and resets on restart.
- FID is read from the query string (placeholder for auth).
- Static hosting falls back to an offline demo if WebSocket is unavailable.
