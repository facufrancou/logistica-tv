const bcrypt = require('bcrypt');

const password = '';
const hash = bcrypt.hashSync(password, 10);

console.log(`Hash para '${password}':`);
console.log(hash);
