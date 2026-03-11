# collapsepgh.com

This is the source code for [collapsepgh.com](https://collapsepgh.com).

To get started with local development & the static site generator:

```
npm install

npm run build-dev  # build static site in `dist` folder
npm run serve-dev  # build and serve site at http://localhost:8080

# in production mode, 'assets/dev' and draft events are ignored
npm run build-prod
npm run serve-prod
```

## Add events workflow

Each event is defined by a markdown file in `src/events/`, which should be named with its date in the format `YYYY-MM-DD.md`. For each event, the flyer should be provided in `src/assets/images/`. The event markdown file contains the following information in the following format:

```yaml
---
title: The Event Name            # string; name of event
date: 2026-03-07                 # YYYY-MM-DD format event date
start: 9:00 PM                   # string; start time of the event
end: LATE                        # string; end time of the event
price: $15 advance, $20 door     # any string here
image: /assets/images/flyer.jpg  # path to event flyer
hiEventsID: 2                    # integer; event ID for HiEvents API (the integer in the event page URL)
draft: false                     # if true, event excluded from production builds
---
```

## License

You are free to use, modify, and distribute this project under the terms of the AGPL, and any hosted version must also provide source code. 

See [LICENSE](./LICENSE.md) for full details.