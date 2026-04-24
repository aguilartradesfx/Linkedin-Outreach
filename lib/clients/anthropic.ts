import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  throw new Error('Falta variable de entorno: ANTHROPIC_API_KEY es requerida');
}

export const anthropic = new Anthropic({ apiKey });
