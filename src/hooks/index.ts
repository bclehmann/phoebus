import * as React from "react";
import { HttpMethod, HttpResponse, WebQuery } from "@phoebusjs/phoebus-web";

export interface WebQuerySettings {
  httpMethod: HttpMethod;
  headers?: { [key: string]: string };
  lazy?: boolean;
}

export interface QueryResults<TResponse> {
  data: TResponse;
  loading: boolean;
  loadedAtLeastOnce: boolean;
}

const defaultSettings: WebQuerySettings = {
  httpMethod: "GET",
};

export function useWebQuery<TRequestBody, TResponse>(
  settings?: WebQuerySettings
) {
  const [tick, forceUpdate] = React.useReducer((x) => x + 1, 0);

  const settingsOrDefault = settings ?? defaultSettings;
  const hookApi = React.useMemo(() => {
    return new WebQueryHookApiBackend<TRequestBody, TResponse>(
      settingsOrDefault
    );
  }, [settingsOrDefault]);

  const queryResults: QueryResults<TResponse> = {
    data: hookApi.data,
    loading: hookApi.loading,
    loadedAtLeastOnce: hookApi.loadedAtLeastOnce,
  };

  hookApi.promiseInFlight.then(() => forceUpdate());

  React.useEffect(() => {
    console.log("asd");
    forceUpdate();
  }, [queryResults.data, queryResults.loading, queryResults.loadedAtLeastOnce]);

  return [hookApi.api, queryResults] as [
    WebQueryHookApi<TRequestBody, TResponse>,
    QueryResults<TResponse>
  ];
}

export class WebQueryHookApiBackend<TRequestBody, TResponse> {
  private query: WebQuery<TRequestBody, TResponse> | null = null;
  private readonly settings: WebQuerySettings;
  private _uri: string | undefined = undefined;

  public api = new WebQueryHookApi<TRequestBody, TResponse>(this);

  public get uri(): string | undefined {
    return this._uri;
  }

  public set uri(v: string) {
    this._uri = v;
    if (!this.settings.lazy) {
      this.fetchResult();
    }
  }

  public get body(): TRequestBody | undefined {
    return this._body;
  }

  public set body(v: TRequestBody) {
    this._body = v;
    if (!this.settings.lazy) {
      this.fetchResult();
    }
  }

  private _body: TRequestBody | undefined = undefined;

  public promiseInFlight: Promise<HttpResponse<TResponse>> | undefined;
  public data: TResponse | undefined = undefined;
  public loading: boolean = false;
  public loadedAtLeastOnce: boolean = false;

  public fetchResult = () => {
    if (this.query === null) {
      this.query = new WebQuery(
        this._uri,
        this.settings.httpMethod,
        this._body,
        this.settings.headers
      );
    }

    this.query.uri = this._uri;
    this.query.body = this._body;
    this.promiseInFlight = this.query.getResult();
    this.promiseInFlight.then((v) => {
      this.data = v.body;
      this.loadedAtLeastOnce = true;
      this.loading = false;
    });
  };

  constructor(settings: WebQuerySettings) {
    this.settings = settings;
  }
}

export class WebQueryHookApi<TRequestBody, TResponse> {
  private readonly api: WebQueryHookApiBackend<TRequestBody, TResponse>;

  constructor(api: WebQueryHookApiBackend<TRequestBody, TResponse>) {
    this.api = api;
  }

  public get uri(): string | undefined {
    return this.api.uri;
  }

  public set uri(v: string) {
    this.api.uri = v;
  }

  public get body(): TRequestBody | undefined {
    return this.api.body;
  }

  public set body(v: TRequestBody) {
    this.api.body = v;
  }

  public fetchResult = () => {
    this.api.fetchResult();
  };
}
