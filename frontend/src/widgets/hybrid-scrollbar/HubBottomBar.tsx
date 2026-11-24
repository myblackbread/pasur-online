'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface HubBottomBarProps {
  isVisible: boolean;
  currentMode: 'scroll' | 'hub' | 'control';
  icon: React.ReactNode;
  title: string;
}

export const HubBottomBar: React.FC<HubBottomBarProps> = ({
  isVisible,
  currentMode,
  icon,
  title,
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="hub-bottom-bar"
          initial={{ opacity: 0, y: 12, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28, mass: 0.8 }}
          // Строго по верхней границе safe-area без зазоров
          className="absolute bottom-[env(safe-area-inset-bottom,0px)] inset-x-0 flex justify-center items-center pointer-events-none z-40"
        >
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="flex items-center gap-2 pointer-events-none select-none max-w-[85vw]"
          >
            {/* Круг с иконкой (только в режиме scroll) */}
            <AnimatePresence initial={false}>
              {currentMode === 'scroll' && (
                <motion.div
                  key="hub-circle"
                  initial={{ opacity: 0, scale: 0.5, width: 0 }}
                  animate={{ opacity: 1, scale: 1, width: 'auto' }}
                  exit={{ opacity: 0, scale: 0.5, width: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                  className="overflow-hidden flex items-center justify-center shrink-0"
                >
                  <div className="w-9 h-9 rounded-full bg-neutral-900/85 backdrop-blur-2xl border border-white/15 text-white flex items-center justify-center shadow-2xl shadow-black/60">
                    <div className="scale-90">{icon}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Капсула с тайтлом */}
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="h-9 px-4 rounded-full bg-neutral-900/85 backdrop-blur-2xl border border-white/15 text-white flex items-center justify-center shadow-2xl shadow-black/60 min-w-0"
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={title}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16 }}
                  className="text-[13px] font-semibold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis text-neutral-100"
                >
                  {title}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};