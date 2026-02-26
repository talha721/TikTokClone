# TikTok Clone

A full-featured short-video social platform built with **React Native (Expo)** and **Supabase**, replicating the core TikTok experience — from a vertically scrollable video feed to real-time messaging and notifications.

---

## Features

- **Video Feed** — Vertically scrollable, auto-playing short video feed
- **Authentication** — Secure sign-up / sign-in with persistent sessions via Supabase Auth (PKCE flow)
- **Post Creation** — Record or pick videos from library, add descriptions, and upload with thumbnail generation
- **Comments & Replies** — Nested comment threads with per-comment like counts
- **Follow System** — Follow / unfollow users and view follower & following counts
- **Real-time Messaging** — One-on-one conversations with unread message badges
- **Notifications** — Real-time push of likes, comments, replies, follows, and mentions
- **User Profiles** — Avatar, bio, post grid, and stats (followers, following, likes)
- **Dark / Light Theme** — System-aware theme with manual toggle
- **Live Badge Counts** — Tab bar badges for inbox and notifications powered by Supabase Realtime

---

## Tech Stack

| Layer            | Technology                                                           |
| ---------------- | -------------------------------------------------------------------- |
| Framework        | [Expo](https://expo.dev) (SDK 54) + React Native 0.81                |
| Language         | TypeScript                                                           |
| Routing          | [Expo Router](https://expo.github.io/router/) (file-based)           |
| Backend / DB     | [Supabase](https://supabase.com) (Postgres, Auth, Storage, Realtime) |
| Data Fetching    | [TanStack Query](https://tanstack.com/query) v5                      |
| State Management | [Zustand](https://zustand-demo.pmnd.rs/) v5                          |
| Animations       | React Native Reanimated + Gesture Handler                            |
| Video            | expo-video, expo-camera, expo-video-thumbnails                       |
| Media Picker     | expo-image-picker                                                    |

---

## Project Structure

```
app/
├── (auth)/           # Login & registration screens
├── (protected)/      # Authenticated routes
│   ├── (tabs)/       # Bottom tab navigator (Feed, New Post, Inbox, Notifications, Profile)
│   ├── chat/         # Individual conversation screen
│   ├── postDetails/  # Post detail view
│   └── userProfile/  # Public user profile
components/           # Reusable UI components
context/              # React contexts (Theme, NewPost)
hooks/                # Custom hooks
lib/                  # Supabase client configuration
services/             # All Supabase data-access functions
stores/               # Zustand stores (auth, new post)
types/                # Shared TypeScript types
supabase/             # SQL migration files
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — `npm install -g expo-cli`
- A [Supabase](https://supabase.com) project

### 1. Clone the repository

```bash
git clone https://github.com/your-username/tiktok-clone.git
cd tiktok-clone
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run database migrations

Apply the SQL files in the `supabase/` directory to your Supabase project via the SQL Editor or the Supabase CLI:

```bash
supabase db push
```

### 5. Start the development server

```bash
npx expo start
```

Then open the app in one of the following:

| Target           | Command                                              |
| ---------------- | ---------------------------------------------------- |
| Android Emulator | Press `a` in the terminal                            |
| iOS Simulator    | Press `i` in the terminal                            |
| Physical Device  | Scan the QR code with [Expo Go](https://expo.dev/go) |
| Web Browser      | Press `w` in the terminal                            |

---

## Available Scripts

| Script                  | Description                       |
| ----------------------- | --------------------------------- |
| `npm start`             | Start the Expo dev server         |
| `npm run android`       | Build and run on Android          |
| `npm run ios`           | Build and run on iOS              |
| `npm run web`           | Start the web version             |
| `npm run lint`          | Run ESLint                        |
| `npm run reset-project` | Reset to a blank project scaffold |

---

## Environment Variables

| Variable                        | Description                              |
| ------------------------------- | ---------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`      | Your Supabase project URL                |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous (public) API key |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Expo Router Documentation](https://expo.github.io/router/docs)
