import BottomNav from '@/components/ui/BottomNav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen max-h-screen overflow-hidden">
      <main className="flex-1 overflow-hidden pb-14">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
