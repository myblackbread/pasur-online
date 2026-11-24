import type { DbTableInsert, DbTableRow, DbTableUpdate } from "../database.helpers.ts";
import type {
  UserBlock,
  UserDeletionCustomFeedback,
  UserDeletionReason,
  UserDevice,
  UserProfile,
  UserStatistics,
} from "./user.ts";

export const UserMapper = {
  /**
   * Преобразует строку таблицы users в доменную модель UserProfile.
   */
  toDomain(props: { row: DbTableRow<"users"> }): UserProfile {
    return {
      id: props.row.id,
      displayName: props.row.display_name,
      gender: props.row.gender ?? "female",
      avatar: props.row.avatar,
      isAdmin: props.row.is_admin,
      isIncognito: props.row.is_incognito,
      settings: props.row.settings,
      deletionReasonId: props.row.deletion_reason_id,
      deletedAt: props.row.deleted_at,
    };
  },

  /**
   * Преобразует доменную модель в формат обновления таблицы users.
   */
  toPersistenceUpdate(props: { profile: UserProfile }): DbTableUpdate<"users"> {
    return {
      display_name: props.profile.displayName,
      gender: props.profile.gender,
      avatar: props.profile.avatar,
      is_admin: props.profile.isAdmin,
      is_incognito: props.profile.isIncognito,
      settings: props.profile.settings,
      deletion_reason_id: props.profile.deletionReasonId,
      deleted_at: props.profile.deletedAt,
    };
  },
};

export const UserDeviceMapper = {
  toDomain(props: { row: DbTableRow<"user_devices"> }): UserDevice {
    return {
      id: props.row.id,
      userId: props.row.user_id,
      createdAt: props.row.created_at,
    };
  },

  toPersistence(props: { device: UserDevice }): DbTableInsert<"user_devices"> {
    return {
      id: props.device.id,
      user_id: props.device.userId,
      created_at: props.device.createdAt,
    };
  },
};

export const UserStatisticsMapper = {
  toDomain(props: { row: DbTableRow<"user_statistics"> }): UserStatistics {
    return {
      userId: props.row.user_id,
      abandonsCount: props.row.abandons_count,
      lastAbandonAt: props.row.last_abandon_at,
      dodgesCount: props.row.dodges_count,
      lastDodgeAt: props.row.last_dodge_at,
    };
  },
};

export const UserBlockMapper = {
  toDomain(props: { row: DbTableRow<"user_blocks"> }): UserBlock {
    return {
      blockerId: props.row.blocker_id,
      blockedId: props.row.blocked_id,
    };
  },

  toPersistence(props: { block: UserBlock }): DbTableInsert<"user_blocks"> {
    return {
      blocker_id: props.block.blockerId,
      blocked_id: props.block.blockedId,
    };
  },
};

export const UserDeletionReasonMapper = {
  toDomain(props: { row: DbTableRow<"user_deletion_reasons"> }): UserDeletionReason {
    return {
      id: props.row.id,
      reason: props.row.reason,
      count: props.row.count,
      createdAt: props.row.created_at,
    };
  },
};

export const UserDeletionCustomFeedbackMapper = {
  toDomain(props: { row: DbTableRow<"user_deletion_custom_feedback"> }): UserDeletionCustomFeedback {
    return {
      id: props.row.id,
      reasonId: props.row.reason_id,
      reasonType: props.row.reason_type,
      feedbackText: props.row.feedback_text,
      createdAt: props.row.created_at,
    };
  },

  toPersistence(props: {
    feedback: UserDeletionCustomFeedback;
  }): DbTableInsert<"user_deletion_custom_feedback"> {
    return {
      id: props.feedback.id,
      reason_id: props.feedback.reasonId,
      reason_type: props.feedback.reasonType,
      feedback_text: props.feedback.feedbackText,
      created_at: props.feedback.createdAt,
    };
  },
};