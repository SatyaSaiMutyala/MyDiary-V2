import { PermissionsAndroid, Platform } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

// `noCamera` is set only when the phone has no usable camera, as opposed to
// the person refusing it.

// Same budgets as the website: evidence 1280 px, selfie 800 px, JPEG quality 80.
//
// `includeBase64` is what lets a photograph be uploaded at all: React Native cannot put a file in
// a request body except through a form, and the API takes the image as base64 in JSON. At these
// sizes a photograph is a few hundred KB, well inside the 8 MB the API allows.
const EVIDENCE = {
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 0.8,
  includeBase64: true,
};
const SELFIE = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 0.8,
  includeBase64: true,
};

const messages = {
  camera_unavailable: 'The camera is not available on this device.',
  permission:
    'Permission was refused. Allow it in the phone settings and try again.',
  others: 'The photograph could not be added. Please try again.',
};

// Each photograph comes back as { uri, base64, mimeType, name }: the uri to show it on screen,
// the base64 to send it to the API.
function read(response) {
  if (response.didCancel) {
    return { photos: [], uris: [] };
  }
  if (response.errorCode) {
    return {
      photos: [],
      uris: [],
      error: messages[response.errorCode] ?? messages.others,
      noCamera: response.errorCode === 'camera_unavailable',
    };
  }
  const photos = (response.assets ?? [])
    .filter(a => !!a.uri)
    .map((a, i) => ({
      uri: a.uri,
      base64: a.base64 ?? '',
      mimeType: a.type ?? 'image/jpeg',
      name: a.fileName || `photo-${i + 1}.jpg`,
    }));
  return { photos, uris: photos.map(p => p.uri) };
}

// The manifest declares CAMERA, so Android refuses to open the camera until
// the person has allowed it at runtime. iOS asks by itself.
async function cameraAllowed() {
  if (Platform.OS !== 'android') {
    return true;
  }
  const answer = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
  );
  return answer === PermissionsAndroid.RESULTS.GRANTED;
}

export async function takePhoto() {
  if (!(await cameraAllowed())) {
    return { uris: [], error: messages.permission };
  }
  return read(
    await launchCamera({ mediaType: 'photo', cameraType: 'back', ...EVIDENCE }),
  );
}

export async function takeSelfie() {
  if (!(await cameraAllowed())) {
    return { uris: [], error: messages.permission };
  }
  return read(
    await launchCamera({ mediaType: 'photo', cameraType: 'front', ...SELFIE }),
  );
}

export async function pickPhotos(limit) {
  return read(
    await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: Math.max(1, Math.min(6, limit)),
      ...EVIDENCE,
    }),
  );
}
