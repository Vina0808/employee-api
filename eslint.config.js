module.exports = [
  {
    files: ["*.js"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
      },
    },
    rules: {
      semi: ["error", "always"],
      quotes: ["error", "double"],
    },
  },
];
