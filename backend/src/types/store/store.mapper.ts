import type { DbTableInsert, DbTableRow } from "../database.helpers.ts";
import type {
  AdReward,
  ApplePurchase,
  Store,
  StoreProduct,
  StripePurchase,
} from "./store.ts";

export const StoreMapper = {
  toDomain(props: { row: DbTableRow<"stores"> }): Store {
    return {
      id: props.row.id,
      name: props.row.name,
      description: props.row.description,
      createdAt: props.row.created_at,
    };
  },

  toPersistence(props: { store: Store }): DbTableInsert<"stores"> {
    return {
      id: props.store.id,
      name: props.store.name,
      description: props.store.description,
      created_at: props.store.createdAt,
    };
  },
};

export const StoreProductMapper = {
  toDomain(props: { row: DbTableRow<"store_products"> }): StoreProduct {
    return {
      id: props.row.id,
      storeId: props.row.store_id,
      name: props.row.name,
      rewardAmount: props.row.reward_amount,
      isActive: props.row.is_active ?? true,
      createdAt: props.row.created_at,
    };
  },

  toPersistence(props: { product: StoreProduct }): DbTableInsert<"store_products"> {
    return {
      id: props.product.id,
      store_id: props.product.storeId,
      name: props.product.name,
      reward_amount: props.product.rewardAmount,
      is_active: props.product.isActive,
      created_at: props.product.createdAt,
    };
  },
};

export const ApplePurchaseMapper = {
  toDomain(props: { row: DbTableRow<"apple_purchases"> }): ApplePurchase {
    return {
      id: props.row.id,
      userId: props.row.user_id,
      transactionId: props.row.transaction_id,
      productId: props.row.product_id,
      createdAt: props.row.created_at,
    };
  },

  toPersistence(props: { purchase: ApplePurchase }): DbTableInsert<"apple_purchases"> {
    return {
      id: props.purchase.id,
      user_id: props.purchase.userId,
      transaction_id: props.purchase.transactionId,
      product_id: props.purchase.productId,
      created_at: props.purchase.createdAt,
    };
  },
};

export const StripePurchaseMapper = {
  toDomain(props: { row: DbTableRow<"stripe_purchases"> }): StripePurchase {
    return {
      id: props.row.id,
      userId: props.row.user_id,
      paymentIntentId: props.row.payment_intent_id,
      productId: props.row.product_id,
      createdAt: props.row.created_at,
    };
  },

  toPersistence(props: { purchase: StripePurchase }): DbTableInsert<"stripe_purchases"> {
    return {
      id: props.purchase.id,
      user_id: props.purchase.userId,
      payment_intent_id: props.purchase.paymentIntentId,
      product_id: props.purchase.productId,
      created_at: props.purchase.createdAt,
    };
  },
};

export const AdRewardMapper = {
  toDomain(props: { row: DbTableRow<"ad_rewards"> }): AdReward {
    return {
      id: props.row.id,
      userId: props.row.user_id,
      networkTxId: props.row.network_tx_id,
      adNetwork: props.row.ad_network,
      rewardAmount: props.row.reward_amount,
      createdAt: props.row.created_at,
    };
  },

  toPersistence(props: { reward: AdReward }): DbTableInsert<"ad_rewards"> {
    return {
      id: props.reward.id,
      user_id: props.reward.userId,
      network_tx_id: props.reward.networkTxId,
      ad_network: props.reward.adNetwork,
      reward_amount: props.reward.rewardAmount,
      created_at: props.reward.createdAt,
    };
  },
};