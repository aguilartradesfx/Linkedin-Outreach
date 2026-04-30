import Anthropic from '@anthropic-ai/sdk';
import { anthropic } from './clients/anthropic';
import { supabase } from './clients/supabase';
import { SYSTEM_PROMPT } from './prompts/system';
import { toolDefinitions, executeTool } from './tools/index';
import { logEvent } from './utils/logger';
import type { AgentResponse, Message } from './types';

const MAX_TOOL_ITERATIONS = 12;
const MODEL = 'claude-sonnet-4-6';

async function getSystemPrompt(): Promise<string> {
  try {
    const { data } = await supabase
      .from('agent_config')
      .select('value')
      .eq('id', 'system_prompt')
      .single();
    if (data?.value) return data.value;
  } catch {
    // fallback to file constant
  }
  return SYSTEM_PROMPT;
}

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
  const activePrompt = await getSystemPrompt();
  const systemWithContext = `${activePrompt}\n\n## CONTEXTO DE SESIÓN\nProspect ID activo: ${prospectId}\nUsá este ID en todas las llamadas a tools que requieran prospect_id.`;

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
      // Fix A: only overwrite finalText if the end_turn response has actual text.
      // An empty end_turn after tool_use means the model already produced its text
      // as partialText in a prior tool_use response — preserve that.
      const endText = extractText(response.content);
      if (endText) finalText = endText;
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      );

      // Capture any text the model produced alongside the tool call
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

      claudeMessages.push({ role: 'assistant', content: response.content });
      claudeMessages.push({ role: 'user', content: toolResults });

      // Fix A: on the last available iteration, force text output so the model
      // can't burn the final slot on another tool call without producing a reply.
      const forceText = iterations >= MAX_TOOL_ITERATIONS - 1;
      response = await anthropic.messages.create({
        model: MODEL,
        system: systemWithContext,
        messages: claudeMessages,
        tools: toolDefinitions,
        ...(forceText ? { tool_choice: { type: 'none' as const } } : {}),
        max_tokens: 1024,
      });

      continue;
    }

    // Any other stop_reason (max_tokens, etc.): capture whatever text exists
    const otherText = extractText(response.content);
    if (otherText) finalText = otherText;
    break;
  }

  // Post-loop: try one last extract from the final response
  if (!finalText) {
    const lastText = extractText(response.content);
    if (lastText) finalText = lastText;
  }

  // Fix D: if still no text, log for manual review and return null — do NOT
  // send a generic fallback string to the prospect.
  if (!finalText) {
    await logEvent(prospectId, 'agent_no_response', {
      iterations,
      last_stop_reason: response.stop_reason,
    });
    const { data: prospectRow } = await supabase
      .from('linkedin_agent_prospects')
      .select('status')
      .eq('id', prospectId)
      .single();
    return { message: null, prospectId, status: prospectRow?.status ?? 'conversando' };
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
