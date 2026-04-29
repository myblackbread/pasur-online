import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const db = admin.firestore();

// 🟢 В идеале здесь должен быть массив UID админов.
// const ADMIN_UIDS = ["ТВОЙ_UID_АДМИНА"];

export const adminDeleteUser = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Требуется авторизация");
    
    // Проверка прав (пока отключена для тестов)
    // if (!ADMIN_UIDS.includes(request.auth.uid)) {
    //    throw new HttpsError("permission-denied", "Нет прав администратора");
    // }

    const { uidToKill } = request.data;
    if (!uidToKill) throw new HttpsError("invalid-argument", "Не указан UID");
    
    await db.collection("users").doc(uidToKill).update({ isDeleted: true });

    const batch = db.batch();
    const roomsSnap = await db.collection("rooms").get();

    for (const roomDoc of roomsSnap.docs) {
        const room = roomDoc.data();
        const secretDoc = await db.collection("room_secrets").doc(roomDoc.id).get();
        const secrets = secretDoc.data() || { realUids: {} };

        const killedPublicUid = Object.keys(secrets.realUids).find(key => secrets.realUids[key] === uidToKill);

        if (killedPublicUid && room.players) {
            if (room.status === 'playing' || room.status === 'paused' || room.status === 'ready_check_resume') {
                const innocentPlayer = room.players.find((p: any) => p.id !== killedPublicUid);
                if (innocentPlayer) {
                    const innocentRealId = secrets.realUids[innocentPlayer.id];
                    const pot = room.betAmount * room.maxPlayers;

                    if (innocentRealId) {
                        batch.update(db.collection("users").doc(innocentRealId), {
                            balance: FieldValue.increment(pot),
                            activeRooms: FieldValue.arrayRemove(roomDoc.id)
                        });
                    }

                    // 🟢 ФИКС: Указываем ID невинного игрока в начале
                    batch.update(roomDoc.ref, {
                        status: 'waiting',
                        players: [{ ...innocentPlayer, isReady: false }],
                        gameState: null,
                        turnDeadline: null,
                        pauseProposals: [],
                        adminMessage: `${innocentPlayer.id}|Модератор удалил вашего противника. Банк стола зачислен вам.|${Date.now()}`
                    });

                    const newSecrets: any = {};
                    newSecrets[innocentPlayer.id] = innocentRealId;
                    batch.set(secretDoc.ref, { realUids: newSecrets });
                }
            } else {
                const remainingPlayers = room.players.filter((p: any) => p.id !== killedPublicUid);
                if (remainingPlayers.length === 0) {
                    batch.delete(roomDoc.ref);
                    batch.delete(secretDoc.ref);
                } else {
                    batch.update(roomDoc.ref, { players: remainingPlayers });
                    delete secrets.realUids[killedPublicUid];
                    batch.set(secretDoc.ref, { realUids: secrets.realUids });
                }
            }
        }
    }

    await batch.commit();
    return { success: true };
});