# 🎙️ PodCommons

**A Community Podcast Discovery Engine with Transparent, AI-Powered Algorithms**

PodCommons is an open-source platform for discovering, curating, and sharing podcasts — built around the radical idea that you should be able to *see and adjust* the algorithm that shapes your feed.

> *Listen together. Understand the algorithm. Amplify what matters.*

**Live instance:** [podcasts.wesfryer.com](https://podcasts.wesfryer.com)  
**Video intro:** [youtube.com/watch?v=o-IsBZzpGkc](https://www.youtube.com/watch?v=o-IsBZzpGkc)  
**Built by:** [Dr. Wes Fryer](https://wesfryer.com) with Claude AI · [#podcommons](https://bsky.app/search?q=%23podcommons)

---

## ✨ What Makes PodCommons Different

Most podcast apps hide their recommendation logic. PodCommons does the opposite:

- **🤖 AI-powered episode analysis** — Every new episode analyzed by Google Gemini 2.5 Flash at import time. 3,700+ episodes already tagged with topics and taste scores
- **🧠 "Why this?" transparency** — Every recommended episode shows exactly which signals surfaced it
- **⚙️ Algorithm tuning sliders** — Adjust Discovery vs. Familiar, Recent vs. Timeless, and My Taste vs. Community in real time
- **🏷️ Topic filtering** — 20 AI-assigned categories, filterable from the feed
- **🔎 Search** — Find episodes and podcasts by title, show name, or description
- **📡 Open web values** — Built on RSS, OPML, Mastodon, Bluesky, and Pinboard

---

## 🚀 Features

### Discovery
- Import podcast subscriptions via OPML (400+ feeds supported)
- Automatic RSS polling every 4 hours via Firebase Cloud Functions
- AI episode analysis: topic classification + taste scoring via Gemini 2.5 Flash
- Four feed tabs: 🧠 Discover / 🕐 Latest / ⭐ Admin Picks / 🔥 Community
- Algorithm tuning sliders with persistent settings
- "Why this?" transparency chip on every episode card
- Topic filter dropdown with 20 AI-assigned categories
- Pagination — load more episodes on any tab
- 🎲 Lucky button — random episode discovery

### Search
- Search across 3,700+ episodes and 400+ podcasts
- Episode results with artwork, podcast name, date, and topic tags
- Podcast results with clickable preview showing recent episodes
- Suggest or feature any episode directly from search results

### Audio
- Large artwork banner on episode detail pages
- 72px amber play button with glow effect
- ⟨⟨ 30s / ⟩⟩ 30s skip buttons
- Scrubber with current time and remaining time display
- **Auto-add to queue** — episode added to queue automatically when you press play
- **Resume playback** — position saved every 10 seconds, resumes where you left off
- **Completion banner** — offers to remove from queue when episode finishes
- Graceful fallback to "Open Original Podcast Link" if audio fails

### Community & Profiles
- Google OAuth login (no password required)
- Gravatar avatars with identicon fallback
- Three-tier trust system: New → Trusted → Admin
- Public member profiles with activity feeds, favorites, and listening queues
- Profile visibility: Public / Members Only / Private
- Profile dropdown in navbar — Queue, Settings, Admin access
- 🎧 Listening queue — auto-populated when playing, accessible from navbar
- ♥ Like / ★ Favorite / 💬 Comment on episodes
- Suggest a podcast or episode from your profile
- Mastodon handle + server stored per user for one-click sharing

### Content Safety & Moderation
- Episode and feed flagging
- Flag queue shows episode artwork, title, and clickable link to episode
- Admin → Feeds: search, filter, show/hide/delete, **edit RSS URL**
- Approve suggestion → auto-imports RSS feed to PodCommons
- RSS poll error log

### Admin Dashboard
- **⚙️ System** — RSS poll status, manual refresh, registration gate
- **💬 Moderation** — pending likes/comments with trust controls
- **🚩 Flags** — flagged content with episode details, restoration/removal options
- **📡 Feeds** — search, filter, show/hide/delete, edit RSS URL for any feed
- **👥 Users** — role management, clickable profile links
- **💡 Suggestions** — pending podcast/episode suggestions with auto-import on approval

### Open Web
- Mastodon polling (imports #podcastrecc posts)
- Pinboard polling (imports #podcastrecc bookmarks)
- Share to Bluesky and Mastodon with #podcommons
- Uses user's actual Mastodon server for sharing

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Authentication | Firebase Auth (Google OAuth) |
| Database | Firestore |
| Background jobs | Firebase Cloud Functions v2 (Node.js 22) |
| AI analysis | Google Gemini 2.5 Flash API |
| Hosting | Firebase Hosting |
| Mobile (planned) | Capacitor (iOS + Android) |

---

## 🏁 Quick Start — Run Your Own PodCommons

### Prerequisites
- Node.js v22 (use nvm: `nvm install 22 && nvm use 22`)
- A free [Firebase](https://firebase.google.com) account (Blaze plan required for Cloud Functions)
- A [Google AI Studio](https://aistudio.google.com) API key for Gemini 2.5 Flash with billing enabled

### 1. Fork and clone
```bash
git clone https://github.com/YOUR_USERNAME/podcommons.git
cd podcommons
npm install
cd functions && npm install && cd ..
```

### 2. Create a Firebase project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Google sign-in
4. Enable **Firestore** → Start in production mode → `nam5` region
5. Upgrade to **Blaze plan** (required for Cloud Functions)
6. Add a **Web app** → copy the `firebaseConfig`

### 3. Configure environment
Update `src/firebase.js` with your `firebaseConfig`.

```bash
cp env.example .env
```

### 4. Set Firebase secrets
```bash
firebase functions:secrets:set GEMINI_API_KEY
```

### 5. Deploy Firestore rules
```bash
firebase deploy --only firestore:rules
```

### 6. Run locally
```bash
npm run dev
```

### 7. Set yourself as admin
In Firebase Console → Firestore → `users` → your document → set `role` to `"admin"`.

### 8. Import your podcasts
Open Firestore rules temporarily, then:
```bash
node importOPML.mjs path/to/subscriptions.opml
```

### 9. Deploy
**Important:** Firebase CLI requires a minimal stub for first-time function deployment.
```bash
# First deploy frontend
npm run build && firebase deploy --only hosting

# For functions — deploy stub first, then full code
firebase deploy --only functions
```

---

## 📁 Project Structure

```
podcommons/
├── src/
│   ├── components/       # EpisodeCard, AudioPlayer, Navbar, Footer, TopicFilter...
│   ├── pages/            # Home, Episode, Show, Profile, Admin, About, Search, Settings...
│   ├── hooks/            # useAuth
│   ├── utils/            # algorithmScorer.js, textUtils.js
│   └── firebase.js
├── functions/
│   └── index.js          # RSS polling + Gemini AI analysis Cloud Functions
├── public/images/        # Show artwork
├── firestore.rules
└── firebase.json
```

---

## 🔮 Roadmap

### High Priority
- Cross-device resume playback (Firestore-backed)
- PodCommons RSS output feeds
- Per-user personalized taste profiles
- Speed of Creativity full archive import

### Medium Priority
- Top 10 favorite podcasts per member
- Data export (OPML, activity, LLM-ready)
- Active discussions feed (episodes with comments)
- Error feed dashboard for admins
- Admin email notifications
- Auto-hyperlinks in comments

### Phase 2
- Mobile app (Capacitor iOS + Android)
- Native Bluesky AT Protocol posting
- Email digest
- Embeddable episode widget
- Community group sub-feeds
- docs/MEDIA_LITERACY.md, ALGORITHM.md

---

## 🎓 Educational Use

PodCommons was designed as a **media literacy teaching tool** as much as a podcast platform. The algorithm transparency layer makes abstract concepts about recommendation systems concrete and interactive. Used as a classroom example of vibe-coding, AI API integration, and open web standards.

---

## 🤝 Contributing

MIT License — fork it, deploy your own instance, share with `#podcommons`.

---

*Built by Dr. Wes Fryer in April–May 2026 through collaborative vibe-coding sessions with Claude AI.*
