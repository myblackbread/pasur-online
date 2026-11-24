/**
 * Универсальная in-memory коллекция с поддержкой вторичных индексов.
 * Работает без I/O и сторонних зависимостей.
 */
export class IndexedCollection<T extends { id: string }> {
  private records = new Map<string, T>();
  private indexExtractors = new Map<string, (item: T) => string>();
  private indexes = new Map<string, Map<string, Set<T>>>();

  /**
   * Регистрирует вторичный индекс по правилу извлечения ключа.
   */
  addIndex(name: string, extractor: (item: T) => string): void {
    this.indexExtractors.set(name, extractor);
    this.indexes.set(name, new Map());
  }

  /**
   * Добавляет элемент в хранилище и индексирует его.
   */
  insert(item: T): void {
    this.records.set(item.id, item);
    for (const [name, extractor] of this.indexExtractors) {
      const key = extractor(item);
      const indexMap = this.indexes.get(name)!;
      let set = indexMap.get(key);
      if (!set) {
        set = new Set();
        indexMap.set(key, set);
      }
      set.add(item);
    }
  }

  /**
   * Удаляет элемент по ID из хранилища и вторичных индексов.
   */
  delete(id: string): void {
    const item = this.records.get(id);
    if (!item) return;

    for (const [name, extractor] of this.indexExtractors) {
      const key = extractor(item);
      const indexMap = this.indexes.get(name)!;
      const set = indexMap.get(key);
      if (set) {
        set.delete(item);
        if (set.size === 0) {
            indexMap.delete(key);
        }
      }
    }
    this.records.delete(id);
  }

  /**
   * Получение элемента по первичному ID за O(1).
   */
  get(id: string): T | undefined {
    return this.records.get(id);
  }

  /**
   * Получение всех элементов коллекции.
   */
  getAll(): T[] {
    return Array.from(this.records.values());
  }

  /**
   * Поиск по вторичному индексу за O(1).
   */
  getByIndex(indexName: string, key: string): T[] {
    const indexMap = this.indexes.get(indexName);
    if (!indexMap) {
      throw new Error(`Index ${indexName} not found`);
    }
    const set = indexMap.get(key);
    return set ? Array.from(set) : [];
  }

  /**
   * Полная очистка коллекции и индексов.
   */
  clear(): void {
    this.records.clear();
    for (const indexMap of this.indexes.values()) {
      indexMap.clear();
    }
  }
}