/**
 * @file babel.config.js
 * @description Babel configuration file for the React Native/Expo mobile application.
 * Configures presets and plugins, including environment variable loading via dotenv
 * and support for react-native-reanimated.
 */

module.exports = function(api) {
  // Enables caching of the Babel configuration for better build performance.
  api.cache(true);

  return {
    // Uses the standard Expo Babel preset as the foundation.
    presets: ['babel-preset-expo'],
    plugins: [
      // Configures the react-native-dotenv plugin to load environment variables.
      ['module:react-native-dotenv', {
        "moduleName": "@env",      // Allows importing env vars from '@env'
        "path": "../.env",         // Path to the .env file relative to the mobile directory
        "blocklist": null,         // Optional: patterns to exclude
        "allowlist": null,         // Optional: patterns to exclusively allow
        "safe": false,             // If true, loads .env.example configuration rules
        "allowUndefined": true,    // Allows referencing undefined variables without crashing
        "verbose": false           // Suppresses detailed build logs from the dotenv plugin
      }],
      // React Native Reanimated plugin, which must be listed last as per its documentation.
      'react-native-reanimated/plugin',
    ],
  };
};