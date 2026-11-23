import { Platform } from 'react-native';

// Where the MyDiary v2 backend runs (Node + Express, MyDiary-V2/Backend).
//
// The app talks to the live server. To work against the backend on this Mac
// instead (`cd Backend && npm run dev`, port 4000), set USE_LOCAL to true:
// - iPhone simulator reaches the Mac as "localhost".
// - Android emulator reaches the Mac as 10.0.2.2.
// - A real phone needs the Mac's Wi-Fi address; set LAN_HOST to use it.
const USE_LOCAL = true;
const LAN_HOST = '';
const LOCAL_HOST =
  LAN_HOST || (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');

// TODO before the first store build: point this at the deployed v2 API.
// The v1 server (mydiary.mytrustlab.co.in) is a different application — do not use it here.
const LIVE_URL = 'https://mydiary.mytrustlab.co.in/api';
const LOCAL_URL = `http://${LOCAL_HOST}:4000/api`;

// A release build always uses the live server, whatever USE_LOCAL says.
export const API_BASE_URL = __DEV__ && USE_LOCAL ? LOCAL_URL : LIVE_URL;

// Seconds before a request is given up on.
export const API_TIMEOUT = 20;
