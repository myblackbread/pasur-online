import React from 'react';

interface InscribedZoneProps {
    children: React.ReactNode;
    className?: string;
    align?: 'center' | 'left' | 'right';
}

export function InscribedZone({ children, className = '', align = 'center' }: InscribedZoneProps) {
    // Геометрически идеальная вписанная зона (Inscribed Rectangle)
    // Высота = H * sqrt(0.5) ≈ 70.71%
    // Ширина = W - H * (1 - sqrt(0.5)) ≈ 100% ширины - 29.29% высоты
    
    const alignmentClass = 
        align === 'left' ? 'justify-start' : 
        align === 'right' ? 'justify-end' : 'justify-center';

    return (
        <div className="absolute inset-0 pointer-events-none" style={{ containerType: 'size' }}>
            <div 
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center pointer-events-auto ${alignmentClass} ${className}`}
                style={{
                    height: '70.71cqh',
                    width: 'calc(100cqw - 29.29cqh)'
                }}
            >
                {children}
            </div>
        </div>
    );
}