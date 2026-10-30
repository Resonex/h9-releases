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

function getText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getImage(profile) {
  for (const field of [
    "photoURL",
    "photoUrl",
    "profileImageUrl",
    "profileImageURL",
    "avatarUrl",
    "avatarURL",
    "avatar",
    "photo",
    "imageUrl",
  ]) {
    const value = profile[field];
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
        // Ignore invalid profile image URLs and use the site fallback.
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
  <title>H9 Profile</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:#0a0a0c;color:#fff;font:16px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    main{max-width:480px;width:100%;padding:28px;box-sizing:border-box;text-align:center;background:#121620;border:1px solid #232836;border-radius:16px}
    a{color:#00e5ff}
  </style>
</head>
<body><main><h1>Profile unavailable</h1><p>${escapeHtml(message)}</p><a href="${SITE_URL}/">Go to HACKIN9</a></main></body>
</html>`;
}

function renderProfile(handle, profile) {
  const username =
    getText(profile.username) ||
    getText(profile.handle) ||
    handle;
  const displayName =
    getText(profile.displayName) ||
    getText(profile.name) ||
    username;
  const bio =
    getText(profile.bio) ||
    getText(profile.about) ||
    getText(profile.description);
  const excerpt =
    [...(bio || `View ${displayName}'s profile on HACKIN9.`)]
      .slice(0, 200)
      .join("");
  const image = getImage(profile);
  const profileUrl = `${SITE_URL}/user/${encodeURIComponent(handle)}`;
  const appUrl = `h9://user/${encodeURIComponent(handle)}`;
  const bioHtml = bio
    ? escapeHtml([...bio].slice(0, 320).join("")).replace(/\r?\n/g, "<br>")
    : "Open this profile in the H9 app to see more.";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0a0a0c">
  <meta name="robots" content="index,follow">
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="HACKIN9">
  <meta property="og:title" content="${escapeHtml(displayName)} (@${escapeHtml(username)})">
  <meta property="og:description" content="${escapeHtml(excerpt)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:alt" content="Profile picture for ${escapeHtml(displayName)}">
  <meta property="og:url" content="${escapeHtml(profileUrl)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(displayName)} (@${escapeHtml(username)})">
  <meta name="twitter:description" content="${escapeHtml(excerpt)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <link rel="canonical" href="${escapeHtml(profileUrl)}">
  <title>${escapeHtml(displayName)} (@${escapeHtml(username)}) | HACKIN9</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0a0a0c;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .card{background:#121620;border:1px solid #232836;border-radius:16px;padding:24px;max-width:560px;width:100%}
    .eyebrow{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8b8b94;margin:0 0 18px}
    .profile{display:grid;grid-template-columns:minmax(0,1fr) 112px;gap:20px;align-items:center}
    .name{font-size:22px;font-weight:700;color:#00e5ff;margin:0 0 5px;overflow-wrap:anywhere}
    .handle{font-size:14px;color:#8b8b94;margin:0 0 14px}
    .bio{font-size:14px;color:#c5c7d0;line-height:1.6;margin:0;overflow-wrap:anywhere}
    .avatar{display:block;width:112px;height:112px;object-fit:cover;border-radius:50%;background:#1a1f2c;border:1px solid #232836}
    .btn{color:#fff;font-weight:700;text-decoration:none;padding:14px 20px;border-radius:12px;display:block;margin-top:20px;text-align:center}
    .btn-open{background:linear-gradient(135deg,#00a9c2,#8128a8)}
    .btn-download{background:#1a1f2c;color:#c5c7d0;font-size:13px;margin-top:10px}
    @media(max-width:440px){.profile{grid-template-columns:minmax(0,1fr) 80px;gap:12px}.avatar{width:80px;height:80px}.card{padding:18px}}
  </style>
</head>
<body>
  <main class="card">
    <p class="eyebrow">H9 Community Profile</p>
    <section class="profile">
      <div>
        <h1 class="name">${escapeHtml(displayName)}</h1>
        <p class="handle">@${escapeHtml(username)}</p>
        <p class="bio">${bioHtml}</p>
      </div>
      <img class="avatar" src="${escapeHtml(image)}" alt="Profile picture for ${escapeHtml(displayName)}" loading="eager">
    </section>
    <a class="btn btn-open" href="${escapeHtml(appUrl)}">OPEN IN H9 APP</a>
    <a class="btn btn-download" href="${DOWNLOAD_URL}">Download H9 App (APK)</a>
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

  const handle = typeof req.query.handle === "string" ? req.query.handle.trim() : "";
  if (!handle || handle.length > 64 || !/^[A-Za-z0-9_-]+$/.test(handle)) {
    res.status(400).send(renderError("The username link is invalid."));
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let profile;

  try {
    const indexUrl = `${DATABASE_URL}/usernameIndex/${encodeURIComponent(handle)}.json`;
    const indexResponse = await fetch(indexUrl, { signal: controller.signal });
    if (!indexResponse.ok) {
      console.error("Firebase username lookup returned", indexResponse.status);
      res.setHeader("Cache-Control", "no-store");
      res.status(502).send(renderError("The profile could not be loaded right now."));
      return;
    }

    const uid = await indexResponse.json();
    if (typeof uid !== "string" || !uid || uid.length > 128 || /[.#$/[\]\u0000-\u001f\u007f]/.test(uid)) {
      res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
      res.status(404).send(renderError("This profile could not be found."));
      return;
    }

    const profileUrl = `${DATABASE_URL}/users/${encodeURIComponent(uid)}.json`;
    const profileResponse = await fetch(profileUrl, { signal: controller.signal });
    if (!profileResponse.ok) {
      console.error("Firebase profile request returned", profileResponse.status);
      res.setHeader("Cache-Control", "no-store");
      res.status(502).send(renderError("The profile could not be loaded right now."));
      return;
    }

    profile = await profileResponse.json();
  } catch (error) {
    console.error("Firebase profile request failed", error);
    res.setHeader("Cache-Control", "no-store");
    res.status(502).send(renderError("The profile could not be loaded right now."));
    return;
  } finally {
    clearTimeout(timeout);
  }

  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
    res.status(404).send(renderError("This profile could not be found."));
    return;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(200).send(renderProfile(handle, profile));
};
