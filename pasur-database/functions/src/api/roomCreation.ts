import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const db = admin.firestore();

export const devAddMoney = onCall(async (request) => {
    if (process.env.FUNCTIONS_EMULATOR !== "true") throw new HttpsError("permission-denied", "Dev only.");
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required");
    await db.collection("users").doc(request.auth.uid).set({ balance: FieldValue.increment(500) }, { merge: true });
    return { success: true };
});

export const secureCreateRoom = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Требуется авторизация");
    const { betAmount, ruleSet, isPrivate, maxPlayers = 2 } = request.data;
    const uid = request.auth.uid;
    
    const userRef = db.collection("users").doc(uid);
    const roomRef = db.collection("rooms").doc();
    const secretRef = db.collection("room_secrets").doc(roomRef.id);

    let publicUid = uid;

    await db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (!userDoc.exists || (userDoc.data()?.balance ?? 0) < betAmount) throw new HttpsError("failed-precondition", "Недостаточно средств");

        const userData = userDoc.data()!;
        const shouldHide = !isPrivate && userData.settings?.isIncognito;
        publicUid = shouldHide ? `anon_${Math.random().toString(36).substring(2, 12)}` : uid;

        t.set(userRef, { 
            balance: userData.balance - betAmount,
            activeRooms: FieldValue.arrayUnion(roomRef.id) // 🟢 Вносим в активные игры
        }, { merge: true });
        
        t.set(secretRef, { realUids: { [publicUid]: uid } }); 
        t.set(roomRef, {
            players: [{ id: publicUid, name: shouldHide ? "Неизвестный игрок" : userData.displayName, isReady: false }],
            maxPlayers, betAmount, ruleSet, status: 'waiting', createdAt: Date.now(),
            isPrivate: !!isPrivate, joinCode: isPrivate ? Math.random().toString(36).substring(2, 8).toUpperCase() : null
        });
    });
    return { success: true, roomId: roomRef.id, publicUid };
});