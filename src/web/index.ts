import { Store, Query } from "@phoebusjs/phoebus-core";
import axios, { AxiosResponse } from "axios";

/**
 * Lists the supported HTTP methods
 */
export type HttpMethod = "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * Represents an HTTP response
 */
export interface HttpResponse<TBody> {
  body: TBody;
  statusCode: number;
  headers: { [key: string]: string };
}

interface RequestParams<TRequestBody> {
  uri: string;
  body: TRequestBody;
}

/**
 * A class for sending smartly-cached web queries.
 */
export class WebQuery<TRequestBody, TResponse> {
  public uri: string;
  public body: TRequestBody;

  private readonly httpMethod: HttpMethod;
  private readonly headers: { [key: string]: string };
  private readonly store: Store;
  private readonly query: Query<
    RequestParams<TRequestBody>,
    AxiosResponse<TResponse>
  >;

  constructor(
    uri: string,
    httpMethod: HttpMethod,
    initialBody?: TRequestBody,
    headers?: { [key: string]: string }
  ) {
    this.uri = uri;
    this.headers = headers;
    this.httpMethod = httpMethod;
    this.body = initialBody;
    this.store = new Store();
    this.query = this.store.createQuery<
      RequestParams<TRequestBody>,
      AxiosResponse<TResponse>
    >(
      "default",
      (params: { uri: string; body: TRequestBody }) =>
        sendAjaxRequest(params.uri, this.headers, this.httpMethod, params.body),
      { uri, body: initialBody }
    ); // This is ok because the store can only have one query
  }

  /**
   * Returns the result of the query. This function will cache the result by default if the body and URL have not changed since the last fetch.
   * @param forceRefetch - Determines whether to recompute the query, even if the cache is valid.
   * @returns HttpResponse<TResponse> - The result of the query.
   */
  getResult: (
    forceRefetch?: boolean
  ) => Promise<HttpResponse<TResponse> | undefined> = async (forceRefetch) => {
    this.query.body = { uri: this.uri, body: this.body };
    const res = await this.query.getResult();
    return {
      body: res.data,
      statusCode: res.status,
      headers: res.headers,
    };
  };
}

const sendAjaxRequest = (
  uri: string,
  headers: { [key: string]: string },
  method: HttpMethod,
  body?: any
) => {
  switch (method) {
    case "GET":
      return axios.get(uri, { headers });
    case "HEAD":
      return axios.head(uri, { headers });
    case "POST":
      return axios.post(uri, body, { headers });
    case "PUT":
      return axios.put(uri, body, { headers });
    case "DELETE":
      return axios.delete(uri, { headers });
    case "PATCH":
      return axios.patch(uri, body, { headers });
    default:
      throw new Error("Invalid or unsupported HTTP method");
  }
};
