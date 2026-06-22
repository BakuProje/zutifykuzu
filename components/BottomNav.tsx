'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHasMounted } from '@/hooks/useHasMounted';
import { motion } from 'motion/react';

export function BottomNav() {
  const pathname = usePathname();
  const hasMounted = useHasMounted();

  if (!hasMounted) return null;

  const navItems = [
    { name: 'Beranda', href: '/', icon: Home },
    { name: 'Mencari', href: '/search', icon: Search },
    { name: 'Pustaka', href: '/library', icon: Library },
    { name: 'Zutify', href: '/developer', icon: null },
  ];

  return (
    <div className="fixed bottom-0 md:bottom-6 left-0 md:left-1/2 right-0 md:right-auto md:-translate-x-1/2 z-50 w-full md:w-[420px] bg-[#050505]/95 backdrop-blur-md border-t md:border border-white/10 px-4 md:px-6 pt-2.5 md:pt-2 pb-6 md:pb-2 rounded-none md:rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.5)]">
      <div className="w-full flex justify-around items-center h-14">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={true}
              className="flex flex-col items-center justify-center flex-1 transition-all duration-200 outline-none"
            >
              {/* Icon Wrapper Pill */}
              <div className="relative w-16 h-8 flex items-center justify-center mb-1">
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="absolute inset-0 bg-[#FA243C] rounded-full shadow-lg shadow-[#FA243C]/20"
                  />
                )}
                <span className={cn(
                  "relative z-10 transition-colors duration-300",
                  isActive ? "text-white" : "text-white/50 hover:text-white"
                )}>
                  {item.icon ? (
                    <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  ) : (
                    <img src="/zutify.png" className="w-5 h-5 object-contain" alt="ZUTIFY" />
                  )}
                </span>
              </div>
              {/* Label Text */}
              <span className={cn(
                "text-[10px] font-bold tracking-wide transition-colors duration-300",
                isActive ? "text-white" : "text-white/40"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

