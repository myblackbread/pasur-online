import React from 'react';
import { GameRoom } from '@/types';
import { RoomPreview } from '@/features/lobby/components/modals/RoomPreview';

interface WaitingRoomViewProps {
    roomData: GameRoom;
    safeMyId: string;
    isJoining: boolean;
    onJoin: () => void;
    onLeave: () => void;
}

export function WaitingRoomView({ roomData, safeMyId, isJoining, onJoin, onLeave }: WaitingRoomViewProps) {
    return (
        <main className="fixed inset-0 w-full h-full flex flex-col bg-theme-main overflow-hidden safe-padding">
            <div className="flex-1 overflow-y-auto flex flex-col justify-center max-w-lg mx-auto w-full p-4 pt-8">
                {/* 🟢 Убрали border border-theme-border/50, добавили мягкую тень shadow-xl */}
                <div className="bg-theme-panel p-6 sm:p-8 rounded-[2rem] shadow-xl">
                    <RoomPreview 
                        room={roomData} 
                        safeMyId={safeMyId} 
                        isJoining={isJoining} 
                        onJoin={onJoin} 
                        onLeave={onLeave} 
                    />
                </div>
            </div>
        </main>
    );
}