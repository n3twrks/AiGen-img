import Sidebar from '@/app/components/Sidebar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden"> {/* h-screen + overflow-hidden pour éviter le scroll */}
      <Sidebar />
      <main className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
        {children}
      </main>
    </div>
  );
}