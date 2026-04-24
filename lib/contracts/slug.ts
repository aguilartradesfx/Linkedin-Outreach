import slugify from 'slugify'
import { nanoid } from 'nanoid'

export function generateContractSlug(empresaNombre: string): string {
  const base = slugify(empresaNombre, { lower: true, strict: true, locale: 'es' }).slice(0, 40)
  const uid = nanoid(8)
  return base ? `${base}-${uid}` : uid
}
