/**
 * IndexedDB хранилище для локальных приватных ключей устройства и сессионных Sender Keys.
 * Ни один приватный ключ отсюда никогда не отправляется в сеть.
 */

const DB_NAME = "game_app_crypto_store";
const DB_VERSION = 1;

interface StoredDeviceIdentity {
  id: string; // 'current_device'
  deviceId: string;
  identityId: string;
  registrationId: number;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicKeyBase64: string;
}

interface StoredSenderKey {
  id: string; // `${groupId}:${senderIdentityId}`
  groupId: string;
  senderIdentityId: string;
  rawKey: CryptoKey;
  createdAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported"));
    }

    const req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("device_identity")) {
        db.createObjectStore("device_identity", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("sender_keys")) {
        db.createObjectStore("sender_keys", { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const cryptoStore = {
  async getDeviceIdentity(): Promise<StoredDeviceIdentity | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("device_identity", "readonly");
      const store = tx.objectStore("device_identity");
      const req = store.get("current_device");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async saveDeviceIdentity(data: Omit<StoredDeviceIdentity, "id">): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("device_identity", "readwrite");
      const store = tx.objectStore("device_identity");
      const req = store.put({ id: "current_device", ...data });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async getSenderKey(groupId: string, senderIdentityId: string): Promise<CryptoKey | null> {
    const db = await openDatabase();
    const id = `${groupId}:${senderIdentityId}`;
    return new Promise((resolve, reject) => {
      const tx = db.transaction("sender_keys", "readonly");
      const store = tx.objectStore("sender_keys");
      const req = store.get(id);
      req.onsuccess = () => {
        const row = req.result as StoredSenderKey | undefined;
        resolve(row?.rawKey || null);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async saveSenderKey(groupId: string, senderIdentityId: string, rawKey: CryptoKey): Promise<void> {
    const db = await openDatabase();
    const id = `${groupId}:${senderIdentityId}`;
    return new Promise((resolve, reject) => {
      const tx = db.transaction("sender_keys", "readwrite");
      const store = tx.objectStore("sender_keys");
      const req = store.put({
        id,
        groupId,
        senderIdentityId,
        rawKey,
        createdAt: Date.now(),
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
};