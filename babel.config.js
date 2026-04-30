module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['module:@react-native/babel-preset'],
    // IMPORTANT: this plugin MUST be listed last.
    plugins: ['react-native-reanimated/plugin'],
  };
};
