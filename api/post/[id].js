const DATABASE_URL = "https://h9-database-default-rtdb.firebaseio.com";
const SITE_URL = "https://hackin9.name.ng";
const DEFAULT_IMAGE = `${SITE_URL}/post-placeholder.svg`;
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

function validImageUrl(value) {
  if (typeof value !== "string" || value.length > 2048) {
    return "";
  }

  try {
    const url = new URL(value);
    if (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password
    ) {
      return url.href;
    }
  } catch {
    return "";
  }

  return "";
}

function imageDisplayUrl(value) {
  const imageUrl = validImageUrl(value);
  if (!imageUrl) {
    return DEFAULT_IMAGE;
  }

  try {
    const host = new URL(imageUrl).hostname.toLowerCase();
    if (
      [
        "i.ibb.co",
        "i.imgur.com",
        "images.unsplash.com",
        "lh3.googleusercontent.com",
        "res.cloudinary.com",
        "firebasestorage.googleapis.com",
        "storage.googleapis.com",
      ].includes(host)
    ) {
      return `${SITE_URL}/api/post-image?url=${encodeURIComponent(imageUrl)}`;
    }
  } catch {
    return DEFAULT_IMAGE;
  }

  return imageUrl;
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

function firstImage(post, directImage) {
  const queryImage = validImageUrl(directImage);
  if (queryImage) {
    return queryImage;
  }

  const imageFields = [
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
    "media",
    "images",
    "photos",
    "attachments",
  ];
  const queue = imageFields
    .map((field) => ({ value: post[field], depth: 0 }))
    .filter((entry) => entry.value);
  let inspected = 0;

  while (queue.length && inspected < 40) {
    const { value, depth } = queue.shift();
    inspected += 1;
    const imageUrl = validImageUrl(value);
    if (imageUrl) {
      return imageUrl;
    }

    if (value && typeof value === "object" && depth < 3) {
      for (const field of [
        "url",
        "src",
        "imageUrl",
        "imageURL",
        "photoUrl",
        "photoURL",
        "downloadURL",
        "downloadUrl",
        "originalUrl",
        "fullUrl",
        "previewUrl",
      ]) {
        if (value[field]) {
          queue.push({ value: value[field], depth: depth + 1 });
        }
      }

      if (Array.isArray(value)) {
        queue.push(...value.slice(0, 10).map((child) => ({ value: child, depth: depth + 1 })));
      }
    }
  }

  const content = firstText(post, ["content", "text", "caption", "body"]);
  const markdownImage = content.match(/!\[[^\]]{0,200}\]\((https?:\/\/[^)\s]+)\)/i);
  if (markdownImage) {
    const imageUrl = validImageUrl(markdownImage[1]);
    if (imageUrl) {
      return imageUrl;
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

function renderPost(id, post, directImage) {
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
  const imageSource = firstImage(post, directImage);
  const image = imageDisplayUrl(imageSource);
  const postUrl = `${SITE_URL}/post/${encodeURIComponent(id)}`;
  const appUrl = `h9://post/${encodeURIComponent(id)}`;
  const author =
    firstText(post, ["authorName", "displayName", "username"]) ||
    textValue(post.author && (post.author.displayName || post.author.name || post.author));
  const authorImageSource = validImageUrl(
    firstText(post, ["authorAvatar", "authorPhotoUrl", "authorPhotoURL"]),
  );
  const authorImage = authorImageSource
    ? imageDisplayUrl(authorImageSource)
    : "";
  const contentHtml = preview
    ? renderMarkdown(preview)
    : "<p>Open this community post in the H9 app to view its details.</p>";
  const appIntentUrl =
    `intent://post/${encodeURIComponent(id)}` +
    `#Intent;scheme=h9;package=com.resonex.h9;` +
    `S.browser_fallback_url=${encodeURIComponent(DOWNLOAD_URL)};end`;

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
  <meta property="og:image:secure_url" content="${escapeHtml(image)}">
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
    :root{color-scheme:dark;--bg:#080b12;--panel:#101725;--line:rgba(255,255,255,.09);--text:#f4f7fb;--muted:#9aa7ba;--cyan:#4ce1ee;--blue:#6c8cff}
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;padding:28px;background:radial-gradient(ellipse at 50% 0%,rgba(54,91,157,.22),transparent 52%),var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .shell{width:min(100%,680px)}
    .brand{display:flex;justify-content:center;align-items:center;gap:9px;margin:0 0 16px;color:#dce7f5;font-size:12px;font-weight:800;letter-spacing:.16em}
    .brand-mark{display:grid;place-items:center;width:25px;height:25px;border:1px solid rgba(76,225,238,.36);border-radius:8px;background:rgba(76,225,238,.1);color:var(--cyan);font-size:12px;letter-spacing:0}
    .card{overflow:hidden;background:linear-gradient(160deg,rgba(20,29,45,.98),rgba(12,17,27,.99));border:1px solid var(--line);border-radius:24px;box-shadow:0 28px 90px rgba(0,0,0,.42),0 0 0 1px rgba(255,255,255,.015)}
    .eyebrow{padding:22px 26px 0;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#8b9bb1}
    .post-image-wrap{position:relative;margin:18px 26px 0;overflow:hidden;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:linear-gradient(135deg,#17263b,#101725);min-height:160px}
    .post-image{display:block;width:100%;height:auto;max-height:540px;object-fit:contain;background:#0d1421}
    .post-image-fallback{display:block;width:100%;min-height:220px;color:#9aa7ba;font-size:13px}
    .post-content{padding:22px 26px 26px}
    .author-row{display:flex;align-items:center;gap:10px;margin-bottom:15px}
    .author-avatar{width:34px;height:34px;flex:none;border-radius:50%;object-fit:cover;background:#202b3c;border:1px solid var(--line)}
    .author{font-size:13px;font-weight:700;color:#d9e3f0}
    .eyebrow + .post-content .author-row{margin-top:0}
    .title{font-size:24px;font-weight:800;letter-spacing:-.03em;line-height:1.25;color:#f4f7fb;margin:0 0 14px;overflow-wrap:anywhere}
    .markdown-body{font-size:15px;color:#c5cdd9;line-height:1.75;overflow-wrap:anywhere}
    .markdown-body p{margin:0 0 12px}
    .markdown-body h1,.markdown-body h2,.markdown-body h3{color:#f4f7fd;line-height:1.3;margin:16px 0 8px}
    .markdown-body h1{font-size:20px}.markdown-body h2{font-size:18px}.markdown-body h3{font-size:16px}
    .markdown-body a{color:#58a6ff;text-decoration:none}
    .markdown-body a:hover{text-decoration:underline}
    .markdown-body code{background:#1b2230;border-radius:5px;padding:2px 6px;color:#d2a8ff;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.92em}
    .markdown-body ul,.markdown-body ol{margin:0 0 12px;padding-left:22px}
    .markdown-body blockquote{margin:0 0 12px;padding-left:12px;border-left:3px solid #40516b;color:#9da8bb}
    .markdown-body hr{border:0;border-top:1px solid #303b50;margin:12px 0}
    .actions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:24px}
    .btn{min-height:50px;display:flex;align-items:center;justify-content:center;gap:9px;padding:13px 18px;border:1px solid transparent;border-radius:13px;text-align:center;text-decoration:none;font-size:14px;font-weight:800;transition:transform .18s ease,filter .18s ease}
    .btn:hover{transform:translateY(-1px);filter:brightness(1.06)}
    .btn:focus-visible{outline:3px solid rgba(76,225,238,.65);outline-offset:3px}
    .btn-open{background:linear-gradient(110deg,#3bdae8,#6088ff);color:#07111d;box-shadow:0 10px 28px rgba(69,174,238,.2)}
    .btn-download{border-color:var(--line);background:rgba(255,255,255,.035);color:#dce4ef;font-weight:600}
    .footer{margin:15px 0 0;text-align:center;color:#657287;font-size:11px;letter-spacing:.04em}
    @media(max-width:520px){body{padding:18px}.eyebrow{padding:18px 18px 0}.post-image-wrap{margin:14px 18px 0;border-radius:12px}.post-image{max-height:420px}.post-content{padding:18px}.title{font-size:21px}.actions{grid-template-columns:1fr}}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important}}
  </style>
</head>
<body>
  <main class="shell">
    <div class="brand"><span class="brand-mark">H9</span> HACKIN9 NETWORK</div>
    <article class="card">
      <div class="eyebrow">Community post</div>
      <div class="post-image-wrap">
        <img src="${escapeHtml(image)}" class="post-image" alt="Image for ${escapeHtml(title)}" width="1200" height="675" fetchpriority="high" onerror="this.onerror=null;this.src='${DEFAULT_IMAGE}';this.alt='H9 community preview';this.classList.add('post-image-fallback')">
      </div>
      <div class="post-content">
        ${author ? `<div class="author-row">${authorImage ? `<img class="author-avatar" src="${escapeHtml(authorImage)}" alt="" width="34" height="34">` : ""}<span class="author">Posted by ${escapeHtml(author)}</span></div>` : ""}
        <h1 class="title">${escapeHtml(title)}</h1>
        <div class="markdown-body">${contentHtml}</div>
        <div class="actions">
          <a href="${escapeHtml(appUrl)}" class="btn btn-open" id="open-post" data-app-url="${escapeHtml(appUrl)}" data-intent-url="${escapeHtml(appIntentUrl)}" data-fallback-url="${DOWNLOAD_URL}">Open post in H9</a>
          <a href="${DOWNLOAD_URL}" class="btn btn-download">Get H9 for Android</a>
        </div>
      </div>
    </article>
    <p class="footer">A COMMUNITY BUILT FOR WHAT’S NEXT</p>
  </main>
  <script>
    (function () {
      var button = document.getElementById("open-post");
      var isAndroid = /Android/i.test(navigator.userAgent);
      var isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      var appUrl = button.getAttribute("data-app-url");
      var fallbackUrl = button.getAttribute("data-fallback-url");

      if (isAndroid) {
        button.href = button.getAttribute("data-intent-url");
      } else if (!isAppleMobile) {
        button.href = fallbackUrl;
      } else {
        button.addEventListener("click", function (event) {
          event.preventDefault();
          var fallbackTimer = window.setTimeout(function () {
            if (document.visibilityState === "visible") {
              window.location.href = fallbackUrl;
            }
          }, 1600);
          document.addEventListener("visibilitychange", function () {
            if (document.visibilityState === "hidden") {
              window.clearTimeout(fallbackTimer);
            }
          }, { once: true });
          window.location.href = appUrl;
        });
      }
    })();
  </script>
  <script>
    (function () {
      var button = document.getElementById("open-post");
      var isAndroid = /Android/i.test(navigator.userAgent);
      var isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      var appUrl = button.getAttribute("data-app-url");
      var fallbackUrl = button.getAttribute("data-fallback-url");

      if (isAndroid) {
        button.href = button.getAttribute("data-intent-url");
      } else if (!isAppleMobile) {
        button.href = fallbackUrl;
      } else {
        button.addEventListener("click", function (event) {
          event.preventDefault();
          var fallbackTimer = window.setTimeout(function () {
            if (document.visibilityState === "visible") {
              window.location.href = fallbackUrl;
            }
          }, 1600);
          document.addEventListener("visibilitychange", function () {
            if (document.visibilityState === "hidden") {
              window.clearTimeout(fallbackTimer);
            }
          }, { once: true });
          window.location.href = appUrl;
        });
      }
    })();
  </script>
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
  const directImage = typeof req.query.img === "string" ? req.query.img : "";
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
  res.status(200).send(renderPost(id, post, directImage));
};
