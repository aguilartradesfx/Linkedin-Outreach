-- Add missing pipeline statuses to the check constraint.
-- STATUS_ORDER in code had perfil_visitado and mensaje_inicial_enviado
-- but the DB constraint didn't include them.
ALTER TABLE linkedin_agent_prospects
  DROP CONSTRAINT IF EXISTS linkedin_agent_prospects_status_check;

ALTER TABLE linkedin_agent_prospects
  ADD CONSTRAINT linkedin_agent_prospects_status_check
  CHECK (status IN (
    'nuevo',
    'perfil_visitado',
    'conexion_enviada',
    'conectado',
    'mensaje_inicial_enviado',
    'conversando',
    'calificado',
    'agendado',
    'no_califica',
    'no_respondio',
    'cerrado_ganado',
    'cerrado_perdido'
  ));
