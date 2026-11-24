import type { DbTableInsert, DbTableRow, DbTableUpdate } from "../database.helpers.ts";
import type { Json } from "../database.types.ts";
import type {
  GameRoom,
  GameRulesPayload,
  GameSettings,
  Match,
  MatchGameState,
} from "./game.ts";

export const GameRoomMapper = {
  toDomain(props: { row: DbTableRow<"rooms"> }): GameRoom {
    return {
      id: props.row.id,
      displayName: props.row.display_name,
      betAmount: props.row.bet_amount,
      joinCodeHash: props.row.join_code_hash,
      activeDeadline: props.row.active_deadline,
      updatedAt: props.row.updated_at,
    };
  },

  toPersistenceInsert(props: { room: GameRoom }): DbTableInsert<"rooms"> {
    return {
      id: props.room.id,
      display_name: props.room.displayName,
      bet_amount: props.room.betAmount,
      join_code_hash: props.room.joinCodeHash,
      active_deadline: props.room.activeDeadline,
      updated_at: props.room.updatedAt,
    };
  },

  toPersistenceUpdate(props: {
    room: Partial<GameRoom> & { id: string };
  }): DbTableUpdate<"rooms"> {
    return {
      display_name: props.room.displayName,
      bet_amount: props.room.betAmount,
      join_code_hash: props.room.joinCodeHash,
      active_deadline: props.room.activeDeadline,
      updated_at: props.room.updatedAt,
    };
  },
};

export const GameSettingsMapper = {
  toDomain(props: { row: DbTableRow<"settings"> }): GameSettings {
    return {
      id: props.row.id,
      gameType: props.row.game_type,
      requiredPlayers: props.row.required_players,
      turnDuration: props.row.turn_duration,
      rulesPayload: props.row.rules_payload as GameRulesPayload,
    };
  },

  toPersistence(props: { settings: GameSettings }): DbTableInsert<"settings"> {
    return {
      id: props.settings.id,
      game_type: props.settings.gameType,
      required_players: props.settings.requiredPlayers,
      turn_duration: props.settings.turnDuration,
      rules_payload: props.settings.rulesPayload as Json,
    };
  },
};

export const MatchMapper = {
  toDomain(props: { row: DbTableRow<"matches"> }): Match {
    return {
      id: props.row.id,
      roomId: props.row.room_id,
      settingsId: props.row.settings_id,
      groupId: props.row.group_id,
      status: props.row.status,
      version: props.row.version,
      createdAt: props.row.created_at,
    };
  },

  toPersistenceInsert(props: { match: Match }): DbTableInsert<"matches"> {
    return {
      id: props.match.id,
      room_id: props.match.roomId,
      settings_id: props.match.settingsId,
      group_id: props.match.groupId,
      status: props.match.status,
      version: props.match.version,
      created_at: props.match.createdAt,
    };
  },

  toPersistenceUpdate(props: {
    match: Partial<Match> & { id: string };
  }): DbTableUpdate<"matches"> {
    return {
      room_id: props.match.roomId,
      settings_id: props.match.settingsId,
      group_id: props.match.groupId,
      status: props.match.status,
      version: props.match.version,
    };
  },
};

export const MatchGameStateMapper = {
  toDomain(props: { row: DbTableRow<"match_game_states"> }): MatchGameState {
    return {
      matchId: props.row.match_id,
      gameState: props.row.game_state,
      createdAt: props.row.created_at,
    };
  },

  toPersistence(props: { state: MatchGameState }): DbTableInsert<"match_game_states"> {
    return {
      match_id: props.state.matchId,
      game_state: props.state.gameState,
      created_at: props.state.createdAt,
    };
  },
};