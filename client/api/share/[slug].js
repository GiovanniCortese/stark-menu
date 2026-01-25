export default async function handler(req, res) {
  const { slug } = req.query;

  const BACKEND = "https://stark-backend-gg17.onrender.com";
  const SITE = "https://www.cosaedovemangiare.it";

  try {
    const apiRes = await fetch(`${BACKEND}/api/menu/${encodeURIComponent(slug)}`);
    if (!apiRes.ok) return res.status(404).send("Not found");
    const data = await apiRes.json();

    const title = `${data.ristorante} | Menu Digitale`;
    const desc = "Sfoglia il menu e ordina comodamente dal tavolo.";
    const image =
      data?.style?.cover ||
      data?.style?.logo ||
      `${SITE}/default-share.jpg`;
    const url = `${SITE}/${slug}`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");

    res.status(200).send(`<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${esc(title)}</title>

  <meta name="description" content="${esc(desc)}"/>

  <meta property="og:title" content="${esc(title)}"/>
  <meta property="og:description" content="${esc(desc)}"/>
  <meta property="og:image" content="${esc(image)}"/>
  <meta property="og:url" content="${esc(url)}"/>
  <meta property="og:type" content="website"/>
  <meta property="og:site_name" content="cosaedovemangiare.it"/>

  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${esc(title)}"/>
  <meta name="twitter:description" content="${esc(desc)}"/>
  <meta name="twitter:image" content="${esc(image)}"/>

  <meta http-equiv="refresh" content="0; url=${esc(url)}">
</head>
<body>Redirecting…</body>
</html>`);
  } catch (e) {
    res.status(500).send("Error");
  }
}

function esc(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
