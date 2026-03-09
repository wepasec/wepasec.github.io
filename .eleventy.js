module.exports = function (eleventyConfig) {
  // Pass through static assets
  eleventyConfig.addPassthroughCopy("./src/assets/images");
  eleventyConfig.addPassthroughCopy("./src/assets/style.css");
  eleventyConfig.addPassthroughCopy("./src/assets/homepage.js");

  // Base events collection
  eleventyConfig.addCollection("events", function (collectionApi) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = collectionApi.getFilteredByGlob("./src/events/*.md");

    events.forEach((event) => {
      const eventDate = new Date(event.data.date);
      event.data.upcoming = eventDate >= today;
    });

    return events.sort((a, b) => new Date(a.data.date) - new Date(b.data.date));
  });

  // Upcoming events (reuse events collection)
  eleventyConfig.addCollection("upcomingevents", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("./src/events/*.md")
      .filter((event) => event.data.upcoming);
  });

  // Past events (reuse events collection)
  eleventyConfig.addCollection("pastevents", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("./src/events/*.md")
      .filter((event) => !event.data.upcoming)
      .sort((a, b) => new Date(b.data.date) - new Date(a.data.date));
  });

  return {
    dir: {
      input: "src",
      output: "dist",
    },
  };
};
