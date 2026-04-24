import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables desde .env.local antes de importar los módulos
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { supabase } from '../lib/clients/supabase';
import { runAgent } from '../lib/agent';

function parseArgs(): Record<string, string> {
  const args = process.argv.slice(2);
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    result[key] = value;
  }
  return result;
}

const REQUIRED_ARGS = ['firstName', 'lastName', 'company', 'position', 'industry', 'message'];

async function main() {
  const args = parseArgs();

  // Validar args requeridos
  const missing = REQUIRED_ARGS.filter((a) => !args[a]);
  if (missing.length > 0) {
    console.error(`Faltan argumentos requeridos: ${missing.map((a) => `--${a}`).join(', ')}`);
    console.error('\nUso:');
    console.error(
      '  npx ts-node test/simulate-conversation.ts \\\n' +
      '    --firstName "Carlos" --lastName "Mendoza" \\\n' +
      '    --company "TechSolutions MX" --position "CEO" \\\n' +
      '    --industry "Software" \\\n' +
      '    --message "Hola, vi tu solicitud. Qué hacen en Bralto?"'
    );
    process.exit(1);
  }

  const { firstName, lastName, company, position, industry, message } = args;
  const linkedinUrl = `https://www.linkedin.com/in/sim-${firstName.toLowerCase()}-${lastName.toLowerCase()}`;

  // Buscar o crear prospecto simulado
  const { data: existing } = await supabase
    .from('linkedin_agent_prospects')
    .select('*')
    .eq('linkedin_url', linkedinUrl)
    .single();

  let prospectId: string;

  if (!existing) {
    const { data: created, error } = await supabase
      .from('linkedin_agent_prospects')
      .insert({
        linkedin_url: linkedinUrl,
        full_name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
        company_name: company,
        position,
        industry,
        status: 'conversando',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !created) {
      console.error('Error al crear prospecto simulado:', error?.message);
      process.exit(1);
    }

    prospectId = created.id as string;
  } else {
    prospectId = existing.id as string;
  }

  console.log('──────────────────────────────────');
  console.log(`PROSPECTO: ${firstName} ${lastName} (${position} @ ${company})`);
  console.log(`MENSAJE: ${message}`);
  console.log('──────────────────────────────────');

  const response = await runAgent(prospectId, message);

  console.log(`AGENTE: ${response.message}`);
  console.log('──────────────────────────────────');

  // Obtener señales actualizadas del prospecto
  const { data: updated } = await supabase
    .from('linkedin_agent_prospects')
    .select('status, mentioned_problem, is_decision_maker, has_budget_signal, timing_urgency')
    .eq('id', prospectId)
    .single<{
      status: string;
      mentioned_problem: boolean | null;
      is_decision_maker: boolean | null;
      has_budget_signal: boolean | null;
      timing_urgency: boolean | null;
    }>();

  console.log(
    `STATUS: ${updated?.status ?? 'conversando'} | SEÑALES: problema=${updated?.mentioned_problem ?? false}, ` +
    `decisor=${updated?.is_decision_maker ?? false}, ` +
    `presupuesto=${updated?.has_budget_signal ?? false}, ` +
    `timing=${updated?.timing_urgency ?? false}`
  );
  console.log('──────────────────────────────────');
}

main().catch((err) => {
  console.error('Error en simulación:', err);
  process.exit(1);
});
