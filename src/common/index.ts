export type Resolver<TRequestBody, TResult> = (
  body: TRequestBody
) => Promise<TResult>;

export class Query<TRequestBody, TResult> {
  private _body: TRequestBody;
  private cacheIsDirty: boolean;
  private promiseInFlight: Promise<TResult> | null;
  private readonly resolver: Resolver<TRequestBody, TResult>;
  private readonly getter: () => TResult;
  private readonly setter: (value: TResult) => void;

  constructor(
    resolver: Resolver<TRequestBody, TResult>,
    body: TRequestBody,
    getter: () => TResult,
    setter: (value: TResult) => void
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

  getResult: (forceRefetch?: boolean) => Promise<TResult> = async (
    forceRefetch
  ) => {
    if (this.promiseInFlight && !forceRefetch) {
      return this.promiseInFlight;
    }

    if (forceRefetch || this.cacheIsDirty) {
      await this.updateStore();
    }

    return this.getter();
  };

  private executeQuery: () => Promise<TResult> = async () => {
    return await this.resolver(this._body);
  };

  private updateStore: () => Promise<void> = async () => {
    this.promiseInFlight = this.executeQuery();
    const result = await this.promiseInFlight;
    this.setter(result);
    this.cacheIsDirty = false;
    this.promiseInFlight = null;
  };
}

export class Store {
  private data: { [storageKey: string]: any };
  private usedKeys: Set<string>;

  constructor() {
    this.data = {};
    this.usedKeys = new Set();
  }

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

    return new Query(
      resolver,
      initialBody,
      () => this.getValue<TResult>(storageKey),
      (value: TResult) => this.setValue<TResult>(storageKey, value)
    );
  }

  private setValue<T>(this: Store, key: string, value: T) {
    this.data[key] = value;
  }

  private getValue<T>(this: Store, key: string) {
    return this.data[key] as T;
  }
}
