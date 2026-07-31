const {DateTime} = require("luxon")

const isProd = process.env.ELEVENTY_ENV === "production";

module.exports = {
    layout: "layouts/event.njk",
    tags: ["events"],
    eleventyComputed: {
        dateString: ({page}) => DateTime.fromJSDate(page.date, {zone: 'utc'}).toLocaleString(DateTime.DATE_FULL),
        slug: (data) => data.custom_permalink || data.page.fileSlug,
        upcoming: (data) => {
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            return new Date(data.date) >= today;
        },
        permalink: (data) => {
            if (isProd && data.draft) return false;
            return data.upcoming
                ? `/${data.slug}/`
                : `/archive/${data.slug}/`;
        },
    },
}
