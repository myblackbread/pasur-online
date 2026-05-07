import React, { memo, ReactNode } from 'react';

export interface HybridScrollScreenProps {
  children?: ReactNode;
  bg?: string;
  className?: string;
  id?: string;
}

export const HybridScrollScreen = memo(({ 
  children, 
  bg = 'bg-zinc-900', 
  className = '',
  id
}: HybridScrollScreenProps) => (
  <div 
    id={id}
    className={`h-screen w-full snap-start flex flex-col relative ${bg} ${className}`}
    style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 100vh' }}
  >
    {children}
  </div>
));

HybridScrollScreen.displayName = 'HybridScrollScreen';