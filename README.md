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
- **Task Periods (ช่วงเวลา / ภาคเรียน)**: Group tasks by custom terms, semesters, or timeframes (e.g. *2569/1*, *Summer Break*, *Project A*). Easily switch active periods or manage them via the **Manage Task Periods** modal.
- **Subtasks Support**: Break down complex tasks into actionable subtasks with live completion progress bars and quick toggles.
- **Smart Status Sorting**: 
  - **Pending Tasks**: Automatically sorted by nearest upcoming due date (overdue items highlighted first).
  - **Completed Tasks**: Sorted by completion history (least overdue items at top).
- **Categories**: Color-coded custom task categories with task count tracking and fallback category reassignments.
- **View Modes**: Dynamic switching between **List View** and **Table View**.
- **One-Click Clear Inputs**: Integrated instant clear buttons (`X`) on search inputs across all tables.

### 🎯 Daily Habits & Routines
- **Routines (รูทีน / กิจวัตร)**: Group daily habits into dedicated routines (e.g., *Morning Routine*, *Nightly Habits*, *Workouts*).
- **Flexible Scheduling**: Select active days of the week (Sun–Sat) and set custom time ranges (`HH:MM`).
- **Weekly Timetable Modal**: Visual daily schedule displaying habit time blocks across the week.
- **Drag-and-Drop Reordering**: Custom drag-drop order for daily habit lists.
- **Streak & Adherence Tracking**: Streak counts respect scheduled days (missing unscheduled days won't break your streak!).

### 📊 Analytics & Performance Insights
- **Contribution Heatmap**: GitHub-style activity matrix displaying daily completion frequency over time.
- **Streak & Consistency Metrics**: Tracks total active streaks, longest streaks, and overall consistency percentage based on tracking start dates.
- **Past 7 Days Adherence**: Instant visual status indicators for recent adherence.
- **Inactive Routine Filtering**: Non-active routines are recognized as *Not Scheduled* on days they were inactive, ensuring historical analytics precision.
- **Analytics Reset Options**: Flexibility to reset analytics for a single habit or all habits per user.

### 🎨 Responsive Design & Hero Dashboard Banners
- **Adaptive Desktop & Tablet Layouts**:
  - **Desktop (1280px+)**: Sleek 1-row Hero Dashboard Banner featuring greeting text on the left, an expanded center stats box, and action buttons on the right.
  - **Mobile & Tablet (< 1280px)**: Balanced 2-row layout with top-right aligned action buttons and a 100% full-width stats bar, preventing text truncation or awkward gaps.
- **Glassmorphic UI**: Vibrant gradient palettes, subtle micro-animations, glassmorphism cards, and Google Fonts (*Bai Jamjuree* & *Inter*).

### 🔐 Authentication & Profile Management
- **Auth Options**: Email/Password Sign Up & Sign In, plus Google OAuth popup authentication.
- **Centered Glassmorphism Sign-In Page**: Modern, responsive authentication layout.
- **Profile Customization**: Display name editing and client-side photo processing (auto-resized to 200x200 JPEG).
- **Account Deletion**: Secure account deletion requiring re-authentication and typing `"DELETE"` confirmation.

---

## 📁 Project Structure

```text
src/
├── components/              # Reusable UI & Modal components
│   ├── CategoriesModal.tsx      # Task categories manager
│   ├── ContributionHeatmap.tsx  # GitHub-style completion heatmap
│   ├── HabitTimeline.tsx        # Daily visual time blocks
│   ├── HabitsTable.tsx          # Interactive habit list/table
│   ├── ManageHabitSetsModal.tsx # Routine manager modal
│   ├── ManageTaskPresetsModal.tsx # Task period manager modal
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
│   ├── habitService.ts          # Daily habits & routine sets CRUD
│   ├── taskPresetService.ts     # Task periods CRUD & auto-deduplication
│   ├── taskService.ts           # Tasks CRUD & subtasks status updates
│   └── userService.ts           # User profile & photo upload processing
├── types/                   # Shared TypeScript Interfaces
│   └── index.ts                 # Task, Habit, Period, Routine, User types
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
  scheduledDays: number[];  // 0-6 (Sun-Sat)
  startTime: string;        // 'HH:MM'
  endTime: string;          // 'HH:MM'
  color?: string;           // Tag hex color
  setId?: string;           // Routine document ID
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
