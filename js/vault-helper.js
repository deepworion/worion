/**
 * vault-helper.js
 * Helper para acessar chaves de API da Supabase Vault
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');

let _supabaseVaultClient;

/**
 * Inicializa cliente Supabase para a Vault
 */
function getVaultClient() {
  if (_supabaseVaultClient) return _supabaseVaultClient;

  const url = process.env.WORION_VAULT_SUPABASE_URL;
  const key = process.env.WORION_VAULT_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    console.warn('[vault-helper] Supabase Vault não configurado');
    return null;
  }

  _supabaseVaultClient = createClient(url, key, {
    auth: { persistSession: false },
  });

  return _supabaseVaultClient;
}

/**
 * Busca valor da Vault por ID
 * Schema: id, provider, key, value, store, expires_at, created_at, updated_at
 */
async function getVaultValueById(id) {
  const client = getVaultClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('api_keys_vault_v2')
      .select('value')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data?.value || null;
  } catch (err) {
    console.warn(`[vault-helper] Erro ao buscar ID ${id}:`, err.message);
    return null;
  }
}

/**
 * Busca valor da Vault por provider + key type
 * Schema: id, provider, key, value, store, expires_at, created_at, updated_at
 */
async function getVaultValue(provider, keyType = 'api_key') {
  const client = getVaultClient();
  if (!client) return null;

  try {
    const { data, error} = await client
      .from('api_keys_vault_v2')
      .select('value')
      .eq('provider', provider)
      .eq('key', keyType)
      .limit(1)
      .single();

    if (error) throw error;
    return data?.value || null;
  } catch (err) {
    console.warn(`[vault-helper] Erro ao buscar provider ${provider}:`, err.message);
    return null;
  }
}

/**
 * Busca chave de modelo (compatível com deepworion.js)
 * Vault IDs conhecidos:
 * - openai → id 1
 * - anthropic → id 41
 * - deepseek → id 43
 */
async function getModelKey(model) {
  if (model === 'claude' || model === 'anthropic') {
    return process.env.ANTHROPIC_API_KEY
      || await getVaultValueById(41)
      || await getVaultValue('anthropic', 'api_key');
  }

  if (model === 'gpt-mini' || model === 'gpt-medium' || model === 'openai') {
    return process.env.OPENAI_API_KEY
      || await getVaultValueById(1)
      || await getVaultValue('openai', 'api_key');
  }

  if (model === 'deepseek') {
    return process.env.DEEPSEEK_API_KEY
      || await getVaultValueById(43)
      || await getVaultValue('deepseek', 'api_key');
  }

  return null;
}

module.exports = {
  getVaultClient,
  getVaultValueById,
  getVaultValue,
  getModelKey,
};
