import {
  errorCodes,
  isErrorWithCode,
  pick,
} from '@react-native-documents/picker';

export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

let counter = 0;

// Same limits as the website: 5 files per task, 5 MB each, any type.
export async function pickFiles(room) {
  if (room <= 0) {
    return { files: [], error: `A task can hold ${MAX_FILES} files.` };
  }
  try {
    const picked = await pick({ allowMultiSelection: true });
    const tooBig = picked.filter(f => (f.size ?? 0) > MAX_FILE_BYTES);
    const ok = picked
      .filter(f => (f.size ?? 0) <= MAX_FILE_BYTES)
      .slice(0, room)
      .map(f => ({
        id: `f-${Date.now()}-${++counter}`,
        name: f.name ?? 'File',
        uri: f.uri,
        size: f.size ?? 0,
        type: f.type ?? '',
      }));
    const skipped = picked.length - tooBig.length - ok.length;
    return {
      files: ok,
      error: tooBig.length
        ? `${tooBig.length} ${
            tooBig.length === 1 ? 'file is' : 'files are'
          } larger than 5 MB and ${
            tooBig.length === 1 ? 'was' : 'were'
          } not added.`
        : skipped > 0
        ? `Only ${MAX_FILES} files fit on a task. ${skipped} not added.`
        : undefined,
    };
  } catch (e) {
    if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) {
      return { files: [] };
    }
    return {
      files: [],
      error: 'The file could not be added. Please try again.',
    };
  }
}

export const fileSize = bytes =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const isImage = file =>
  file.type.startsWith('image/') ||
  /\.(png|jpe?g|webp|heic|gif)$/i.test(file.name);
