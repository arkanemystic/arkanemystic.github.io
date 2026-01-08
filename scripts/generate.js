/**
 * Simple generator: reads markdown files from --src, writes HTML files to --out
 * - Uses gray-matter for frontmatter
 * - Uses marked to render Markdown
 * - Uses sanitize-html for HTML sanitization
 *
 * Usage:
 *   node scripts/generate.js --src journal/entries --out docs/blog
 */
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const matter = require('gray-matter');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function formatDate(d) {
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}

async function ensureDir(dir) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (e) {}
}

async function generate({ src, out }) {
  await ensureDir(out);
  const files = (await readdir(src)).filter(f => /\.md$/i.test(f));

  const posts = [];

  for (const fname of files) {
    const fpath = path.join(src, fname);
    const content = await readFile(fpath, 'utf8');
    const fm = matter(content);
    const title = fm.data.title || fname.replace(/\.md$/i, '').replace(/-/g, ' ');
    const date = fm.data.date || (await (async () => {
      try {
        const s = await stat(fpath);
        return s.mtime.toISOString();
      } catch { return null; }
    })());
    const slug = fm.data.slug || slugify(title);
    const htmlRaw = marked.parse(fm.content || '');
    const htmlSafe = sanitizeHtml(htmlRaw, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img' ]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ['src','alt','title','width','height']
      }
    });

    const pageHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)} — Journal</title>
  <link rel="stylesheet" href="/assets/blog.css" />
</head>
<body>
  <header style="padding:12px;background:#0b0b0f;color:#fff;">
    <a href="/" style="color:#9aa0a6;text-decoration:none">← home</a>
    <h1 style="display:inline-block;margin-left:12px">${escapeHtml(title)}</h1>
    <div style="margin-top:6px;color:#9aa0a6">${formatDate(date)}</div>
  </header>
  <main style="max-width:900px;margin:28px auto;padding:0 16px;">
    <article>${htmlSafe}</article>
  </main>
  <footer style="max-width:900px;margin:28px auto;padding:0 16px;color:#9aa0a6">Generated from private journal</footer>
</body>
</html>`;

    const outFile = path.join(out, `${slug}.html`);
    await writeFile(outFile, pageHtml, 'utf8');

    posts.push({
      title,
      slug,
      date,
      excerpt: fm.data.excerpt || fm.content.split('\n').find(Boolean)?.slice(0,200) || '',
      href: `./${slug}.html`
    });
  }

  // Generate index page
  posts.sort((a,b) => (b.date || '').localeCompare(a.date || ''));
  const indexItems = posts.map(p => `<li style="margin-bottom:12px"><a href="${p.href}">${escapeHtml(p.title)}</a> <div style="color:#767676;font-size:0.9rem">${formatDate(p.date)}</div><p style="color:#9aa0a6">${escapeHtml(p.excerpt)}</p></li>`).join('\n');

  const indexHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Journal — Blog</title>
  <link rel="stylesheet" href="/assets/blog.css" />
</head>
<body>
  <header style="padding:12px;background:#0b0b0f;color:#fff;">
    <a href="/" style="color:#9aa0a6;text-decoration:none">← home</a>
    <h1 style="display:inline-block;margin-left:12px">Journal</h1>
  </header>
  <main style="max-width:900px;margin:28px auto;padding:0 16px;">
    <ul style="list-style:none;padding:0;margin:0">${indexItems}</ul>
  </main>
  <footer style="max-width:900px;margin:28px auto;padding:0 16px;color:#9aa0a6">Generated from private journal</footer>
</body>
</html>`;

  await writeFile(path.join(out, 'index.html'), indexHtml, 'utf8');
  console.log(`Generated ${posts.length} posts to ${out}`);
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { src: 'journal/entries', out: 'docs/blog' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--src') out.src = args[++i];
    if (args[i] === '--out') out.out = args[++i];
  }
  return out;
}

(async () => {
  try {
    const args = parseArgs();
    await generate(args);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();