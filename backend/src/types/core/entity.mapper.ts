import type { DbTableInsert, DbTableRow } from "../database.helpers.ts";
import type { EntityRef } from "./entity.ts";

export const EntityMapper = {
  /**
   * Преобразует запись базы данных в ссылку на сущность в памяти.
   */
  toDomain(props: { row: DbTableRow<"entities"> }): EntityRef {
    return {
      id: props.row.id,
      entityType: props.row.entity_type,
    };
  },

  /**
   * Преобразует ссылку из памяти в формат строки для сохранения в Postgres.
   */
  toPersistence(props: { entity: EntityRef }): DbTableInsert<"entities"> {
    return {
      id: props.entity.id,
      entity_type: props.entity.entityType,
    };
  },
};