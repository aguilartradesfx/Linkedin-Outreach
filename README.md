# Bralto LinkedIn Agent

Agente de IA que maneja conversaciones de LinkedIn con prospectos, los califica según señales de venta y agenda discovery calls en GHL, todo de forma automática.

## Stack

- **Runtime**: Vercel (Node.js Functions)
- **IA**: Claude Sonnet 4 via Anthropic SDK
- **Base de datos**: Supabase
- **CRM / Calendario**: GoHighLevel (GHL)
- **LinkedIn**: Botdog (webhooks)

## Estructura

```
api/
  chat.ts          → Webhook principal de Botdog
  health.ts        → Health check
lib/
  agent.ts         → Loop principal del agente con Claude
  types.ts         → Tipos TypeScript compartidos
  prompts/
    system.ts      → System prompt del agente
  tools/
    index.ts       → Definiciones de tools + router
    supabase.ts    → Tools de lectura/escritura en Supabase
    ghl.ts         → Tools de calendario y appointments GHL
  clients/
    supabase.ts    → Cliente de Supabase
    anthropic.ts   → Cliente de Anthropic
  utils/
    logger.ts      → Logger a Supabase + consola
    webhook-validator.ts → Validación HMAC del webhook de Botdog
test/
  simulate-conversation.ts → CLI para testear sin Botdog
```

## Instalación

```bash
npm install
```

## Configuración

Abrí `.env.local` y reemplazá cada `<PLACEHOLDER>` con tu valor real:

```bash
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# GHL (GoHighLevel)
GHL_API_KEY=eyJ...
GHL_LOCATION_ID=hdVpvshZP3RGJQbxx8GA   # ya configurado
GHL_CALENDAR_ID=...
GHL_COMPANY_ID=cnKny2ektFPRpPLw4AOb    # ya configurado

# Botdog
BOTDOG_API_KEY=...
BOTDOG_WEBHOOK_SECRET=...

# Apify (opcional por ahora)
APIFY_API_TOKEN=...
APIFY_SALES_NAV_ACTOR_ID=...
APIFY_PROFILE_SCRAPER_ACTOR_ID=...
```

## Testear localmente

```bash
npx ts-node test/simulate-conversation.ts \
  --firstName "Carlos" \
  --lastName "Mendoza" \
  --company "TechSolutions MX" \
  --position "CEO" \
  --industry "Software" \
  --message "Hola, vi tu solicitud. Qué hacen en Bralto?"
```

## Verificar TypeScript

```bash
npx tsc --noEmit
```

## Deploy a Vercel

```bash
# Instalar Vercel CLI si no lo tenés
npm i -g vercel

# Primer deploy
vercel

# Deploy a producción
vercel --prod
```

Configurá las mismas variables de `.env.local` en el dashboard de Vercel o con:

```bash
vercel env add ANTHROPIC_API_KEY
```

## Tablas requeridas en Supabase

- `linkedin_agent_prospects` — datos de prospectos
- `linkedin_agent_messages` — historial de conversaciones
- `linkedin_agent_events` — log de eventos del agente
