import { DataSource, EntityManager } from 'typeorm';

// SQLite uses one connection: queue writes so concurrent requests cannot nest transactions.
const pending = new WeakMap<DataSource, Promise<unknown>>();
export function localTransaction<T>(source: DataSource, work: (manager: EntityManager) => Promise<T>): Promise<T> {
  const previous = pending.get(source) || Promise.resolve();
  const current = previous.catch(() => undefined).then(() => source.transaction(work));
  pending.set(source, current.catch(() => undefined));
  return current;
}
