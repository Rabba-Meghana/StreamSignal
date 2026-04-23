# StreamSignal 📡

> Twitch Growth Intelligence Platform — built for the Community Growth team at Twitch.

StreamSignal is a full-stack analytics dashboard that connects to the real Twitch Helix API to give streamers the data-driven insights they need to grow. It was built to solve the #1 unsolved pain on Twitch: **small streamers can't get discovered, and Twitch's own Discovery Feed still isn't fixing it**.

---

## What It Does

- **Real Twitch OAuth 2.0** — Authenticates with your actual Twitch account
- **Live Channel Analytics** — Viewer trends, follower counts, clip performance
- **Engagement Score** — Measures viewer interaction relative to follower count
- **Discovery Score** — How findable you are on Twitch's Discovery Feed
- **Growth Blueprint** — 5 personalized, data-driven recommendations per channel
- **Explore Mode** — Analyze any channel by username, or browse top live streams
- **Light/Dark Mode** — Full Twitch-themed design system

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Routing | React Router v7 |
| Charts | Recharts |
| Icons | Lucide React |
| Build | Vite |
| API | Twitch Helix API (real data) |
| Auth | Twitch OAuth 2.0 (Implicit Flow) |
| Styling | CSS Modules + CSS Variables |

This stack mirrors exactly what Twitch's Community Growth team uses: **React, TypeScript, consumer-facing web products at scale**.

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000, click **Connect with Twitch**, and authorize the app.

## Why I Built This

The Community Growth team owns Chat, Discovery, and Stream Together. The biggest unsolved problem is the discovery gap — despite Twitch launching its Discovery Feed in 2024, streamers say it hasn't moved the needle. StreamSignal is the tool I'd want to build on day one: a real-data intelligence layer that helps streamers understand exactly why they're not growing and what to change.

Built by **Meghana Rabba** as a demonstration for the Software Engineer I, Community Growth role at Twitch.

## API Endpoints Used

- `GET /users` — Channel profile data
- `GET /streams` — Live stream status and viewer count
- `GET /channels/followers` — Total follower count
- `GET /clips` — Clip performance data
- `GET /search/channels` — Channel search
- `GET /search/categories` — Game/category search
- `GET /streams?first=20` — Top live streams (Explore tab)

## Deployment

```bash
npm run build
# Deploy /dist to Vercel, Netlify, or AWS S3+CloudFront
```
