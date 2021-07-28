import { jest, describe, it, expect } from "@jest/globals";
import { Store } from "../../src/common/dist";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getSlowCounter = () => {
  let counter = 0;
  const store = new Store();
  const slowCounter = store.createQuery(
    "slowCounter",
    async () => {
      await sleep(500);
      return counter++;
    },
    {}
  );

  return slowCounter;
}

describe("avoids unnecessary refetches", () => {
  it("doesn't invoke if a promise is in flight", () => {
    const slowCounter = getSlowCounter();

    return Promise.all([
      slowCounter.getResult().then((r) => expect(r).toEqual(0)),
      slowCounter.getResult().then((r) => expect(r).toEqual(0)),
      slowCounter.getResult().then((r) => expect(r).toEqual(0)),
      slowCounter.getResult().then((r) => expect(r).toEqual(0)),
      slowCounter.getResult().then((r) => expect(r).toEqual(0)),
      slowCounter.getResult().then((r) => expect(r).toEqual(0)),
    ]);
  });

  it("respects forceRefresh", () => {
    const slowCounter = getSlowCounter();

    return Promise.all([
      slowCounter.getResult(true).then((r) => expect(r).toEqual(0)),
      slowCounter.getResult(true).then((r) => expect(r).toEqual(1)),
      slowCounter.getResult(true).then((r) => expect(r).toEqual(2)),
    ]);
  });

  it("fetches old values from cache", async () => {
    const slowCounter = getSlowCounter();
    
    slowCounter.body = "0";
    await expect(await slowCounter.getResult()).toEqual(0);
    
    slowCounter.body = "1";
    await expect(await slowCounter.getResult()).toEqual(1);

    slowCounter.body = "0";
    await expect(await slowCounter.getResult()).toEqual(0);
  });
});

export {};
