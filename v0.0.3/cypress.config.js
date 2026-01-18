const { defineConfig } = require("cypress");

module.exports = defineConfig({
  video: true,
  videosFolder: "cypress/videos",
  screenshotsFolder: "cypress/screenshots",
  e2e: {
    baseUrl: "http://localhost:4173",
    supportFile: false,
    fixturesFolder: "cypress/fixtures",
    specPattern: "cypress/e2e/**/*.cy.js",
    video: true,
    screenshotOnRunFailure: true
  }
});
