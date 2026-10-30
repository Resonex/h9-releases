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

function getImage(
  profile,
  fields = [
    "photoURL",
    "photoUrl",
    "profileImageUrl",
    "profileImageURL",
    "avatarUrl",
    "avatarURL",
    "avatar",
    "photo",
    "imageUrl",
  ],
) {
  for (const field of fields) {
    const value = profile[field];
    const candidate =
      typeof value === "string"
        ? value
        : value && typeof value === "object"
          ? value.url || value.downloadURL || value.downloadUrl
          : "";

    const imageUrl = validImageUrl(candidate);
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

function renderProfile(handle, profile, directPhoto) {
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
  const image = validImageUrl(directPhoto) || getImage(profile);
  const coverImage = getImage(profile, ["coverImageUrl", "coverImageURL"]);
  const profileUrl = `${SITE_URL}/user/${encodeURIComponent(handle)}`;
  const appUrl = `h9://user/${encodeURIComponent(handle)}`;
  const intentUrl =
    `intent://user/${encodeURIComponent(handle)}` +
    `#Intent;scheme=h9;package=com.resonex.h9;` +
    `S.browser_fallback_url=${encodeURIComponent(DOWNLOAD_URL)};end`;
  const bioHtml = bio
    ? escapeHtml([...bio].slice(0, 320).join("")).replace(/\r?\n/g, "<br>")
    : "Open this profile in the H9 app to see more.";
  const verified =
    profile.verified === true ||
    profile.isVerified === true ||
    profile.verificationStatus === "verified";
  const website = getText(profile.website);
  let websiteUrl = "";
  if (website) {
    try {
      const parsed = new URL(
        website.startsWith("http://") || website.startsWith("https://")
          ? website
          : `https://${website}`,
      );
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        websiteUrl = parsed.href;
      }
    } catch {
      websiteUrl = "";
    }
  }

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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <title>${escapeHtml(displayName)} (@${escapeHtml(username)}) | HACKIN9</title>
  <style>
    :root{color-scheme:dark;--bg:#080b12;--panel:#101725;--line:rgba(255,255,255,.09);--text:#f4f7fb;--muted:#9aa7ba;--cyan:#4ce1ee;--blue:#6c8cff}
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;padding:28px;background:radial-gradient(ellipse at 50% 0%,rgba(54,91,157,.22),transparent 52%),var(--bg);color:var(--text);font-family:"DM Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .shell{width:min(100%,560px)}
    .brand{display:flex;justify-content:center;align-items:center;gap:9px;margin:0 0 16px;color:#dce7f5;font-size:12px;font-weight:800;letter-spacing:.16em}
    .brand-mark{display:grid;place-items:center;width:25px;height:25px;border:1px solid rgba(76,225,238,.36);border-radius:8px;background:rgba(76,225,238,.1);color:var(--cyan);font-size:12px;letter-spacing:0}
    .card{overflow:hidden;background:linear-gradient(160deg,rgba(20,29,45,.98),rgba(12,17,27,.99));border:1px solid var(--line);border-radius:24px;box-shadow:0 28px 90px rgba(0,0,0,.42),0 0 0 1px rgba(255,255,255,.015)}
    .cover{position:relative;height:150px;overflow:hidden;background:linear-gradient(120deg,rgba(44,211,224,.22),rgba(108,140,255,.18)),#141d2c}
    .cover::after{position:absolute;inset:0;content:"";background:linear-gradient(180deg,rgba(8,11,18,.06),rgba(8,11,18,.3))}
    .cover-image{width:100%;height:100%;display:block;object-fit:cover}
    .profile{position:relative;padding:0 30px 28px}
    .avatar{display:block;width:104px;height:104px;margin-top:-52px;object-fit:cover;border-radius:50%;background:#182131;border:4px solid #101725;box-shadow:0 8px 26px rgba(0,0,0,.34)}
    .identity{padding-top:18px}
    .name-line{display:flex;align-items:center;gap:9px;min-width:0}
    .name{font-size:26px;font-weight:800;letter-spacing:-.04em;line-height:1.2;margin:0;overflow-wrap:anywhere}
    .verified{flex:none;display:inline-grid;place-items:center;width:19px;height:19px;border-radius:50%;background:var(--cyan);color:#071217;font-size:12px;font-weight:900}
    .handle{font-size:14px;color:var(--muted);margin:5px 0 0}
    .bio{font-size:14px;color:#d2d9e4;line-height:1.7;margin:17px 0 0;white-space:pre-line;overflow-wrap:anywhere}
    .website{display:inline-flex;align-items:center;gap:7px;margin-top:14px;color:var(--cyan);font-size:13px;font-weight:600;text-decoration:none;overflow-wrap:anywhere}
    .website:hover{text-decoration:underline}
    .actions{display:grid;gap:10px;margin-top:25px}
    .btn{min-height:50px;display:flex;align-items:center;justify-content:center;gap:10px;padding:13px 18px;border:1px solid transparent;border-radius:13px;text-align:center;text-decoration:none;font-size:14px;font-weight:800;transition:transform .18s ease,filter .18s ease,border-color .18s ease}
    .btn:hover{transform:translateY(-1px);filter:brightness(1.06)}
    .btn:focus-visible,.website:focus-visible{outline:3px solid rgba(76,225,238,.65);outline-offset:3px}
    .btn-open{background:linear-gradient(110deg,#3bdae8,#6088ff);color:#07111d;box-shadow:0 10px 28px rgba(69,174,238,.2)}
    .btn-download{border-color:var(--line);background:rgba(255,255,255,.035);color:#dce4ef;font-weight:600}
    .btn-icon{font-size:17px;line-height:1}
    .hint{margin:13px 0 0;text-align:center;color:#8390a3;font-size:12px;line-height:1.5}
    .footer{margin:15px 0 0;text-align:center;color:#657287;font-size:11px;letter-spacing:.04em}
    @media(max-width:520px){body{padding:18px}.cover{height:122px}.profile{padding:0 21px 23px}.avatar{width:90px;height:90px;margin-top:-45px}.name{font-size:23px}}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important}}
  </style>
</head>
<body>
  <main class="shell">
    <div class="brand"><span class="brand-mark">H9</span> HACKIN9 NETWORK</div>
    <article class="card">
      <div class="cover">${coverImage !== DEFAULT_IMAGE ? `<img class="cover-image" src="${escapeHtml(coverImage)}" alt="" loading="eager">` : ""}</div>
      <section class="profile" aria-label="Profile">
        <img class="avatar" src="${escapeHtml(image)}" alt="${escapeHtml(displayName)} profile photo" loading="eager">
        <div class="identity">
          <div class="name-line">
            <h1 class="name">${escapeHtml(displayName)}</h1>
            ${verified ? '<span class="verified" aria-label="Verified profile">✓</span>' : ""}
          </div>
          <p class="handle">@${escapeHtml(username)}</p>
        </div>
        ${bio ? `<p class="bio">${bioHtml}</p>` : ""}
        ${websiteUrl ? `<a class="website" href="${escapeHtml(websiteUrl)}" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">↗</span>${escapeHtml(websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>` : ""}
        <div class="actions">
          <a class="btn btn-open" id="open-app" href="${escapeHtml(appUrl)}" data-intent-url="${escapeHtml(intentUrl)}" data-app-url="${escapeHtml(appUrl)}" data-fallback-url="${DOWNLOAD_URL}">
            <span class="btn-icon" aria-hidden="true">↗</span><span id="open-label">Open profile in H9</span>
          </a>
          <a class="btn btn-download" href="${DOWNLOAD_URL}">Get H9 for Android</a>
        </div>
        <p class="hint">Opens this profile in the H9 app. If you don’t have the app yet, get it here.</p>
      </section>
    </article>
    <p class="footer">A COMMUNITY BUILT FOR WHAT’S NEXT</p>
  </main>
  <script>
    (function () {
      var button = document.getElementById("open-app");
      var label = document.getElementById("open-label");
      var downloadButton = document.querySelector(".btn-download");
      var hint = document.querySelector(".hint");
      var isAndroid = /Android/i.test(navigator.userAgent);
      var isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      var appUrl = button.getAttribute("data-app-url");
      var fallbackUrl = button.getAttribute("data-fallback-url");

      if (isAndroid) {
        button.href = button.getAttribute("data-intent-url");
      } else if (!isAppleMobile) {
        button.href = fallbackUrl;
        label.textContent = "Get H9 for Android";
        downloadButton.hidden = true;
        hint.textContent = "Install H9 for Android to open this profile in the app.";
      }

      if (isAppleMobile) {
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

  const handle = typeof req.query.handle === "string" ? req.query.handle.trim() : "";
  const directPhoto = typeof req.query.photo === "string" ? req.query.photo : "";
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
  res.status(200).send(renderProfile(handle, profile, directPhoto));
};
