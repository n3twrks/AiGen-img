'use client';

import Background from './components/Background';
import Sidebar from './components/Sidebar';
import ImageGenerator from './components/ImageGenerator';

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <Background />
      <Sidebar />
      <ImageGenerator />
    </main>
  );
}
