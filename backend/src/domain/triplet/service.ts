import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database.types.ts";
import type { UUID } from "../../types/primitives.ts";
import type { EntityRef, EntityType } from "../../types/core/entity.ts";
import type { EntityRelation } from "../../types/core/relation.ts";
import { WriteQueue } from "../../utils/queue.ts";
import { type CascadeDeletionReport, TripletManager } from "./manager.ts";

interface JoinedEntityNode {
  id: string;
  entity_type: EntityType;
}

interface JoinedRelationRow {
  id: string;
  created_at: string;
  expires_at: string | null;
  space: JoinedEntityNode;
  subject: JoinedEntityNode;
  target: JoinedEntityNode;
}

/**
 * Сервис тернарного графа отношений.
 * Обеспечивает строгую синхронизацию между оперативной памятью и таблицей entity_relations.
 */
export class RelationsService {
  private manager = new TripletManager();
  private writeQueue = new WriteQueue();

  constructor(private client: SupabaseClient<Database>) {}

  /**
   * Первичная загрузка и индексация графа из БД при старте сервера.
   */
  async init(): Promise<void> {
    const { data, error } = await this.client
      .from("entity_relations")
      .select(`
        id,
        created_at,
        expires_at,
        space:entities!entity_relations_space_id_fkey(id, entity_type),
        subject:entities!entity_relations_subject_id_fkey(id, entity_type),
        target:entities!entity_relations_target_id_fkey(id, entity_type)
      `);

    if (error) throw error;
    if (!data) return;

    const mapped: EntityRelation[] = (data as unknown as JoinedRelationRow[]).map((row) => ({
      id: row.id,
      space: { id: row.space.id, entityType: row.space.entity_type },
      subject: { id: row.subject.id, entityType: row.subject.entity_type },
      target: { id: row.target.id, entityType: row.target.entity_type },
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    }));

    this.manager.loadMany(mapped);
  }

  /**
   * Добавление новой связи в граф с проверкой математических инвариантов.
   */
  createRelation(props: {
    space: EntityRef;
    subject: EntityRef;
    target: EntityRef;
  }): Promise<EntityRelation | null> {
    return this.writeQueue.enqueue(async () => {
      const { space, subject, target } = props;

      if (!this.manager.validateInsert(space, subject, target)) {
        return null;
      }

      const { data, error } = await this.client
        .from("entity_relations")
        .insert({
          space_id: space.id,
          subject_id: subject.id,
          target_id: target.id,
        })
        .select("id, created_at, expires_at")
        .single();

      if (error) throw error;

      const newRelation: EntityRelation = {
        id: data.id,
        space,
        subject,
        target,
        createdAt: data.created_at,
        expiresAt: data.expires_at,
      };

      this.manager.insert(newRelation);
      return newRelation;
    });
  }

  /**
   * Точечное удаление конкретной связи с каскадным расчетом зависимых ребер.
   */
  removeRelation(props: {
    spaceId: UUID;
    subjectId: UUID;
    targetId: UUID;
  }): Promise<CascadeDeletionReport> {
    return this.writeQueue.enqueue(async () => {
      const rel = this.manager.findExact(props.spaceId, props.subjectId, props.targetId);
      if (!rel) return { deletedIds: [], retainedBy: [] };

      const report = this.manager.gatherDeletions(rel);

      if (report.deletedIds.length > 0) {
        const { error } = await this.client
          .from("entity_relations")
          .delete()
          .in("id", report.deletedIds);

        if (error) throw error;

        for (const id of report.deletedIds) {
          this.manager.delete(id);
        }
      }

      return report;
    });
  }

  /**
   * Приватная логика: удаляет все рёбра сущности из PostgreSQL и оперативной памяти.
   * Вызывается строго внутри очередей записи.
   */
  private async executePurgeEntityRelations(entityId: UUID): Promise<void> {
    // 1. Поиск всех зависимых ребер через вторичные индексы памяти за O(1)
    const relationIds = this.manager.gatherRelationsByEntity(entityId);
    if (relationIds.length === 0) return;

    // 2. Атомарное удаление записей связей из PostgreSQL
    const { error } = await this.client
      .from("entity_relations")
      .delete()
      .in("id", relationIds);

    if (error) {
      throw new Error(`Failed to purge entity relations from database: ${error.message}`);
    }

    // 3. Вычищение ребер из структур в памяти сервера
    for (const id of relationIds) {
      this.manager.delete(id);
    }
  }

  /**
   * Публичный фасад: полная зачистка всех связей сущности (в роли space, subject или target).
   * Поддерживает completion-коллбэк, гарантирующий выполнение сторонней операции
   * (например, удаление строки сущности) до освобождения очереди записи.
   */
  purgeEntityRelations(props: {
    entityId: UUID;
    onComplete?: () => Promise<void>;
  }): Promise<void> {
    return this.writeQueue.enqueue(async () => {
      // 1. Вычищаем все рёбра сущности из БД и RAM
      await this.executePurgeEntityRelations(props.entityId);

      // 2. Если передан коллбэк завершения — выполняем его без освобождения очереди
      if (props.onComplete) {
        await props.onComplete();
      }
    });
  }

  /**
   * Чтение: проверка вхождения.
   */
  getInclusion(props: {
    target: EntityRef;
    subject: EntityRef;
    findFirst?: boolean;
  }): EntityRelation[] {
    return this.manager.getInclusion(props.target, props.subject, props.findFirst);
  }

  /**
   * Чтение: проверка источников видимости.
   */
  getVisibilitySources(props: {
    target: EntityRef;
    subject: EntityRef;
    findFirst?: boolean;
  }): EntityRef[] {
    return this.manager.getVisibilitySources(props.target, props.subject, props.findFirst);
  }
}