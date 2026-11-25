import { cryptoStore } from "./cryptoStore";

/**
 * Утилиты конвертации байтов в Postgres hex (\x...) и Base64
 */
export function bytesToHex(bytes: Uint8Array): string {
  let hex = "\\x";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

export function hexToBytes(hexString: string): Uint8Array {
  const cleanHex = hexString.startsWith("\\x") ? hexString.slice(2) : hexString;
  const length = cleanHex.length / 2;
  const buffer = new ArrayBuffer(length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface ClientCryptoProfile {
  deviceId: string;
  identityId: string;
  identityKeyBase64: string;
  registrationId: number;
}

export const clientCrypto = {
  /**
   * Инициализирует профиль устройства.
   * Если ключей в IndexedDB ещё нет — генерирует новую ключевую пару ECDH P-256.
   */
  async getOrInitIdentity(): Promise<{
    isNew: boolean;
    identityKeyBase64: string;
    registrationId: number;
    deviceId?: string;
    identityId?: string;
  }> {
    const existing = await cryptoStore.getDeviceIdentity();
    if (existing) {
      return {
        isNew: false,
        identityKeyBase64: existing.publicKeyBase64,
        registrationId: existing.registrationId,
        deviceId: existing.deviceId,
        identityId: existing.identityId,
      };
    }

    // 1. Генерация пары ключей устройства (ECDH P-256)
    const keyPair = await window.crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      false, // приватный ключ non-extractable
      ["deriveKey", "deriveBits"]
    );

    // 2. Экспорт публичного ключа в формат spki -> Base64
    const spki = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const publicKeyBase64 = bytesToBase64(new Uint8Array(spki));
    const registrationId = Math.floor(Math.random() * 100000) + 1;

    return {
      isNew: true,
      identityKeyBase64: publicKeyBase64,
      registrationId,
    };
  },

  /**
   * Сохраняет назначенные сервером deviceId и identityId в IndexedDB.
   */
  async saveRegisteredIdentity(params: {
    deviceId: string;
    identityId: string;
    registrationId: number;
  }): Promise<void> {
    const existing = await cryptoStore.getDeviceIdentity();
    if (existing) {
      await cryptoStore.saveDeviceIdentity({
        ...existing,
        deviceId: params.deviceId,
        identityId: params.identityId,
      });
      return;
    }

    const keyPair = await window.crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      false,
      ["deriveKey", "deriveBits"]
    );
    const spki = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const publicKeyBase64 = bytesToBase64(new Uint8Array(spki));

    await cryptoStore.saveDeviceIdentity({
      deviceId: params.deviceId,
      identityId: params.identityId,
      registrationId: params.registrationId,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicKeyBase64,
    });
  },

  /**
   * Генерирует локальный симметричный Sender Key для группы (AES-GCM-256).
   */
  async getOrCreateMySenderKey(groupId: string, myIdentityId: string): Promise<CryptoKey> {
    const existing = await cryptoStore.getSenderKey(groupId, myIdentityId);
    if (existing) return existing;

    const newKey = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true, // extractable, чтобы зашифровать его для участников
      ["encrypt", "decrypt"]
    );

    await cryptoStore.saveSenderKey(groupId, myIdentityId, newKey);
    return newKey;
  },

  /**
   * Экспортирует и шифрует свой Sender Key публичным ключом получателя (ECDH + AES-GCM).
   */
  async exportSenderKeyForReceiver(
    senderKey: CryptoKey,
    receiverPublicKeyBase64: string
  ): Promise<string> {
    const device = await cryptoStore.getDeviceIdentity();
    if (!device) throw new Error("Local identity not found");

    const receiverRawBytes = base64ToBytes(receiverPublicKeyBase64);

    // 1. Импортируем открытый ключ получателя
    const receiverKey = await window.crypto.subtle.importKey(
      "spki",
      receiverRawBytes.buffer as ArrayBuffer,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      []
    );

    // 2. Согласуем общий секрет через ECDH
    const sharedSecret = await window.crypto.subtle.deriveKey(
      { name: "ECDH", public: receiverKey },
      device.privateKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    // 3. Экспортируем сырые байты Sender Key
    const rawSenderKey = await window.crypto.subtle.exportKey("raw", senderKey);

    // 4. Шифруем Sender Key общим секретом
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      sharedSecret,
      rawSenderKey
    );

    // Упаковываем: [12 байт IV] + [Ciphertext]
    const fullPayload = new Uint8Array(iv.length + encrypted.byteLength);
    fullPayload.set(iv, 0);
    fullPayload.set(new Uint8Array(encrypted), iv.length);

    return bytesToHex(fullPayload);
  },

  /**
   * Расшифровывает полученный Sender Key от собеседника и сохраняет в IndexedDB.
   */
  async importSenderKeyFromSender(
    groupId: string,
    senderIdentityId: string,
    senderPublicKeyBase64: string,
    encryptedSenderKeyHex: string
  ): Promise<void> {
    const device = await cryptoStore.getDeviceIdentity();
    if (!device) throw new Error("Local identity not found");

    const senderRawBytes = base64ToBytes(senderPublicKeyBase64);

    const senderKey = await window.crypto.subtle.importKey(
      "spki",
      senderRawBytes.buffer as ArrayBuffer,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      []
    );

    const sharedSecret = await window.crypto.subtle.deriveKey(
      { name: "ECDH", public: senderKey },
      device.privateKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    const fullBytes = hexToBytes(encryptedSenderKeyHex);
    const iv = fullBytes.slice(0, 12);
    const ciphertext = fullBytes.slice(12);

    const decryptedRaw = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      sharedSecret,
      ciphertext.buffer as ArrayBuffer
    );

    const importedKey = await window.crypto.subtle.importKey(
      "raw",
      decryptedRaw,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );

    await cryptoStore.saveSenderKey(groupId, senderIdentityId, importedKey);
  },

  /**
   * Шифрует открытый текст сообщения ключом группы (AES-GCM-256).
   */
  async encryptTextMessage(
    text: string,
    groupId: string,
    myIdentityId: string
  ): Promise<{ encryptedPayloadHex: string; sequenceIteration: number }> {
    const senderKey = await this.getOrCreateMySenderKey(groupId, myIdentityId);

    const encoder = new TextEncoder();
    const encodedData = encoder.encode(text);

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      senderKey,
      encodedData.buffer as ArrayBuffer
    );

    const fullBytes = new Uint8Array(iv.length + encrypted.byteLength);
    fullBytes.set(iv, 0);
    fullBytes.set(new Uint8Array(encrypted), iv.length);

    return {
      encryptedPayloadHex: bytesToHex(fullBytes),
      sequenceIteration: 0,
    };
  },

  /**
   * Расшифровывает зашифрованное тело сообщения.
   */
  async decryptTextMessage(
    encryptedPayloadHex: string,
    groupId: string,
    senderIdentityId: string
  ): Promise<string> {
    const senderKey = await cryptoStore.getSenderKey(groupId, senderIdentityId);
    if (!senderKey) {
      return "[Зашифрованное сообщение: ожидание ключа]";
    }

    try {
      const fullBytes = hexToBytes(encryptedPayloadHex);
      const iv = fullBytes.slice(0, 12);
      const ciphertext = fullBytes.slice(12);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
        senderKey,
        ciphertext.buffer as ArrayBuffer
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch {
      return "[Ошибка расшифровки]";
    }
  },
};