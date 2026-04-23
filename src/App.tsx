import { AuthProvider } from '@/context/AuthContext';
import AuthPage from '@/pages/AuthPage';

export function App() {
  return (
    <AuthProvider>
      <AuthPage />
    </AuthProvider>
  );
}

export default App;
