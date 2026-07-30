import { AuthProvider } from '@/context/AuthContext';
import { DataRefreshProvider } from '@/context/DataRefreshContext';
import AuthPage from '@/pages/AuthPage';
import { ToastContainer } from '@/components/ui/Toast';

export function App() {
  return (
    <AuthProvider>
      <DataRefreshProvider>
        <AuthPage />
        <ToastContainer />
      </DataRefreshProvider>
    </AuthProvider>
  );
}

export default App;
