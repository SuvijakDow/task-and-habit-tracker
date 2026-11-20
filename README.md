# Task & Habit Tracker ⚡

A fast, modular productivity web application for managing period-based tasks, daily routines, and long-term habit analytics—engineered with **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Firebase**.

![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.3-38B2AC?logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-10.7-FFCA28?logo=firebase&logoColor=black)

---

## ✨ Key Features

### 📋 Task Management
- **Deadline Calendar Overview**: 🗓️ Interactive **Month View** & **7-Day Week Comparison Board** accessible directly from the Task Hub—inspect past and future deadlines for both main tasks and subtask milestones, jump between nearby deadlines (`±7 days`), toggle completion, edit, delete tasks/subtasks, or schedule new items on any date across Desktop, iPad, and Mobile.
  - **Drag to Move or Duplicate Across Dates**: Hold & drag any task or subtask from Month View chips, the Day Inspector, or Week View columns onto any other date (including adjacent-month trailing/leading cells) with a 60fps floating drag ghost, then pick **Move** or **Duplicate (`(Copy)`)** from a crisp drop popover—backed by instant optimistic UI updates and automatic subtask date shifting.
  - **Quick Month & Year Picker**: Click the calendar month label to open a 12-month and 12-year jump grid with deadline indicators for navigating distant dates in two taps, paired with a compact single-row desktop header and full-width mobile controls.
  - **Smart Adaptive Subtask Deduplication**: Tasks with dated subtask milestones display only their subtasks on the calendar (with undated siblings inheriting the parent deadline) to prevent double-counting, while pure checklist tasks without subtask dates remain a single clean parent card.
  - **Clear 1-to-1 Status Color Language**: **Red Aura** (Overdue), **Yellow Aura** (Due Today), **Purple** (Upcoming), **Green** (All Done), **Dashed Chip `↳`** (Subtask), paired with Thai day-of-week header colors (`Sun`–`Sat`).
- **Subtask Checklists & Individual Deadlines**: 📅 Actionable checklists with live progress bars, auto-sync completion, per-subtask due dates (editable inline and in modals), chronological sorting, and a **"Next Up" subtask indicator** on task cards.
- **Smart Effective Deadline Prioritization**: 🚀 Parent tasks automatically bubble up based on the earliest deadline among the main task and its incomplete subtasks, keeping urgent milestones visible.
- **Unified Search & Quick Filters**: 🔍 Real-time deferred search across titles, descriptions, categories, and subtask titles, paired with category and deadline quick filters (`Due Today`, `Overdue`, `Due in 7 Days`) synced across **List** and **Table** views.
- **Link Smart Chips**: 🔗 Auto-detected URL chips (GitHub, Google Drive, Figma, YouTube, Notion, Docs, etc.) with customizable labels and icons.
- **Star & Pin + Task Presets (Periods)**: ⭐ Pin top-priority tasks and organize workloads by terms, semesters, or custom project periods (e.g., `2569/1`).
- **Scalable List & Table Views**: Progressive batch rendering (`Show more` / collapsible Completed section) in **List View** and paginated bulk-action **Table View** built to stay smooth with 100–1,000+ tasks.

### 🔄 Daily Habits & Routines
- **Multi-Routine Presets**: Assign habits across one or multiple routines (`General`, `Exam Week`, `Vacation`, etc.) and switch active routines instantaneously.
- **Flexible Per-Day Schedules**: Support single daily time slots or multiple custom time slots per day of the week, visualized on both a **Daily Timeline** and a **Weekly Timetable Modal**.
- **Quantitative Target Goals**: Track fractional daily goals (e.g., `5 videos`, `20 pages`) with quick `+/-` counters, inline numeric input, and live completion progress bars.
- **Dual View Modes**: Switch between **Card/List View** (split into Today's Scheduled vs. Other Days) and **Table View** with search and multi-select deletion.

### 📊 Analytics & History
- **Contribution Heatmap**: GitHub-style activity heatmap showing consistency intensity across tracked history.
- **Editable Past History**: Click any past date on the heatmap or 7-day strip to set **Completed**, **Partial**, **Not Scheduled (Excused)**, or **Missed** without losing streak accuracy.
- **Consistency Tiers & Streaks**: Real-time streak calculation, fractional total completion scoring, and rank badges (`Building Habit`, `High Momentum`, `Master`).

### 🎨 Themes, Micro-Interactions & Backup
- **60–120 FPS UI Architecture**: Optimistic Firestore mutations, isolated Add/Edit modal states, `React.memo` + `O(1)` category/date-set lookups, `content-visibility: auto` list virtualization, idle/hover route chunk prefetching, and a GPU-composited stationary ambient canvas.
- **Tactile Polish & Multi-Theme Sound Engine**: GPU-accelerated **Click Spark Effect** on click/tap, singleton Web Audio API sound engine with capture-phase global click detection and distinct semantic sounds (tap, tab switch, subtask check, uncheck, completion chime, star sparkle, action pop, drag pickup/drop, delete, error) across 4 selectable sound themes (**Soft Bubble**, **Crisp Minimal**, **Playful Chime**, **Muted**) synced in Settings & JSON backups, skeleton shimmer loaders, hidden visual scrollbars, and adaptive toast notifications.
- **Standalone PWA Ready**: Installable as a fullscreen web app (`display: standalone`) on iPadOS/iOS Safari and Android Chrome with custom high-resolution PNG icons (`192×192`, `512×512`, maskable, and `180×180` Apple touch icon) and a lightweight network-first service worker.
- **Single-Viewport Auth Screen**: Split-panel Sign In / Sign Up showcase engineered to fit at 100% zoom across Desktop, iPad, and Mobile with Email/Password and Google Sign-In.
- **Live Theme & Font Customization**: Switch between **Gradient Theme** and **High-Contrast Solid Color Mode** with live preview & safe Cancel revert, plus curated Thai & English Google Fonts.
- **Full JSON Backup, Merge & Account Control**: Export v2.0 JSON backups (tasks, subtasks, deadlines, link chips, habits, categories, periods, routines, theme settings), restore via **Replace** or intelligent non-destructive **Merge** mode, reset individual modules, or permanently delete accounts with re-authentication (Email/Password & Google).

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript 5, Vite 5
- **Styling**: Tailwind CSS 3, Custom Glassmorphism & Solid Mode CSS
- **Backend & Database**: Firebase v10 (Authentication, Cloud Firestore)
- **Utilities**: `lucide-react`, `date-fns`, `html-to-image`

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v18+
- A **Firebase** project with **Authentication** (Email/Password & Google) and **Cloud Firestore** enabled

### 2. Installation
```bash
git clone https://github.com/SuvijakDow/task-and-habit-tracker.git
cd task_and_habit_tracker
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

### 4. Firestore Security Rules
Configure your Firestore Security Rules in Firebase Console:
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

### 5. Scripts
```bash
npm run dev         # Start local Vite dev server
npm run type-check  # Run TypeScript type checking (tsc --noEmit)
npm run build       # Type-check and build production bundle
npm run preview     # Preview production build locally
```

---

## 📁 Project Architecture

The codebase is organized cleanly by domain and architectural layer—separating UI components, pure domain utilities, constants, and Firebase service modules:

```
public/
├── manifest.webmanifest                # Standalone PWA manifest (iPad Safari & Android Chrome)
├── sw.js                               # Lightweight network-first service worker (production)
└── icons/                              # Real PNG icons (192x192, 512x512, maskable, apple-touch-icon)

src/
├── config/
│   └── firebase.ts                     # Firebase app, Auth & Firestore initialization
├── constants/
│   ├── calendar.ts                     # Weekday labels & harmonious Thai day-of-week palette
│   ├── colors.ts                       # Shared hex regex & pastel palettes for categories/habits
│   └── defaults.ts                     # Default category/preset names & weekday constants
├── context/
│   ├── AuthContext.tsx                 # Firebase Auth state & user profile synchronization
│   └── DataRefreshContext.tsx          # Cross-page refresh coordination
├── types/
│   └── index.ts                        # Shared domain interfaces (Task, DailyHabit, Category, etc.)
├── utils/
│   ├── audio.ts                        # Singleton Web Audio engine, 4 sound themes & semantic UI sounds
│   ├── categoryUtils.ts                # O(1) category map builder, display resolver & error mapping
│   ├── colorUtils.ts                   # Shared hex validation, rgba conversion & contrast helpers
│   ├── dateUtils.ts                    # Local date coercion, formatting & deadline status helpers
│   ├── fontUtils.ts                    # Curated Thai/English font registry & dynamic loader
│   ├── gradientUtils.ts                # Gradient vs. Solid color mode switcher
│   ├── habitSchedule.ts                # Pure habit time-slot, schedule formatting & sorting helpers
│   ├── habitStats.ts                   # Pure streak, consistency & fractional completion math
│   └── taskUtils.ts                    # Effective deadline sorting, subtask sorting & task filtering
├── services/
│   ├── accountService.ts               # Module resets & full Firestore user data cleanup
│   ├── authService.ts                  # Email/Password, Google Auth & re-authentication
│   ├── backupService.ts                # JSON backup export & Replace/Merge import engine
│   ├── categoryService.ts              # Category CRUD & safe task reassignment
│   ├── habitService.ts                 # Daily habit CRUD, completion & quantitative progress logs
│   ├── habitSetService.ts              # Routine preset (HabitSet) CRUD & deduplication
│   ├── taskPresetService.ts            # Task period (TaskPreset) CRUD & deduplication
│   ├── taskService.ts                  # Task CRUD, subtask normalization & date-aware duplication
│   └── userService.ts                  # User profile CRUD & avatar upload/normalization
├── components/
│   ├── ui/                             # Shared primitives (ConfirmDialog, Toast, ClickSparkEffect, GlobalSoundEffects, TimePickerInput)
│   ├── tasks/                          # TaskItem, TasksTable, TasksFilterBar, TaskSmartChip, SubtaskDateControl
│   │   └── calendar/                   # TaskCalendarModal, CalendarMonthView, CalendarDayInspector, CalendarWeekView, CalendarMonthYearPicker, CalendarDragOverlay, useCalendarDrag
│   ├── habits/                         # HabitCard, HabitFormModal, HabitsTable, HabitTimeline, ContributionHeatmap, RoutineSelectorDropdown
│   ├── analytics/                      # HabitAnalyticsCard
│   ├── settings/                       # SettingsModal, ProfileThemeTab, DataDangerZoneTab, ImportBackupDialog, DeleteAccountDialog
│   └── modals/                         # CategoriesModal, TaskFormModal, ManageTaskPresetsModal, ManageHabitSetsModal, WeeklyScheduleModal, EditHabitHistoryModal
├── pages/
│   ├── AuthPage.tsx                    # Split-panel authentication & top user header
│   ├── MainPage.tsx                    # Lazy-loaded tab router with idle/hover chunk prefetching
│   ├── TasksPage.tsx                   # Task Hub orchestrator with progressive rendering
│   ├── HabitsPage.tsx                  # Daily Habits orchestrator
│   └── AnalyticsPage.tsx               # Habit Analytics & Insights orchestrator
├── App.tsx
├── main.tsx
└── index.css                           # Global theme tokens, animations & Solid Color Mode overrides
```

---

## 📄 License

Distributed under the [MIT License](LICENSE).
