const fs = require('fs');
const p = 'dist/index.html';
if (fs.existsSync(p)) {
  let s = fs.readFileSync(p, 'utf8');
  s = s.replace(/css\/style\.css/g, 'css/style.min.css').replace(/js\/app\.js/g, 'js/app.min.js');
  fs.writeFileSync(p, s);
  console.log('Updated dist/index.html asset links');
} else {
  console.log('dist/index.html not found, skipping');
}
