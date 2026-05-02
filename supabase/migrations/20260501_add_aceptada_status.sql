-- Add 'aceptada' to the status check constraint
ALTER TABLE proposal_requests DROP CONSTRAINT IF EXISTS proposal_requests_status_check;
ALTER TABLE proposal_requests
  ADD CONSTRAINT proposal_requests_status_check
  CHECK (status IN ('pendiente', 'en_revision', 'propuesta_enviada', 'aceptada', 'ganado', 'perdido'));
