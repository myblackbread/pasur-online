import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();

export { devAddMoney, secureCreateRoom } from "./api/roomCreation";
export { secureJoinRoom, secureToggleReady, secureResolveReadyTimeout } from "./api/roomLobby";
export { secureProposePause, securePlayCard, secureLeaveRoom, secureNextRound, secureGetMyMask, secureSendReaction } from "./api/roomGameplay";
export { adminDeleteUser } from "./api/admin";

export const pingTest = require("firebase-functions/v2/https").onCall(() => {
    return { message: "Cloud Functions Modular Architecture works! 🚀" };
});