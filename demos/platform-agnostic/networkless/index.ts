import { Store, Query } from "../../../src/common/dist";

const store = new Store();
const sumQuery = store.createQuery<number[], number>(
  "sum",
  async (nums) => nums.reduce((prev, curr) => prev + curr),
  [0]
);

let refreshes = 0;
let fetches = 0;

setInterval(() => {
  sumQuery.body = [Math.random(), Math.random(), Math.random()];
  refreshes++;
}, 500);

setInterval(async () => {
  fetches++;
  console.log(`Result: ${(await sumQuery.getResult())}`);
  console.log(`\tFetches: ${fetches}`);
  console.log(`\tRefreshes: ${refreshes}`);
}, 100);
