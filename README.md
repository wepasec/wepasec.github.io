# COLLAPSE Web Services

This is the source code for the COLLAPSE website and related services:

- The website [collapsepgh.com](https://collapsepgh.com)
- Some Cloudflare Workers, defined under `workers`

## Website: collapsepgh.com

The static site is built with [Eleventy](https://www.11ty.dev/) using [Nunjucks](https://mozilla.github.io/nunjucks/) templates. 

To get started with local development & the static site generator:

```
npm install

npm run build-dev  # build static site in `dist` folder
npm run serve-dev  # build and serve site at http://localhost:8080

# in production mode, 'assets/dev' and draft events are ignored
npm run build-prod
npm run serve-prod
```

### Adding events

Each event is defined by a markdown file in `src/events/`, which should be named with its date in the format `YYYY-MM-DD.md`. For each event, the flyer should be provided in `src/assets/images/`. The event markdown file requires header content as follows:

```yaml
---
title: The Event Name            # event title
date: 2026-03-07                 # event date, YYYY-MM-DD format
admission: 21+                   # "21+", "All Ages" etc; OPTIONAL, default: 21+
start: 9:00 PM                   # start time of the event. No formatting constraints.
end: LATE                        # end time of the event; OPTIONAL. No formatting constraints.
price: $15 advance, $20 door     # Ticket price structer; no formatting constraints
image: /assets/images/flyer.jpg  # path to event flyer
hiEventsID: 2                    # event ID for HiEvents API (get from event page URL)
draft: false                     # if true, exclude from production builds
custom_permalink: event-name     # Site's dedicated URL: collapsepgh.com/<permalink>; OPTIONAL, defaults: /events/<filename> otherwise.
buttonText: Advance Donation     # Overrides "Buy Tickets" text on the button; OPTIONAL
---
```

The event description is then added, as Markdown content, after this header content. HTML is also supported if you need to get specific with rendering, but writing Markdown is simplest, easy to read, and leaves HTML rendering to the Eleventy site generator.

## Cloudflare Workers

We use Cloudflare Workers to implement a few simple, free, serverless functions that help maintain our mailing list.

The following Cloudflare Workers are defined in this repository:

- `signup-form`, which parses a form on our website to make additions to our mailing list (we use [Resend](https://resend.com/)) and notify a Discord webhook endpoint when this happens
- `resend-discord-relay`, a webhook relay which accepts messages from Resend and relays them to a Discord webhook endpoint to produce notifications when emails bounce

See each worker's README for more details.

## License

You are free to use, modify, and distribute this project under the terms of the AGPL, and any hosted version must also provide source code. 

See [LICENSE](./LICENSE.md) for full details.