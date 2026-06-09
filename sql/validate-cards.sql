-- Cards criados
SELECT
  id,
  title,
  slug,
  domain,
  status,
  confidence_score,
  metadata->>'source_conversations' as convs,
  metadata->>'icon' as icon,
  created_at
FROM memory_cards_v2
WHERE metadata->>'auto_classified' = 'true'
ORDER BY created_at DESC;

-- Chunks vinculados por card
SELECT
  metadata->>'context_id' as context_id,
  COUNT(*) as chunks
FROM memory_chunks
WHERE metadata->>'context_id' IS NOT NULL
GROUP BY 1
ORDER BY 2 DESC;

-- Total de chunks vinculados
SELECT
  COUNT(*) as total_vinculados,
  COUNT(DISTINCT conversation_id) as conversas_vinculadas
FROM memory_chunks
WHERE metadata->>'context_id' IS NOT NULL;
