# 🎙️ PodCommons

**A Community Podcast Discovery Engine with Transparent Algorithms**

PodCommons is an open-source platform for discovering, curating, and sharing podcasts — built around the radical idea that you should be able to *see and adjust* the algorithm that shapes your feed.

> *Listen together. Understand the algorithm. Amplify what matters.*

**Live instance:** [podcasts.wesfryer.com](https://podcasts.wesfryer.com)  
**Built by:** [Dr. Wes Fryer](https://wesfryer.com) · [#podcommons](https://bsky.app/search?q=%23podcommons)

---

## ✨ What Makes PodCommons Different

Most podcast apps hide their recommendation logic. PodCommons does the opposite:

- **🧠 "Why this?" transparency layer** — every recommended episode shows exactly which signals surfaced it, with a visual breakdown of contributing factors
- **⚙️ Algorithm tuning sliders** — adjust Discovery vs. Familiar, Recent vs. Timeless, and My Taste vs. Community in real time
- **📡 Open web values** — built on RSS, OPML, Mastodon, and Pinboard; produces its own RSS feeds so your curation is portable
- **🏘️ Community-first** — Google Auth, trust tiers, moderation queue, and community groups make this a real community platform, not just a solo recommendation engine

---

## 🚀 Features

### Discovery
- Import your podcast subscriptions via OPML file
- Live RSS polling for new episodes (every 4 hours)
- Algorithmic discovery feed with tunable weights
- Chronological, Wes Picks, and Community feed tabs
- "Why this?" transparency chip on every episode card

### Community
- Google OAuth login (no password required)
- Gravatar avatars with identicon fallback
- Three-tier trust system: New → Trusted → Admin
- Moderation queue for new user interactions
- Like, Favorite, and Comment on episodes
- Community group selection at registration

### Curation & Safety
- Feed exclusion — hide any imported feed from public view
- Episode and feed flagging with instant auto-hide
- Podcast suggestion queue (always moderated)
- Registration gate: Open / Invite Code / Closed modes
- Invite code management with usage tracking

### Open Web
- Mastodon and Pinboard live polling
- Pocket Casts listening history import (screenshot OCR)
- PodCommons RSS output feeds (`/feed.xml`, `/feed/wes-picks.xml`, `/feed/community.xml`)
- RSS autodiscovery in HTML `<head>`
- Share to Bluesky and Mastodon with `#podcommons`

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Authentication | Firebase Auth (Google OAuth) |
| Database | Firestore |
| Background jobs | Firebase Cloud Functions |
| AI layer | Google Gemini API (OCR + topic clustering) |
| Hosting | Firebase Hosting |
| Mobile (Phase 2) | Capacitor (iOS + Android) |

---

## 🏁 Quick Start — Run Your Own PodCommons

### Prerequisites
- Node.js v18+
- A free [Firebase](https://firebase.google.com) account
- A Google account

### 1. Fork and clone
```bash
git clone https://github.com/YOUR_USERNAME/podcommons.git
cd podcommons
npm install
```

### 2. Create a Firebase project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (disable Google Analytics)
3. Enable **Authentication** → Sign-in providers → **Google**
4. Enable **Firestore Database** → Start in test mode → `nam5` region
5. Add a **Web app** → copy the `firebaseConfig` object

### 3. Configure Firebase
```bash
npm install -g firebase-tools
firebase login
firebase init  # Select: Firestore, Functions, Hosting
```

Update `src/firebase.js` with your `firebaseConfig` values.

### 4. Set up Firestore rules
```bash
firebase deploy --only firestore:rules
```

### 5. Run locally
```bash
npm run dev
```

Visit `http://localhost:5173` — sign in with Google and complete your profile.

### 6. Set yourself as admin
In Firebase Console → Firestore → `users` collection → your document → change `role` to `"admin"`.

### 7. Import your podcasts
```bash
node importOPML.mjs path/to/your-subscriptions.opml
```

### 8. Deploy
```bash
npm run build
firebase deploy
```

---

## 📡 Your PodCommons RSS Feeds

Once deployed, your curated recommendations are available as RSS feeds:

| Feed | URL |
|---|---|
| Discovery | `yoursite.com/feed.xml` |
| Your Picks | `yoursite.com/feed/wes-picks.xml` |
| Community | `yoursite.com/feed/community.xml` |

Subscribe to these in Flipboard, Reeder, or any RSS reader. Connect them to your [Federated Reader Bot](https://github.com/wfryer/federated-reader-bot) to auto-post picks to Mastodon.

---

## 🎓 Educational Use

PodCommons was designed as a **media literacy teaching tool** as much as a podcast platform. The algorithm transparency layer — especially the "Why this?" modal with its visual signal breakdown — makes abstract concepts about recommendation systems concrete and interactive.

See `docs/MEDIA_LITERACY.md` for classroom discussion prompts, comparison activities (PodCommons vs. Spotify vs. Apple Podcasts), and student project ideas.

---

## 📁 Project Structure

```
podcommons/
├── src/
│   ├── components/     # EpisodeCard, Navbar, SliderPanel, WhyThisModal...
│   ├── pages/          # Home, Episode, Show, Admin, Profile...
│   ├── hooks/          # useAuth
│   └── firebase.js     # Firebase initialization
├── functions/          # Firebase Cloud Functions (RSS polling, etc.)
├── public/images/      # Show artwork
├── firestore.rules     # Security rules
└── docs/               # Setup, algorithm, media literacy guides
```

---

## 🤝 Contributing

PodCommons is open source under the MIT License. Fork it, deploy your own instance for your community, and share what you build with `#podcommons`.

If you improve the core platform, pull requests are welcome!

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

*PodCommons was built by Dr. Wes Fryer in April 2026 through a collaborative vibe-coding session. It is a living project and this README will grow with it.*
