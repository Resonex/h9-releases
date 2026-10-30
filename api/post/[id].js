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
    "coverImageUrl",
    "coverImageURL",
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

function renderInlineMarkdown(value) {
  const pattern =
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|`([^`]+)`|\*([^*\n]+)\*/g;
  let html = "";
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(value))) {
    html += escapeHtml(value.slice(lastIndex, match.index));
    if (match[1]) {
      try {
        const url = new URL(match[2]);
        if (url.protocol === "https:" || url.protocol === "http:") {
          html += `<a href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(match[1])}</a>`;
        } else {
          html += escapeHtml(match[0]);
        }
      } catch {
        html += escapeHtml(match[0]);
      }
    } else if (match[3] || match[4]) {
      html += `<strong>${escapeHtml(match[3] || match[4])}</strong>`;
    } else if (match[5]) {
      html += `<del>${escapeHtml(match[5])}</del>`;
    } else if (match[6]) {
      html += `<code>${escapeHtml(match[6])}</code>`;
    } else {
      html += `<em>${escapeHtml(match[7])}</em>`;
    }
    lastIndex = pattern.lastIndex;
  }

  return html + escapeHtml(value.slice(lastIndex));
}

function renderMarkdown(value) {
  const lines = value.split(/\r?\n/);
  const blocks = [];
  let paragraph = [];
  let listType = "";
  let listItems = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(`<p>${paragraph.map(renderInlineMarkdown).join("<br>")}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (listItems.length) {
      const tag = listType === "ordered" ? "ol" : "ul";
      blocks.push(
        `<${tag}>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</${tag}>`,
      );
      listItems = [];
      listType = "";
    }
  };

  for (const line of lines) {
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const unorderedItem = line.match(/^\s*[-+*]\s+(.+)$/);
    const orderedItem = line.match(/^\s*\d+[.)]\s+(.+)$/);

    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      blocks.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
    } else if (unorderedItem || orderedItem) {
      flushParagraph();
      const nextType = orderedItem ? "ordered" : "unordered";
      if (listType && listType !== nextType) {
        flushList();
      }
      listType = nextType;
      listItems.push((unorderedItem || orderedItem)[1]);
    } else if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push(`<blockquote>${renderInlineMarkdown(line.replace(/^\s*>\s?/, ""))}</blockquote>`);
    } else if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push("<hr>");
    } else if (!line.trim()) {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line);
    }
  }

  flushParagraph();
  flushList();
  return blocks.join("");
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
  const previewText =
    firstText(post, ["excerpt", "summary", "description"]) || content;
  const preview =
    [...previewText].length > 320
      ? `${[...previewText].slice(0, 320).join("").trimEnd()}…`
      : previewText;
  const description =
    preview || "Open this community post in the H9 app.";
  const excerpt = description.replace(/\s+/g, " ").slice(0, 200);
  const image = firstImage(post);
  const postUrl = `${SITE_URL}/post/${encodeURIComponent(id)}`;
  const appUrl = `h9://post/${encodeURIComponent(id)}`;
  const author =
    firstText(post, ["authorName", "displayName", "username"]) ||
    textValue(post.author && (post.author.displayName || post.author.name || post.author));
  const contentHtml = preview
    ? renderMarkdown(preview)
    : "<p>Open this community post in the H9 app to view its details.</p>";

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
    .card{background:#121620;border:1px solid #232836;border-radius:16px;padding:24px;max-width:640px;width:100%}
    .eyebrow{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8b8b94;margin:0 0 16px}
    .post{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:20px;align-items:start}
    .title{font-size:20px;font-weight:700;color:#00e5ff;margin:0 0 8px}
    .author{font-size:13px;color:#8b8b94;margin:0 0 14px}
    .markdown-body{font-size:14px;color:#c5c7d0;line-height:1.6;overflow-wrap:anywhere}
    .markdown-body p{margin:0 0 12px}
    .markdown-body h1,.markdown-body h2,.markdown-body h3{color:#f4f7fd;line-height:1.3;margin:16px 0 8px}
    .markdown-body h1{font-size:18px}.markdown-body h2{font-size:16px}.markdown-body h3{font-size:15px}
    .markdown-body a{color:#58a6ff;text-decoration:none}
    .markdown-body a:hover{text-decoration:underline}
    .markdown-body code{background:#1b2230;border-radius:4px;padding:2px 5px;color:#d2a8ff;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.92em}
    .markdown-body ul,.markdown-body ol{margin:0 0 12px;padding-left:22px}
    .markdown-body blockquote{margin:0 0 12px;padding-left:12px;border-left:3px solid #303b50;color:#9da8bb}
    .markdown-body hr{border:0;border-top:1px solid #303b50;margin:12px 0}
    .post-image{display:block;width:150px;height:150px;object-fit:cover;border-radius:12px;background:#1a1f2c;border:1px solid #232836}
    .post-image-fallback{display:grid;place-items:center;color:#8b8b94;font-size:12px;text-align:center;padding:12px}
    .btn{color:#fff;font-weight:700;text-decoration:none;padding:14px 20px;border-radius:12px;display:block;margin-top:20px;text-align:center}
    .btn-open{background:linear-gradient(135deg,#00a9c2,#8128a8)}
    .btn-download{background:#1a1f2c;color:#c5c7d0;font-size:13px;margin-top:10px}
    @media(max-width:520px){.post{grid-template-columns:minmax(0,1fr) 96px;gap:12px}.post-image{width:96px;height:96px}.card{padding:18px}}
  </style>
</head>
<body>
  <main class="card">
    <p class="eyebrow">H9 Community Post</p>
    <section class="post">
      <div>
        <h1 class="title">${escapeHtml(title)}</h1>
        ${author ? `<p class="author">By ${escapeHtml(author)}</p>` : ""}
        <div class="markdown-body">${contentHtml}</div>
      </div>
      <img src="${escapeHtml(image)}" class="post-image" alt="Image for ${escapeHtml(title)}" loading="eager">
    </section>
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
