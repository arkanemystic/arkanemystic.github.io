#!/usr/bin/env node
/**
 * update.js — regenerates blog-index.json and photos-data.json
 *
 * Usage:
 *   node scripts/update.js            # update both blog and photos
 *   node scripts/update.js --blog     # blog only
 *   node scripts/update.js --photos   # photos only
 *
 * Cloudinary credentials (required for --photos):
 *   Set as environment variables before running, or create a .env file:
 *     CLOUDINARY_CLOUD_NAME=your_cloud_name
 *     CLOUDINARY_API_KEY=your_api_key
 *     CLOUDINARY_API_SECRET=your_api_secret
 */

const fs      = require('fs');
const path    = require('path');
const matter  = require('gray-matter');
const { marked }       = require('marked');
const sanitizeHtml     = require('sanitize-html');

marked.setOptions({ mangle: false, headerIds: false });

const ROOT = path.join(__dirname, '..');

// ── Load .env if present ──────────────────────────────────────────────────────
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function formatDate(d) {
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return ''; }
}

function renderMarkdown(mdContent) {
  const html = marked.parse(mdContent || '');
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title', 'width', 'height'],
    },
  });
}

// ── Blog ──────────────────────────────────────────────────────────────────────
async function updateBlog() {
  const blogDir   = path.join(ROOT, 'blog');
  const indexPath = path.join(ROOT, 'blog-index.json');

  if (!fs.existsSync(blogDir)) {
    console.log('No blog/ directory found — skipping blog update.');
    return;
  }

  const files = fs.readdirSync(blogDir).filter(f => /\.md$/i.test(f));
  if (!files.length) {
    console.log('No .md files in blog/ — writing empty index.');
    fs.writeFileSync(indexPath, JSON.stringify({ posts: [] }, null, 2));
    return;
  }

  const posts = files.map(fname => {
    const fpath   = path.join(blogDir, fname);
    const raw     = fs.readFileSync(fpath, 'utf8');
    const fm      = matter(raw);
    const title   = fm.data.title || fname.replace(/\.md$/i, '').replace(/-/g, ' ');
    const date    = fm.data.date
      ? new Date(fm.data.date).toISOString()
      : fs.statSync(fpath).mtime.toISOString();
    const slug    = fm.data.slug || slugify(title);
    const excerpt = fm.data.excerpt
      || fm.content.split('\n').find(l => l.trim() && !l.startsWith('#'))?.slice(0, 200)
      || '';
    const html    = renderMarkdown(fm.content);

    return { title, slug, date, dateFormatted: formatDate(date), excerpt, html };
  });

  // Newest first
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  fs.writeFileSync(indexPath, JSON.stringify({ posts }, null, 2));
  console.log(`✓ blog-index.json — ${posts.length} post(s)`);
}

// ── Photos ────────────────────────────────────────────────────────────────────
async function updatePhotos() {
  const cloudName  = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey     = process.env.CLOUDINARY_API_KEY;
  const apiSecret  = process.env.CLOUDINARY_API_SECRET;
  const folder     = process.env.CLOUDINARY_FOLDER || 'photos';

  if (!cloudName || !apiKey || !apiSecret) {
    console.error(
      'Missing Cloudinary credentials.\n' +
      'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET\n' +
      'in your environment or in a .env file at the project root.'
    );
    process.exit(1);
  }

  const cloudinary = require('cloudinary').v2;
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  console.log(`Fetching photos from Cloudinary folder "${folder}"…`);
  let resources = [];
  let nextCursor;

  do {
    const opts = { type: 'upload', prefix: folder, max_results: 500 };
    if (nextCursor) opts.next_cursor = nextCursor;
    const res = await cloudinary.api.resources(opts);
    resources = resources.concat(res.resources || []);
    nextCursor = res.next_cursor;
  } while (nextCursor);

  const out = resources.map(r => ({
    public_id:  r.public_id,
    secure_url: r.format === 'heic'
      ? r.secure_url.replace('/upload/', '/upload/f_jpg,q_auto/')
      : r.secure_url,
    photo_date: r.created_at,
  }));

  // Newest first
  out.sort((a, b) => new Date(b.photo_date) - new Date(a.photo_date));

  const outPath = path.join(ROOT, 'photos-data.json');
  fs.writeFileSync(outPath, JSON.stringify({ resources: out }, null, 2));
  console.log(`✓ photos-data.json — ${out.length} photo(s)`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const args    = process.argv.slice(2);
  const blogOnly   = args.includes('--blog');
  const photosOnly = args.includes('--photos');
  const both = !blogOnly && !photosOnly;

  try {
    if (both || blogOnly)   await updateBlog();
    if (both || photosOnly) await updatePhotos();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
