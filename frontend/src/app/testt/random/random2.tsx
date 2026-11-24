import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, type Variants, type Transition } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';

// MARK: - Типизация
export interface CapsuleActionItem {
  id: string;
  icon: LucideIcon | React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

export interface VerticalCapsuleProps {
  items?: CapsuleActionItem[];
  collapsedSize?: number;
  buttonSize?: number;
  gap?: number;
  paddingY?: number;
  className?: string;
  onStateChange?: (isExpanded: boolean) => void;
}

type CapsulePhase = 
  | 'collapsed'     // точка-индикатор
  | 'expanding'     // капсула растет
  | 'expanded'      // кнопки выпадают лесенкой
  | 'hiding-items'  // кнопки прячутся обратно
  | 'collapsing';   // капсула сжимается в точку

// MARK: - Конфигурация анимаций
const springTransition: Transition = {
  type: 'spring',
  stiffness: 280,
  damping: 25,
  mass: 0.85,
};

const listVariants: Variants = {
  idle: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
  runCascade: {
    transition: {
      delayChildren: 0.02,
      staggerChildren: 0.045,
    },
  },
};

const itemVariants: Variants = {
  idle: {
    opacity: 0,
    y: -20,
    scale: 0.6,
    transition: {
      duration: 0.12,
      ease: 'easeIn',
    },
  },
  runCascade: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 340,
      damping: 22,
      mass: 0.7,
    },
  },
};

// MARK: - Компонент капсулы
export const VerticalCapsule: React.FC<VerticalCapsuleProps> = ({
  items = [],
  collapsedSize = 44,
  buttonSize = 36,
  gap = 10,
  paddingY = 10,
  className = '',
  onStateChange,
}) => {
  const [phase, setPhase] = useState<CapsulePhase>('collapsed');

  const itemsCount = items?.length ?? 0;

  // Динамический расчёт высоты под произвольное количество кнопок
  const expandedHeight = useMemo(() => {
    if (itemsCount === 0) return collapsedSize;
    return itemsCount * buttonSize + (itemsCount - 1) * gap + paddingY * 2;
  }, [itemsCount, buttonSize, gap, paddingY, collapsedSize]);

  const expandedWidth = buttonSize + 18;

  const capsuleVariants: Variants = useMemo(
    () => ({
      collapsed: {
        width: collapsedSize,
        height: collapsedSize,
        borderRadius: collapsedSize / 2,
        paddingTop: 0,
        paddingBottom: 0,
      },
      expanded: {
        width: expandedWidth,
        height: expandedHeight,
        borderRadius: expandedWidth / 2,
        paddingTop: paddingY,
        paddingBottom: paddingY,
      },
    }),
    [collapsedSize, expandedWidth, expandedHeight, paddingY]
  );

  const isCapsuleExpanded = 
    phase === 'expanding' || 
    phase === 'expanded' || 
    phase === 'hiding-items';

  const areButtonsVisible = phase === 'expanded';

  const handleToggle = () => {
    if (itemsCount === 0) return;

    if (phase === 'collapsed') {
      setPhase('expanding');
      onStateChange?.(true);
    } else if (phase === 'expanded') {
      setPhase('hiding-items');
      onStateChange?.(false);
    }
  };

  const handleCapsuleAnimationComplete = (definition: string) => {
    if (definition === 'expanded' && phase === 'expanding') {
      setPhase('expanded');
    } else if (definition === 'collapsed' && phase === 'collapsing') {
      setPhase('collapsed');
    }
  };

  const handleListAnimationComplete = (definition: string) => {
    if (definition === 'idle' && phase === 'hiding-items') {
      setPhase('collapsing');
    }
  };

  return (
    <motion.div
      variants={capsuleVariants}
      initial="collapsed"
      animate={isCapsuleExpanded ? 'expanded' : 'collapsed'}
      transition={springTransition}
      onAnimationComplete={(def) => handleCapsuleAnimationComplete(def as string)}
      onClick={handleToggle}
      className={`
        pointer-events-auto cursor-pointer relative
        flex flex-col items-center justify-center
        bg-white/80 dark:bg-neutral-900/80 
        backdrop-blur-xl border border-white/20 dark:border-white/10
        shadow-2xl shadow-black/15
        overflow-hidden select-none
        ${className}
      `}
      style={{
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        willChange: 'width, height, border-radius',
      }}
    >
      {/* Индикатор-точка в свернутом виде */}
      <AnimatePresence>
        {phase === 'collapsed' && (
          <motion.div
            key="dot"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute w-2.5 h-2.5 rounded-full bg-neutral-400 dark:bg-neutral-500"
          />
        )}
      </AnimatePresence>

      {/* Выпадающий список кнопок */}
      <motion.div
        variants={listVariants}
        initial="idle"
        animate={areButtonsVisible ? 'runCascade' : 'idle'}
        onAnimationComplete={(def) => handleListAnimationComplete(def as string)}
        style={{ gap: `${gap}px` }}
        className="flex flex-col items-center justify-center h-full w-full pointer-events-none"
      >
        {items?.map(({ id, icon: Icon, label, onClick, disabled }) => (
          <motion.div
            key={id}
            variants={itemVariants}
            className="flex items-center justify-center"
          >
            <button
              type="button"
              aria-label={label}
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              style={{
                width: `${buttonSize}px`,
                height: `${buttonSize}px`,
              }}
              className="
                rounded-full 
                flex items-center justify-center 
                text-neutral-800 dark:text-neutral-100 
                bg-neutral-200/50 dark:bg-neutral-800/60
                active:scale-90 transition-transform
                disabled:opacity-40 disabled:pointer-events-none
                pointer-events-auto
              "
            >
              <Icon size={Math.round(buttonSize * 0.5)} strokeWidth={2.2} />
            </button>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};