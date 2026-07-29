# ⚡ Task & Habit Tracker

A modern, full-featured productivity web application for managing tasks by time periods, building daily routines, and tracking habits with rich visual analytics. Built with **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Firebase**.

![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.3-38B2AC?logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-10.7-FFCA28?logo=firebase&logoColor=black)

---

## ✨ Key Features & Capabilities

### 📝 Smart Task & Period Management
- **Task Periods (Presets)**: Group tasks by custom terms, semesters, or timeframes (e.g. *2569/1*, *Summer Break*, *Project A*). Easily switch active periods or manage them via the **Manage Task Periods** modal.
- **Subtasks Support**: Break down complex tasks into actionable checklists with live completion progress bars and quick toggles.
- **Smart Status Sorting**: 
  - **Pending Tasks**: Automatically sorted by nearest upcoming due date (overdue items highlighted first).
  - **Completed Tasks**: Sorted by completion history (least overdue items at the top).
- **Categories**: Color-coded custom task categories with task count tracking and fallback category reassignments.
- **View Modes**: Dynamic switching between **List View** and **Table View**.

### 🎯 Daily Habits & Multi-Routine Tracking
- **Multi-Routine Tagging**: Habits can belong to **multiple routines** simultaneously (e.g., *Morning Routine*, *Workouts*, *Semester 2568/2*).
- **Partial Progress Logging**: Set target values (e.g. read 10 pages) and log partial progress throughout the day.
- **Accurate Today % Formula**: Today's completion percentage incorporates exact partial progress ratios across all habits scheduled for today.
- **Smart Inactive Routine Filtering**: Deactivating one routine will not affect habit tracking or status in other active routines where the habit belongs.
- **Weekly Timetable Modal**: Visual daily schedule displaying habit time blocks across the week.
- **Drag-and-Drop Reordering**: Custom drag-and-drop ordering for daily habit lists.

### 📊 Analytics & Performance Insights
- **Contribution Heatmap**: GitHub-style activity matrix displaying daily completion frequency over time.
- **Total Completions & Decimal Precision**: Tracks aggregate completions in the Hero Banner and individual habit cards, supporting decimal precision (up to 2 decimal places) for partial goal progress.
- **Stable Routine Analytics**: Top Hero Banner stats (**HABITS**, **COMPLETIONS**, **CONSISTENCY**) remain stable across all habits in the selected Routine preset while search filtering habit cards in real time.
- **Consistency Scoring**: Calculates adherence percentage based on custom tracking start dates and scheduled days of the week.
- **Analytics Reset Options**: Flexibility to reset analytics for a single habit or all habits per user.

### 🎨 Graphic Design & Responsive Layouts
- **Custom Graphic Empty States**: Vibrant, celebratory empty state cards with custom glowing icon rings (e.g., *Free Day Ahead! ☀️*, *All caught up! 🎉*).
- **Adaptive Responsive Banner**: Glassmorphic Hero Dashboard Banners optimized across Mobile, Tablet, and Desktop screens.
- **Aesthetic UI**: Smooth gradients, glassmorphism cards, micro-animations, and modern typography (*Bai Jamjuree* & *Inter*).

### 🔐 Authentication & Security
- **Auth Options**: Email/Password Sign Up & Sign In, plus Google OAuth popup authentication.
- **Confirmation Modals**: Secure confirmation popups before Sign Out and Account Deletion.
- **Profile Customization**: Display name editing and client-side photo processing (auto-resized to 200x200 JPEG).

---

## 📁 Project Structure

```text
src/
├── components/                  # Reusable UI & Component modules
│   ├── habits/                      # Habit visualizations & views
│   │   ├── ContributionHeatmap.tsx      # GitHub-style activity matrix heatmap
│   │   ├── HabitTimeline.tsx            # Visual daily time block schedule
│   │   └── HabitsTable.tsx              # Interactive habit list & partial logging
│   ├── modals/                      # Modals & Dialog overlays
│   │   ├── CategoriesModal.tsx          # Task category manager & fallback reassignment
│   │   ├── ManageHabitSetsModal.tsx     # Routine manager modal
│   │   ├── ManageTaskPresetsModal.tsx   # Task period manager modal
│   │   ├── SettingsModal.tsx            # User profile & account security settings
│   │   └── WeeklyScheduleModal.tsx      # Weekly timetable overview modal
│   ├── tasks/                       # Task components
│   │   └── TasksTable.tsx               # Interactive task list & subtask checklist
│   └── ui/                          # Global UI helpers
│       ├── TimePickerInput.tsx          # Time selection popover input
│       └── Toast.tsx                    # Notification toast system
├── config/                      # Application Configurations
│   ├── firebase.config.ts           # Firebase credentials & API keys
│   └── firebase.ts                  # Firebase app & Firestore initialization
├── context/                     # React Context Providers
│   └── AuthContext.tsx              # Authentication state & user session context
├── pages/                       # Top-level Page Views
│   ├── AnalyticsPage.tsx            # Heatmap, streak & consistency analytics
│   ├── AuthPage.tsx                 # Glassmorphic Sign In / Sign Up page
│   ├── HabitsPage.tsx               # Daily habits & routine tracker page
│   ├── MainPage.tsx                 # App layout & top navigation container
│   └── TasksPage.tsx                # Task & period management page
├── services/                    # Firebase Firestore API Layer
│   ├── accountService.ts            # Account deletion & re-authentication
│   ├── authService.ts               # Email/Password & Google OAuth authentication
│   ├── categoryService.ts           # Task categories CRUD & reassignments
│   ├── habitService.ts              # Daily habits & routine sets CRUD
│   ├── taskPresetService.ts         # Task periods CRUD & auto-deduplication
│   ├── taskService.ts               # Tasks CRUD & subtasks state updates
│   └── userService.ts               # User profile & client photo processing
├── types/                       # Shared TypeScript Interfaces
│   └── index.ts                     # Data models (Tasks, Habits, Periods, Routines)
├── utils/                       # Utility Functions
│   ├── audio.ts                     # Sound effects generator
│   ├── dateUtils.ts                 # Date formatting & date-fns helpers
│   └── taskUtils.ts                 # Status-based task sorting logic
├── App.tsx                      # Root application router
├── main.tsx                     # Vite entry point
└── index.css                    # Tailwind CSS & global design system
```

---

## 🗄️ Firestore Database Schema

### `tasks`
```typescript
{
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: string;       // Category ID or name
  dueDate: Date | null;
  isCompleted: boolean;
  setId?: string;         // Task Period document ID
  subtasks?: {            // Subtasks array
    id: string;
    title: string;
    completed: boolean;
  }[];
  createdAt: Date;
  updatedAt: Date;
}
```

### `taskPresets` (Task Periods)
```typescript
{
  id: string;
  userId: string;
  name: string;           // e.g., '2569/1', 'Summer Break'
  color?: string;         // Hex color string
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### `dailyHabits`
```typescript
{
  id: string;
  userId: string;
  title: string;
  completedDates: string[]; // Format: 'YYYY-MM-DD'
  dailyProgress?: Record<string, number>; // 'YYYY-MM-DD': loggedValue
  targetValue?: number;     // e.g., 10 (pages/mins)
  targetUnit?: string;      // e.g., 'pages', 'mins'
  scheduledDays: number[];  // 0-6 (Sun-Sat)
  startTime: string;        // 'HH:MM'
  endTime: string;          // 'HH:MM'
  color?: string;           // Tag hex color
  setIds?: string[];        // Routine document IDs (multi-routine support)
  order?: number;           // Reordering index
  trackingStartDate?: Date; // Analytics baseline date
  createdAt: Date;
  updatedAt: Date;
}
```

### `habitSets` (Routines)
```typescript
{
  id: string;
  userId: string;
  name: string;           // e.g., 'Morning Routine', 'Workouts'
  color?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### `categories`
```typescript
{
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm** or **yarn**
- A **Firebase Project** with Authentication and Cloud Firestore enabled

### 2. Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SuvijakDow/task-and-habit-tracker.git
   cd task_and_habit_tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

5. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 🔒 Firebase Security Rules

Add the following security rules to your Firebase Console under **Firestore Database > Rules**:

```firestore rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tasks/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    match /taskPresets/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    match /dailyHabits/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    match /habitSets/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    match /categories/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 📄 License

This project is licensed under the **MIT License**.
