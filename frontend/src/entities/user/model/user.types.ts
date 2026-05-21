export interface UserProfile {
    uid: string;
    displayName: string;
    balance: number;
    createdAt: number;
    lastActive: number;
    avatarEmoji?: string;
    isDeleted?: boolean; 
    gender: 'male' | 'female';
    activeRooms?: string[];
    settings?: {
        isIncognito?: boolean;
        blockedUids?: string[];
    };
}