'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { ImageIcon, LibraryIcon, HeartIcon, Settings } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const navigation = [
    { name: 'Image Generator', href: '/app', icon: ImageIcon },
    { name: 'Library', href: '/library', icon: LibraryIcon },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen flex-col justify-between bg-gray-900 text-white w-64 p-4">
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold">ColorIA</h1>
        </div>

        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div>
      {user && (
            <p className="text-sm text-gray-400 mt-2">
              {user.email}
            </p>
          )}
        <button
          onClick={() => signOut()}
          className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-colors"
        >
          Log out
        </button>
      </div>
    </div>
  );
} 