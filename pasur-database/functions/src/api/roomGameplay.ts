import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { PasurGame } from "../game/PasurGame";
import { createShuffledDeck } from "../game/deck";

const db = admin.firestore();

export const secureProposePause = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required");
    const { roomId } = request.data;
    const uid = request.auth.uid;

    await db.runTransaction(async (t) => {
        const roomRef = db.collection("rooms").doc(roomId);
        const secretDoc = await t.get(db.collection("room_secrets").doc(roomId));
        const roomDoc = await t.get(roomRef);

        if (!roomDoc.exists) throw new HttpsError("not-found", "Room not found");
        const secrets = secretDoc.data() || { realUids: {} };
        const publicUid = Object.keys(secrets.realUids).find(key => secrets.realUids[key] === uid);
        if (!publicUid) throw new HttpsError("permission-denied", "Вы не за столом");

        const roomData = roomDoc.data()!;
        if (!roomData.gameState?.isRoundOver) throw new HttpsError("failed-precondition", "Пауза возможна только между раундами");

        const proposals = roomData.pauseProposals || [];
        if (!proposals.includes(publicUid)) proposals.push(publicUid);

        if (proposals.length === roomData.maxPlayers) {
            t.update(roomRef, { status: 'paused', pauseProposals: [], turnDeadline: null });
        } else {
            t.update(roomRef, { pauseProposals: proposals });
        }
    });
    return { success: true };
});

export const securePlayCard = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required");
    const { roomId, cardId, targetCardIds = [] } = request.data;
    const uid = request.auth.uid;

    await db.runTransaction(async (t) => {
        const roomRef = db.collection("rooms").doc(roomId);
        const secretDoc = await t.get(db.collection("room_secrets").doc(roomId));
        const roomDoc = await t.get(roomRef);

        if (!roomDoc.exists) throw new HttpsError("not-found", "Room not found");
        const roomData = roomDoc.data()!;
        const secrets = secretDoc.data() || { realUids: {} };
        const publicUid = Object.keys(secrets.realUids).find(key => secrets.realUids[key] === uid);
        if (!publicUid) throw new HttpsError("permission-denied", "Вы не за столом");

        const game = new PasurGame(roomData.players.map((p: any) => p.id), roomData.ruleSet, true);
        Object.assign(game, roomData.gameState);

        game.playCard(publicUid, cardId, targetCardIds);

        if (game.isMatchOver && game.matchWinnerTeamId !== null) {
            const pot = roomData.betAmount * roomData.maxPlayers;
            const winners = game.players.filter(p => p.teamId === game.matchWinnerTeamId);
            const winPerPlayer = pot / winners.length;

            Object.values(secrets.realUids).forEach(realId => {
                if (typeof realId === 'string') {
                    t.set(db.collection("users").doc(realId), { activeRooms: FieldValue.arrayRemove(roomId) }, { merge: true });
                }
            });

            winners.forEach(w => {
                const realId = secrets.realUids[w.id];
                if (realId) t.set(db.collection("users").doc(realId), { balance: FieldValue.increment(winPerPlayer) }, { merge: true });
            });

            t.update(roomRef, { status: 'finished', gameState: JSON.parse(JSON.stringify(game)), turnDeadline: null, pauseProposals: [] });
            t.delete(secretDoc.ref);
        } else {
            t.update(roomRef, { gameState: JSON.parse(JSON.stringify(game)), turnDeadline: Date.now() + 3600000 });
        }
    });
    return { success: true };
});

export const secureLeaveRoom = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required");
    const { roomId, reason } = request.data;
    const uid = request.auth.uid;

    await db.runTransaction(async (t) => {
        const roomRef = db.collection("rooms").doc(roomId);
        const secretRef = db.collection("room_secrets").doc(roomId);
        const roomDoc = await t.get(roomRef);
        const secretDoc = await t.get(secretRef);
        if (!roomDoc.exists) return;

        const data = roomDoc.data()!;
        const secrets = secretDoc.data() || { realUids: {} };
        const callerPublicUid = Object.keys(secrets.realUids).find(k => secrets.realUids[k] === uid);
        if (!callerPublicUid) throw new HttpsError("permission-denied", "Вы не за столом");

        if (data.status === 'ready_check') throw new HttpsError("failed-precondition", "Идет проверка готовности. Выход заблокирован.");

        if (data.status === 'playing' || data.status === 'paused' || data.status === 'ready_check_resume') {
            let loserPublicId: string;

            if (reason === 'timeout') {
                if (data.status !== 'playing') throw new HttpsError("failed-precondition", "Нельзя забрать по таймауту на паузе.");

                // 🟢 ИСПРАВЛЕНИЕ: Сначала проверяем реальное серверное время!
                if (Date.now() < (data.turnDeadline || 0)) {
                    throw new HttpsError("failed-precondition", "Время еще не вышло!");
                }

                const activePlayerIndex = data.gameState.currentTurnIndex;
                loserPublicId = data.players[activePlayerIndex].id;

                // 🟢 Если время вышло, только тогда смотрим, не кикает ли игрок сам себя
                if (loserPublicId === callerPublicUid) {
                    throw new HttpsError("failed-precondition", "Нельзя выгнать самого себя");
                }
            } else {
                loserPublicId = callerPublicUid;
            }

            const game = new PasurGame(data.players.map((p: any) => p.id), data.ruleSet, true);
            if (data.gameState) Object.assign(game, data.gameState);

            const losingPlayer = game.players.find(p => p.id === loserPublicId);
            const winningTeamId = losingPlayer?.teamId === 0 ? 1 : 0;
            const winners = game.players.filter(p => p.teamId === winningTeamId);
            const pot = data.betAmount * data.maxPlayers;
            const winPerPlayer = pot / winners.length;

            const newRealUids: any = {};
            const newPlayers: any[] = [];

            // 🟢 КРИТИЧЕСКИЙ ФИКС: Убираем стол у лузера, ориентируясь на его ID, а не на вызывающего!
            const loserRealId = secrets.realUids[loserPublicId];
            if (loserRealId) {
                t.set(db.collection("users").doc(loserRealId), { activeRooms: FieldValue.arrayRemove(roomId) }, { merge: true });
            }

            winners.forEach(w => {
                const realId = secrets.realUids[w.id];
                if (realId) {
                    t.set(db.collection("users").doc(realId), { balance: FieldValue.increment(winPerPlayer) }, { merge: true });
                    newRealUids[w.id] = realId;
                    const pData = data.players.find((p: any) => p.id === w.id);
                    if (pData) newPlayers.push({ ...pData, isReady: false });
                }
            });

            t.set(secretRef, { realUids: newRealUids });
            const msg = reason === 'timeout' ? "Оппонент исключен за бездействие!" : "Оппонент сдался (вышел)!";

            t.update(roomRef, {
                status: 'waiting', players: newPlayers, gameState: null, turnDeadline: null, pauseProposals: [],
                adminMessage: `${winners[0].id}|${msg} Банк ваш!|${Math.random().toString(36).substring(2, 8)}`
            });

        } else if (data.status === 'waiting') {
            t.set(db.collection("users").doc(uid), {
                balance: FieldValue.increment(data.betAmount),
                activeRooms: FieldValue.arrayRemove(roomId)
            }, { merge: true });

            const remainingPlayers = data.players.filter((p: any) => p.id !== callerPublicUid);
            delete secrets.realUids[callerPublicUid];

            if (remainingPlayers.length === 0) {
                t.delete(roomRef); t.delete(secretRef);
            } else {
                t.set(secretRef, { realUids: secrets.realUids });
                t.update(roomRef, { players: remainingPlayers });
            }
        }
    });
    return { success: true };
});

export const secureNextRound = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required");
    const { roomId } = request.data;
    const uid = request.auth.uid;

    await db.runTransaction(async (t) => {
        const roomRef = db.collection("rooms").doc(roomId);
        const roomDoc = await t.get(roomRef);
        const secretDoc = await t.get(db.collection("room_secrets").doc(roomId));

        if (!roomDoc.exists) return;
        const secrets = secretDoc.data() || { realUids: {} };
        if (!Object.values(secrets.realUids).includes(uid)) throw new HttpsError("permission-denied", "Зрители не могут раздавать карты");

        const roomData = roomDoc.data()!;
        const game = new PasurGame(roomData.players.map((p: any) => p.id), roomData.ruleSet, true);
        Object.assign(game, roomData.gameState);

        if (!game.isRoundOver) throw new HttpsError("failed-precondition", "Раунд еще не окончен!");

        game.startNewRound(createShuffledDeck(game.roundNumber));
        t.update(roomRef, { gameState: JSON.parse(JSON.stringify(game)), turnDeadline: Date.now() + 3600000, pauseProposals: [] });
    });
    return { success: true };
});

export const secureGetMyMask = onCall(async (request) => {
    if (!request.auth) return { mask: null };
    const { roomId } = request.data;
    const secretDoc = await db.collection("room_secrets").doc(roomId).get();
    if (!secretDoc.exists) return { mask: null };
    const secrets = secretDoc.data() || { realUids: {} };
    const publicUid = Object.keys(secrets.realUids).find(key => secrets.realUids[key] === request.auth?.uid);
    return { mask: publicUid || null };
});

export const secureSendReaction = onCall(async (request) => {
    return { success: true };
});