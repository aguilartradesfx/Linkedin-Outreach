import { Resend } from 'resend'

let resendInstance: Resend | null = null

export function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('Missing RESEND_API_KEY')
    resendInstance = new Resend(apiKey)
  }
  return resendInstance
}

export const FROM = 'Bralto <contratos@send.bralto.io>'
