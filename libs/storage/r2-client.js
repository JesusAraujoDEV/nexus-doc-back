const boom = require('@hapi/boom');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { config } = require('../../config/config');

let client = null;

function assertConfigured() {
  const { accountId, accessKeyId, secretAccessKey, bucket } = config.r2;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw boom.serverUnavailable('El almacenamiento de adjuntos no está configurado');
  }
}

function getClient() {
  assertConfigured();
  if (client) return client;
  client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey },
  });
  return client;
}

async function putObject(key, body, contentType) {
  await getClient().send(new PutObjectCommand({
    Bucket: config.r2.bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

/** Devuelve el cuerpo como stream de Node para reenviarlo al cliente. */
async function getObjectStream(key) {
  const result = await getClient().send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }));
  return result.Body;
}

module.exports = { putObject, getObjectStream };
