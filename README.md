# 🎙️ PodCommons

**A Community Podcast Discovery Engine with Transparent, AI-Powered Algorithms**

PodCommons is an open-source platform for discovering, curating, and sharing podcasts — built around the radical idea that you should be able to *see and adjust* the algorithm that shapes your feed.

> *Listen together. Understand the algorithm. Amplify what matters.*

**Live instance:** [podcasts.wesfryer.com](https://podcasts.wesfryer.com)  
**Built by:** [Dr. Wes Fryer](https://wesfryer.com) with Claude AI · [#podcommons](https://bsky.app/search?q=%23podcommons)

---

## ✨ What Makes PodCommons Different

Most podcast apps hide their recommendation logic. PodCommons does the opposite:

- **🤖 AI-powered episode analysis** — Every new episode is analyzed by Google Gemini Flash at import time, assigning topic tags and a 0–1 relevance score against the curator's taste profile
- **🧠 "Why this?" transparency layer** — Every recommended episode shows exactly which signals surfaced it, with a visual breakdown of contributing factors
- **⚙️ Algorithm tuning sliders** — Adjust Discovery vs. Familiar, Recent vs. Timeless, and My Taste vs. Community in real time. Settings saved to your profile
- **🏷️ Topic filtering** — Filter the feed by topic: AI & Technology, Democracy & Civic, Education, Faith, History, and 16 more categories
- **📡 Open web values** — Built on RSS, OPML, Mastodon, Bluesky, and Pinboard. Produces its own RSS feeds so your curation is portable

---

## 🚀 Features

### Discovery
- Import podcast subscriptions via OPML (420+ feeds supported)
- Automatic RSS polling every 4 hours via Firebase Cloud Functions
- Manual refresh with real-time status in admin dashboard
- AI episode analysis: topic classification + taste scoring via Gemini Flash
- Four feed tabs: 🧠 Discover / 🕐 Latest / ⭐ Admin Picks / 🔥 Community
- Algorithm tuning sliders with persistent settings
- "Why this?" transparency chip on every episode card
- Topic filter bar with 17 categories

### Audio
- ▶ Play button overlay on episode artwork
- Embedded audio player on episode detail pages
- ⟨⟨ 30s / ⟩⟩ 30s skip buttons
- Scrubber with time display
- Graceful fallback to external link if audio fails

### Community & Profiles
- Google OAuth login (no password required)
- Gravatar avatars with identicon fallback
- Three-tier trust system: New → Trusted → Admin
- Public member profiles with activity feeds, favorites, and listening queues
- Profile visibility: Public / Members Only / Private
- 🎧 Listening queue — add episodes from any card or detail page
- ♥ Like / ★ Favorite / 💬 Comment on episodes
- Toggle unlike/unfavorite with real-time counts
- Suggest a podcast or episode (from profile page)
- Mastodon handle + server stored per user for one-click sharing

### Content Safety & Moderation
- Episode and feed flagging (goes to moderation queue, does NOT auto-hide)
- Admin can permanently delete feeds (added to blocked list)
- Moderation queue: Approve / Reject / Approve + Trust User
- Flag queue: Restore / Keep Hidden / Remove Permanently
- Suggestions queue in admin dashboard
- RSS poll error log — see which feeds are failing and why

### Admin Dashboard
- **⚙️ System** — RSS poll status, manual refresh, registration gate
- **💬 Moderation** — pending likes/comments with trust controls
- **🚩 Flags** — flagged content with restoration/removal options
- **📡 Feeds** — search, filter, show/hide/delete any of 420+ feeds
- **👥 Users** — role management (New/Trusted/Admin)
- **💡 Suggestions** — pending podcast/episode suggestions

### Open Web
- Mastodon polling (imports #podcastrecc posts)
- Pinboard polling (imports #podcastrecc bookmarks)
- Pocket Casts listening history import
- Share to Bluesky and Mastodon with #podcommons
- Uses user's actual Mastodon server for sharing
- PodCommons RSS output feeds (coming soon)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Authentication | Firebase Auth (Google OAuth) |
| Database | Firestore |
| Background jobs | Firebase Cloud Functions v2 (Node.js 24) |
| AI analysis | Google Gemini Flash API |
| Hosting | Firebase Hosting |
| Mobile (planned) | Capacitor (iOS + Android) |

---

## 🏁 Quick Start — Run Your Own PodCommons

### Prerequisites
- Node.js v18+
- A free [Firebase](https://firebase.google.com) account (Blaze plan required for Cloud Functions)
- A Google account
- A [Google AI Studio](https://aistudio.google.com) API key for Gemini Flash

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
```bash
cp env.example .env
# Edit .env and add your VITE_ADMIN_TOKEN
```

Update `src/firebase.js` with your `firebaseConfig`.

### 4. Set Firebase secrets
```bash
firebase functions:secrets:set ADMIN_TOKEN
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
Open Firestore rules to allow writes temporarily, then:
```bash
node importOPML.mjs path/to/subscriptions.opml
```

### 9. Deploy everything
```bash
npm run build
firebase deploy
```

---

## 📁 Project Structure

```
podcommons/
├── src/
│   ├── components/       # EpisodeCard, AudioPlayer, Navbar, SliderPanel, TopicFilter...
│   ├── pages/            # Home, Episode, Show, Profile, Admin, About, Settings...
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
- Fix login redirect race condition (profile check on sign-in)
- PodCommons RSS output feeds (`/feed.xml`, `/feed/admin-picks.xml`, `/feed/community.xml`)
- Larger listening queue button (mobile UX)
- Mobile UX audit and improvements
- Per-user personalized taste profiles (currently uses curator's listening history)

### Medium Priority
- Data export: OPML (full + by category), activity export (LLM-ready text file)
- Podcast + episode search
- Admin email notifications for flags and suggestions
- Algorithmic transparency improvements (show AI taste score + reason on cards)
- Listening progress tracking
- Pocket Casts OCR upload UI (currently manual script)

### Phase 2
- Capacitor mobile app (iOS + Android)
- Native Bluesky AT Protocol posting
- Community group sub-feeds and RSS feeds
- Email digest (weekly recommendations)
- Embeddable episode widget
- YouTube integration exploration
- docs/MEDIA_LITERACY.md — classroom guide
- docs/ALGORITHM.md — deep dive
- docs/SETUP.md — deploy your own instance

---

## 🎓 Educational Use

PodCommons was designed as a **media literacy teaching tool** as much as a podcast platform. The algorithm transparency layer makes abstract concepts about recommendation systems concrete and interactive.

---

## 🤝 Contributing

MIT License — fork it, deploy your own instance, share with `#podcommons`.

---

*Built by Dr. Wes Fryer in April 2026 through collaborative vibe-coding sessions with Claude AI.*
