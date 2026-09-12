# Resend signup worker

A minimal Cloudflare Worker that receives an email from your GitHub Pages
site and adds it to a Resend audience/contact list.

## Files

- `src/index.js` — the worker itself
- `wrangler.toml` — Cloudflare config
- `package.json` — dev/deploy scripts (uses `wrangler` CLI)
- `signup-form-snippet.html` — paste-able form for your GitHub Pages site

## 1. Install the Cloudflare CLI

```bash
npm install
npx wrangler login
```

This opens a browser to authenticate wrangler with your Cloudflare account
(free account is fine).

## 2. Edit `wrangler.toml`

Change `ALLOWED_ORIGIN` to your actual GitHub Pages URL, e.g.:

```toml
[vars]
ALLOWED_ORIGIN = "https://yourusername.github.io"
```

If your site is a custom domain, use that instead
(e.g. `"https://yourdomain.com"`).

## 3. Set your Resend secrets

These are encrypted and never appear in your code or repo:

```bash
npx wrangler secret put RESEND_API_KEY
# paste your re_xxxxxxxxx key when prompted

npx wrangler secret put RESEND_SEGMENT_ID
# paste the segment UUID every website-form signup should join
```

Every contact created by this worker is tagged with the custom property
`from_event: "website_form"` and added to the `RESEND_SEGMENT_ID` segment,
so you can filter/target signups from this form specifically in Resend.

## 4. Test locally (optional)

```bash
npm run dev
```

This runs the worker on `localhost:8787`. You can test it with:

```bash
curl -X POST http://localhost:8787 \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com"}'
```

Note: local dev doesn't enforce CORS the same way production does, so test
the real cross-origin behavior after deploying.

## 5. Deploy

```bash
npm run deploy
```

Wrangler will print your live URL, something like:

```
https://resend-signup-worker.your-subdomain.workers.dev
```

## 6. Wire up the frontend

Open `signup-form-snippet.html`, replace `WORKER_URL` with the URL from
step 5, and paste the form + script into your GitHub Pages HTML.

## Notes

- **Rate limiting / abuse:** Cloudflare's free tier includes basic WAF rate
  limiting rules you can attach to this route from the dashboard if you're
  worried about spam signups. Not set up by default here.
- **Duplicate signups:** the worker treats Resend's 409 (contact already
  exists) as a success response so users seeing "already subscribed" isn't
  treated as an error.
- **Swapping in the Resend SDK:** the worker currently calls Resend's REST
  API directly with `fetch` to avoid npm dependency overhead. If you'd
  rather use the official `resend` SDK, enable Node compatibility in
  `wrangler.toml` (`compatibility_flags = ["nodejs_compat"]`), run
  `npm install resend`, and swap the `fetch` block in `src/index.js` for
  the SDK call — happy to make that edit if you share which SDK version/
  example you want to match.
