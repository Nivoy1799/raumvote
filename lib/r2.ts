import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

let _s3: S3Client | null = null;

function getS3(): S3Client {
  if (!_s3) {
    if (!process.env.R2_PUBLIC_URL) {
      throw new Error("[R2] R2_PUBLIC_URL env var is not set. Expected: https://<account-id>.r2.cloudflarestorage.com");
    }
    _s3 = new S3Client({
      region: "eu-central-1",
      endpoint: process.env.R2_PUBLIC_URL!,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _s3;
}

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
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
