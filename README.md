# Task & Habit Tracker

A modern, full-featured productivity web application for managing tasks by time periods, building daily routines, and tracking habits with rich visual analytics. Built with React 18, TypeScript, Vite, Tailwind CSS, and Firebase.

![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.3-38B2AC?logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-10.7-FFCA28?logo=firebase&logoColor=black)

## Features

### Task Management
- **Task Periods (Presets)**: Group tasks by custom terms, semesters, or timeframes (e.g., "2569/1", "Summer Break", "Project A")
- **Subtasks Support**: Break down complex tasks into actionable checklists with live completion progress
- **Smart Sorting**: Pending tasks sorted by due date, completed tasks sorted by completion history
- **Categories**: Color-coded task categories with automatic fallback reassignment
- **View Modes**: Switch between List View and Table View

### Habit Tracking
- **Multi-Routine Tagging**: Habits can belong to multiple routines simultaneously
- **Partial Progress Logging**: Set target values (e.g., read 10 pages) and log partial progress
- **Weekly Timetable**: Visual daily schedule displaying habit time blocks across the week
- **Drag-and-Drop Reordering**: Custom ordering for daily habit lists

### Analytics
- **Contribution Heatmap**: GitHub-style activity matrix for daily completion tracking
- **Consistency Scoring**: Calculates adherence based on custom tracking start dates
- **Stable Analytics**: Stats remain stable across routine presets while filtering
- **Decimal Precision**: Supports partial goal progress with up to 2 decimal places

### Data Management
- **Backup & Restore**: Export/import data as JSON with Replace or Merge modes
- **Module Reset**: Reset tasks or habits independently without deleting account
- **Account Deletion**: Secure account deletion with display name confirmation

### User Experience
- **Custom Fonts**: Multiple Thai and English font options (Bai Jamjuree, Sarabun, Prompt, Kanit, Pridi, Chakra Petch, Mitr, Krub, Inter, Outfit)
- **Profile Customization**: Display name editing and avatar selection
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Glassmorphic UI**: Modern aesthetic with smooth gradients and animations

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Authentication, Cloud Firestore)
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── habits/         # Habit-related components
│   ├── modals/         # Modal dialogs
│   ├── tasks/          # Task-related components
│   └── ui/             # Global UI components
├── config/             # Firebase configuration
├── context/            # React Context providers
├── constants/          # Application constants
├── hooks/              # Custom React hooks
├── pages/              # Page components
├── services/           # Firebase service layer
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── App.tsx             # Root component
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## Getting Started

### Prerequisites
- Node.js v18.0.0 or higher
- npm or yarn
- Firebase project with Authentication and Firestore enabled

### Installation

1. Clone the repository:
```bash
git clone https://github.com/SuvijakDow/task-and-habit-tracker.git
cd task_and_habit_tracker
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env.local` file in the root directory:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

4. Start development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

## Database Schema

### Tasks
```typescript
{
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: string;
  dueDate: Date | null;
  isCompleted: boolean;
  setId?: string;
  subtasks?: Subtask[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Task Presets (Periods)
```typescript
{
  id: string;
  userId: string;
  name: string;
  color?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Daily Habits
```typescript
{
  id: string;
  userId: string;
  title: string;
  completedDates: string[];
  dailyProgress?: Record<string, number>;
  targetValue?: number;
  targetUnit?: string;
  scheduledDays: number[];
  startTime: string;
  endTime: string;
  color?: string;
  setIds?: string[];
  order?: number;
  trackingStartDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Habit Sets (Routines)
```typescript
{
  id: string;
  userId: string;
  name: string;
  color?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Categories
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

## Firebase Security Rules

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

## License

MIT License
