import { jest, describe, it, expect } from "@jest/globals";
import { Store } from "../../src/common/dist";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe("avoids unnecessary refetches", () => {
  let counter = 0;
  const store = new Store();
  const query = store.createQuery(
    "foo",
    async () => {
      await sleep(500);
      return counter++;
    },
    {}
  );

  it("doesn't invoke if a promise is in flight", () => {
    return Promise.all([
      query.getResult().then((r) => expect(r).toEqual(0)),
      query.getResult().then((r) => expect(r).toEqual(0)),
      query.getResult().then((r) => expect(r).toEqual(0)),
      query.getResult().then((r) => expect(r).toEqual(0)),
      query.getResult().then((r) => expect(r).toEqual(0)),
      query.getResult().then((r) => expect(r).toEqual(0)),
    ]);
  });

  it("respects forceRefresh", () => {
    return Promise.all([
      query.getResult(true).then((r) => expect(r).toEqual(1)),
      query.getResult(true).then((r) => expect(r).toEqual(2)),
      query.getResult(true).then((r) => expect(r).toEqual(3)),
    ]);
  });
});

export {};
