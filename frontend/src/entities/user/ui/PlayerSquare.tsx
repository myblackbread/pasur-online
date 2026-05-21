export const PlayerSquare = ({ players, maxPlayers }: { players: any[], maxPlayers: number }) => {
    const isFour = maxPlayers === 4;
    const seats = Array.from({ length: maxPlayers });
    
    if (isFour) {
        return (
            <div className="w-full h-full rounded-xl overflow-hidden grid grid-cols-2 grid-rows-2 gap-[1px] bg-theme-border/40 shadow-sm">
                {seats.map((_, i) => {
                    const p = players[i];
                    return (
                        <div key={i} className={`flex items-center justify-center transition-colors ${p ? 'bg-theme-main text-theme-text' : 'bg-theme-panel/50 opacity-50'}`}>
                            {p ? <span className="text-[10px] sm:text-xs drop-shadow-sm leading-none">{p.avatarEmoji || '👤'}</span> : null}
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="w-full h-full rounded-xl overflow-hidden flex gap-[1px] bg-theme-border/40 shadow-sm relative">
            <div className={`relative flex-1 h-full overflow-hidden transition-colors ${players[0] ? 'bg-theme-main text-theme-text' : 'bg-theme-panel/50'}`}>
                {players[0] && (
                    <span className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 text-2xl sm:text-3xl drop-shadow-sm leading-none z-10">
                        {players[0].avatarEmoji || '👤'}
                    </span>
                )}
            </div>
            <div className={`relative flex-1 h-full overflow-hidden transition-colors ${players[1] ? 'bg-theme-main text-theme-text' : 'bg-theme-panel/50'}`}>
                {players[1] && (
                    <span className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 text-2xl sm:text-3xl drop-shadow-sm leading-none z-10">
                        {players[1].avatarEmoji || '👤'}
                    </span>
                )}
            </div>
        </div>
    );
};