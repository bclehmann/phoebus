/**
 * A convenience type for functions who's results are cached.
 */
export type Resolver<TRequestBody, TResult> = (
  body: TRequestBody
) => Promise<TResult>;

/**
 * This class represents a query who's result is cached by a Store.
 * 
 * Do not instantiate this class directly. Instead, get an instance from `Store.createQuery`.
 */
export class Query<TRequestBody, TResult> {
  body: TRequestBody;

  private promiseInFlight: Promise<CacheResult<TResult> | null> | null = null;
  private readonly resolver: Resolver<TRequestBody, TResult>;
  private readonly getter: (body: TRequestBody) => CacheResult<TResult> | null;
  private readonly setter: (body: TRequestBody, value: TResult) => void;

  /**
   * This constructor is for internal use only. No guarantees are made that it will not change in non-breaking releases
   */
  constructor(
    resolver: Resolver<TRequestBody, TResult>,
    body: TRequestBody,
    getter: (body: TRequestBody) => CacheResult<TResult> | null,
    setter: (body: TRequestBody, value: TResult) => void
  ) {
    this.resolver = resolver;
    this.body = body;
    this.getter = getter;
    this.setter = setter;
  }

  /**
   * Returns the result of the query. This function will cache the result by default if the body has not changed since the last fetch.
   * @param forceRefetch - Determines whether to recompute the query, even if the cache is valid.
   * @returns TResult - The result of the query.
   */
  getResult: (forceRefetch?: boolean) => Promise<TResult | undefined> = async (
    forceRefetch
  ) => {
    if (this.promiseInFlight && !forceRefetch) {
      return this.promiseInFlight.then((res) => res.value);
    }

    const cachedResult = this.getter(this.body);
    if (forceRefetch || !cachedResult.found) {
      await this.updateStore();
    }

    return this.getter(this.body)!.value;
  };

  private executeQuery: () => Promise<TResult> = async () => {
    return await this.resolver(this.body);
  };

  private updateStore: () => Promise<void> = async () => {
    this.promiseInFlight = this.executeQuery().then(
      (r) => new CacheResult(true, r)
    );
    const result = await this.promiseInFlight;
    this.setter(this.body, result.value);
    this.promiseInFlight = null;
  };
}

/**
 * Represents a smart cache. An instance of this class is required for any cached queries.
 */
export class Store {
  private data: { [storageKey: string]: StoreEntry<any, any> };
  private usedKeys: Set<string>;

  /**
   * Instantiates a new Store object
   */
  constructor() {
    this.data = {};
    this.usedKeys = new Set();
  }

  /**
   * Creates a query, which is used to smartly cache the results of functions.
   *
   * @param this - This parameter cannot be filled in by client code. This prevents use if the this context has been redefined.
   * @param storageKey - The key in the cache for this query. Must be unique within a store.
   * @param resolver - The function to call in order to resolve the query. This function is not called until the first request.
   * @param initialBody - The initial parameter used.
   * @returns Query<TRequestBody, TResult>
   */
  createQuery<TRequestBody, TResult>(
    this: Store,
    storageKey: string,
    resolver: (body: TRequestBody) => Promise<TResult>,
    initialBody: TRequestBody
  ) {
    if (this.usedKeys.has(storageKey)) {
      throw new Error(
        `The storageKey ${storageKey} is already in use in this store. Storage keys must be unique.`
      );
    }

    this.usedKeys.add(storageKey);
    this.data[storageKey] = new StoreEntry<TRequestBody, TResult>();

    return new Query(
      resolver,
      initialBody,
      (body: TRequestBody) =>
        this.getValue<TRequestBody, TResult>(storageKey, body),
      (body: TRequestBody, value: TResult) =>
        this.setValue<TRequestBody, TResult>(storageKey, body, value)
    );
  }

  private setValue<TRequestBody, TResult>(
    this: Store,
    key: string,
    body: TRequestBody,
    value: TResult
  ) {
    this.data[key].set(body, value);
  }

  /**
   * Gets a value from the store, given its storage key. This will never trigger a refetch even if the cache is dirty.
   *
   * @param this - This parameter cannot be filled in by client code. This prevents use if the this context has been redefined.
   * @param storageKey - The key of the entry to fetch.
   * @param body - The body of the request you want to retrieve.
   * @returns CacheResult<TResult> - The most recent value associated with this key, or an empty cache result if it does not exist.
   */
  getValue<TRequestBody, TResult>(
    this: Store,
    storageKey: string,
    body: TRequestBody
  ) {
    if (!(storageKey in this.data)) {
      throw new Error("The storage key does not exist in this store");
    }

    return this.data[storageKey].get(body) as CacheResult<TResult>;
  }

  /**
   * Gets the most recent value from the store, given its storage key. This will never trigger a refetch even if the cache is dirty.
   * @param this
   * @param storageKey - The key of the entry to fetch.
   * @returns CacheResult<TResult> - The most recent value associated with this key, or an empty cache result if it does not exist.
   */
  getCurrentValue<TResult>(this: Store, storageKey: string) {
    if (!(storageKey in this.data)) {
      throw new Error("The storage key does not exist in this store");
    }

    return this.data[storageKey].getLast() as CacheResult<TResult>;
  }
}

class StoreEntry<TRequestBody, TResult> {
  private data: { [stringifiedBody: string]: TResult };
  private lastSetKey: string | null;

  constructor() {
    this.data = {};
    this.lastSetKey = null;
  }

  get(this: StoreEntry<TRequestBody, TResult>, body: TRequestBody) {
    const key = JSON.stringify(body);
    return this.getWithStringKey(key);
  }

  set(
    this: StoreEntry<TRequestBody, TResult>,
    body: TRequestBody,
    value: TResult
  ) {
    this.setWithStringKey(JSON.stringify(body), value);
  }

  getLast(this: StoreEntry<TRequestBody, TResult>) {
    if (this.lastSetKey === null) {
      return CacheResult.notFound
    }

    return this.getWithStringKey(this.lastSetKey);
  }

  private getWithStringKey(
    this: StoreEntry<TRequestBody, TResult>,
    key: string
  ) {
    return new CacheResult(key in this.data, this.data[key]);
  }

  private setWithStringKey(
    this: StoreEntry<TRequestBody, TResult>,
    key: string,
    value: TResult
  ) {
    this.data[key] = value;
    this.lastSetKey = key;
  }
}

export class CacheResult<TResult> {
  found: boolean;
  value?: TResult;
  static readonly notFound = new CacheResult(false);

  constructor(found: boolean, value?: TResult) {
    this.found = found;
    this.value = value;
  }
}
