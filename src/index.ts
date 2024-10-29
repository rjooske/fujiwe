import { parse } from "csv-parse/browser/esm/sync";

console.log("hello");
const x = parse(`a,b
1,2
3,4`);
console.log(x);
