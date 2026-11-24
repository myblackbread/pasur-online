import { GameApiAction } from "./actions.ts";
import { CreateRoomPayload, SearchRoomsFilters } from "../dto/requests.ts";
import { 
    SuccessResponse, 
    RoomEntryResponse, 
    SearchRoomsResponse, 
    GetGameStateResponse, 
    GetMyMaskResponse 
} from "../dto/responses.ts";

export interface GameApiContracts extends Record<GameApiAction, { request: any; response: any }> {
    secureCompleteOnboarding: {
        request: { gender: 'male' | 'female'; displayName: string; avatarEmoji?: string };
        response: SuccessResponse;
    };
    secureExtendOnboarding: {
        request: Record<string, never>; // Ничего не принимает
        response: SuccessResponse;
    };
    devAddMoney: {
        request: Record<string, never>; // Пустой объект
        response: SuccessResponse;
    };
    secureCreateRoom: {
        request: CreateRoomPayload;
        response: RoomEntryResponse;
    };
    secureJoinRoom: {
        request: { roomId: string; joinCode?: string };
        response: RoomEntryResponse;
    };
    secureToggleReady: {
        request: { roomId: string; isReady: boolean };
        response: SuccessResponse;
    };
    secureSearchRooms: {
        request: SearchRoomsFilters;
        response: SearchRoomsResponse;
    };
    secureReturnToLobby: {
        request: { roomId: string };
        response: SuccessResponse;
    };
    secureResolveReadyTimeout: {
        request: { roomId: string };
        response: SuccessResponse;
    };
    securePlayCard: {
        request: { roomId: string; cardId: string; targetCardIds?: string[] };
        response: SuccessResponse;
    };
    secureLeaveRoom: {
        request: { roomId: string };
        response: SuccessResponse;
    };
    reportAfk: {
        request: { roomId: string };
        response: SuccessResponse;
    };
    secureGetMyMask: {
        request: { roomId: string };
        response: GetMyMaskResponse;
    };
    secureSendReaction: {
        request: { roomId: string };
        response: SuccessResponse;
    };
    secureGetGameState: {
        request: { roomId: string };
        response: GetGameStateResponse;
    };
    adminDeleteUser: {
        request: { uidToKill: string };
        response: SuccessResponse;
    };
    runGlobalCleanup: {
        request: Record<string, never>;
        response: SuccessResponse;
    };
}