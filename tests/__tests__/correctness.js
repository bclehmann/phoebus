import { jest, describe, it, expect } from "@jest/globals";
import { Store } from "../../src/common/dist";

describe("produces correct output", () => {
  let count = 0;
  const identityFunction = (x) => x;
  const countingFunction = () => count++;
  
  const store = new Store();
  const identityQuery = store.createQuery("identityQuery", identityFunction, "A");
  const countingQuery = store.createQuery("countingQuery", countingFunction, {});

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
})
