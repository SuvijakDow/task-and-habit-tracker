import { AuthProvider } from '@/context/AuthContext';
import { DataRefreshProvider } from '@/context/DataRefreshContext';
import AuthPage from '@/pages/AuthPage';
import { ToastContainer } from '@/components/ui/Toast';
import { ClickSparkEffect } from '@/components/ui/ClickSparkEffect';
import { GlobalSoundEffects } from '@/components/ui/GlobalSoundEffects';

export function App() {
  return (
    <AuthProvider>
      <DataRefreshProvider>
        <AuthPage />
        <ToastContainer />
        <ClickSparkEffect />
        <GlobalSoundEffects />
      </DataRefreshProvider>
    </AuthProvider>
  );
}

export default App;
