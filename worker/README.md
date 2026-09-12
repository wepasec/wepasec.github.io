# Resend signup worker

A minimal Cloudflare Worker that parses a form on the static site
and updated the Resend mailing list.

## Test locally

Rename `.dev.vars.example` to `.dev.vars` and add a Resend API key. The dev/local
worker will write new signups to a "Dev" segment in Resend instead of the actual
mailing list.

```bash
npm run dev
```

This runs the worker on `localhost:8787`. You can test it with:

```bash
curl -X POST http://localhost:8787 \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com"}'
```

To test with the local dev static site, change the URL in signup.njk to `http://localhost:8787`. TODO- automate this!

## Deploy

```bash
npm run deploy
```

Wrangler will print your live URL, something like:

```
https://resend-signup-worker.your-subdomain.workers.dev
```

## Notes

- **Duplicate signups:** the worker treats Resend's 409 (contact already
  exists) as a success response so users seeing "already subscribed" isn't
  treated as an error.
- **Swapping in the Resend SDK:** the worker currently calls Resend's REST
  API directly with `fetch` to avoid npm dependency overhead.
  To use the official `resend` SDK, enable Node compatibility in
  `wrangler.toml` (`compatibility_flags = ["nodejs_compat"]`), run
  `npm install resend`, and swap the `fetch` block in `src/index.js` for
  the SDK call