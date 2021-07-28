export type Resolver<TRequestBody, TResult> = (
  body: TRequestBody
) => Promise<TResult>;

export class Query<TRequestBody, TResult> {
  private _body: TRequestBody;
  private cacheIsDirty: boolean;
  private promiseInFlight: Promise<TResult> | null;
  private readonly resolver: Resolver<TRequestBody, TResult>;
  private readonly getter: (body: TRequestBody) => TResult;
  private readonly setter: (body: TRequestBody, value: TResult) => void;

  constructor(
    resolver: Resolver<TRequestBody, TResult>,
    body: TRequestBody,
    getter: (body: TRequestBody) => TResult,
    setter: (body: TRequestBody, value: TResult) => void
  ) {
    this.resolver = resolver;
    this._body = body;
    this.getter = getter;
    this.setter = setter;
    this.cacheIsDirty = true;
  }

  get body(): TRequestBody {
    return this._body;
  }

  set body(newBody: TRequestBody) {
    this._body = newBody;
    this.cacheIsDirty = true;
  }

  /**
   * Returns the result of the query. This function will cache the result by default if the body has not changed since the last fetch.
   * @param forceRefetch - Determines whether to recompute the query, even if the cache is valid.
   * @returns TResponse - The result of the query.
   */
  getResult: (forceRefetch?: boolean) => Promise<TResult> = async (
    forceRefetch
  ) => {
    if (this.promiseInFlight && !forceRefetch) {
      return this.promiseInFlight;
    }

    if (forceRefetch || this.cacheIsDirty) {
      await this.updateStore();
    }

    return this.getter(this.body);
  };

  private executeQuery: () => Promise<TResult> = async () => {
    return await this.resolver(this._body);
  };

  private updateStore: () => Promise<void> = async () => {
    this.promiseInFlight = this.executeQuery();
    const result = await this.promiseInFlight;
    this.setter(this.body, result);
    this.cacheIsDirty = false;
    this.promiseInFlight = null;
  };
}

/**
 * Represents a smart cache. An instance of this class is required for any cached queries.
 */
export class Store {
  private data: { [storageKey: string]: StoreEntry<any, any> };
  private usedKeys: Set<string>;

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
   * @returns TResult | null - The value associated with this key, or null if it does not exist.
   */
  getValue<TRequestBody, TResult>(
    this: Store,
    key: string,
    body: TRequestBody
  ) {
    return key in this.data ? (this.data[key].get(body) as TResult) : null;
  }

  /**
   * Gets the most recent value from the store, given its storage key.
   * @param this
   * @param storageKey - The key of the entry to fetch.
   * @returns TResult | null - The most recent value associated with this key, or null if it does not exist.
   */
  getCurrentValue<TResult>(this: Store, storageKey: string) {
    return storageKey in this.data ? this.data[storageKey].getLast() : null;
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
      return null;
    }

    return this.getWithStringKey(this.lastSetKey);
  }

  private getWithStringKey(
    this: StoreEntry<TRequestBody, TResult>,
    key: string
  ) {
    return key in this.data ? this.data[key] : null;
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
