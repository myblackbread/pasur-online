import type { DbTableInsert, DbTableRow } from "../database.helpers.ts";
import type { TimestampISO, UUID } from "../primitives.ts";

/**
 * Сырая запись кошелька из таблицы wallets базы данных.
 */
export type WalletRow = DbTableRow<"wallets">;

/**
 * Данные для ручной вставки записи в таблицу wallets.
 */
export type WalletInsert = DbTableInsert<"wallets">;

/**
 * Доменная модель кошелька сущности в памяти.
 */
export interface Wallet {
  /** Идентификатор сущности-владельца (совпадает с entities.id) */
  entityId: UUID;
  /** Баланс в неделимых единицах (целое неотрицательное число >= 0) */
  balance: number;
}

/**
 * Сырая запись о транзакции из таблицы wallet_transactions.
 */
export type WalletTransactionRow = DbTableRow<"wallet_transactions">;

/**
 * Данные для вставки в таблицу wallet_transactions.
 */
export type WalletTransactionInsert = DbTableInsert<"wallet_transactions">;

/**
 * Доменная модель финансовой транзакции между кошельками.
 */
export interface WalletTransaction {
  /** Уникальный идентификатор транзакции */
  id: UUID;
  /** Отправитель средств (null при системной эмиссии) */
  senderId: UUID | null;
  /** Получатель средств (null при системном списании) */
  receiverId: UUID | null;
  /** Сумма операции (> 0) */
  amount: number;
  /** Время проведения операции */
  createdAt: TimestampISO;
}