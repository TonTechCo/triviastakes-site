/**
 * Trivia Stakes share page — the per-result link behind "Share the win" /
 * "Share the result". Must run on a host that serves real HTML (Supabase
 * forces text/plain + a sandbox CSP on HTML, so crawlers never see the tags
 * there). Written for Deno Deploy; it is plain `Deno.serve`, so it also runs
 * anywhere Deno does. Deploy:
 *
 *   Deno Deploy → Create an App → this repo → entrypoint share/main.ts
 *
 * then point the app at it: SHARE_PAGE_BASE in src/services/winShare.ts.
 *
 *   GET /?i=<uid/file.jpg>&t=<title>&d=<description>&to=<landing url>
 *
 * Everyone gets a small HTML page: Open Graph tags whose image is the card
 * the app captured and uploaded to the public `shares` bucket, a title and
 * description for the result, and a script that sends people on to the
 * landing page (store buttons; opens the app). Crawlers do not run script,
 * so they keep reading the tags. No user-agent sniffing, no meta refresh
 * (Meta's fetcher follows that like a redirect).
 */

const STORAGE = 'https://xhzfuhnphbrjnfsqmgwk.supabase.co/storage/v1/object/public/shares';
const SITE = 'https://tontechco.github.io/triviastakes-site';
const LANDING_PREFIX = `${SITE}/t/`;
const FALLBACK_IMAGE = `${SITE}/img/icon-512.png`;

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

Deno.serve((req) => {
  const url = new URL(req.url);
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  if (url.pathname === '/healthz') return new Response('ok');

  const image = url.searchParams.get('i') ?? '';
  const title = (url.searchParams.get('t') ?? 'Trivia Stakes').slice(0, 120);
  const description = (url.searchParams.get('d') ?? 'Beat my score on Trivia Stakes.').slice(0, 300);
  const to = url.searchParams.get('to') ?? '';
  const landing = to.startsWith(LANDING_PREFIX) || to === `${SITE}/` ? to : LANDING_PREFIX;
  const imageUrl = /^[0-9a-f-]{36}\/[A-Za-z0-9_-]{1,64}\.(png|jpg)$/.test(image) ? `${STORAGE}/${image}` : FALLBACK_IMAGE;

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="Trivia Stakes">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(imageUrl)}">
<meta property="og:image:width" content="1080">
<meta property="og:image:height" content="1080">
<meta property="og:url" content="${esc(url.toString())}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(imageUrl)}">
<style>body{font-family:-apple-system,system-ui,sans-serif;background:#0F1A2E;color:#F2F4F8;margin:0;padding:24px;text-align:center}img{max-width:min(100%,420px);border-radius:16px}a{color:#F2A93B}</style>
</head><body>
<p><img src="${esc(imageUrl)}" alt=""></p>
<p><a href="${esc(landing)}">${esc(title)}</a></p>
<script>setTimeout(function(){location.replace(${JSON.stringify(landing)});},150);</script>
</body></html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
});
