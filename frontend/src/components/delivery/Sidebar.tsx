"use client";

import { Home, Map, Wallet, User, Menu, X, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', icon: Home, path: '/delivery' },
    { name: 'Live Map', icon: Map, path: '/delivery/map' },
    { name: 'Earnings', icon: Wallet, path: '/delivery/earnings' },
    { name: 'Profile', icon: User, path: '/delivery/profile' },
  ];

  return (
    <>
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between bg-neutral-900 text-white p-4 sticky top-0 z-50">
         <div className="font-bold text-lg flex items-center gap-2">
            <span className="w-8 h-8 rounded bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">LF</span>
            Partner Portal
         </div>
         <button onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
         </button>
      </div>

      {/* Sidebar (Desktop + Mobile overlay) */}
      <div className={cn(
        "fixed md:sticky top-0 left-0 h-screen bg-neutral-900 border-r border-neutral-800 z-40 transition-transform duration-300 w-64 flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="hidden md:flex items-center gap-3 p-6 pt-8 text-white font-bold text-xl border-b border-neutral-800">
            <div className="w-10 h-10 rounded bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">LF</div>
            LogixFlow
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.name} 
                href={item.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                  isActive ? "bg-orange-500/10 text-orange-500" : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
                )}
              >
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="font-semibold text-sm">{item.name}</span>
                {isActive && (
                   <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-orange-500 rounded-r-full"></div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-neutral-800">
           <Link href="/delivery/register" className="flex items-center gap-4 px-4 py-3 rounded-xl text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 transition-colors text-sm font-semibold mb-2">
              Registration
           </Link>
           <button className="flex items-center w-full gap-4 px-4 py-3 rounded-xl text-neutral-400 hover:bg-red-500/10 hover:text-red-500 transition-colors text-sm font-semibold">
              <LogOut size={22} />
              Sign Out
           </button>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {isOpen && (
         <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsOpen(false)}></div>
      )}
    </>
  );
}
