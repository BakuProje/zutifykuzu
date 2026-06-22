'use client';

import Image from 'next/image';
import { Globe, Instagram, Coffee, CheckCircle2 } from 'lucide-react';

const DiscordIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white">
    <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.33-.35-.76-.53-1.09A.08.08 0 0 0 9 4c-1.5.26-2.94.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06-.01.08-.04l.75-.98c-.46-.17-.9-.37-1.31-.6a.09.09 0 0 1-.01-.13l.36-.27c.01-.01.03-.02.05-.01 2.81 1.28 5.84 1.28 8.61 0 .02-.01.04 0 .05.01l.36.27c.04.03.04.09 0 .13-.41.23-.85.43-1.31.6l.75.98c.02.03.05.05.08.04 1.71-.53 3.44-1.33 5.24-2.65.02-.01.03-.03.03-.05.41-4.52-.7-8.35-3.1-11.95-.01-.01-.02-.02-.03-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z" />
  </svg>
);

const TiktokIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.2c0 1.25-.33 2.54-1.05 3.59-1.41 1.96-3.8 2.87-6.14 2.37-2.34-.48-4.25-2.28-4.9-4.57-.65-2.29.07-4.8 1.83-6.28 1.75-1.48 4.29-1.82 6.38-.85V13.6c-1.14-.4-2.45-.19-3.37.58-.93.78-1.37 2.08-.99 3.22.37 1.14 1.48 1.93 2.66 1.93 1.19-.01 2.25-.85 2.51-2.02.09-.43.09-.88.09-1.32V.02z" />
  </svg>
);
import { motion } from 'motion/react';

export default function DeveloperPage() {
  return (
    <motion.main 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen pb-24 flex flex-col items-center justify-center"
    >
      <div className="px-6 w-full max-w-lg">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center space-y-6"
        >
          {/* Blob Avatar */}
          <div className="relative w-48 h-48 mb-2">
            <div className="absolute inset-0 bg-[#7F1D1D] rounded-[40%_60%_70%_30%_/_40%_50%_60%_50%] animate-[blob_8s_ease-in-out_infinite] scale-110" />
            <div className="absolute inset-0 bg-[#991B1B] rounded-[60%_40%_30%_70%_/_50%_60%_40%_50%] animate-[blob_8s_ease-in-out_infinite_reverse] scale-105" />
            <div className="relative w-full h-full rounded-[50%_50%_40%_60%_/_60%_40%_50%_50%] overflow-hidden border-2 border-[#FA243C]/20 z-10">
              <Image
                src="/logo.png"
                alt="ZUTIFY"
                fill
                sizes="192px"
                className="object-contain p-4"
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <h2 className="text-2xl font-bold text-white">ZUTIFY</h2>
          </div>

          <p className="text-white/60 text-sm leading-relaxed max-w-sm mb-6">
            Platform streaming musik modern gratis tanpa iklan. Nikmati jutaan lagu, buat daftar putar Anda sendiri, dan temukan musik baru setiap hari dengan kualitas audio premium tanpa batasan.
          </p>

          {/* Social Links Grid */}
          <div className="grid grid-cols-4 gap-3 w-full max-w-sm mb-4">
            <a href="https://kuzuroken.site" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-2 bg-[#1C1C1E] hover:bg-[#2C2C2E] p-4 rounded-2xl transition-colors">
              <Globe className="w-6 h-6 text-white" />
              <span className="text-[10px] text-white/70 font-medium">Website</span>
            </a>
            <a href="https://discord.gg/s8myK3smZK" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-2 bg-[#1C1C1E] hover:bg-[#2C2C2E] p-4 rounded-2xl transition-colors">
              <DiscordIcon />
              <span className="text-[10px] text-white/70 font-medium">Discord</span>
            </a>
            <a href="https://www.tiktok.com/@kuzuroken" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-2 bg-[#1C1C1E] hover:bg-[#2C2C2E] p-4 rounded-2xl transition-colors">
              <TiktokIcon />
              <span className="text-[10px] text-white/70 font-medium">TikTok</span>
            </a>
            <a href="https://www.tiktok.com/@kuzuroken" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-2 bg-[#1C1C1E] hover:bg-[#2C2C2E] p-4 rounded-2xl transition-colors">
              <Instagram className="w-6 h-6 text-white" />
              <span className="text-[10px] text-white/70 font-medium">Instagram</span>
            </a>
          </div>

          {/* Buy me a coffee */}
          <a
            href="https://saweria.co/kuzuroken"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full max-w-sm flex items-center gap-4 bg-[#1C1C1E] hover:bg-[#2C2C2E] p-5 rounded-3xl transition-colors mb-8"
          >
            <div className="w-12 h-12 rounded-full bg-[#7F1D1D] flex items-center justify-center shrink-0">
              <Coffee className="w-6 h-6 text-[#FA243C]" />
            </div>
            <div className="text-left">
              <div className="text-white font-medium">Like what I do?</div>
              <div className="text-white/50 text-sm">Buy me a coffee</div>
            </div>
          </a>

        </motion.div>
      </div>

      <style jsx global>{`
        @keyframes blob {
          0%, 100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
          34% { border-radius: 70% 30% 50% 50% / 30% 30% 70% 70%; }
          67% { border-radius: 100% 60% 60% 100% / 100% 100% 60% 60%; }
        }
      `}</style>
    </motion.main>
  );
}
