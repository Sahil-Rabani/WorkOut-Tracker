# Solo Leveling Tracker

This is an AI created website for tracking daily workouts, progress, streaks, and rank-based XP.

## Overview

Solo Leveling Tracker is a React + Vite app that helps users log exercises, track progress, and manage workout streaks. It includes features for rest days, Sunday recovery, penalties for missed workouts, exercise progression, and achievements.

## Features

- Daily workout tracking with exercise completion and rep counts
- Sunday recovery day support
- Persistent progress storage using browser storage
- Automatic history generation and streak computation
- Missed-day penalty that can reduce level and XP
- Exercise default settings and XP multiplier
- Calendar view with status legend
- Backup / restore JSON export and import

## Getting Started

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

## Notes

- This project is AI created.
- Local browser storage is used for persistence.
- Sunday Recovery Day pauses progression and preserves streaks when enabled.

## Project Structure

- `index.html` — App entry page
- `src/main.jsx` — React app bootstrap
- `solo-leveling-tracker.jsx` — Main app component and logic

## License

This project is provided as-is.
