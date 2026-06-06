import {
  PutObjectCommand,
  S3Client,
} from 'npm:@aws-sdk/client-s3@3.709.0'
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.709.0'
import { AwsClient } from 'npm:aws4fetch@1.0.20'

const R2_DELETE_TIMEOUT_MS = 15_000

export function getR2Config() {
  const accountId = Deno.env.get('R2_ACCOUNT_ID')
  const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID')
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY')
  const bucket = Deno.env.get('R2_BUCKET_NAME')
  const publicBase = Deno.env.get('R2_PUBLIC_BASE_URL')
  const endpoint =
    Deno.env.get('R2_S3_ENDPOINT')?.trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined)

  if (!accessKeyId || !secretAccessKey || !bucket || !endpoint || !publicBase) {
    throw new Error('R2-Konfiguration unvollständig (Secrets prüfen).')
  }

  return {
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint: endpoint.replace(/\/$/, ''),
    publicBase: publicBase.replace(/\/$/, ''),
  }
}

export function createR2Client(): S3Client {
  const { accessKeyId, secretAccessKey, endpoint } = getR2Config()
  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  })
}

export function publicUrlForKey(key: string): string {
  return `${getR2Config().publicBase}/${key}`
}

export async function presignPutObject(
  key: string,
  contentType: string,
  expiresIn = 900,
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const client = createR2Client()
  const { bucket } = getR2Config()
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  })
  const uploadUrl = await getSignedUrl(client, command, { expiresIn })
  return { uploadUrl, publicUrl: publicUrlForKey(key), key }
}

export async function uploadBytesToR2(
  key: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<string> {
  const client = createR2Client()
  const { bucket } = getR2Config()
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: new Uint8Array(bytes),
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )
  return publicUrlForKey(key)
}

/** R2-Löschung per signiertem fetch (zuverlässig in Supabase Edge; AWS-SDK hing hier). */
export async function deleteR2Keys(keys: string[]): Promise<void> {
  if (keys.length === 0) return

  const { accessKeyId, secretAccessKey, bucket, endpoint } = getR2Config()
  const aws = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: 's3',
    region: 'auto',
  })

  for (const key of keys) {
    const url = `${endpoint}/${bucket}/${key}`
    const res = await aws.fetch(url, {
      method: 'DELETE',
      signal: AbortSignal.timeout(R2_DELETE_TIMEOUT_MS),
    })

    if (res.ok || res.status === 404) {
      console.log('purge: R2 deleted', key, res.status)
      continue
    }

    const body = await res.text().catch(() => '')
    throw new Error(`R2-Löschung fehlgeschlagen (${res.status}): ${key} ${body}`.trim())
  }
}
