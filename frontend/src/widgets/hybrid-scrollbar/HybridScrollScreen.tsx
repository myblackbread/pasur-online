import React from 'react';

export interface HybridScrollScreenProps {
  children?: React.ReactNode;
  bg?: string;
  className?: string;
  id?: string;
}

export const HybridScrollScreen = React.memo(({
  children,
  bg = 'bg-theme-main',
  className = '',
  id
}: HybridScrollScreenProps) => (
  <div 
    id={id}
    className={`min-h-full w-full flex flex-col relative ${bg} ${className}`}
  >
    {children}
  </div>
));

HybridScrollScreen.displayName = 'HybridScrollScreen';