# Resend signup worker

A Cloudflare Worker that parses a form on the static site and updates
the Resend mailing list.

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

When testing with the local dev static site, run the Eleventy project in dev mode
(`ELEVENTY_ENV != "production"`) and the local dev worker will spin up, and the
URL used by the form will switch to the local version automatically.

## Deploy

To deploy the changes to the actual Cloudflare worker:

```bash
npm run deploy
```

## Notes

- **Writes to Resend** even in `dev` mode: you will want to manually clear out
  the `Dev` mailing list segment in Resend once you're done testing.
- **Duplicate signups:** if someone is already subscribed, the worker will not update their
  entry. This lets them retain "OG clout" within the mailing list `from_event` field- their
  oldest is retained. Whether someone is newly added or already exists, the displayed message
  just tells them they are subscribed. This is a data privacy measure so that the form can't
  be used to check whether someone is signed up.
