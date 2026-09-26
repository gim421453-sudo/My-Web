import type {
  TrustedTransaction,
  TrustedTransactionRunner,
} from "../../src/repositories/trustedTransaction.js";

function key(pathSegments: readonly string[]): string {
  return pathSegments.join("/");
}

function cloneStore(
  source: ReadonlyMap<string, Readonly<Record<string, unknown>>>,
): Map<string, Readonly<Record<string, unknown>>> {
  return new Map([...source].map(([path, data]) => [path, structuredClone(data)]));
}

export class MemoryTransactionRunner implements TrustedTransactionRunner {
  readonly store: Map<string, Readonly<Record<string, unknown>>>;
  readonly reads: string[] = [];
  readonly writes: string[] = [];

  constructor(
    fixtures: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {},
    private readonly fixtureNow: unknown = "fixture-now",
  ) {
    this.store = new Map(Object.entries(fixtures));
  }

  async run<T>(callback: (transaction: TrustedTransaction) => Promise<T>): Promise<T> {
    const pending = cloneStore(this.store);
    const pendingWrites: string[] = [];
    const transaction: TrustedTransaction = Object.freeze({
      now: this.fixtureNow,
      get: async (pathSegments: readonly string[]) => {
        const path = key(pathSegments);
        this.reads.push(path);
        const data = pending.get(path);
        return Object.freeze({ exists: Boolean(data), data });
      },
      queryEqual: async (
        pathSegments: readonly string[],
        field: string,
        value: string | number | boolean,
      ) => {
        const collectionPath = key(pathSegments);
        const prefix = `${collectionPath}/`;
        this.reads.push(`${collectionPath}?${field}==${String(value)}`);
        return Object.freeze([...pending.entries()]
          .filter(([path, data]) => (
            path.startsWith(prefix)
            && !path.slice(prefix.length).includes("/")
            && data[field] === value
          ))
          .map(([, data]) => Object.freeze({ exists: true, data })));
      },
      create: (
        pathSegments: readonly string[],
        data: Readonly<Record<string, unknown>>,
      ) => {
        const path = key(pathSegments);
        if (pending.has(path)) throw new Error("fixture-already-exists");
        pending.set(path, structuredClone(data));
        pendingWrites.push(path);
      },
      set: (
        pathSegments: readonly string[],
        data: Readonly<Record<string, unknown>>,
      ) => {
        const path = key(pathSegments);
        pending.set(path, structuredClone(data));
        pendingWrites.push(path);
      },
      update: (
        pathSegments: readonly string[],
        data: Readonly<Record<string, unknown>>,
      ) => {
        const path = key(pathSegments);
        const current = pending.get(path);
        if (!current) throw new Error("fixture-not-found");
        pending.set(path, Object.freeze({ ...current, ...structuredClone(data) }));
        pendingWrites.push(path);
      },
      delete: (pathSegments: readonly string[]) => {
        const path = key(pathSegments);
        if (!pending.has(path)) throw new Error("fixture-not-found");
        pending.delete(path);
        pendingWrites.push(path);
      },
    });

    const result = await callback(transaction);
    this.store.clear();
    for (const [path, data] of pending) this.store.set(path, data);
    this.writes.push(...pendingWrites);
    return result;
  }
}
