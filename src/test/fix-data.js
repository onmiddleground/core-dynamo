const data = require("./data.json");
const fs = require("fs");

const newItems = [];
for (let item of data) {
  const keys = Object.keys(item);
  for (let key of keys) {
    item[key] = { "S" : item[key] }
  }
  newItems.push(JSON.stringify(item));
}
const formatted = "[" + newItems.join(",") + "]";
// console.log(formatted);
fs.writeFileSync("./fixed-data.json",formatted);
