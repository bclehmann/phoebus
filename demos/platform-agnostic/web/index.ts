import { WebQuery } from "@phoebusjs/phoebus-web";

interface Response {
  data: User;
  support: Support;
}

interface Support {
  url: string;
  text: string;
}

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar: string;
}

const apiDelay = 1;

// See https://reqres.in/ for a mock API
const getUserUri = (id: number) =>
  `https://reqres.in/api/users/${id}?delay=${apiDelay}`;
const query = new WebQuery<{}, Response>(getUserUri(1), "GET");

let i = 1;

setInterval(async () => {
  const start = Date.now();
  const res = await query.getResult();
  console.log(`ID: ${i}`);
  console.log(`Email: ${res!.body.data.email}`);
  console.log(`Time Taken: ${Date.now() - start}ms\n`);

  i %= 3;
  i++;
  query.uri = getUserUri(i);
}, 2000);
