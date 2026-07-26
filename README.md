# ⚡ Task & Habit Tracker

A modern, full-featured productivity web application for managing tasks, building recurring routines, and tracking habits with rich visual analytics. Built with **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Firebase**.

![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.3-38B2AC?logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-10.7-FFCA28?logo=firebase&logoColor=black)

---

## ✨ Features

### 📝 Smart Task Management
- **Task Presets**: Organize tasks into custom sets (e.g. *General*, *Work*, *Projects*). Easily switch active task presets.
- **Smart Status Sorting**: 
  - **Pending Tasks**: Sorted by nearest upcoming due date (overdue items highlighted first).
  - **Completed Tasks**: Sorted by completion history (least overdue items at top).
- **Categories**: Color-coded custom task categories with task count tracking and fallback category reassignments.
- **View Modes**: Dynamic switching between **List View** and **Table View**.
- **Inline Editing & Completion**: Quick actions for completion toggle, title, due date, category, and deletion.

### 🎯 Daily Habits & Routine Presets
- **Routine Presets (Habit Sets)**: Group daily habits into routines (e.g., *Morning Routine*, *Workouts*, *Nightly*).
- **Flexible Scheduling**: Select active days of the week (Sun-Sat) and time ranges (`HH:MM`).
- **Interactive Daily Timeline**: Visual daily schedule displaying habits by time blocks.
- **Drag-and-Drop Order**: Custom drag-drop reordering of habits.
- **Completion Tracking**: Streak counts that respect scheduled days (missing unscheduled days won't break your streak!).

### 📊 Analytics & Performance Insights
- **Contribution Heatmap**: GitHub-style activity matrix showing completion frequency over time.
- **Streak & Consistency**: Tracks current streak, longest streak, and consistency percentage based on tracking start date.
- **Past 7 Days View**: Quick visual indicators for weekly adherence.
- **Inactive Routine Logic**: Non-active routines are recognized as *Not Scheduled* on days they were inactive, maintaining accurate analytics history.
- **Analytics Reset**: Option to reset analytics for a single habit or all habits per user.

### 🔐 Authentication & Account Management
- **Auth Options**: Email/Password Sign Up & Sign In, plus Google OAuth popup authentication.
- **Centered & Sleek Sign-In Page**: Modern glassmorphism card layout perfectly centered on all mobile and desktop viewports.
- **Profile Customization**: Display name editing and profile photo upload (auto-processed client-side to 200x200 JPEG).
- **Account Deletion**: Secure account deletion requiring re-authentication and typing `"DELETE"` confirmation.

### 🎨 Design & User Experience
- **Unified Control Toolbar**: Seamless integration of view mode toggles (`List | Table`) and Preset selector inside a single, zero-gap control card.
- **Responsive Layout**: Designed mobile-first with sticky action footers and mobile bottom bar navigation.
- **Thai & English Typography**: Integrated Google Fonts (*Bai Jamjuree* & *Inter*).

---

## 📁 Project Structure

```text
src/
├── components/              # Reusable UI & Modal components
│   ├── CategoriesModal.tsx      # Task categories manager
│   ├── ContributionHeatmap.tsx  # GitHub-style completion heatmap
│   ├── HabitTimeline.tsx        # Daily visual time blocks
│   ├── HabitsTable.tsx          # Interactive habit list/table
│   ├── ManageHabitSetsModal.tsx # Routine presets manager
│   ├── ManageTaskPresetsModal.tsx # Task presets manager
│   ├── SettingsModal.tsx        # User profile & account settings
│   ├── TasksTable.tsx           # Interactive task list/table
│   ├── TimePickerInput.tsx      # Time selection popover
│   ├── Toast.tsx                # Notification toasts
│   └── WeeklyScheduleModal.tsx  # Day selection modal
├── context/                 # React Contexts
│   └── AuthContext.tsx          # Firebase Auth listener & state
├── pages/                   # Top-level Page Views
│   ├── AnalyticsPage.tsx        # Heatmap & consistency analytics
│   ├── AuthPage.tsx             # Centered Sign In / Sign Up page
│   ├── HabitsPage.tsx           # Daily habits management page
│   ├── MainPage.tsx             # Main layout & navigation container
│   └── TasksPage.tsx            # Task management page
├── services/                # Firebase Firestore Service Layer
│   ├── authService.ts           # Sign In, Sign Up, Google OAuth, Account Delete
│   ├── categoryService.ts       # Task categories CRUD & reassignments
│   ├── habitService.ts          # Daily habits & habit set presets CRUD
│   ├── taskPresetService.ts     # Task presets CRUD & auto-deduplication
│   ├── taskService.ts           # Tasks CRUD & status updates
│   └── userService.ts           # User profile & photo upload processing
├── types/                   # Shared TypeScript Interfaces
│   └── index.ts                 # Task, Habit, Preset, User types
├── utils/                   # Helper Utilities
│   ├── audio.ts                 # Sound effects
│   ├── dateUtils.ts             # Date formatting & date-fns helpers
│   ├── firebase.ts              # Firebase app initialization
│   └── taskUtils.ts             # Status-based task sorting logic
├── App.tsx                  # Root application router
├── main.tsx                 # Vite entry point
└── index.css                # Tailwind CSS & global styles
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
  setId?: string;         // TaskPreset document ID
  createdAt: Date;
  updatedAt: Date;
}
```

### `taskPresets`
```typescript
{
  id: string;
  userId: string;
  name: string;           // e.g., 'General', 'Work'
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
  scheduledDays: number[];  // 0-6 (Sun-Sat)
  startTime: string;        // 'HH:MM'
  endTime: string;          // 'HH:MM'
  color?: string;           // Tag hex color
  setId?: string;           // HabitSet document ID
  order?: number;           // Reordering index
  trackingStartDate?: Date; // Analytics baseline date
  createdAt: Date;
  updatedAt: Date;
}
```

### `habitSets`
```typescript
{
  id: string;
  userId: string;
  name: string;           // e.g., 'General', 'Morning Routine'
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

### `users`
```typescript
{
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  defaultTaskPresetId?: string;
  defaultHabitSetId?: string;
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
