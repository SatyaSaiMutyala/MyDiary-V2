import { createHash, createHmac, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Where evidence files are written.
 *
 * Two drivers, chosen by what is configured — the same arrangement v1 uses, so a developer can work
 * without bucket credentials and production still writes to the real bucket:
 *
 *   S3      when S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are all set
 *   local   otherwise — files under Backend/.data/uploads, which is gitignored
 *
 * Objects are laid out exactly as v1 lays them out, so both apps' evidence sits side by side in the
 * same bucket and the path alone says which unit, which day and which activity a photograph belongs to:
 *
 *     <folder>/<unit-key>/<YYYY-MM-DD>/<activity-key>/<uuid>.jpg
 *
 * Nothing here throws on a missing file: a record whose bytes have been purged still reads, it simply
 * has no image to show.
 */

const env = (k, fallback = '') => (process.env[k] ?? fallback).trim();

/** v1's folder names, including the spelling of "lab-openeings" — that is how the folder was created. */
export const FOLDERS = {
  opening: env('LAB_READINESS_FOLDER_OPENING', 'lab-openeings'),
  closing: env('LAB_READINESS_FOLDER_CLOSING', 'lab-closings'),
  signoff: env('LAB_READINESS_FOLDER_SIGNOFF', 'sign-off-pics'),
};

const s3Config = () => ({
  bucket: env('S3_BUCKET'),
  region: env('S3_REGION', 'ap-south-1'),
  accessKeyId: env('S3_ACCESS_KEY_ID'),
  secretAccessKey: env('S3_SECRET_ACCESS_KEY'),
  endpoint: env('S3_ENDPOINT'),
});

/** Which driver is in use right now. */
export function activeDisk() {
  const c = s3Config();
  return c.bucket && c.accessKeyId && c.secretAccessKey ? 's3' : 'local';
}

const LOCAL_ROOT = path.resolve(process.cwd(), env('UPLOAD_DIR', '.data/uploads'));

/** The object key for one piece of evidence. @returns {string} */
export function evidenceKey({ phase, unitKey, date, taskKey, ext = 'jpg' }) {
  const folder = phase === 'signoff' ? FOLDERS.signoff : FOLDERS[phase] ?? FOLDERS.opening;
  const parts = [folder, unitKey, date, taskKey || phase, `${randomUUID()}.${ext}`];
  return parts.filter(Boolean).join('/');
}

// ---------------------------------------------------------------- S3 (SigV4, no SDK)

const sha256hex = (b) => createHash('sha256').update(b).digest('hex');
const hmac = (key, data) => createHmac('sha256', key).update(data).digest();

/** AWS Signature Version 4 for a single PUT/GET/DELETE — the only three calls this app makes. */
function signedRequest({ method, key, body, contentType }) {
  const { bucket, region, accessKeyId, secretAccessKey, endpoint } = s3Config();
  const host = endpoint ? new URL(endpoint).host : `${bucket}.s3.${region}.amazonaws.com`;
  const base = endpoint ? `${endpoint.replace(/\/$/, '')}/${bucket}` : `https://${host}`;
  const url = `${base}/${key.split('/').map(encodeURIComponent).join('/')}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256hex(body ?? Buffer.alloc(0));

  /** @type {Record<string,string>} */
  const headers = { host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
  if (contentType) headers['content-type'] = contentType;

  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonicalHeaders = Object.keys(headers).sort().map((h) => `${h}:${headers[h]}\n`).join('');
  const canonicalUri = new URL(url).pathname;
  const canonicalRequest = [method, canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');

  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(Buffer.from(canonicalRequest))].join('\n');
  const signingKey = ['aws4_request'].reduce(
    (k, s) => hmac(k, s),
    hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), 's3'),
  );
  const signature = createHmac('sha256', signingKey).update(toSign).digest('hex');

  headers.authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return { url, headers };
}

async function s3Put(key, body, contentType) {
  const { url, headers } = signedRequest({ method: 'PUT', key, body, contentType });
  const res = await fetch(url, { method: 'PUT', headers, body });
  if (!res.ok) throw new Error(`S3 upload failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
}

async function s3Get(key) {
  const { url, headers } = signedRequest({ method: 'GET', key });
  const res = await fetch(url, { method: 'GET', headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`S3 read failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function s3Delete(key) {
  const { url, headers } = signedRequest({ method: 'DELETE', key });
  const res = await fetch(url, { method: 'DELETE', headers });
  if (!res.ok && res.status !== 404) throw new Error(`S3 delete failed (${res.status})`);
}

// ---------------------------------------------------------------- local disk

const localPath = (key) => path.join(LOCAL_ROOT, key);

async function localPut(key, body) {
  const file = localPath(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
}

async function localGet(key) {
  try {
    return await readFile(localPath(key));
  } catch {
    return null;
  }
}

async function localDelete(key) {
  try {
    await unlink(localPath(key));
  } catch { /* already gone — nothing to undo */ }
}

// ---------------------------------------------------------------- the API the app uses

/**
 * Writes one file and says where it went.
 * @returns {Promise<{ path: string, disk: string }>}
 */
export async function putEvidence({ phase, unitKey, date, taskKey, body, contentType }) {
  const ext = (contentType ?? '').includes('png') ? 'png' : (contentType ?? '').includes('webp') ? 'webp' : 'jpg';
  const key = evidenceKey({ phase, unitKey, date, taskKey, ext });
  const disk = activeDisk();
  if (disk === 's3') await s3Put(key, body, contentType);
  else await localPut(key, body);
  return { path: key, disk };
}

/** The bytes back, or null when they are no longer there. @returns {Promise<Buffer | null>} */
export function getEvidence(key, disk) {
  if (!key) return Promise.resolve(null);
  return (disk ?? activeDisk()) === 's3' ? s3Get(key) : localGet(key);
}

/** Removes one file. Never throws — a missing object is the state we wanted anyway. */
export async function deleteEvidence(key, disk) {
  if (!key) return;
  try {
    if ((disk ?? activeDisk()) === 's3') await s3Delete(key);
    else await localDelete(key);
  } catch { /* the record is what matters; a stray object is harmless */ }
}
