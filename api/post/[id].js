const DATABASE_URL = "https://h9-database-default-rtdb.firebaseio.com";
const SITE_URL = "https://hackin9.name.ng";
const DEFAULT_IMAGE = "https://i.ibb.co/GvWL4DFM/1010401853.png";
const DOWNLOAD_URL = `${SITE_URL}/download`;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function textValue(value) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value.map(textValue).filter(Boolean).join(" ");
  }

  if (value && typeof value === "object") {
    for (const key of ["text", "content", "body", "caption", "message"]) {
      const text = textValue(value[key]);
      if (text) {
        return text;
      }
    }
  }

  return "";
}

function firstText(post, fields) {
  for (const field of fields) {
    const text = textValue(post[field]);
    if (text) {
      return text;
    }
  }

  return "";
}

function firstImage(post) {
  for (const field of [
    "imageUrl",
    "imageURL",
    "photoUrl",
    "photoURL",
    "thumbnailUrl",
    "thumbnailURL",
    "mediaUrl",
    "mediaURL",
    "image",
    "photo",
    "thumbnail",
  ]) {
    const value = post[field];
    const candidate =
      typeof value === "string"
        ? value
        : value && typeof value === "object"
          ? value.url || value.downloadURL || value.downloadUrl
          : "";

    if (typeof candidate === "string") {
      try {
        const url = new URL(candidate);
        if (url.protocol === "https:" || url.protocol === "http:") {
          return url.href;
        }
      } catch {
        // Ignore invalid image URLs and use the site fallback.
      }
    }
  }

  return DEFAULT_IMAGE;
}

function renderError(message) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>H9 Community Post</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:#0a0a0c;color:#fff;font:16px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    main{max-width:480px;width:100%;padding:28px;box-sizing:border-box;text-align:center;background:#121620;border:1px solid #232836;border-radius:16px}
    a{color:#00e5ff}
  </style>
</head>
<body><main><h1>Post unavailable</h1><p>${escapeHtml(message)}</p><a href="${SITE_URL}/">Go to HACKIN9</a></main></body>
</html>`;
}

function renderPost(id, post) {
  const content = firstText(post, [
    "text",
    "content",
    "caption",
    "message",
    "body",
    "postText",
    "description",
  ]);
  const title =
    firstText(post, ["title", "headline"]) ||
    (content ? `${content.slice(0, 72)}${content.length > 72 ? "…" : ""}` : "H9 Community Post");
  const description =
    content || "Open this community post in the H9 app.";
  const excerpt = description.replace(/\s+/g, " ").slice(0, 200);
  const image = firstImage(post);
  const postUrl = `${SITE_URL}/post/${encodeURIComponent(id)}`;
  const appUrl = `h9://post/${encodeURIComponent(id)}`;
  const author =
    firstText(post, ["authorName", "displayName", "username"]) ||
    textValue(post.author && (post.author.displayName || post.author.name || post.author));
  const contentHtml = content
    ? escapeHtml(content).replace(/\r?\n/g, "<br>")
    : "Open this community post in the H9 app to view its details.";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0a0a0c">
  <meta name="robots" content="index,follow">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="HACKIN9">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(excerpt)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:alt" content="HACKIN9 community post">
  <meta property="og:url" content="${escapeHtml(postUrl)}">
  <link rel="canonical" href="${escapeHtml(postUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(excerpt)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <title>${escapeHtml(title)} | HACKIN9 Community</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0a0a0c;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .card{background:#121620;border:1px solid #232836;border-radius:16px;padding:28px;max-width:480px;width:100%;text-align:center}
    .logo{width:56px;height:56px;object-fit:cover;border-radius:14px;margin-bottom:12px}
    .title{font-size:20px;font-weight:700;color:#00e5ff;margin:0 0 8px}
    .author{font-size:13px;color:#8b8b94;margin:0 0 12px}
    .preview{font-size:14px;color:#c5c7d0;margin:0 0 24px;line-height:1.6;overflow-wrap:anywhere}
    .btn{color:#fff;font-weight:700;text-decoration:none;padding:14px 20px;border-radius:12px;display:block;margin-bottom:12px}
    .btn-open{background:linear-gradient(135deg,#00a9c2,#8128a8)}
    .btn-download{background:#1a1f2c;color:#c5c7d0;font-size:13px}
  </style>
</head>
<body>
  <main class="card">
    <img src="${escapeHtml(image)}" class="logo" alt="H9">
    <h1 class="title">${escapeHtml(title)}</h1>
    ${author ? `<p class="author">By ${escapeHtml(author)}</p>` : ""}
    <p class="preview">${contentHtml}</p>
    <a href="${escapeHtml(appUrl)}" class="btn btn-open">OPEN IN H9 APP</a>
    <a href="${DOWNLOAD_URL}" class="btn btn-download">Download H9 App (APK)</a>
  </main>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.status(405).send("Method Not Allowed");
    return;
  }

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (
    !id ||
    Buffer.byteLength(id, "utf8") > 768 ||
    /[.#$/[\]\u0000-\u001f\u007f]/.test(id)
  ) {
    res.status(400).send(renderError("The post link is invalid."));
    return;
  }

  const databaseUrl = `${DATABASE_URL}/community_posts/${encodeURIComponent(id)}.json`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let post;
  try {
    const response = await fetch(databaseUrl, { signal: controller.signal });
    if (!response.ok) {
      console.error("Firebase post request returned", response.status);
      res.setHeader("Cache-Control", "no-store");
      res.status(502).send(renderError("The post could not be loaded right now."));
      return;
    }

    try {
      post = await response.json();
    } catch (error) {
      console.error("Firebase returned invalid post data", error);
      res.setHeader("Cache-Control", "no-store");
      res.status(502).send(renderError("The post could not be loaded right now."));
      return;
    }
  } catch (error) {
    console.error("Firebase post request failed", error);
    res.setHeader("Cache-Control", "no-store");
    res.status(502).send(renderError("The post could not be loaded right now."));
    return;
  } finally {
    clearTimeout(timeout);
  }

  if (!post || typeof post !== "object" || Array.isArray(post)) {
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
    res.status(404).send(renderError("This post may have been removed or is unavailable."));
    return;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(200).send(renderPost(id, post));
};
