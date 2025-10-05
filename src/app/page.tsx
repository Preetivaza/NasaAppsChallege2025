import { AppProvider } from '@/context/AppContext';
import AppLayoutLoader from '@/components/AppLayoutLoader';

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <AppProvider>
        <AppLayoutLoader />
      </AppProvider>
    </main>
  );
}
