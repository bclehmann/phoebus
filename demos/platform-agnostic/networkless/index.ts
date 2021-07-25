import { Store, Query } from "../../../src/common/dist";

const store = new Store();
const sumQuery = store.createQuery<number[], number>(
  "sum",
  async (nums) => nums.reduce((prev, curr) => prev + curr),
  []
);

let refreshes = 0;
let fetches = 0;

console.log([1, 2, 3].reduce((prev, curr) => prev + curr))

setInterval(() => {
    sumQuery.body = [Math.random(), Math.random(), Math.random()]
    console.log(`Refresh #${++refreshes}: ${sumQuery.body}`);
}, 500);

setInterval(async () => {
    console.log(`Fetch #${++fetches}: ${await sumQuery.getResult()}`)
}, 100);