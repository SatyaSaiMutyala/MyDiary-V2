/**
 * Icons, for tests.
 *
 * lucide-react-native ships ES modules that jest does not transform, and an icon has nothing to do
 * with what these tests check. Any name asked of this module comes back as a plain View, so a screen
 * renders exactly as it would with the real icons.
 */
const React = require('react');
const { View } = require('react-native');

const Icon = React.forwardRef((props, ref) =>
  React.createElement(View, { ...props, ref, accessibilityRole: 'image' }),
);

module.exports = new Proxy(
  { __esModule: true },
  {
    get: (target, name) => (name in target ? target[name] : Icon),
  },
);
