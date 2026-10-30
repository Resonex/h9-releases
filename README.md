# HACKIN9 website

This static site is hosted on Vercel. Shared community post links use
`/post/{postId}`; Vercel rewrites them to the serverless function in
`api/post/[id].js`.

The function reads one record from the public Firebase Realtime Database path
`community_posts/{postId}`. It renders Open Graph and Twitter metadata plus a
web preview with an H9 app deep link and a download link through `/download`.
That route resolves the latest official APK and redirects directly to its
asset, never to a GitHub Releases page. It shows a shortened Markdown-formatted
excerpt and the post image beside it. The preview recognizes fields such as
`title`, `excerpt`, `content`, `coverImageUrl`, `imageUrl`, and `authorName`.

The database URL is configured in the function as a public endpoint; no
service-account key or Firebase admin credential is used. If the post fields
in Firebase use different names, update the field lists in
`api/post/[id].js`.

Public profile links use `/user/{handle}` and are rewritten to
`api/user/[handle].js`. That function resolves the username through
`usernameIndex/{handle}`, then reads the corresponding `users/{uid}` record.
It renders a profile preview with Open Graph metadata, profile and cover
images, and a primary app-opening action. Android uses an H9 intent targeting
`com.resonex.h9` with a direct APK download fallback; Apple mobile devices try
the H9 scheme and fall back to that download route. An optional `photo` query
parameter overrides the Firebase profile photo for the rendered page and
social metadata. Only selected public profile fields are rendered.

Post links also accept an optional `img` query parameter. A valid HTTP(S) URL
overrides the image stored on the Firebase post for the preview and social
metadata. The visible post image is rendered prominently above the post text;
image URLs are also recognized in common nested media fields and Markdown
image syntax. Images from supported hosts are served through the site's
size-limited image proxy, so the preview and social card use a HACKIN9 URL
instead of embedding the external image host. Android app links target
`com.resonex.h9`, with `/download` as the install fallback. Invalid image URLs
are ignored.
