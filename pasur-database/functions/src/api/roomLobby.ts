import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { PasurGame } from "../game/PasurGame";

const db = admin.firestore();

export const secureJoinRoom = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Требуется авторизация");
    const { roomId } = request.data;
    const uid = request.auth.uid;

    const roomRef = db.collection("rooms").doc(roomId);
    const secretRef = db.collection("room_secrets").doc(roomId);
    const userRef = db.collection("users").doc(uid);

    let publicUid = uid;

    await db.runTransaction(async (t) => {
        const roomDoc = await t.get(roomRef);
        const secretDoc = await t.get(secretRef);
        const userDoc = await t.get(userRef);

        if (!roomDoc.exists) throw new HttpsError("not-found", "Стол не найден");
        const roomData = roomDoc.data()!;
        const secrets = secretDoc.data() || { realUids: {} };

        if (Object.values(secrets.realUids).includes(uid)) {
            publicUid = Object.keys(secrets.realUids).find(key => secrets.realUids[key] === uid)!;
            if (roomData.status === 'ready_check' || roomData.status === 'waiting' || roomData.status === 'ready_check_resume') {
                const targetStatus = roomData.status === 'ready_check_resume' ? 'paused' : 'waiting';
                const resetPlayers = roomData.players.map((p: any) => ({ ...p, isReady: false }));
                t.update(roomRef, { players: resetPlayers, status: targetStatus, readyDeadline: null });
            }
            return;
        }

        if (roomData.status !== 'waiting') throw new HttpsError("failed-precondition", "Игра уже идет");
        if (roomData.players.length >= roomData.maxPlayers) throw new HttpsError("failed-precondition", "Стол заполнен");
        if ((userDoc.data()?.balance ?? 0) < roomData.betAmount) throw new HttpsError("failed-precondition", "Недостаточно средств");

        const userData = userDoc.data()!;
        const shouldHide = !roomData.isPrivate && userData.settings?.isIncognito;
        publicUid = shouldHide ? `anon_${Math.random().toString(36).substring(2, 12)}` : uid;

        t.set(userRef, { 
            balance: userData.balance - roomData.betAmount,
            activeRooms: FieldValue.arrayUnion(roomId)
        }, { merge: true });
        
        secrets.realUids[publicUid] = uid;
        t.set(secretRef, { realUids: secrets.realUids }, { merge: true });

        const updatedPlayers = [...roomData.players, { id: publicUid, name: shouldHide ? "Неизвестный" : userData.displayName, isReady: false }];
        t.update(roomRef, { players: updatedPlayers });
    });

    return { success: true, roomId, publicUid };
});

export const secureToggleReady = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required");
    const { roomId, isReady } = request.data;
    const uid = request.auth.uid;

    await db.runTransaction(async (t) => {
        const roomRef = db.collection("rooms").doc(roomId);
        const roomDoc = await t.get(roomRef);
        const secretDoc = await t.get(db.collection("room_secrets").doc(roomId));
        if (!roomDoc.exists) return;

        const roomData = roomDoc.data()!;
        if (roomData.status === 'playing') return;

        const secrets = secretDoc.data() || { realUids: {} };
        const publicUid = Object.keys(secrets.realUids).find(key => secrets.realUids[key] === uid);
        if (!publicUid) throw new HttpsError("permission-denied", "Вы не за столом");

        const updatedPlayers = roomData.players.map((p: any) => p.id === publicUid ? { ...p, isReady } : p);
        const allReady = updatedPlayers.every((p: any) => p.isReady);

        if (allReady) {
            if (roomData.status === 'ready_check_resume') {
                const game = new PasurGame(updatedPlayers.map((p: any) => p.id), roomData.ruleSet, true);
                Object.assign(game, roomData.gameState);
                game.startNewRound(require('../game/deck').createShuffledDeck(game.roundNumber));
                
                t.update(roomRef, {
                    players: updatedPlayers, status: 'playing', readyDeadline: null,
                    gameState: JSON.parse(JSON.stringify(game)), turnDeadline: Date.now() + 3600000,
                    adminMessage: `ALL|Игра возобновлена!|${Date.now()}` // 🟢 ФИКС
                });
            } else {
                const game = new PasurGame(updatedPlayers.map((p: any) => p.id), roomData.ruleSet);
                t.update(roomRef, {
                    players: updatedPlayers, status: 'playing', readyDeadline: null,
                    gameState: JSON.parse(JSON.stringify(game)), turnDeadline: Date.now() + 3600000,
                    adminMessage: `ALL|Игра началась!|${Date.now()}` // 🟢 ФИКС
                });
            }
        } else if (roomData.status === 'waiting') {
            t.update(roomRef, { players: updatedPlayers, status: 'ready_check', readyDeadline: Date.now() + 15000 });
        } else if (roomData.status === 'paused') {
            t.update(roomRef, { players: updatedPlayers, status: 'ready_check_resume', readyDeadline: Date.now() + 15000 });
        } else {
            t.update(roomRef, { players: updatedPlayers });
        }
    });
    return { success: true };
});

export const secureResolveReadyTimeout = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required");
    const { roomId } = request.data;

    await db.runTransaction(async (t) => {
        const roomRef = db.collection("rooms").doc(roomId);
        const secretRef = db.collection("room_secrets").doc(roomId);
        const roomDoc = await t.get(roomRef);
        const secretDoc = await t.get(secretRef);
        if (!roomDoc.exists) return;

        const data = roomDoc.data()!;
        if (data.status !== 'ready_check' && data.status !== 'ready_check_resume') return;
        if (!data.readyDeadline || Date.now() < data.readyDeadline) return;

        const secrets = secretDoc.data() || { realUids: {} };

        if (data.status === 'ready_check_resume') {
            const resetPlayers = data.players.map((p: any) => ({ ...p, isReady: false }));
            t.update(roomRef, { status: 'paused', players: resetPlayers, readyDeadline: null });
        } else {
            const newRealUids: any = {};
            const remainingPlayers: any[] = [];
            const kickedNames: string[] = []; // Для алерта
            
            data.players.forEach((p: any) => {
                const realId = secrets.realUids[p.id];
                if (p.isReady) {
                    remainingPlayers.push({ ...p, isReady: false });
                    if (realId) newRealUids[p.id] = realId;
                } else if (realId) {
                    kickedNames.push(p.name);
                    t.set(db.collection("users").doc(realId), { 
                        balance: FieldValue.increment(data.betAmount),
                        activeRooms: FieldValue.arrayRemove(roomId)
                    }, { merge: true });
                }
            });

            if (remainingPlayers.length === 0) {
                t.delete(roomRef); t.delete(secretRef);
            } else {
                t.set(secretRef, { realUids: newRealUids });
                t.update(roomRef, { 
                    status: 'waiting', 
                    players: remainingPlayers, 
                    readyDeadline: null,
                    adminMessage: `ALL|${kickedNames.join(", ")} исключен(ы) за неподтверждение.|${Math.random().toString(36).substring(2, 6)}` // 🟢 ФИКС
                });
            }
        }
    });
    return { success: true };
});