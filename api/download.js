const RELEASES_API =
  "https://api.github.com/repos/Resonex/h9-releases/releases?per_page=30";
const ASSET_PREFIX =
  "/Resonex/h9-releases/releases/download/";

function isReleaseAssetUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "github.com" &&
      url.pathname.startsWith(ASSET_PREFIX) &&
      /\.apk$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function chooseApkRelease(releases) {
  if (!Array.isArray(releases)) {
    return null;
  }

  for (const release of releases) {
    if (!release || release.draft || release.prerelease || !Array.isArray(release.assets)) {
      continue;
    }

    const assets = release.assets
      .filter(
        (asset) =>
          asset &&
          typeof asset.name === "string" &&
          /\.apk$/i.test(asset.name) &&
          isReleaseAssetUrl(asset.browser_download_url),
      )
      .sort((a, b) => {
        const score = (name) => (/universal|release|arm64|all/i.test(name) ? 1 : 0);
        return score(b.name) - score(a.name);
      });

    if (assets.length) {
      return assets[0].browser_download_url;
    }
  }

  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.status(405).send("Method Not Allowed");
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let releases;

  try {
    const response = await fetch(RELEASES_API, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "HACKIN9-website",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("GitHub release asset lookup returned", response.status);
      res.setHeader("Cache-Control", "no-store");
      res
        .status(502)
        .send("The H9 APK could not be found right now. Please try again later.");
      return;
    }

    releases = await response.json();
  } catch (error) {
    console.error("GitHub release asset lookup failed", error);
    res.setHeader("Cache-Control", "no-store");
    res
      .status(502)
      .send("The H9 APK could not be found right now. Please try again later.");
    return;
  } finally {
    clearTimeout(timeout);
  }

  const apkUrl = chooseApkRelease(releases);
  if (!apkUrl) {
    res.setHeader("Cache-Control", "no-store");
    res.status(404).send("No H9 APK is available to download right now.");
    return;
  }

  res.setHeader("Location", apkUrl);
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(302).send("");
};
