module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.test.js"],
  collectCoverageFrom: [
    "src/controller/**/*.js",
    "src/services/**/*.js",
    "src/middleware/**/*.js",
    "src/shared/**/*.js",
  ],
};
