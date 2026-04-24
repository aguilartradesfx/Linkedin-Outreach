const ONES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']
const TEENS = [
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince',
  'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
]
const TENS = [
  '', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta',
  'sesenta', 'setenta', 'ochenta', 'noventa',
]
const HUNDREDS = [
  '', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos',
]

function hundreds(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'cien'

  const h = Math.floor(n / 100)
  const rest = n % 100
  const hWord = HUNDREDS[h]

  if (rest === 0) return hWord
  return `${hWord} ${tens(rest)}`
}

function tens(n: number): string {
  if (n < 10) return ONES[n]
  if (n < 20) return TEENS[n - 10]

  const t = Math.floor(n / 10)
  const o = n % 10

  if (t === 2 && o > 0) {
    // veintiuno, veintidós, etc.
    const veinti = ['', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve']
    return veinti[o]
  }

  return o === 0 ? TENS[t] : `${TENS[t]} y ${ONES[o]}`
}

function integerToWords(n: number): string {
  if (n === 0) return 'cero'
  if (n < 0) return `menos ${integerToWords(-n)}`

  if (n < 100) return tens(n)
  if (n < 1000) return hundreds(n)

  if (n < 2000) {
    const rest = n % 1000
    return rest === 0 ? 'mil' : `mil ${hundreds(rest) || tens(rest % 100)}`
  }

  if (n < 1_000_000) {
    const thousands = Math.floor(n / 1000)
    const rest = n % 1000
    const tWord = integerToWords(thousands)
    const rWord = rest > 0 ? ` ${hundreds(rest) || tens(rest)}` : ''
    // "un mil" → "mil" is handled above; 2000+ use "dos mil", etc.
    return `${tWord} mil${rWord}`
  }

  if (n < 1_000_000_000) {
    const millions = Math.floor(n / 1_000_000)
    const rest = n % 1_000_000
    const mWord = millions === 1 ? 'un millón' : `${integerToWords(millions)} millones`
    const rWord = rest > 0 ? ` ${integerToWords(rest)}` : ''
    return `${mWord}${rWord}`
  }

  return String(n)
}

export function numberToWords(amount: number): string {
  if (!isFinite(amount) || isNaN(amount)) return ''

  const integer = Math.floor(amount)
  const cents = Math.round((amount - integer) * 100)

  const intWord = integerToWords(integer)
  if (cents === 0) return intWord

  const centWord = integerToWords(cents)
  return `${intWord} con ${centWord}/100`
}
