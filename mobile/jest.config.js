module.exports = {
  preset: '@react-native/jest-preset',
  // Fixtures and helpers are not tests.
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/fixtures/',
    '/__tests__/support/',
  ],
  moduleNameMapper: {
    // Icons ship as ES modules jest will not transform, and they are not what these tests check.
    '^lucide-react-native$': '<rootDir>/__tests__/support/lucideStub.js',
  },
  // These packages ship untranspiled ES modules, so they are transformed like our own code.
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native|react-native|react-native-size-matters|react-native-safe-area-context|react-native-screens|react-native-image-picker|react-native-svg|@react-navigation|immer|@reduxjs/toolkit|redux|reselect|react-redux)/)',
  ],
};
