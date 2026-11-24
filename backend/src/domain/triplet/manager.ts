import type { UUID } from "../../types/primitives.ts";
import { type EntityRef, getEntityRank } from "../../types/core/entity.ts";
import type { EntityRelation } from "../../types/core/relation.ts";
import { buildIndexKey } from "../../utils/keys.ts";
import { IndexedCollection } from "./collection.ts";

/**
 * Локальный отчет алгоритма каскадного удаления связи.
 */
export interface CascadeDeletionReport {
  deletedIds: UUID[];
  retainedBy: EntityRef[];
}

/**
 * In-memory менеджер тернарного графа (space, subject, target).
 * [Алгоритмическое ядро]: использует прямые позиционные параметры для минимизации аллокаций.
 */
export class TripletManager {
  private db = new IndexedCollection<EntityRelation>();
  private pendingDeletes = new Set<string>();

  constructor() {
    this.db.addIndex("target", (r) => buildIndexKey(r.target.id));
    this.db.addIndex("space", (r) => buildIndexKey(r.space.id));
    this.db.addIndex("subject", (r) => buildIndexKey(r.subject.id));
    this.db.addIndex("exact", (r) => buildIndexKey(r.space.id, r.subject.id, r.target.id));
    this.db.addIndex("subject_target", (r) => buildIndexKey(r.subject.id, r.target.id));
  }

  loadMany(relations: EntityRelation[]): void {
    this.db.clear();
    for (const rel of relations) {
      this.db.insert(rel);
    }
  }

  insert(rel: EntityRelation): void {
    this.db.insert(rel);
  }

  delete(id: UUID): void {
    this.db.delete(id);
  }

  findExact(spaceId: UUID, subjectId: UUID, targetId: UUID): EntityRelation | undefined {
    return this.db.getByIndex("exact", buildIndexKey(spaceId, subjectId, targetId))[0];
  }

  /**
   * Находит все ID связей, в которых сущность участвует как space, subject или target.
   */
  gatherRelationsByEntity(entityId: UUID): UUID[] {
    const toDelete = new Set<UUID>();
    const key = buildIndexKey(entityId);

    for (const rel of this.db.getByIndex("space", key)) toDelete.add(rel.id);
    for (const rel of this.db.getByIndex("target", key)) toDelete.add(rel.id);
    for (const rel of this.db.getByIndex("subject", key)) toDelete.add(rel.id);

    return Array.from(toDelete);
  }

  /**
   * Валидирует допустимость добавления связи согласно аксиомам тернарного графа.
   */
  validateInsert(space: EntityRef, subject: EntityRef, target: EntityRef): boolean {
    if (space.id === subject.id && subject.id === target.id) return false;

    const spaceRank = getEntityRank(space.entityType);
    const targetRank = getEntityRank(target.entityType);
    const subjectRank = getEntityRank(subject.entityType);

    if (spaceRank === 0 && targetRank === 0) return false;

    if (
      (space.id === subject.id && space.id !== target.id) ||
      (subject.id === target.id && space.id !== subject.id)
    ) {
      throw new Error("INVALID_RELATION_FORMAT: (A,A,B) and (A,B,B) are forbidden");
    }

    const exactKey = buildIndexKey(space.id, subject.id, target.id);
    if (this.db.getByIndex("exact", exactKey).length > 0) return false;

    if (space.id === target.id) {
      if (
        subjectRank !== 0 &&
        this.db.getByIndex("subject_target", buildIndexKey(target.id, subject.id)).length === 0
      ) {
        throw new Error("INSERT_DENIED: XYX requires at least one ZXY relation");
      }
    } else {
      if (spaceRank > 0) {
        const hasSub = this.getInclusion(space, subject, true).length > 0;
        const hasTgt = this.getInclusion(space, target, true).length > 0;
        if (!hasSub || !hasTgt) {
          throw new Error("INSERT_DENIED: XYZ requires valid XZX and XZY inclusions");
        }
      }
    }

    return true;
  }

  /**
   * Проверяет вхождение субъекта в контекст цели (target).
   */
  getInclusion(target: EntityRef, subject: EntityRef, findFirst = false): EntityRelation[] {
    const result: EntityRelation[] = [];
    let potentialXba: EntityRelation | undefined;

    const relations = this.db.getByIndex(
      "subject_target",
      buildIndexKey(subject.id, target.id),
    );
    if (relations.length === 0) return result;

    const targetRank = getEntityRank(target.entityType);
    const subjectRank = getEntityRank(subject.entityType);

    for (const rel of relations) {
      if (this.pendingDeletes.has(rel.id)) continue;

      if (rel.space.id === target.id) {
        if (findFirst) return [rel];
        result.push(rel);
        continue;
      }

      const relSpaceRank = getEntityRank(rel.space.entityType);
      if (relSpaceRank < targetRank && relSpaceRank < subjectRank) {
        if (findFirst) {
          if (!potentialXba) potentialXba = rel;
        } else {
          result.push(rel);
        }
      }
    }

    if (findFirst && potentialXba) return [potentialXba];
    return result;
  }

  /**
   * Возвращает список пространств/сущностей, дающих субъекту видимость цели.
   */
  getVisibilitySources(target: EntityRef, subject: EntityRef, findFirst = false): EntityRef[] {
    const targetRank = getEntityRank(target.entityType);
    if (subject.id === target.id || targetRank === 0) return [target];

    const result: EntityRef[] = [];
    const seenIds = new Set<string>();
    const addUnique = (ref: EntityRef) => {
      if (!seenIds.has(ref.id)) {
        seenIds.add(ref.id);
        result.push(ref);
      }
    };

    const inclusions = this.getInclusion(target, subject, findFirst);
    for (const rel of inclusions) {
      if (findFirst) return [rel.space];
      addUnique(rel.space);
    }

    const targetRelations = this.db.getByIndex("target", buildIndexKey(target.id));
    const candidatesY = new Map<string, EntityRef>();
    const subjectRank = getEntityRank(subject.entityType);

    for (const rel of targetRelations) {
      const y = rel.subject;
      const yRank = getEntityRank(y.entityType);
      const spaceRank = getEntityRank(rel.space.entityType);

      if (
        (rel.space.id === target.id || spaceRank < yRank) &&
        yRank < subjectRank &&
        yRank < targetRank
      ) {
        candidatesY.set(y.id, y);
      }
    }

    for (const y of candidatesY.values()) {
      if (
        this.getInclusion(y, target, true).length > 0 &&
        this.getInclusion(y, subject, true).length > 0
      ) {
        if (findFirst) return [y];
        addUnique(y);
      }
    }

    return result;
  }

  /**
   * Вычисляет каскадное удаление связей при удалении целевой связи.
   * Сущности не затрагиваются.
   */
  gatherDeletions(targetRelation: EntityRelation): CascadeDeletionReport {
    this.pendingDeletes.clear();
    let retainedBy: EntityRef[] = [];

    const cascade = (rel: EntityRelation) => {
      if (this.pendingDeletes.has(rel.id)) return;
      this.pendingDeletes.add(rel.id);

      const { space: sp, subject: sub, target: tgt } = rel;

      if (sp.id === tgt.id) {
        const remaining = this.getInclusion(sp, sub, false);
        if (remaining.length > 0) {
          retainedBy = remaining.map((r) => r.space);
          return;
        }

        const spaceRels = this.db.getByIndex("space", buildIndexKey(sp.id));
        for (const r of spaceRels) {
          if (r.subject.id === sub.id || r.target.id === sub.id) {
            cascade(r);
          }
        }

        const allStarBa = this.db.getByIndex(
          "subject_target",
          buildIndexKey(sub.id, sp.id),
        );
        const hasStarBa = allStarBa.some((r) => !this.pendingDeletes.has(r.id));

        if (!hasStarBa) {
          const babs = this.db.getByIndex(
            "exact",
            buildIndexKey(sub.id, sp.id, sub.id),
          );
          for (const r of babs) cascade(r);
        }
      } else {
        const allStarBc = this.db.getByIndex(
          "subject_target",
          buildIndexKey(sub.id, tgt.id),
        );
        const hasStarBc = allStarBc.some((r) => !this.pendingDeletes.has(r.id));

        if (!hasStarBc) {
          const bcbs = this.db.getByIndex(
            "exact",
            buildIndexKey(sub.id, tgt.id, sub.id),
          );
          for (const r of bcbs) cascade(r);
        }
      }
    };

    cascade(targetRelation);
    const deletedIds = Array.from(this.pendingDeletes);
    this.pendingDeletes.clear();

    return { deletedIds, retainedBy };
  }
}