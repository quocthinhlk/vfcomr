const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const unstableConditionNames = Array.from(
  new Set([
    ...(defaultConfig.resolver?.unstable_conditionNames ?? []),
    // Ensure CommonJS (require) packages resolve correctly via `exports`
    'require',
    // Improve compatibility for packages that provide browser/react-native builds
    'browser',
    // Fallback condition in many `exports` maps
    'default',
  ]),
);

const config = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    ...(defaultConfig.transformer || {}),
  },
  resolver: {
    assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...defaultConfig.resolver.sourceExts, 'svg'],
    // Axios (and other deps) rely on `package.json` "exports" to pick the
    // correct React Native/browser entrypoint. Without this, Metro can fall
    // back to "main" which may point to Node builds (requiring `crypto`, etc).
    unstable_enablePackageExports: true,
    unstable_conditionNames: unstableConditionNames,
  },
};

module.exports = mergeConfig(defaultConfig, config);
