import type { DbTableRow } from "../database.helpers.ts";
import type { TimestampISO, UUID } from "../primitives.ts";

/**
 * Сырая строка таблицы stores из базы данных.
 */
export type StoreRow = DbTableRow<"stores">;

/**
 * Доменная модель витрины магазина (сущность с рангом 1).
 */
export interface Store {
  /** Уникальный идентификатор магазина (совпадает с entities.id) */
  id: UUID;
  /** Название магазина (от 3 до 60 символов) */
  name: string;
  /** Описание магазина (до 1000 символов), либо null */
  description: string | null;
  /** Метка времени создания */
  createdAt: TimestampISO | null;
}

/**
 * Сырая строка таблицы store_products из базы данных.
 */
export type StoreProductRow = DbTableRow<"store_products">;

/**
 * Доменная модель товара в магазине.
 */
export interface StoreProduct {
  /** Текстовый артикул/SKU товара (например, "coins_pack_100") */
  id: string;
  /** Идентификатор магазина, к которому привязан товар */
  storeId: UUID;
  /** Название товара (2-100 символов) */
  name: string;
  /** Количество начисляемой игровой валюты (> 0) */
  rewardAmount: number;
  /** Флаг доступности товара для покупки */
  isActive: boolean;
  /** Время добавления товара в каталог */
  createdAt: TimestampISO | null;
}

/**
 * Сырая строка таблицы apple_purchases.
 */
export type ApplePurchaseRow = DbTableRow<"apple_purchases">;

/**
 * Модель чека покупки через Apple App Store In-App Purchases.
 */
export interface ApplePurchase {
  /** Уникальный идентификатор записи покупки */
  id: UUID;
  /** Пользователь, совершивший покупку */
  userId: UUID;
  /** Уникальный номер транзакции Apple (transaction_id) для дедупликации */
  transactionId: string;
  /** Идентификатор купленного товара */
  productId: string;
  /** Время проведения операции */
  createdAt: TimestampISO | null;
}

/**
 * Сырая строка таблицы stripe_purchases.
 */
export type StripePurchaseRow = DbTableRow<"stripe_purchases">;

/**
 * Модель покупки через Stripe.
 */
export interface StripePurchase {
  /** Уникальный идентификатор записи покупки */
  id: UUID;
  /** Пользователь-плательщик */
  userId: UUID;
  /** Идентификатор платежного намерения Stripe (payment_intent_id) */
  paymentIntentId: string;
  /** Купленный продукт */
  productId: string;
  /** Время создания записи */
  createdAt: TimestampISO | null;
}

/**
 * Сырая строка таблицы ad_rewards.
 */
export type AdRewardRow = DbTableRow<"ad_rewards">;

/**
 * Модель начисления награды за просмотр рекламы (Rewarded Ad).
 */
export interface AdReward {
  /** Уникальный идентификатор записи награды */
  id: UUID;
  /** Пользователь, получивший награду */
  userId: UUID;
  /** Идентификатор транзакции рекламной сети (network_tx_id) */
  networkTxId: string;
  /** Название рекламной сети (например, "admob", "unity") */
  adNetwork: string;
  /** Размер начисленной награды (> 0) */
  rewardAmount: number;
  /** Время начисления */
  createdAt: TimestampISO | null;
}