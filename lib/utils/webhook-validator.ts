import { createHmac, timingSafeEqual } from 'crypto';

const MAX_TIMESTAMP_AGE_MS = 30 * 60 * 1000; // 30 minutos (cubre retries de Botdog)

export function validateWebhookSignature(
  header: string | undefined,
  body: unknown
): boolean {
  const secret = process.env.BOTDOG_WEBHOOK_SECRET;

  if (!secret) {
    console.warn('[webhook-validator] BOTDOG_WEBHOOK_SECRET no configurado — omitiendo validación (solo para desarrollo)');
    return true;
  }

  if (!header) {
    console.error('[webhook-validator] Header x-webhook-signature ausente');
    return false;
  }

  // Parsear header: t=<timestamp>,s=<signature>
  const parts: Record<string, string> = {};
  for (const part of header.split(',')) {
    const [key, value] = part.split('=');
    if (key && value) parts[key.trim()] = value.trim();
  }

  const { t: timestamp, s: signature } = parts;

  if (!timestamp || !signature) {
    console.error('[webhook-validator] Header mal formado');
    return false;
  }

  // Verificar antigüedad del timestamp (acepta segundos o milisegundos)
  let tsMs = parseInt(timestamp, 10);
  if (tsMs < 1e12) tsMs *= 1000; // convertir de segundos a ms si es necesario
  const age = Date.now() - tsMs;
  if (age > MAX_TIMESTAMP_AGE_MS || age < 0) {
    console.error('[webhook-validator] Timestamp expirado o inválido', { age, tsMs });
    return false;
  }

  // Calcular HMAC
  const payload = `${timestamp}.${JSON.stringify(body)}`;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');

  // Comparar con timing-safe equality
  try {
    const expectedBuf = Buffer.from(expected, 'hex');
    const receivedBuf = Buffer.from(signature, 'hex');

    if (expectedBuf.length !== receivedBuf.length) return false;

    return timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}
