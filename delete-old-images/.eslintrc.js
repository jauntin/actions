module.exports = {
  env: {
    commonjs: true,
    es2021: true,
  },
  ignorePatterns: ["dist/**/*"],
  extends: ["airbnb-base", "prettier"],
  settings: {
    "import/resolver": {
      node: {
        moduleDirectory: ["node_modules"],
      },
    },
  },
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    "func-names": ["error", "as-needed"],
    "no-restricted-syntax": ["off"],
    "import/no-extraneous-dependencies": ["off"],
  },
};
