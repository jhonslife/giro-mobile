/**
 * Expo Config Plugin to fix Gradle settings for pnpm compatibility
 * This plugin adds the expo-module-gradle-plugin to the pluginManagement block
 */

const { withSettingsGradle } = require('@expo/config-plugins');

function withExpoModulesGradlePlugin(config) {
  return withSettingsGradle(config, (config) => {
    const settingsGradle = config.modResults.contents;

    // Check if the expo-module-gradle-plugin includeBuild is already present
    if (settingsGradle.includes('expo-module-gradle-plugin')) {
      return config;
    }

    // Add the includeBuild for expo-module-gradle-plugin after the react-native gradle plugin
    const newIncludeBuild = `    includeBuild(new File(["node", "--print", "require.resolve('expo-modules-core/package.json')"].execute(null, rootDir).text.trim(), "../android/expo-module-gradle-plugin"))`;

    // Find the pluginManagement block and add the new includeBuild
    config.modResults.contents = settingsGradle.replace(
      /(includeBuild\(new File\(\["node", "--print", "require\.resolve\('@react-native\/gradle-plugin\/package\.json'.*?\)\.toString\(\)\))/,
      `$1\n${newIncludeBuild}`
    );

    return config;
  });
}

module.exports = withExpoModulesGradlePlugin;
