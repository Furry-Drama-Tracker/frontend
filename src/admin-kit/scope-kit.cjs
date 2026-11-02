const fs = require('fs');
const path = require('path');

const SCOPE = '.yuanli-admin';
const srcDir = path.join(__dirname, 'src', 'admin-kit');

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function scopeCss(css, scope) {
  let out = '';
  let i = 0;
  let buffer = '';
  const stack = [];

  const ctx = () => (stack.length ? stack[stack.length - 1].type : 'root');

  function prefixSelector(sel) {
    return sel
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        if (s === ':root' || s === 'html' || s === 'body') return scope;
        if (s.startsWith(scope)) return s;
        return `${scope} ${s}`;
      })
      .join(', ');
  }

  while (i < css.length) {
    const ch = css[i];

    if (ch === '{') {
      const sel = buffer.trim();
      buffer = '';
      let type = 'rule';
      if (sel[0] === '@') {
        type = /^@(keyframes|-webkit-keyframes|font-face|page|property|counter-style)/i.test(sel)
          ? 'verbatim'
          : 'at';
      }
      out += type === 'rule' && ctx() !== 'verbatim' ? `${prefixSelector(sel)} {` : `${sel} {`;
      stack.push({ type });
      i++;
      continue;
    }

    if (ch === '}') {
      if (buffer.trim()) out += buffer.trim();
      buffer = '';
      stack.pop();
      out += '}\n';
      i++;
      continue;
    }

    buffer += ch;
    i++;
  }

  return out;
}

for (const name of ['colors_and_type', 'components']) {
  const raw = fs.readFileSync(path.join(srcDir, `${name}.raw.css`), 'utf8');
  const scoped = scopeCss(stripComments(raw), SCOPE);
  fs.writeFileSync(path.join(srcDir, `${name}.css`), scoped, 'utf8');
  console.log(`${name}.css -> ${scoped.length} bytes`);
}
