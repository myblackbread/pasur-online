import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database.types.ts";
import type { UUID } from "../../types/primitives.ts";

export interface RegisterDeviceDto {
  userId: UUID;
  deviceId?: UUID;
  identityKey: string;
  registrationId: number;
  signedPrekey: string;
  signedPrekeyId: number;
  signedPrekeySignature: string;
  oneTimePrekeys?: Array<{ keyId: number; publicKey: string }>;
}

export interface RegisterDeviceResult {
  deviceId: UUID;
  identityId: UUID;
}

export class DeviceService {
  constructor(private client: SupabaseClient<Database>) {}

  /**
   * Регистрирует PWA-девайс и создает для него крипто-профиль.
   */
  async registerDevice(dto: RegisterDeviceDto): Promise<RegisterDeviceResult> {
    let deviceId = dto.deviceId;

    // 1. Проверяем или создаем физическое устройство
    if (deviceId) {
      const { data: existingDevice } = await this.client
        .from("user_devices")
        .select("id")
        .eq("id", deviceId)
        .eq("user_id", dto.userId)
        .maybeSingle();

      if (!existingDevice) {
        deviceId = undefined;
      }
    }

    if (!deviceId) {
      const { data: newDevice, error: devErr } = await this.client
        .from("user_devices")
        .insert({ user_id: dto.userId })
        .select("id")
        .single();

      if (devErr || !newDevice) {
        throw new Error(`Failed to create device: ${devErr?.message}`);
      }
      deviceId = newDevice.id;
    }

    // 2. Создаем криптографический профиль устройства
    const { data: identity, error: idErr } = await this.client
      .from("crypto_identities")
      .insert({
        device_id: deviceId,
        identity_key: dto.identityKey,
        registration_id: dto.registrationId,
        signed_prekey: dto.signedPrekey,
        signed_prekey_id: dto.signedPrekeyId,
        signed_prekey_signature: dto.signedPrekeySignature,
      })
      .select("id")
      .single();

    if (idErr || !identity) {
      throw new Error(`Failed to create crypto identity: ${idErr?.message}`);
    }

    // 3. Сохраняем пачку одноразовых ключей, если переданы
    if (dto.oneTimePrekeys && dto.oneTimePrekeys.length > 0) {
      const prekeysPayload = dto.oneTimePrekeys.map((opk) => ({
        identity_id: identity.id,
        key_id: opk.keyId,
        public_key: opk.publicKey,
      }));

      const { error: opkErr } = await this.client
        .from("crypto_one_time_prekeys")
        .insert(prekeysPayload);

      if (opkErr) {
        throw new Error(`Failed to store OPKs: ${opkErr.message}`);
      }
    }

    return {
      deviceId,
      identityId: identity.id,
    };
  }

  /**
   * Находит актуальный список активных крипто-профилей пользователя.
   */
  async getUserIdentities(userId: UUID): Promise<Array<{ id: UUID; deviceId: UUID; identityKey: string }>> {
    const { data, error } = await this.client
      .from("crypto_identities")
      .select(`
        id,
        device_id,
        identity_key,
        user_devices!fk_crypto_identities_device!inner(user_id)
      `)
      .eq("user_devices.user_id", userId);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      deviceId: row.device_id,
      identityKey: row.identity_key,
    }));
  }
}