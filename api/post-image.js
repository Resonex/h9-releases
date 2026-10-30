const ALLOWED_IMAGE_HOSTS = new Set([
  "i.ibb.co",
  "i.imgur.com",
  "images.unsplash.com",
  "lh3.googleusercontent.com",
  "res.cloudinary.com",
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 3;

function isAllowedImageUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      ALLOWED_IMAGE_HOSTS.has(url.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

async function readImage(response) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
    throw new Error("Image exceeds size limit");
  }

  if (!response.body) {
    throw new Error("Image response has no body");
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    total += value.byteLength;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error("Image exceeds size limit");
    }
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks, total);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.status(405).send("Method Not Allowed");
    return;
  }

  const sourceUrl = typeof req.query.url === "string" ? req.query.url : "";
  if (!sourceUrl || !isAllowedImageUrl(sourceUrl)) {
    res.status(400).send("Invalid image URL");
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let imageResponse;
  let currentUrl = sourceUrl;

  try {
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      imageResponse = await fetch(currentUrl, {
        headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif" },
        redirect: "manual",
        signal: controller.signal,
      });

      if (![301, 302, 303, 307, 308].includes(imageResponse.status)) {
        break;
      }

      if (redirectCount === MAX_REDIRECTS) {
        throw new Error("Image redirect limit exceeded");
      }

      const location = imageResponse.headers.get("location");
      if (!location) {
        throw new Error("Image redirect has no destination");
      }

      currentUrl = new URL(location, currentUrl).href;
      if (!isAllowedImageUrl(currentUrl)) {
        throw new Error("Image redirect destination is not allowed");
      }
    }

    if (!imageResponse || !imageResponse.ok) {
      console.error("Post image upstream returned", imageResponse && imageResponse.status);
      res.setHeader("Cache-Control", "no-store");
      res.status(502).send("Post image is temporarily unavailable");
      return;
    }

    const contentType = (imageResponse.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      console.error("Post image upstream returned a non-image content type");
      res.setHeader("Cache-Control", "no-store");
      res.status(502).send("Post image is temporarily unavailable");
      return;
    }

    const image = await readImage(imageResponse);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", String(image.byteLength));
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.status(200).send(req.method === "HEAD" ? "" : image);
  } catch (error) {
    console.error("Post image proxy failed", error);
    res.setHeader("Cache-Control", "no-store");
    res.status(502).send("Post image is temporarily unavailable");
  } finally {
    clearTimeout(timeout);
  }
};
