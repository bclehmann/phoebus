import { jest, describe, it, expect } from "@jest/globals";
import { Store } from "../../src/core/dist";

describe("produces correct output", () => {
  let count = 0;
  const identityFunction = (x) => x;
  const countingFunction = () => count++;

  const store = new Store();
  const identityQuery = store.createQuery(
    "identityQuery",
    identityFunction,
    "A"
  );
  const countingQuery = store.createQuery(
    "countingQuery",
    countingFunction,
    {}
  );

  it("refetches on set", async () => {
    const res1 = await identityQuery.getResult();
    await expect(res1).toEqual("A");

    identityQuery.body = "B";

    const res2 = await identityQuery.getResult();
    await expect(res2).toEqual("B");
  });

  it("is idempotent if body is unupdated", async () => {
    const res = await countingQuery.getResult();
    await expect(res).toEqual(0);

    const res2 = await countingQuery.getResult();
    await expect(res2).toEqual(0);
  });

  it("respects forceUpdate", async () => {
    const res = await countingQuery.getResult();
    await expect(res).toEqual(0);

    const res2 = await countingQuery.getResult(true);
    await expect(res2).toEqual(1);
  });

  it("getValue throws if the StoreEntry does not exist", () => {
    return expect(() => store.getValue("invalid")).toThrow();
  });

  it("getValue and getCurrentValue return null if the Query has never ran", () => {
    const testQuery = store.createQuery("test", () => "A", "A");

    return Promise.all([
      expect(store.getValue("test", "A").found).toBe(false),
      expect(store.getCurrentValue("test").found).toBe(false),
    ]);
  });

  it("correctly fetches old data", async () => {
    identityQuery.body = "1";
    expect(await identityQuery.getResult()).toBe("1");

    identityQuery.body = "2";
    expect(await identityQuery.getResult()).toBe("2");

    identityQuery.body = "1";
    expect(await identityQuery.getResult()).toBe("1");
  })
});

describe("preserves invariants", () => {
  const identityFunction = (x) => x;
  const store = new Store();

  it("ensures storageKeys are always unique within a store", () => {
    return expect(() => {
      store.createQuery("key", identityFunction, {});
      store.createQuery("key", identityFunction, {});
    }).toThrow();
  });
});
