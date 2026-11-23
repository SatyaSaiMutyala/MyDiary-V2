/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerBackgroundHandler } from './src/push';
import { registerAlarmHandlers } from './src/reminders/alarms';

// A push that arrives while the app is not running is handled here, before the component — that is
// the only place a background handler is allowed to be set up. The system draws the notification
// itself; this only has to exist so Android does not complain.
registerBackgroundHandler();

// Tapping Stop on a ringing reminder, or dismissing it, while the app is closed. Same rule: a
// background handler can only be set up here.
registerAlarmHandlers();

AppRegistry.registerComponent(appName, () => App);
