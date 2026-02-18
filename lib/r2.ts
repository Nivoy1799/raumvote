import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

let _s3: S3Client | null = null;

function getS3(): S3Client {
  if (!_s3) {
    const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
    if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error("[R2] Missing env vars: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
    }
    _s3 = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return _s3;
}

export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
  const bucket = process.env.R2_BUCKET_NAME!;
  const publicUrl = process.env.R2_PUBLIC_URL!;

  await getS3().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return `${publicUrl}/${key}`;
}

// Check if R2 is reachable by writing and verifying a tiny probe object
export async function checkR2Health(): Promise<{ ok: boolean; error?: string }> {
  try {
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket || !process.env.R2_ENDPOINT) {
      return { ok: false, error: "R2 env vars not configured" };
    }

    const probeKey = `_health/${Date.now()}.txt`;
    await getS3().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: probeKey,
        Body: "ok",
        ContentType: "text/plain",
      }),
    );
    await getS3().send(new HeadObjectCommand({ Bucket: bucket, Key: probeKey }));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
