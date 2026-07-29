import { AuthProvider } from '@/context/AuthContext';
import AuthPage from '@/pages/AuthPage';
import { ToastContainer } from '@/components/ui/Toast';

export function App() {
  return (
    <AuthProvider>
      <AuthPage />
      <ToastContainer />
    </AuthProvider>
  );
}

export default App;
