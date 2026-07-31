const {DateTime} = require("luxon")

const isProd = process.env.ELEVENTY_ENV === "production";

module.exports = {
    layout: "layouts/event.njk",
    tags: ["events"],
    eleventyComputed: {
        dateString: ({page}) => DateTime.fromJSDate(page.date, {zone: 'utc'}).toLocaleString(DateTime.DATE_FULL),
        slug: (data) => data.custom_permalink || data.page.fileSlug,
        permalink: (data) => {
            if (isProd && data.draft) return false;
            return `/${data.custom_permalink || data.page.fileSlug}/`;
        },
    },
}
