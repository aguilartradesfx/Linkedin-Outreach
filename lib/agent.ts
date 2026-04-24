import Anthropic from '@anthropic-ai/sdk';
import { anthropic } from './clients/anthropic';
import { supabase } from './clients/supabase';
import { SYSTEM_PROMPT } from './prompts/system';
import { toolDefinitions, executeTool } from './tools/index';
import { logEvent } from './utils/logger';
import type { AgentResponse, Message } from './types';

const MAX_TOOL_ITERATIONS = 8;
const MODEL = 'claude-sonnet-4-6';

export async function runAgent(
  prospectId: string,
  incomingMessage: string
): Promise<AgentResponse> {
  // Obtener historial para calcular turn_number
  const { data: existingMessages } = await supabase
    .from('linkedin_agent_messages')
    .select('turn_number')
    .eq('prospect_id', prospectId)
    .order('turn_number', { ascending: false })
    .limit(1);

  const lastTurn = existingMessages?.[0]?.turn_number ?? 0;
  const turnNumber = lastTurn + 1;

  // Guardar mensaje entrante del prospecto
  await supabase.from('linkedin_agent_messages').insert({
    prospect_id: prospectId,
    role: 'prospect',
    content: incomingMessage,
    turn_number: turnNumber,
    tool_calls: null,
    created_at: new Date().toISOString(),
  });

  // Obtener historial completo para construir el contexto
  const { data: allMessages } = await supabase
    .from('linkedin_agent_messages')
    .select('*')
    .eq('prospect_id', prospectId)
    .order('turn_number', { ascending: true });

  // Reconstruir historial como user/assistant alternados para Claude
  const claudeMessages: Anthropic.MessageParam[] = buildClaudeMessages(
    (allMessages ?? []) as Message[]
  );

  // Inyectar el prospect_id en el sistema para que Claude pueda usarlo en las tools
  const systemWithContext = `${SYSTEM_PROMPT}\n\n## CONTEXTO DE SESIÓN\nProspect ID activo: ${prospectId}\nUsá este ID en todas las llamadas a tools que requieran prospect_id.`;

  let response = await anthropic.messages.create({
    model: MODEL,
    system: systemWithContext,
    messages: claudeMessages,
    tools: toolDefinitions,
    max_tokens: 1024,
  });

  let finalText = '';
  let iterations = 0;

  // Loop de tool use
  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    if (response.stop_reason === 'end_turn') {
      finalText = extractText(response.content);
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      );

      // Guardar texto parcial si existe
      const partialText = extractText(response.content);
      if (partialText) finalText = partialText;

      // Construir tool_results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        await logEvent(prospectId, 'tool_call', { tool: toolUse.name, input: toolUse.input });
        const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      // Agregar respuesta del asistente y los resultados al historial
      claudeMessages.push({ role: 'assistant', content: response.content });
      claudeMessages.push({ role: 'user', content: toolResults });

      response = await anthropic.messages.create({
        model: MODEL,
        system: systemWithContext,
        messages: claudeMessages,
        tools: toolDefinitions,
        max_tokens: 1024,
      });

      continue;
    }

    // Cualquier otro stop_reason: salir
    finalText = extractText(response.content);
    break;
  }

  // Si se agotaron las iteraciones, usar el último texto disponible
  if (!finalText) {
    finalText = extractText(response.content) || 'Disculpa, hubo un problema al procesar tu mensaje.';
  }

  // Guardar respuesta del agente
  const agentTurn = turnNumber + 1;
  await supabase.from('linkedin_agent_messages').insert({
    prospect_id: prospectId,
    role: 'agent',
    content: finalText,
    turn_number: agentTurn,
    tool_calls: null,
    created_at: new Date().toISOString(),
  });

  // Obtener status actual del prospecto
  const { data: prospect } = await supabase
    .from('linkedin_agent_prospects')
    .select('status')
    .eq('id', prospectId)
    .single();

  const status = prospect?.status ?? 'conversando';

  await logEvent(prospectId, 'agent_response', { turn: agentTurn, status });

  return { message: finalText, prospectId, status };
}

function buildClaudeMessages(messages: Message[]): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];

  for (const msg of messages) {
    if (msg.role === 'prospect') {
      result.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'agent') {
      result.push({ role: 'assistant', content: msg.content });
    }
    // Los mensajes de sistema se omiten del historial (van en el campo system)
  }

  return result;
}

function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}
