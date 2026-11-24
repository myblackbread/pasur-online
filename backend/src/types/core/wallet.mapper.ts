import type { DbTableInsert, DbTableRow } from "../database.helpers.ts";
import type { Wallet, WalletTransaction } from "./wallet.ts";

export const WalletMapper = {
  /**
   * Преобразует строку таблицы wallets в доменную модель Wallet.
   */
  toDomain(props: { row: DbTableRow<"wallets"> }): Wallet {
    return {
      entityId: props.row.entity_id,
      balance: props.row.balance,
    };
  },

  /**
   * Преобразует модель кошелька в формат вставки таблицы wallets.
   */
  toPersistence(props: { wallet: Wallet }): DbTableInsert<"wallets"> {
    return {
      entity_id: props.wallet.entityId,
      balance: props.wallet.balance,
    };
  },
};

export const WalletTransactionMapper = {
  /**
   * Преобразует строку таблицы wallet_transactions в доменную модель.
   */
  toDomain(props: { row: DbTableRow<"wallet_transactions"> }): WalletTransaction {
    return {
      id: props.row.id,
      senderId: props.row.sender_id,
      receiverId: props.row.receiver_id,
      amount: props.row.amount,
      createdAt: props.row.created_at,
    };
  },

  /**
   * Преобразует доменную транзакцию в запись для сохранения в БД.
   */
  toPersistence(props: { transaction: WalletTransaction }): DbTableInsert<"wallet_transactions"> {
    return {
      id: props.transaction.id,
      sender_id: props.transaction.senderId,
      receiver_id: props.transaction.receiverId,
      amount: props.transaction.amount,
      created_at: props.transaction.createdAt,
    };
  },
};