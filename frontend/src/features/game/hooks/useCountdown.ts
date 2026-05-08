import { useState, useEffect } from 'react';

export function useCountdown(deadline: number | null | undefined) {
    const [timeLeft, setTimeLeft] = useState(0);
    
    useEffect(() => {
        if (!deadline) { setTimeLeft(0); return; }
        const update = () => setTimeLeft(Math.max(0, Math.floor((deadline - Date.now()) / 1000)));
        update();
        
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [deadline]);
    
    return timeLeft;
}