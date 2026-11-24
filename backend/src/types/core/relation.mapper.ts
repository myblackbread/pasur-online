import type { DbTableInsert, DbTableRow } from "../database.helpers.ts";
import type { EntityRelation } from "./relation.ts";
import type { EntityRef } from "./entity.ts";

export const RelationMapper = {
  /**
   * Преобразует сырую строку таблицы БД и предзагруженные EntityRef в доменную модель.
   */
  toDomain(props: {
    row: DbTableRow<"entity_relations">;
    space: EntityRef;
    subject: EntityRef;
    target: EntityRef;
  }): EntityRelation {
    return {
      id: props.row.id,
      space: props.space,
      subject: props.subject,
      target: props.target,
      createdAt: props.row.created_at,
      expiresAt: props.row.expires_at,
    };
  },

  /**
   * Преобразует доменную модель в формат вставки таблицы entity_relations.
   */
  toPersistence(props: { relation: EntityRelation }): DbTableInsert<"entity_relations"> {
    return {
      id: props.relation.id,
      space_id: props.relation.space.id,
      subject_id: props.relation.subject.id,
      target_id: props.relation.target.id,
      created_at: props.relation.createdAt,
      expires_at: props.relation.expiresAt,
    };
  },
};