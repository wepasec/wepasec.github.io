module.exports = () => {
  const isProd = process.env.ELEVENTY_ENV === "production";
  return isProd
    ? "https://api.collapsepgh.com/"
    : "http://localhost:8787";
};