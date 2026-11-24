import type { DbTableInsert, DbTableRow } from "../database.helpers.ts";
import type { CryptoIdentity, CryptoOneTimePrekey } from "./crypto.ts";

export const CryptoIdentityMapper = {
  toDomain(props: { row: DbTableRow<"crypto_identities"> }): CryptoIdentity {
    return {
      id: props.row.id,
      deviceId: props.row.device_id,
      identityKey: props.row.identity_key,
      registrationId: props.row.registration_id,
      signedPrekey: props.row.signed_prekey,
      signedPrekeyId: props.row.signed_prekey_id,
      signedPrekeySignature: props.row.signed_prekey_signature,
    };
  },

  toPersistence(props: { identity: CryptoIdentity }): DbTableInsert<"crypto_identities"> {
    return {
      id: props.identity.id,
      device_id: props.identity.deviceId,
      identity_key: props.identity.identityKey,
      registration_id: props.identity.registrationId,
      signed_prekey: props.identity.signedPrekey,
      signed_prekey_id: props.identity.signedPrekeyId,
      signed_prekey_signature: props.identity.signedPrekeySignature,
    };
  },
};

export const CryptoOneTimePrekeyMapper = {
  toDomain(props: { row: DbTableRow<"crypto_one_time_prekeys"> }): CryptoOneTimePrekey {
    return {
      identityId: props.row.identity_id,
      keyId: props.row.key_id,
      publicKey: props.row.public_key,
    };
  },

  toPersistence(props: { prekey: CryptoOneTimePrekey }): DbTableInsert<"crypto_one_time_prekeys"> {
    return {
      identity_id: props.prekey.identityId,
      key_id: props.prekey.keyId,
      public_key: props.prekey.publicKey,
    };
  },
};