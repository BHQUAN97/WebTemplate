/**
 * CAM sua du lieu trong tools — read-only only.
 *
 * `ReadonlyRepo<T>` la mot subset cua `Repository<T>` chi expose
 * cac method read. Moi attempt goi `save/insert/update/delete/remove/
 * softDelete/query/restore/upsert/clear` se throw ngay lap tuc.
 *
 * Wrap repo bang `asReadonly(repo)` o constructor cua ChatToolsService →
 * ke ca AI tool co bug, se khong the modify DB.
 */
import { Repository, ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/** Methods duoc phep goi — chi doc. */
export interface ReadonlyRepo<T extends ObjectLiteral> {
  find: Repository<T>['find'];
  findOne: Repository<T>['findOne'];
  findOneBy: Repository<T>['findOneBy'];
  findBy: Repository<T>['findBy'];
  findAndCount: Repository<T>['findAndCount'];
  count: Repository<T>['count'];
  countBy: Repository<T>['countBy'];
  exist: Repository<T>['exist'];
  createQueryBuilder(alias?: string): SelectQueryBuilder<T>;
}

const FORBIDDEN_METHODS = new Set<string>([
  'save',
  'insert',
  'update',
  'delete',
  'remove',
  'softDelete',
  'softRemove',
  'restore',
  'clear',
  'upsert',
  'query',
  'increment',
  'decrement',
  'manager', // access ra EntityManager se bypass
]);

/**
 * Wrap Repository bang Proxy — chan write operations.
 *
 * Note: `createQueryBuilder` van cho phep (readonly by nature o day vi
 * chung ta chi goi `.select/.where/.getMany/.getOne`) — neu tool co y do
 * `.delete()/.update()` qua qb, Proxy o duoi cung chan.
 */
export function asReadonly<T extends ObjectLiteral>(
  repo: Repository<T>,
): ReadonlyRepo<T> {
  return new Proxy(repo, {
    get(target, prop, receiver) {
      const key = String(prop);
      if (FORBIDDEN_METHODS.has(key)) {
        throw new Error(
          `[readonly-repo] Forbidden method "${key}" — tools la read-only.`,
        );
      }
      // createQueryBuilder → wrap ket qua de chan .update/.delete/.softDelete
      if (key === 'createQueryBuilder') {
        const original = Reflect.get(target, prop, receiver) as (
          ...args: unknown[]
        ) => SelectQueryBuilder<T>;
        return (...args: unknown[]) => {
          const qb = original.apply(target, args);
          return wrapQueryBuilder(qb);
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as unknown as ReadonlyRepo<T>;
}

const FORBIDDEN_QB_METHODS = new Set<string>([
  'update',
  'delete',
  'softDelete',
  'softRemove',
  'restore',
  'insert',
]);

function wrapQueryBuilder<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
): SelectQueryBuilder<T> {
  return new Proxy(qb, {
    get(target, prop, receiver) {
      const key = String(prop);
      if (FORBIDDEN_QB_METHODS.has(key)) {
        throw new Error(
          `[readonly-repo] Forbidden QueryBuilder method "${key}" — tools la read-only.`,
        );
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
