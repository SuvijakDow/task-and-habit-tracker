# Task & Habit Tracker

A comprehensive productivity application designed to help users manage tasks and build lasting habits. Built with React, TypeScript, Vite, Tailwind CSS, and Firebase.

![Version](https://img.shields.io/badge/version-0.0.1-blue)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-3178C6)
![Tailwind](https://img.shields.io/badge/Tailwind-3.3.0-38B2AC)

## ✨ Features

### 📝 Task Management
- Create, edit, and delete tasks with rich descriptions
- Organize tasks with color-coded categories
- Set due dates and track completion status
- Filter tasks by category and completion state
- Responsive task table with inline editing

### 🎯 Daily Habits
- Build and maintain recurring daily routines
- Schedule habits for specific days of the week
- Set time ranges for habit execution
- Track completion with visual indicators
- Habit timeline view for daily overview
- Drag-and-drop reordering support
- Habit streak and consistency tracking

### 📊 Analytics & Insights
- Contribution heatmap showing habit completion over time
- Streak tracking for consecutive completions
- Consistency percentage calculations
- Past 7 days completion status
- Year-by-year analytics view
- Reset individual or all habit analytics

### 🎨 Categories & Organization
- Custom color-coded categories
- Default categories (Academic, Personal, Health)
- Category management with task reassignment
- Pastel color palette for visual appeal

### 🔐 Authentication & User Profiles
- Email/password authentication
- Google OAuth integration
- User profile management
- Custom avatar support (DiceBear avatars)
- Profile photo upload with auto-resizing
- Secure Firestore data isolation per user

### 🎨 User Interface
- Modern, responsive design with Tailwind CSS
- Mobile-first approach with bottom navigation
- Smooth animations and transitions
- Toast notifications for user feedback
- Modal dialogs for complex interactions
- Thai font support (Bai Jamjuree)

### ⚡ Performance & Developer Experience
- Vite for lightning-fast development
- Code splitting for optimal bundle size
- TypeScript for type safety
- Lazy loading of route components
- Firebase Firestore for real-time sync

## 🏗️ Project Structure

```
src/
├── components/              # Reusable React components
│   ├── CategoriesModal.tsx      # Category management modal
│   ├── ContributionHeatmap.tsx  # GitHub-style contribution heatmap
│   ├── HabitTimeline.tsx        # Daily habit timeline view
│   ├── HabitsTable.tsx          # Habits data table
│   ├── ManageHabitSetsModal.tsx # Habit set management
│   ├── SettingsModal.tsx        # User settings modal
│   ├── TasksTable.tsx           # Tasks data table
│   ├── TimePickerInput.tsx      # Time input component
│   ├── Toast.tsx                # Toast notifications
│   ├── WeeklyScheduleModal.tsx  # Weekly schedule picker
│   ├── habits/                  # Habit-specific components
│   └── tasks/                   # Task-specific components
├── config/                 # Configuration files
├── context/                # React Context providers
│   └── AuthContext.tsx         # Authentication context
├── pages/                  # Page components
│   ├── AnalyticsPage.tsx       # Analytics dashboard
│   ├── AuthPage.tsx            # Authentication page
│   ├── CategoriesPage.tsx      # Category management page
│   ├── HabitsPage.tsx          # Habits management page
│   ├── MainPage.tsx            # Main navigation page
│   └── TasksPage.tsx           # Tasks management page
├── services/               # Firebase service layer
│   ├── authService.ts          # Authentication operations
│   ├── categoryService.ts      # Category CRUD operations
│   ├── habitService.ts         # Habit CRUD & analytics
│   ├── taskService.ts          # Task CRUD operations
│   └── userService.ts          # User profile operations
├── types/                  # TypeScript type definitions
│   └── index.ts                # Shared interfaces
├── utils/                  # Utility functions
│   ├── audio.ts                # Sound effects
│   ├── dateUtils.ts            # Date formatting helpers
│   └── firebase.ts             # Firebase initialization
├── App.tsx                # Root component
├── main.tsx               # Application entry point
└── index.css              # Global styles
```

## 📊 Firestore Collections Schema

### tasks Collection
```typescript
{
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;          // Category document ID
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
  completedDates: string[];      // Format: 'YYYY-MM-DD'
  scheduledDays: number[];       // 0-6 (Sun-Sat)
  startTime: string;             // HH:MM format
  endTime: string;               // HH:MM format
  color?: string;                // Hex color string
  setId?: string;                // HabitSet document ID
  order?: number;                // For drag-drop reordering
  trackingStartDate?: Date;     // Analytics reset date
  createdAt: Date;
  updatedAt: Date;
}
```

### habitSets Collection
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

### categories Collection
```typescript
{
  id: string;
  userId: string;
  name: string;
  color: string;            // Hex color code
  createdAt: Date;
  updatedAt: Date;
}
```

### taskPresets Collection
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

### users Collection
```typescript
{
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;         // Base64 or URL
  createdAt: Date;
  updatedAt: Date;
}
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase project account

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd task_and_habit_tracker
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable **Authentication** (Email/Password and Google providers)
   - Enable **Firestore Database** (Start in test mode, then add security rules)
   - Copy your Firebase configuration credentials

4. **Configure Environment Variables**
   Create a `.env.local` file in the root directory:
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

5. **Run Development Server**
```bash
npm run dev
```
The app will be available at `http://localhost:5173`

6. **Build for Production**
```bash
npm run build
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 🔒 Firebase Firestore Security Rules

Add these rules to protect your Firestore database in the Firebase Console:

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

    match /habitSets/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }

    match /categories/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }

    match /taskPresets/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }

    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      allow create: if request.auth.uid == userId;
    }
  }
}
```

## 🛠️ Tech Stack

### Frontend
- **React 18.2.0** - UI library
- **TypeScript 5.2.2** - Type safety
- **Vite 5.0.0** - Build tool and dev server
- **Tailwind CSS 3.3.0** - Utility-first CSS framework
- **Lucide React 1.8.0** - Icon library
- **date-fns 3.0.0** - Date manipulation
- **html-to-image 1.11.13** - Image generation

### Backend
- **Firebase 10.7.0** - Backend-as-a-Service
  - Authentication (Email/Password, Google OAuth)
  - Firestore Database (Real-time NoSQL)
  - User profile management

### Development Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

## 📚 API Reference

### Authentication Service (`authService.ts`)

```typescript
// Sign up with email and password
await signUp(email: string, password: string, displayName?: string)

// Sign in with email and password
await signIn(email: string, password: string)

// Sign in with Google
await signInWithGoogle()

// Sign out
await signOut()

// Subscribe to auth state changes
const unsubscribe = subscribeToAuthState((user) => { ... })

// Get current user
getCurrentUser(): FirebaseUser | null
```

### Task Service (`taskService.ts`)

```typescript
// Create a new task
const taskId = await createTask(userId, taskData)

// Get all tasks for a user
const tasks = await getUserTasks(userId)

// Get a single task by ID
const task = await getTaskById(taskId)

// Update a task
await updateTask(taskId, updates)

// Delete a task
await deleteTask(taskId)
```

### Habit Service (`habitService.ts`)

```typescript
// Habit Set Operations
const habitSets = await getUserHabitSets(userId)
const habitSet = await createHabitSet(userId, setData)
await setActiveHabitSet(userId, targetSetId)
await updateHabitSet(setId, updates)
await deleteHabitSet(setId, userId)

// Daily Habit Operations
const habitId = await createDailyHabit(userId, habitData)
const habits = await getUserDailyHabits(userId)
const habit = await getDailyHabitById(habitId)
await updateDailyHabit(habitId, updates)
await deleteDailyHabit(habitId)

// Completion Tracking
await markHabitCompletedToday(habitId)
await unmarkHabitCompletedDate(habitId, dateString)
const isCompleted = await isHabitCompletedOnDate(habitId, dateString)

// Analytics
const stats = await getHabitStats(habitId)
const streak = calculateStreak(completedDates, scheduledDays)
const consistency = calculateConsistency(completedDates, scheduledDays, startDate)
const past7Days = getPast7DaysStatus(completedDates)

// Reset
await resetHabitData(habitId)
await resetAllHabitsAnalytics(userId)

// Utilities
const color = getHabitColorHex(habit, habits)
const rgba = hexToRgba(hex, alpha)
const overlaps = calculateHabitOverlaps(habits)
```

### Category Service (`categoryService.ts`)

```typescript
// Create a category
const category = await createCategory(userId, { name, color })

// Get all categories for a user
const categories = await getUserCategories(userId)

// Ensure default categories exist
await ensureDefaultCategories(userId)

// Update a category
await updateCategory(userId, { categoryId, previousName, name, color })

// Delete category and reassign tasks
await deleteCategoryAndReassignTasks(userId, { categoryId, categoryName, fallbackCategoryId })
```

### User Service (`userService.ts`)

```typescript
// Get user profile
const profile = await getUserProfile(uid)

// Create user profile
const profile = await createUserProfile(uid, { email, displayName, photoURL })

// Update user profile
await updateUserProfile(uid, { displayName, photoURL })

// Upload and process profile photo
const photoURL = await uploadProfilePhoto(uid, file)

// Ensure user profile exists (called on auth)
const profile = await ensureUserProfile(firebaseUser)
```

### Date Utilities (`dateUtils.ts`)

```typescript
// Format date to 'YYYY-MM-DD'
formatToDateString(date: Date): string

// Get today's date string
getTodayDateString(): string
```

### Audio Utilities (`audio.ts`)

```typescript
// Play success sound effect
playSuccessSound(): void
```

## 🎨 Key Components

### ContributionHeatmap
GitHub-style contribution heatmap showing habit completion over time with year filtering.

### HabitTimeline
Visual timeline view of habits scheduled for the current day with time-based positioning.

### HabitsTable
Data table for managing habits with inline editing, completion toggling, and drag-drop reordering.

### TasksTable
Data table for managing tasks with category filtering, due date tracking, and completion status.

### WeeklyScheduleModal
Modal for selecting which days of the week a habit should be scheduled.

### ManageHabitSetsModal
Modal for creating, editing, and managing habit sets (routine presets).

### CategoriesModal
Modal for managing task categories with color customization.

### SettingsModal
User settings modal for profile management and preferences.

## 🔑 Key Features Explained

### Habit Sets (Routine Presets)
Habit Sets allow users to create different routine presets (e.g., "Morning Routine", "Work Routine", "Weekend Routine"). Each set can contain multiple habits, and users can switch between active sets to focus on different routines.

### Streak Calculation
The streak calculation respects scheduled days - if a habit is only scheduled on weekdays, missing a weekend won't break the streak. Only missed scheduled days reset the counter.

### Consistency Tracking
Consistency is calculated as the percentage of completed scheduled days since the habit's creation (or tracking start date). This provides a more accurate measure of habit adherence than simple completion counts.

### Category System
Categories support both ID-based and legacy name-based references for backward compatibility. The service automatically normalizes and migrates legacy data when categories are updated.

### Profile Photo Handling
Profile photos are processed client-side to 200×200 JPEG format and stored as base64 in Firestore, avoiding Firebase Storage CORS issues and simplifying the architecture.

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or feedback, please open an issue on the repository.
