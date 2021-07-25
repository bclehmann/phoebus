export interface StorageInformation {
  store: Store;
  storageKey: string;
}

export type Resolver<TRequestBody, TResult> = (
  body: TRequestBody
) => Promise<TResult>;

export class Query<TRequestBody, TResult> {
  readonly storageInfo: StorageInformation;

  private _body: TRequestBody;
  private cacheIsDirty: boolean;
  private readonly resolver: Resolver<TRequestBody, TResult>;

  constructor(
    storageInfo: StorageInformation,
    resolver: Resolver<TRequestBody, TResult>,
    body: TRequestBody
  ) {
    this.storageInfo = storageInfo;
    this.resolver = resolver;
    this._body = body;
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
    if (forceRefetch || this.cacheIsDirty) {
      await this.updateStore();
    }

    return this.storageInfo.store.getValue<TResult>(
      this.storageInfo.storageKey
    );
  };

  private executeQuery: () => Promise<TResult> = async () => {
    return await this.resolver(this._body);
  };

  private updateStore: () => Promise<void> = async () => {
    const result = await this.executeQuery();
    this.storageInfo.store.setValue(this.storageInfo.storageKey, result);
    this.cacheIsDirty = false;
  };
}

export class Store {
  private data: { [storageKey: string]: any };

  constructor() {
    this.data = {};
  }

  createQuery<TRequestBody, TResult>(
    this: Store,
    storageKey: string,
    resolver: (body: TRequestBody) => Promise<TResult>,
    initialBody: TRequestBody
  ) {
    return new Query(
      {
        store: this,
        storageKey,
      },
      resolver,
      initialBody
    );
  }

  setValue<T>(this: Store, key: string, value: T) {
    this.data[key] = value;
  }

  getValue<T>(this: Store, key: string) {
    return this.data[key] as T;
  }
}
