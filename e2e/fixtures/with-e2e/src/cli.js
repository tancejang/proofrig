const add = require('./add');

const [a, b] = process.argv.slice(2).map(Number);
console.log(add(a, b));
