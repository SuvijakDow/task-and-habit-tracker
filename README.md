# Task & Habit Tracker ⚡

A modern, full-featured productivity web application for managing tasks by time periods, building daily routines, and tracking habits with rich visual analytics. Built with **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Firebase**.

![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.3-38B2AC?logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-10.7-FFCA28?logo=firebase&logoColor=black)

---

## ✨ Key Features

### 📋 Task Management
- **Star & Pin Tasks**: ⭐ Star any task to pin it to the top of your list instantly.
- **Task Presets (Periods)**: Group tasks by terms, semesters, or custom project periods (e.g., `2569/1`).
- **Subtask Checklists**: Actionable subtasks with live progress bar and auto-sync completion.
- **Dual View Modes**: Switch seamlessly between **Card/List View** and **Table View**.
- **Color Categories**: Custom color-coded categories with automatic fallback handling.

### 🔄 Habit Tracking & Routines
- **Multi-Routine Tagging**: Organize habits into multiple active routines or sets.
- **Partial Goal Logging**: Log fractional progress towards daily targets (e.g., read 10 pages).
- **Weekly Schedule**: Visual daily timetable displaying habit time slots across the week.
- **Drag-and-Drop**: Easily reorder daily habits.

### 📊 Visual Analytics & History
- **Contribution Heatmap**: GitHub-style activity heatmap tracking long-term consistency.
- **Editable History**: Click past dates to toggle status between **Completed**, **Not Scheduled**, **Missed**, or **Partial**.
- **Excused Days**: Mark non-scheduled days so streaks and consistency scores stay accurate.

### 🎨 Themes & Customization
- **Color Style Modes**: Toggle between **Soft Gradients** and **High-Contrast Solid Color Mode**.
- **Typography**: Choose from curated Thai & English fonts (Bai Jamjuree, Prompt, Sarabun, Inter, Kanit, etc.).
- **Mobile Optimized**: Compact 3-dots action menus and row-aligned controls built for mobile screens.
- **Data Backup & Restore**: Export/import data via JSON with Replace or Merge modes.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Custom Glassmorphism UI
- **Backend & Database**: Firebase (Cloud Firestore, Authentication)
- **Icons & Utilities**: Lucide React, date-fns

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js v18+
- Firebase Project with Auth and Firestore enabled

### 2. Installation & Setup
```bash
# Clone repository
git clone https://github.com/SuvijakDow/task-and-habit-tracker.git
cd task_and_habit_tracker

# Install dependencies
npm install
```

### 3. Environment Variables
Create `.env.local` in the project root:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Firebase Firestore Setup
Enable **Authentication (Email/Password)** and **Cloud Firestore** in your Firebase console. Add the following rules in Firestore Security Rules:
```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 5. Run & Build
```bash
# Start development server
npm run dev

# Build for production
npm run build
```

---

## 📁 Project Structure

```
src/
├── components/          # Reusable UI, Habit, Task, and Modal components
│   ├── habits/         # Heatmap, Timeline, Habits Table
│   ├── modals/         # Category, Settings, History, Period modals
│   └── tasks/          # Tasks Table component
├── config/             # Firebase configuration
├── context/            # Auth and Refresh Context providers
├── pages/              # TasksPage, HabitsPage, AnalyticsPage, AuthPage
├── services/           # Firebase CRUD service layer (tasks, habits, categories, user)
├── types/              # Shared TypeScript definitions
└── utils/              # Sorting, Audio, Date, Font, and Theme utilities
```

---

## 📄 License

Distributed under the [MIT License](LICENSE).
