module.exports = function (eleventyConfig) {
  // Pass through static assets
  eleventyConfig.addPassthroughCopy("./src/assets/images");
  eleventyConfig.addPassthroughCopy("./src/assets/style.css");
  eleventyConfig.addPassthroughCopy("./src/assets/homepage.js");
  eleventyConfig.addPassthroughCopy("./src/assets/popup.js");

  // Function builds, filters, and sorts an events collection
  function buildEvents(collectionApi) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    let events = collectionApi.getFilteredByGlob("./src/events/*.md");
    // Tag events as 'upcoming' based on current date/time
    events.forEach(event => {
      event.data.upcoming = new Date(event.data.date) >= today;
    });
    // For production, filter out draft/test events
    if (process.env.ELEVENTY_ENV === "production") {
      events = events.filter(e => e.data.draft !== true);
    }
    return events;
  }

  // Build upcoming events collection
  eleventyConfig.addCollection("upcomingevents", api =>
    buildEvents(api)
      .filter(e => e.data.upcoming)
      .sort((a, b) => new Date(a.data.date) - new Date(b.data.date))
  );

  // Build past events collection
  eleventyConfig.addCollection("pastevents", api =>
    buildEvents(api)
      .filter(e => !e.data.upcoming)
      .sort((a, b) => new Date(b.data.date) - new Date(a.data.date))
  );

  return {
    dir: {
      input: "src",
      output: "dist",
    },
  };
};
