export function getBraltoSignatureDataUrl(): string | null {
  return process.env.BRALTO_SIGNATURE_DATA_URL ?? null
}
