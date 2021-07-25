
export type Resolver<TRequestBody, TResult> = (
  body: TRequestBody
) => Promise<TResult>;

export class Query<TRequestBody, TResult> {
  private _body: TRequestBody;
  private cacheIsDirty: boolean;
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

    return this.getter();
  };

  private executeQuery: () => Promise<TResult> = async () => {
    return await this.resolver(this._body);
  };

  private updateStore: () => Promise<void> = async () => {
    const result = await this.executeQuery();
    this.setter(result);
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
