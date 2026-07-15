const {DateTime} = require("luxon")

const isProd = process.env.ELEVENTY_ENV === "production";

module.exports = {
    layout: "layouts/event.njk",
    tags: ["events"],
    eleventyComputed: {
        dateString: ({page}) => DateTime.fromJSDate(page.date, {zone: 'utc'}).toLocaleString(DateTime.DATE_FULL),
        permalink: (data) => {
            if (isProd && data.draft === true) {
                return false;
            }
            if (data.custom_permalink) {
                return `/events/${data.custom_permalink}/`;
            }
            return undefined; // falls back to default filename-based permalink
        }
    }
}