# Task & Habit Tracker

A minimalist Full-Stack web application designed to replace Google Keep. Built with React, Vite, Tailwind CSS, and Firebase.

## Features

- 📝 **Task Management** - Create, manage, and track homework and assignments
- 🎯 **Daily Habits** - Build and maintain recurring daily routines
- 🔐 **Secure Authentication** - Firebase Auth integration
- ☁️ **Cloud Storage** - Firestore for real-time data synchronization
- 🎨 **Beautiful UI** - Tailwind CSS for modern, responsive design
- ⚡ **Fast Development** - Vite for lightning-fast builds

## Project Structure

```
src/
├── components/       # React components
├── config/          # Firebase configuration
├── services/        # Database service functions (CRUD operations)
│   ├── authService.ts      # Authentication
│   ├── taskService.ts      # Task CRUD operations
│   └── habitService.ts     # Daily Habit CRUD operations
├── types/           # TypeScript interfaces
├── utils/           # Utility functions
│   ├── firebase.ts         # Firebase initialization
│   └── dateUtils.ts        # Date formatting utilities
├── App.tsx
├── main.tsx
└── index.css
```

## Collections Schema

### tasks Collection
```typescript
{
  id: string;
  userId: string;
  title: string;
  description: string;
  dueDate: Date | null;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### dailyHabits Collection
```typescript
{
  id: string;
  userId: string;
  title: string;
  completedDates: string[];  // Format: 'YYYY-MM-DD'
  createdAt: Date;
  updatedAt: Date;
}
```

## Setup Instructions

### 1. Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase project account

### 2. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a new project"
3. Enable Authentication (Email/Password method)
4. Enable Firestore Database (Production mode, but restrict with security rules)
5. Copy your Firebase configuration credentials

### 3. Configure Environment Variables
1. Update `.env.local` with your Firebase credentials:
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 6. Build for Production
```bash
npm run build
```

## Firebase Firestore Security Rules

Add these rules to protect your Firestore database:

```firestore rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /tasks/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
    
    match /dailyHabits/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
  }
}
```

## API Reference

### Authentication Service

```typescript
// Sign up
await signUp(email, password, displayName?)

// Sign in
await signIn(email, password)

// Sign out
await signOut()

// Subscribe to auth changes
const unsubscribe = subscribeToAuthState((user) => { ... })

// Get current user
getCurrentUser(): FirebaseUser | null
```

### Task Service

```typescript
// Create
const taskId = await createTask(userId, taskData)

// Read
const tasks = await getUserTasks(userId)
const task = await getTaskById(taskId)
const completed = await getCompletedTasks(userId)
const pending = await getPendingTasks(userId)

// Update
await updateTask(taskId, updates)
await toggleTaskCompletion(taskId, isCompleted)

// Delete
await deleteTask(taskId)
```

### Habit Service

```typescript
// Create
const habitId = await createDailyHabit(userId, habitData)

// Read
const habits = await getUserDailyHabits(userId)
const habit = await getDailyHabitById(habitId)

// Mark completion
await markHabitCompletedToday(habitId)
await unmarkHabitCompletedDate(habitId, dateString)
await isHabitCompletedOnDate(habitId, dateString)

// Statistics
const stats = await getHabitStats(habitId)

// Update & Delete
await updateDailyHabit(habitId, updates)
await deleteDailyHabit(habitId)
```

## Utility Functions

### Date Utilities
```typescript
// Format date to 'YYYY-MM-DD'
formatToDateString(date: Date): string

// Parse 'YYYY-MM-DD' to Date
parseToDate(dateString: string): Date

// Get today's date string
getTodayDateString(): string

// Get yesterday's date string
getYesterdayDateString(): string
```

## Next Steps

1. **Build Components**
   - Dashboard component
   - Task list & editor
   - Habit tracker UI
   - Auth forms (Login/Signup)

2. **State Management**
   - Create React Context for auth
   - Create Context for tasks
   - Create Context for habits

3. **Features**
   - Task filtering and search
   - Habit streak tracking
   - Due date notifications
   - Export/Import data

4. **Deployment**
   - Deploy to Firebase Hosting
   - Set up GitHub Actions for CI/CD

## License

MIT
