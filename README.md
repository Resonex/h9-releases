# HACKIN9 website

This static site is hosted on Vercel. Shared community post links use
`/post/{postId}`; Vercel rewrites them to the serverless function in
`api/post/[id].js`.

The function reads one record from the public Firebase Realtime Database path
`community_posts/{postId}`. It renders Open Graph and Twitter metadata plus a
web preview with an H9 app deep link and a download link to the official GitHub
releases page through `/download`. It shows a shortened Markdown-formatted
excerpt and the post image beside it. The preview recognizes fields such as
`title`, `excerpt`, `content`, `coverImageUrl`, `imageUrl`, and `authorName`.

The database URL is configured in the function as a public endpoint; no
service-account key or Firebase admin credential is used. If the post fields
in Firebase use different names, update the field lists in
`api/post/[id].js`.
