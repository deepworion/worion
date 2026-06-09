/**
 * MÓDULO: tools.js
 * RESPONSABILIDADE: Registro e execução de ferramentas (tools), sistema de fallback e fluxo de memória operacional
 * DEPENDÊNCIAS: connectors.js, logger.js, projects.js, app.js
 * EXPORTA: TOOL_REGISTRY, WORION_TOOLS, resolveWorkspacePath, toWorkspaceRelativePath, sanitizeSupabaseRows, memorySnippet, memoryFetchRows, memorySearch, memoryReadConversation, summarizeMemoryText, normalizeMemorySummary, executeToolCall, executeToolCallRaw, executeToolCallWithFallback, executeNotionFallback, executeSupabaseFallback, executeFilesystemFallback, executeBraveFallback, normalizeGoalSearchText, detectArtifactRequest, detectVideoTranscriptionRequest, executeDirectVideoTranscription, extractNotionTitle, extractNotionContent, detectNotionPageRequest, executeNotionPageRequest, executeArtifactWebhook
 * TOOLS REGISTRADAS: sequential_thinking, classify_request, filesystem_list, filesystem_read, filesystem_write, generate_pdf, generate_image, supabase_select, brave_search, tavily_search, fetch_url, notion_search_pages, notion_list_children, notion_read_page, memory_search, memory_read_conversation, memory_summarize_conversation, memory_merge_sessions, memory_save_to_notion, create_notion_page, save_project, youtube_transcript, whisper_transcribe, instagram_content
 * NÃO MODIFICAR SEM LER: connectors.js, logger.js, app.js (núcleo do Goal Execution Engine)
 */

// ============================================
// TOOL EXECUTION ENGINE
// ============================================

const TOOL_REGISTRY = {
  sequential_thinking: {
    description: 'Organiza um raciocinio em etapas antes de executar ou responder. Use para tarefas complexas, planejamento, depuracao, arquitetura e decisoes com tradeoffs.',
    parameters: {
      goal: { type: 'string', description: 'Objetivo ou problema a resolver' },
      context: { type: 'string', description: 'Contexto relevante fornecido pelo usuario' },
      steps: { type: 'string', description: 'Etapas propostas em texto estruturado' },
      next_action: { type: 'string', description: 'Proxima acao concreta recomendada' }
    },
    required: ['goal', 'steps'],
    async execute(args) {
      return {
        success: true,
        goal: args.goal,
        context: args.context || '',
        steps: args.steps,
        next_action: args.next_action || ''
      };
    }
  },
  classify_request: {
    description: 'Classifica internamente um pedido do usuario como simple_query, direct_action ou compound_goal. Use apenas para roteamento interno.',
    parameters: {
      category: { type: 'string', description: 'simple_query, direct_action ou compound_goal' },
      reason: { type: 'string', description: 'Motivo curto da classificacao' },
      confidence: { type: 'number', description: 'Confianca entre 0 e 1' }
    },
    required: ['category', 'reason'],
    async execute(args) {
      const allowed = ['simple_query', 'direct_action', 'compound_goal'];
      const category = allowed.includes(args.category) ? args.category : 'compound_goal';
      return {
        success: true,
        category,
        reason: args.reason || '',
        confidence: Number(args.confidence || 0.7)
      };
    }
  },
  filesystem_list: {
    description: 'Lista arquivos e pastas dentro do workspace local do Worion. Use apenas para estrutura local, modulos, workflows ou artefatos. Nunca use para Notion, paginas, agenda, Worion HQ ou URLs do notion.so.',
    parameters: {
      relative_path: { type: 'string', description: 'Caminho relativo dentro do workspace. Exemplo: js, workflows/modules, artifacts' }
    },
    required: [],
    async execute(args) {
      const target = resolveWorkspacePath(args.relative_path || '.');
      const entries = await fs.readdir(target, { withFileTypes: true });
      return {
        success: true,
        path: toWorkspaceRelativePath(target),
        entries: entries
          .filter(entry => !['node_modules', '.git'].includes(entry.name))
          .map(entry => ({ name: entry.name, type: entry.isDirectory() ? 'directory' : 'file' }))
      };
    }
  },
  filesystem_read: {
    description: 'Le um arquivo de texto dentro do workspace local do Worion. Use apenas para arquivos locais markdown, JSON, JS, CSS e logs. Nunca use para Notion, paginas, agenda, Worion HQ ou URLs do notion.so.',
    parameters: {
      relative_path: { type: 'string', description: 'Caminho relativo do arquivo dentro do workspace' },
      max_chars: { type: 'number', description: 'Limite opcional de caracteres retornados' }
    },
    required: ['relative_path'],
    async execute(args) {
      const target = resolveWorkspacePath(args.relative_path);
      const stat = await fs.stat(target);
      if (!stat.isFile()) throw new Error('O caminho informado nao e um arquivo.');
      const maxChars = Math.min(Number(args.max_chars || 20000), 60000);
      const content = await fs.readFile(target, 'utf-8');
      return {
        success: true,
        path: toWorkspaceRelativePath(target),
        truncated: content.length > maxChars,
        content: content.slice(0, maxChars)
      };
    }
  },
  filesystem_write: {
    description: 'Cria ou atualiza um arquivo de texto dentro de artifacts/ ou data/projects/. Use para salvar artefatos locais e projetos, nunca para sobrescrever codigo do app.',
    parameters: {
      relative_path: { type: 'string', description: 'Caminho relativo permitido: artifacts/... ou data/projects/...' },
      content: { type: 'string', description: 'Conteudo textual a salvar' }
    },
    required: ['relative_path', 'content'],
    async execute(args) {
      const relative = String(args.relative_path || '').replace(/\\/g, '/').replace(/^\/+/, '');
      if (!/^artifacts\/|^data\/projects\//i.test(relative)) {
        throw new Error('filesystem_write so pode escrever em artifacts/ ou data/projects/.');
      }
      const target = resolveWorkspacePath(relative);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, String(args.content || ''), 'utf-8');
      return { success: true, path: toWorkspaceRelativePath(target) };
    }
  },
  generate_pdf: {
    description: 'Gera um arquivo PDF real e salva em artifacts/pdf/. Use quando o usuario pedir para gerar, criar ou salvar PDF.',
    parameters: {
      title: { type: 'string', description: 'Titulo do documento PDF' },
      content: { type: 'string', description: 'Conteudo em texto puro ou markdown do PDF' },
      filename: { type: 'string', description: 'Nome do arquivo sem caminho. Exemplo: relatorio.pdf' }
    },
    required: ['title', 'content', 'filename'],
    async execute(args) {
      const PDFDocument = require('pdfkit');
      const fsSync = require('fs');
      const filename = String(args.filename || 'documento.pdf').replace(/[^a-z0-9._-]/gi, '_');
      if (!filename.endsWith('.pdf')) {
        throw new Error('filename deve terminar com .pdf');
      }
      const relativePath = `artifacts/pdf/${filename}`;
      const target = resolveWorkspacePath(relativePath);
      await fs.mkdir(path.dirname(target), { recursive: true });

      return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fsSync.createWriteStream(target);

        doc.pipe(stream);

        // Título
        doc.fontSize(20).font('Helvetica-Bold').text(String(args.title || 'Documento'), { align: 'center' });
        doc.moveDown(2);

        // Conteúdo
        doc.fontSize(12).font('Helvetica').text(String(args.content || ''), {
          align: 'justify',
          lineGap: 4
        });

        doc.end();

        stream.on('finish', () => {
          // Validar se o arquivo realmente existe
          if (!fsSync.existsSync(target)) {
            reject(new Error('PDF não foi criado no disco'));
            return;
          }

          const fileUrl = `file://${target.replace(/\\/g, '/')}`;
          resolve({
            success: true,
            filePath: target,
            relativePath: relativePath,
            fileName: filename,
            absolutePath: target,
            downloadUrl: fileUrl,
            message: `PDF gerado com sucesso! [Clique aqui para abrir ${filename}](${fileUrl})`
          });
        });

        stream.on('error', reject);
      });
    }
  },
  generate_image: {
    description: 'Gera uma imagem via OpenAI Images e salva em artifacts/images/. Use quando o usuario pedir para gerar, criar ou fazer uma imagem, logo ou visual.',
    parameters: {
      prompt: { type: 'string', description: 'Descricao da imagem a gerar' },
      size: { type: 'string', description: 'Tamanho. Exemplo: 1024x1024, 1024x1536 ou 1536x1024' },
      style: { type: 'string', description: 'Estilo visual opcional' },
      outputPath: { type: 'string', description: 'Nome opcional do arquivo dentro de artifacts/images/' }
    },
    required: ['prompt'],
    async execute(args) {
      if (!openaiKey) openaiKey = await getOpenAIKey();
      const fsSync = require('fs');
      const prompt = [args.prompt, args.style ? `Estilo: ${args.style}` : ''].filter(Boolean).join('\n');
      const size = args.size || '1024x1024';
      const filename = String(args.outputPath || `imagem-${Date.now()}.png`)
        .replace(/^artifacts[\\/]images[\\/]/i, '')
        .replace(/[^a-z0-9._-]/gi, '_')
        .replace(/\.(?!png$)[^.]+$/i, '.png');
      const finalName = filename.endsWith('.png') ? filename : `${filename}.png`;
      const relativePath = `artifacts/images/${finalName}`;
      const target = resolveWorkspacePath(relativePath);
      await fs.mkdir(path.dirname(target), { recursive: true });

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt,
          size,
          n: 1
        })
      });

      const body = await response.text();
      if (!response.ok) {
        console.error('[generate_image] OpenAI image error:', response.status, body.slice(0, 300));
        throw new Error('Geracao de imagem ainda nao esta configurada neste ambiente.');
      }

      const data = JSON.parse(body);
      const b64 = data.data?.[0]?.b64_json;
      if (!b64) throw new Error('Geracao de imagem nao retornou arquivo.');
      await fs.writeFile(target, Buffer.from(b64, 'base64'));

      if (!fsSync.existsSync(target)) throw new Error('Imagem nao foi criada no disco.');
      const fileUrl = `file://${target.replace(/\\/g, '/')}`;
      return {
        success: true,
        filePath: target,
        relativePath,
        fileName: finalName,
        downloadUrl: fileUrl,
        message: `Imagem gerada com sucesso. [Clique aqui para abrir ${finalName}](${fileUrl})`
      };
    }
  },
  supabase_select: {
    description: 'Consulta uma tabela permitida do Supabase via REST ja configurado. Use para checar memoria, atoms, conversas importadas do Claude/GPT, chunks ou vault sem expor secrets.',
    parameters: {
      table: { type: 'string', description: 'Tabela permitida: api_keys_vault_v2, memory_conversations, memory_chunks, memory_atoms_v1 ou worion_memory_conversations' },
      select: { type: 'string', description: 'Colunas do select. Padrao: *' },
      limit: { type: 'number', description: 'Limite de linhas. Padrao: 10' },
      provider: { type: 'string', description: 'Filtro opcional provider para api_keys_vault_v2' },
      source_id: { type: 'string', description: 'Filtro opcional de origem. Exemplo: claude, gpt, worion' },
      role: { type: 'string', description: 'Filtro opcional de role para memory_chunks: user ou assistant' },
      id_prefix: { type: 'string', description: 'Filtro opcional por prefixo de id' },
      count: { type: 'boolean', description: 'Quando true, retorna apenas contagem exata' }
    },
    required: ['table'],
    async execute(args) {
      const table = String(args.table || '').trim();
      const limit = Math.min(Number(args.limit || 10), 50);
      if (table === 'api_keys_vault_v2') {
        const select = args.select || 'id,provider,key,store,updated_at';
        const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
        url.searchParams.set('select', select);
        url.searchParams.set('limit', String(limit));
        if (args.provider) url.searchParams.set('provider', `eq.${args.provider}`);
        const response = await fetch(url.toString(), { headers: supabaseHeaders() });
        if (!response.ok) throw new Error(`Supabase ${response.status}`);
        const rows = await response.json();
        return { success: true, table, rows: sanitizeSupabaseRows(rows) };
      }
      if (['memory_conversations', 'memory_chunks', 'memory_atoms_v1', MEMORY_CONVERSATIONS_TABLE].includes(table)) {
        const defaults = {
          memory_conversations: 'id,source_id,external_id,title,summary,updated_at,imported_at',
          memory_chunks: 'id,conversation_id,source_id,chunk_index,role,content,created_at',
          memory_atoms_v1: 'id,card_id,conversation_id,type,title,content,retrieval_text,keywords,entities,source_chunk_ids,importance,confidence,status,created_at',
          [MEMORY_CONVERSATIONS_TABLE]: 'id,title,agent_name,active_skill_id,project_title,created_at,updated_at'
        };
        const url = new URL(`${MEMORY_SUPABASE_URL}/rest/v1/${table}`);
        url.searchParams.set('select', args.count ? 'id' : (args.select || defaults[table] || '*'));
        if (args.source_id && ['memory_conversations', 'memory_chunks'].includes(table)) {
          url.searchParams.set('source_id', `eq.${args.source_id}`);
        }
        if (args.role && table === 'memory_chunks') {
          url.searchParams.set('role', `eq.${args.role}`);
        }
        if (args.id_prefix) {
          url.searchParams.set('id', `like.${args.id_prefix}%`);
        }
        if (table === 'memory_conversations') url.searchParams.set('order', 'updated_at.desc');
        if (table === 'memory_chunks') url.searchParams.set('order', 'chunk_index.asc');
        if (table === 'memory_atoms_v1') {
          url.searchParams.set('status', 'eq.active');
          url.searchParams.set('order', 'importance.desc');
        }
        url.searchParams.set('limit', args.count ? '1' : String(limit));

        const headers = memorySupabaseHeaders(args.count ? { 'Prefer': 'count=exact', 'Range': '0-0' } : {});
        const response = await fetch(url.toString(), { headers });
        const bodyText = await response.text();
        if (!response.ok) throw new Error(`Supabase memory ${response.status}: ${bodyText.slice(0, 180)}`);

        if (args.count) {
          const range = response.headers.get('content-range') || '';
          const total = Number(range.split('/')[1] || 0);
          return { success: true, table, count: total, filters: { source_id: args.source_id || null, role: args.role || null, id_prefix: args.id_prefix || null } };
        }

        return { success: true, table, rows: JSON.parse(bodyText || '[]') };
      }
      throw new Error('Tabela nao permitida para consulta por tool.');
    }
  },
  brave_search: {
    description: 'Pesquisa a web em tempo real usando Brave Search com a API cadastrada na Vault Supabase id 21. Use para noticias, informacoes atuais, verificacao externa, links e pesquisa geral na internet.',
    parameters: {
      query: { type: 'string', description: 'Consulta de busca' },
      count: { type: 'number', description: 'Quantidade de resultados. Padrao: 8, maximo: 20' },
      freshness: { type: 'string', description: 'Opcional: pd para ultimo dia, pw para ultima semana, pm para ultimo mes, py para ultimo ano' },
      country: { type: 'string', description: 'Pais da busca. Padrao: BR' },
      search_lang: { type: 'string', description: 'Idioma da busca. Padrao: pt-br' }
    },
    required: ['query'],
    async execute(args) {
      const result = await braveWebSearch(args.query, {
        count: args.count,
        freshness: args.freshness,
        country: args.country,
        search_lang: args.search_lang
      });
      return { success: true, ...result };
    }
  },
  tavily_search: {
    description: 'Pesquisa a web em tempo real usando Tavily Search com a API cadastrada na Vault Supabase id 40. Use junto ao Brave para pesquisa geral, verificacao externa, noticias, links e resultados otimizados para agentes.',
    parameters: {
      query: { type: 'string', description: 'Consulta de busca' },
      count: { type: 'number', description: 'Quantidade de resultados. Padrao: 8, maximo: 20' },
      freshness: { type: 'string', description: 'Opcional: pd/day, pw/week, pm/month, py/year' },
      topic: { type: 'string', description: 'general, news ou finance. Padrao: general' },
      search_depth: { type: 'string', description: 'basic, fast, ultra-fast ou advanced. Padrao: basic' },
      country: { type: 'string', description: 'Pais da busca. Padrao: BR/brazil' },
      include_answer: { type: 'boolean', description: 'Quando true, inclui resposta sintetica gerada pela Tavily' },
      include_raw_content: { type: 'boolean', description: 'Quando true, inclui conteudo bruto/limpo das paginas quando disponivel' }
    },
    required: ['query'],
    async execute(args) {
      const result = await tavilyWebSearch(args.query, {
        count: args.count,
        freshness: args.freshness,
        topic: args.topic,
        search_depth: args.search_depth,
        country: args.country,
        include_answer: args.include_answer,
        include_raw_content: args.include_raw_content
      });
      return { success: true, ...result };
    }
  },
  tavily_extract: {
    description: 'Extrai conteudo completo de ate 20 URLs usando Tavily Extract. Projetado para baixa latencia e protecao contra prompt injection. Use quando precisar do conteudo completo de multiplas paginas de uma vez.',
    parameters: {
      urls: { type: 'array', description: 'Lista de URLs para extrair conteudo (maximo 20)' }
    },
    required: ['urls'],
    async execute(args) {
      if (!Array.isArray(args.urls)) throw new Error('tavily_extract requer array de URLs.');
      const result = await tavilyExtract(args.urls);
      return { success: true, ...result };
    }
  },
  fetch_url: {
    description: 'Abre uma URL publica e retorna o conteudo textual da pagina para leitura e sintese. Use depois de uma busca quando precisar validar detalhes diretamente na fonte.',
    parameters: {
      url: { type: 'string', description: 'URL completa para acessar' },
      max_chars: { type: 'number', description: 'Limite opcional de caracteres retornados. Padrao: 12000' }
    },
    required: ['url'],
    async execute(args) {
      const url = String(args.url || '').trim();
      if (!/^https?:\/\//i.test(url)) throw new Error('URL invalida para fetch_url.');
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Worion/1.0 (+https://local.worion)'
        }
      });
      const contentType = response.headers.get('content-type') || '';
      const body = await response.text();
      if (!response.ok) throw new Error(`fetch_url falhou com status ${response.status}`);
      const maxChars = Math.max(1000, Math.min(Number(args.max_chars || 12000), 50000));
      const text = contentType.includes('text/html')
        ? body
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim()
        : body.replace(/\s+/g, ' ').trim();
      return {
        success: true,
        url,
        contentType,
        text: text.slice(0, maxChars),
        truncated: text.length > maxChars
      };
    }
  },
  notion_search_pages: {
    description: 'Busca paginas reais no Notion por titulo ou termo. Use para encontrar paginas como Worion Workspace HQ, agenda, Daily Reports, Tasks & Projects e qualquer conteudo do Notion.',
    parameters: {
      query: { type: 'string', description: 'Termo de busca no Notion' },
      limit: { type: 'number', description: 'Limite de paginas retornadas. Padrao: 10' }
    },
    required: ['query'],
    async execute(args) {
      const pages = await searchNotionPages(args.query || '', args.limit || 10);
      return { success: true, query: args.query || '', pages };
    }
  },
  notion_list_children: {
    description: 'Lista blocos e subpaginas filhos de uma pagina real do Notion. Use quando o usuario pedir lista, agenda, sub sessao, subpagina, pagina Worion HQ ou enviar URL/ID do Notion.',
    parameters: {
      page_ref: { type: 'string', description: 'ID, URL ou titulo da pagina Notion. Se vazio, usa o parent principal configurado.' },
      limit: { type: 'number', description: 'Limite de itens. Padrao: 100' }
    },
    required: [],
    async execute(args) {
      let pageRef = args.page_ref || NOTION_PARENT_PAGE_ID;
      if (pageRef && !/[0-9a-f]{32}|[0-9a-f]{8}-/i.test(pageRef) && !/notion\.so/i.test(pageRef)) {
        const found = await findNotionPageByTitle(pageRef);
        if (found) pageRef = found.id;
      }
      const result = await listNotionChildren(pageRef, args.limit || 100);
      return { success: true, ...result };
    }
  },
  notion_read_page: {
    description: 'Le o texto de uma pagina real do Notion por ID, URL ou titulo. Use para responder perguntas sobre conteudo do Notion.',
    parameters: {
      page_ref: { type: 'string', description: 'ID, URL ou titulo da pagina Notion' },
      max_chars: { type: 'number', description: 'Limite de caracteres retornados. Padrao: 12000' }
    },
    required: ['page_ref'],
    async execute(args) {
      let pageRef = args.page_ref;
      if (pageRef && !/[0-9a-f]{32}|[0-9a-f]{8}-/i.test(pageRef) && !/notion\.so/i.test(pageRef)) {
        const found = await findNotionPageByTitle(pageRef);
        if (found) pageRef = found.id;
      }
      const pageId = extractNotionPageId(pageRef);
      const content = await loadPageText(pageId);
      const maxChars = Math.min(Number(args.max_chars || 12000), 60000);
      return {
        success: true,
        pageId,
        truncated: content.length > maxChars,
        content: content.slice(0, maxChars)
      };
    }
  },
  memory_search: {
    description: 'Busca memoria semantica privada. Prioriza memory_atoms_v1 e usa memory_chunks apenas como evidencia bruta/fallback.',
    parameters: {
      query: { type: 'string', description: 'Termo a buscar no conteudo das memorias' },
      source_id: { type: 'string', description: 'Origem opcional: claude, gpt ou worion' },
      limit: { type: 'number', description: 'Quantidade maxima de resultados. Padrao: 10' }
    },
    required: ['query'],
    async execute(args) {
      return await memorySearch(args.query, args.source_id || '', args.limit || 10);
    }
  },
  memory_read_conversation: {
    description: 'Le uma conversa completa da memoria pelo conversation_id, buscando metadados em memory_conversations e chunks ordenados por chunk_index.',
    parameters: {
      conversation_id: { type: 'string', description: 'ID da conversa em memory_conversations' },
      max_chars: { type: 'number', description: 'Limite opcional de caracteres reconstruidos. Padrao: 60000' }
    },
    required: ['conversation_id'],
    async execute(args) {
      return await memoryReadConversation(args.conversation_id, args.max_chars || 60000);
    }
  },
  memory_summarize_conversation: {
    description: 'Le uma conversa da memoria e usa GPT-4o para gerar resumo com decisoes tomadas, tarefas, pendencias e links mencionados.',
    parameters: {
      conversation_id: { type: 'string', description: 'ID da conversa a resumir' },
      max_chars: { type: 'number', description: 'Limite opcional de caracteres enviados ao resumo. Padrao: 50000' }
    },
    required: ['conversation_id'],
    async execute(args) {
      const conversation = await memoryReadConversation(args.conversation_id, args.max_chars || 50000);
      const sourceSummary = conversation.summary
        ? `Resumo exportado da origem:\n${conversation.summary}\n\n`
        : '';
      const summary = await summarizeMemoryText(
        `Conversa: ${conversation.title}\nOrigem: ${conversation.source_id}\nMensagens: ${conversation.messages.length}\n\n${sourceSummary}Transcript parcial ou completo:\n${conversation.transcript}`,
        'Gere um resumo operacional da conversa com secoes em markdown: **Resumo**, **Decisoes tomadas**, **Tarefas**, **Pendencias** e **Links mencionados**. Use o resumo exportado como contexto quando existir e complemente com o transcript. Seja fiel ao conteudo; se algo nao aparecer, escreva "Nao identificado". Nao finalize com frases genericas.'
      );
      return {
        success: true,
        conversation_id: conversation.conversation_id,
        title: conversation.title,
        source_id: conversation.source_id,
        message_count: conversation.messages.length,
        summary: normalizeMemorySummary(summary)
      };
    }
  },
  memory_merge_sessions: {
    description: 'Le varias conversas da memoria, concatena o conteudo e usa GPT-4o para gerar um resumo consolidado por tema.',
    parameters: {
      conversation_ids: { type: 'array', description: 'Lista de IDs de conversas a consolidar' },
      max_chars_per_conversation: { type: 'number', description: 'Limite opcional por conversa. Padrao: 30000' }
    },
    required: ['conversation_ids'],
    async execute(args) {
      const ids = Array.isArray(args.conversation_ids) ? args.conversation_ids : [];
      if (!ids.length) throw new Error('Informe ao menos um conversation_id.');
      const conversations = [];
      for (const id of ids.slice(0, 10)) {
        conversations.push(await memoryReadConversation(id, args.max_chars_per_conversation || 30000));
      }
      const merged = conversations.map(item =>
        `# ${item.title}\nID: ${item.conversation_id}\nOrigem: ${item.source_id}\n\n${item.transcript}`
      ).join('\n\n---\n\n');
      const summary = await summarizeMemoryText(
        merged,
        'Gere um resumo consolidado por tema a partir das sessoes. Inclua: temas principais, decisoes, tarefas, pendencias, links e conversas de origem mais relevantes.'
      );
      return {
        success: true,
        conversation_ids: conversations.map(item => item.conversation_id),
        total_conversations: conversations.length,
        summary: normalizeMemorySummary(summary)
      };
    }
  },
  memory_save_to_notion: {
    description: 'Salva um resumo ou sessao consolidada de memoria no Notion criando uma pagina real.',
    parameters: {
      title: { type: 'string', description: 'Titulo da pagina no Notion' },
      content: { type: 'string', description: 'Texto do resumo ou consolidado a salvar' }
    },
    required: ['title', 'content'],
    async execute(args) {
      const page = await createNotionPage(args.title, args.content);
      return { success: true, title: page.title, url: page.url, id: page.id };
    }
  },
  create_notion_page: {
    description: 'Cria uma página no Notion com título e conteúdo. Use sempre que o usuário pedir para salvar, registrar, guardar ou criar algo no Notion, ou quando fizer sentido persistir informações importantes da conversa.',
    parameters: {
      title: { type: 'string', description: 'Título da página no Notion' },
      content: { type: 'string', description: 'Conteúdo da página em texto puro ou markdown' }
    },
    required: ['title', 'content'],
    async execute(args) {
      const page = await createNotionPage(args.title, args.content);
      return { success: true, title: page.title, url: page.url, id: page.id };
    }
  },
  save_project: {
    description: 'Salva ou atualiza um projeto local no Worion com título, descrição e contexto.',
    parameters: {
      title: { type: 'string', description: 'Nome do projeto' },
      description: { type: 'string', description: 'Descrição do projeto' },
      context: { type: 'string', description: 'Contexto ou conteúdo inicial do projeto' }
    },
    required: ['title'],
    async execute(args) {
      const project = await saveLocalProject({ title: args.title, description: args.description || '', context: args.context || '' });
      return { success: true, id: project.id, title: project.title };
    }
  },
  // ============================================
  // VIDEO CONTENT EXTRACTION TOOLS
  // ============================================

  // Funções auxiliares para cache e download
  async _checkTranscriptCache(videoId) {
    const fs = require('fs');
    const path = require('path');
    const cacheDir = path.join(process.cwd(), 'cache', 'transcripts');
    const cacheFile = path.join(cacheDir, `${videoId}.json`);

    if (fs.existsSync(cacheFile)) {
      try {
        const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        console.log(`[cache] Transcrição encontrada no cache: ${videoId}`);
        return cached;
      } catch (error) {
        console.warn(`[cache] Erro ao ler cache: ${error.message}`);
        return null;
      }
    }
    return null;
  },

  async _saveTranscriptCache(videoId, data) {
    const fs = require('fs');
    const path = require('path');
    const cacheDir = path.join(process.cwd(), 'cache', 'transcripts');
    const cacheFile = path.join(cacheDir, `${videoId}.json`);

    try {
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.writeFileSync(cacheFile, JSON.stringify({
        videoId,
        timestamp: new Date().toISOString(),
        ...data
      }, null, 2));
      console.log(`[cache] Transcrição salva no cache: ${videoId}`);
    } catch (error) {
      console.warn(`[cache] Erro ao salvar cache: ${error.message}`);
    }
  },

  async _downloadYoutubeAudio(videoId, url) {
    const fs = require('fs');
    const path = require('path');
    const ytdl = require('@distube/ytdl-core');

    const tempDir = path.join(process.cwd(), 'cache', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const audioPath = path.join(tempDir, `${videoId}.mp3`);

    console.log(`[youtube_download] Baixando áudio: ${videoId}...`);

    return new Promise((resolve, reject) => {
      const stream = ytdl(url, {
        quality: 'lowestaudio',
        filter: 'audioonly'
      });

      const writeStream = fs.createWriteStream(audioPath);

      stream.pipe(writeStream);

      stream.on('error', (error) => {
        console.error(`[youtube_download] Erro no download: ${error.message}`);
        reject(error);
      });

      writeStream.on('error', (error) => {
        console.error(`[youtube_download] Erro ao salvar: ${error.message}`);
        reject(error);
      });

      writeStream.on('finish', () => {
        const stats = fs.statSync(audioPath);
        const sizeMB = stats.size / (1024 * 1024);
        console.log(`[youtube_download] Áudio baixado: ${sizeMB.toFixed(2)}MB`);

        if (sizeMB > 25) {
          fs.unlinkSync(audioPath);
          reject(new Error(`Áudio muito grande (${sizeMB.toFixed(1)}MB). Limite: 25MB. Tente um vídeo mais curto.`));
        } else {
          resolve(audioPath);
        }
      });
    });
  },

  youtube_transcript: {
    description: 'Extrai a transcrição/legendas de um vídeo do YouTube. Use quando o usuário fornecer uma URL do YouTube ou pedir para analisar/extrair conteúdo de vídeo do YouTube.',
    parameters: {
      url: { type: 'string', description: 'URL completa do vídeo do YouTube (youtube.com/watch?v=... ou youtu.be/...)' },
      language: { type: 'string', description: 'Código de idioma preferido (pt, en, es, etc). Padrão: pt' }
    },
    required: ['url'],
    async execute(args) {
      const fs = require('fs');
      const url = String(args.url || '').trim();
      const language = String(args.language || 'pt').trim();

      if (!url) throw new Error('URL do YouTube é obrigatória');

      // Extrai o video ID da URL
      const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/);
      if (!videoIdMatch) throw new Error('URL do YouTube inválida');

      const videoId = videoIdMatch[1];

      // 1. Verifica cache primeiro
      const cached = await TOOL_REGISTRY._checkTranscriptCache(videoId);
      if (cached) {
        return {
          success: true,
          videoId,
          url,
          fullText: cached.fullText,
          language: cached.language,
          segmentCount: cached.segmentCount,
          source: 'cache',
          message: `Transcrição recuperada do cache! ${cached.segmentCount || 'N/A'} segmentos.`
        };
      }

      // 2. Tenta buscar legendas do YouTube
      try {
        const { YoutubeTranscript } = require('youtube-transcript');
        let transcript;

        try {
          transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: language });
        } catch (langError) {
          console.log(`[youtube_transcript] Idioma ${language} não disponível, tentando inglês...`);
          transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
        }

        if (transcript && transcript.length > 0) {
          // Sucesso com legendas do YouTube
          const fullText = transcript.map(item => item.text).join(' ');
          const result = {
            fullText,
            language: transcript[0]?.lang || language,
            segmentCount: transcript.length
          };

          // Salva no cache
          await TOOL_REGISTRY._saveTranscriptCache(videoId, result);

          return {
            success: true,
            videoId,
            url,
            ...result,
            source: 'youtube_captions',
            message: `Transcrição extraída com sucesso! ${transcript.length} segmentos encontrados.`
          };
        }
      } catch (captionError) {
        console.log(`[youtube_transcript] Legendas não disponíveis: ${captionError.message}`);
        console.log(`[youtube_transcript] Tentando fallback com Whisper...`);
      }

      // 3. Fallback: baixa áudio e transcreve com Whisper
      let audioPath = null;
      try {
        audioPath = await TOOL_REGISTRY._downloadYoutubeAudio(videoId, url);

        // Transcreve com Whisper
        const whisperResult = await TOOL_REGISTRY.whisper_transcribe.execute({
          file_path: audioPath,
          language: language
        });

        if (whisperResult.success) {
          const result = {
            fullText: whisperResult.text,
            language: whisperResult.language,
            segmentCount: Math.ceil(whisperResult.duration_seconds / 2) // Estimativa
          };

          // Salva no cache
          await TOOL_REGISTRY._saveTranscriptCache(videoId, result);

          return {
            success: true,
            videoId,
            url,
            ...result,
            source: 'whisper',
            duration_seconds: whisperResult.duration_seconds,
            message: `Transcrição gerada com Whisper! Duração: ${whisperResult.duration_seconds}s (custo: ~$${(whisperResult.duration_seconds / 60 * 0.006).toFixed(3)})`
          };
        } else {
          throw new Error(whisperResult.error || 'Erro ao transcrever com Whisper');
        }

      } catch (error) {
        console.error('[youtube_transcript] Erro no fallback:', error);
        return {
          success: false,
          error: error.message || 'Erro ao extrair transcrição do YouTube',
          details: String(error),
          suggestion: 'O vídeo pode não ter legendas e o áudio pode estar inacessível ou muito grande (>25MB). Tente um vídeo mais curto.'
        };
      } finally {
        // Limpeza: deleta arquivo de áudio temporário
        if (audioPath && fs.existsSync(audioPath)) {
          try {
            fs.unlinkSync(audioPath);
            console.log(`[cleanup] Arquivo temporário deletado: ${audioPath}`);
          } catch (cleanupError) {
            console.warn(`[cleanup] Erro ao deletar arquivo temporário: ${cleanupError.message}`);
          }
        }
      }
    }
  },
  whisper_transcribe: {
    description: 'Transcreve áudio/vídeo local usando OpenAI Whisper API. Use quando o usuário fornecer um caminho de arquivo de vídeo/áudio ou mencionar que baixou/tem um arquivo local para transcrever.',
    parameters: {
      file_path: { type: 'string', description: 'Caminho completo do arquivo de áudio/vídeo local (mp3, mp4, wav, m4a, webm, etc)' },
      language: { type: 'string', description: 'Código ISO-639-1 do idioma (pt, en, es, etc). Ajuda na precisão. Opcional.' },
      prompt: { type: 'string', description: 'Texto de contexto opcional para guiar a transcrição. Opcional.' }
    },
    required: ['file_path'],
    async execute(args) {
      try {
        const fs = require('fs');
        const path = require('path');
        const { OpenAI } = require('openai');
        const { getOpenAIKey } = require('./connectors');

        const filePath = String(args.file_path || '').trim();
        const language = args.language ? String(args.language).trim() : undefined;
        const prompt = args.prompt ? String(args.prompt).trim() : undefined;

        if (!filePath) throw new Error('Caminho do arquivo é obrigatório');

        // Verifica se o arquivo existe
        if (!fs.existsSync(filePath)) {
          throw new Error(`Arquivo não encontrado: ${filePath}`);
        }

        // Verifica o tamanho do arquivo (limite de 25MB da API)
        const stats = fs.statSync(filePath);
        const fileSizeMB = stats.size / (1024 * 1024);
        if (fileSizeMB > 25) {
          throw new Error(`Arquivo muito grande (${fileSizeMB.toFixed(1)}MB). O limite da API do Whisper é 25MB.`);
        }

        // Busca a API key do OpenAI
        const apiKey = await getOpenAIKey();
        const openai = new OpenAI({ apiKey });

        console.log(`[whisper_transcribe] Transcrevendo: ${path.basename(filePath)} (${fileSizeMB.toFixed(1)}MB)...`);

        // Cria um stream do arquivo
        const fileStream = fs.createReadStream(filePath);

        // Chama a API do Whisper
        const transcription = await openai.audio.transcriptions.create({
          file: fileStream,
          model: 'whisper-1',
          language: language,
          prompt: prompt,
          response_format: 'verbose_json' // Retorna mais metadados
        });

        console.log(`[whisper_transcribe] Transcrição concluída. Duração: ${transcription.duration}s`);

        // Formata data e hora
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        // Formata cabeçalho com informações do arquivo
        const header = `**Arquivo:** ${path.basename(filePath)}\n**Data:** ${dateStr}\n**Hora:** ${timeStr}\n\n---\n\n`;

        return {
          success: true,
          file_path: filePath,
          file_name: path.basename(filePath),
          file_size_mb: fileSizeMB.toFixed(2),
          duration_seconds: transcription.duration,
          language: transcription.language,
          text: transcription.text,
          transcription_date: dateStr,
          transcription_time: timeStr,
          formatted_output: header + transcription.text,
          message: `Transcrição concluída! Arquivo: ${path.basename(filePath)} (${fileSizeMB.toFixed(1)}MB, ${transcription.duration}s)`
        };

      } catch (error) {
        console.error('[whisper_transcribe] Erro:', error);

        // Mensagens de erro mais amigáveis
        let errorMessage = error.message || 'Erro ao transcrever arquivo';
        let suggestion = '';

        if (error.message?.includes('não encontrado') || error.message?.includes('not found')) {
          suggestion = 'Verifique se o caminho do arquivo está correto e se o arquivo existe.';
        } else if (error.message?.includes('muito grande') || error.message?.includes('too large')) {
          suggestion = 'Tente comprimir o arquivo ou cortar em partes menores de 25MB cada.';
        } else if (error.message?.includes('OpenAI key')) {
          suggestion = 'Configure a API key da OpenAI no Supabase Vault (provider=openai).';
        } else if (error.message?.includes('format')) {
          suggestion = 'Formatos suportados: mp3, mp4, mpeg, mpga, m4a, wav, webm.';
        }

        return {
          success: false,
          error: errorMessage,
          suggestion: suggestion,
          file_path: args.file_path
        };
      }
    }
  },
  instagram_content: {
    description: 'Extrai conteúdo textual (caption, comentários) de um post ou reel do Instagram. Use quando o usuário fornecer uma URL do Instagram ou pedir para analisar conteúdo do Instagram.',
    parameters: {
      url: { type: 'string', description: 'URL completa do post/reel do Instagram' },
      include_comments: { type: 'boolean', description: 'Se deve incluir comentários. Padrão: false' }
    },
    required: ['url'],
    async execute(args) {
      try {
        const url = String(args.url || '').trim();
        const includeComments = Boolean(args.include_comments);

        if (!url) throw new Error('URL do Instagram é obrigatória');
        if (!url.includes('instagram.com')) throw new Error('URL inválida do Instagram');

        // Extrai o shortcode da URL
        const shortcodeMatch = url.match(/instagram\.com\/(?:p|reel)\/([^\/\?]+)/);
        if (!shortcodeMatch) throw new Error('Não foi possível extrair o ID do post');

        const shortcode = shortcodeMatch[1];

        // Verifica se credenciais estão configuradas
        const igUsername = getRuntimeEnv('IG_USERNAME');
        const igPassword = getRuntimeEnv('IG_PASSWORD');

        if (!igUsername || !igPassword) {
          return {
            success: false,
            error: 'Credenciais do Instagram não configuradas',
            message: 'Para extrair conteúdo do Instagram, adicione no arquivo .env:\n\nIG_USERNAME=seu_usuario\nIG_PASSWORD=sua_senha\n\n⚠️ Use uma conta secundária por segurança!',
            shortcode,
            alternative: 'Você pode copiar manualmente o texto do post e colar no chat.'
          };
        }

        // Tenta usar a API do Instagram
        const { IgApiClient } = require('instagram-private-api');
        const ig = new IgApiClient();
        ig.state.generateDevice(igUsername);

        // Login
        await ig.account.login(igUsername, igPassword);

        // Busca o post pelo shortcode
        const mediaId = ig.state.extractMediaIdFromShortcode(shortcode);
        const mediaInfo = await ig.media.info(mediaId);

        const caption = mediaInfo.items[0].caption?.text || '';
        const author = mediaInfo.items[0].user?.username || '';
        const likes = mediaInfo.items[0].like_count || 0;

        let comments = [];
        if (includeComments) {
          try {
            const commentsFeed = await ig.media.comments(mediaId);
            const commentsData = await commentsFeed.items();
            comments = commentsData.slice(0, 10).map(c => ({
              user: c.user.username,
              text: c.text
            }));
          } catch (commentError) {
            console.warn('[instagram_content] Não foi possível obter comentários:', commentError);
          }
        }

        return {
          success: true,
          shortcode,
          caption,
          author,
          likes,
          comments,
          message: `Conteúdo extraído com sucesso do post de @${author}`
        };

      } catch (error) {
        console.error('[instagram_content] Erro:', error);

        // Fallback: tenta extrair via fetch simples (limitado)
        if (error.message === "Cannot find module 'instagram-private-api'") {
          try {
            const response = await fetch(args.url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });

            const html = await response.text();

            // Tenta extrair dados JSON embutidos
            const jsonMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
            if (jsonMatch) {
              const data = JSON.parse(jsonMatch[1]);
              return {
                success: true,
                method: 'scraping',
                caption: data.articleBody || data.caption || '',
                author: data.author?.name || '',
                message: '⚠️ Conteúdo extraído via scraping (método limitado). Configure credenciais para funcionalidade completa.'
              };
            }
          } catch (fetchError) {
            console.error('[instagram_content] Fallback falhou:', fetchError);
          }
        }

        return {
          success: false,
          error: error.message || 'Erro ao extrair conteúdo do Instagram',
          details: String(error),
          suggestion: error.message.includes('login')
            ? 'Credenciais inválidas ou conta bloqueada. Use uma conta secundária e tente novamente.'
            : 'Verifique se as credenciais estão corretas no arquivo .env'
        };
      }
    }
  }
};

function resolveWorkspacePath(relativePath) {
  const base = path.resolve(__dirname);
  const requested = path.resolve(base, String(relativePath || '.'));
  if (requested !== base && !requested.startsWith(base + path.sep)) {
    throw new Error('Caminho fora do workspace do Worion nao permitido.');
  }
  return requested;
}

function toWorkspaceRelativePath(fullPath) {
  return path.relative(path.resolve(__dirname), fullPath).replace(/\\/g, '/') || '.';
}

function sanitizeSupabaseRows(rows) {
  return rows.map(row => {
    const clean = { ...row };
    if ('value' in clean) clean.value = '[redacted]';
    if ('secret' in clean) clean.secret = '[redacted]';
    if ('token' in clean) clean.token = '[redacted]';
    return clean;
  });
}

function memorySnippet(content, query, radius = 260) {
  const text = String(content || '').replace(/\s+/g, ' ').trim();
  const needle = String(query || '').toLowerCase();
  const index = text.toLowerCase().indexOf(needle);
  if (index < 0) return text.slice(0, radius * 2);
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + needle.length + radius);
  return `${start > 0 ? '...' : ''}${text.slice(start, end)}${end < text.length ? '...' : ''}`;
}

function normalizeToolMemoryText(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isToolConversationNarrativeQuery(query = '') {
  const text = normalizeToolMemoryText(query);
  return /\b(ontem|semana passada|ultima vez|onde paramos|continuidade|sessao|sessoes|conversa anterior|historico|o que aconteceu)\b/i.test(text);
}

function getToolMemorySearchTerms(query = '') {
  const normalized = normalizeToolMemoryText(query);
  const terms = normalized
    .split(/\s+/)
    .filter(term => term.length >= 3)
    .slice(0, 8);

  if (/\b(quem sou eu|perfil|identidade|sobre mim)\b/.test(normalized)) {
    terms.push('identity', 'perfil', 'usuario', 'personal_pattern', 'project_state', 'spiritual_pattern');
  }
  if (/\b(tdah|diagnostico|saude)\b/.test(normalized)) {
    terms.push('health_tdah', 'tdah', 'diagnostico', 'hiperfoco');
  }
  if (/\b(decidimos|decisao|regra|agentes|arquitetura)\b/.test(normalized)) {
    terms.push('technical_decision', 'project_state', 'fix', 'decisao');
  }

  return [...new Set(terms)].slice(0, 12);
}

function scoreToolMemoryAtom(row, terms) {
  const haystack = normalizeToolMemoryText([
    row.type,
    row.title,
    row.content,
    row.retrieval_text,
    ...(Array.isArray(row.keywords) ? row.keywords : []),
    ...(Array.isArray(row.entities) ? row.entities : [])
  ].join(' '));
  let score = Number(row.importance || 3) + Number(row.confidence || 0.8);
  for (const term of terms) {
    if (haystack.includes(normalizeToolMemoryText(term))) score += String(term).length > 8 ? 2 : 1;
  }
  return score;
}

async function memoryFetchRows(table, params, options = {}) {
  const url = new URL(`${MEMORY_SUPABASE_URL}/rest/v1/${table}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  const response = await fetch(url.toString(), { headers: memorySupabaseHeaders(options.headers || {}) });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase memory ${response.status}: ${text.slice(0, 240)}`);
  return JSON.parse(text || '[]');
}

async function memoryAtomSearch(query, limit = 10) {
  if (isToolConversationNarrativeQuery(query)) return [];
  const terms = getToolMemorySearchTerms(query);
  if (!terms.length) return [];

  const rowsById = new Map();
  const safeLimit = Math.min(Number(limit || 10), 20);

  for (const term of terms.slice(0, 8)) {
    const safeTerm = String(term || '').replace(/\*/g, '').replace(/[(),]/g, ' ').trim();
    if (!safeTerm) continue;
    try {
      const rows = await memoryFetchRows('memory_atoms_v1', {
        select: 'id,card_id,conversation_id,type,title,content,retrieval_text,keywords,entities,source_chunk_ids,importance,confidence,created_at',
        status: 'eq.active',
        or: `(type.ilike.*${safeTerm}*,title.ilike.*${safeTerm}*,content.ilike.*${safeTerm}*,retrieval_text.ilike.*${safeTerm}*)`,
        order: 'importance.desc',
        limit: String(safeLimit)
      });
      for (const row of rows) rowsById.set(row.id, row);
    } catch (error) {
      console.warn('[MEMORY SEARCH] memory_atoms_v1 indisponivel:', error.message);
      return [];
    }
  }

  return [...rowsById.values()]
    .map(row => ({ ...row, score: scoreToolMemoryAtom(row, terms) }))
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, safeLimit)
    .map(row => ({
      kind: 'memory_atom',
      atom_id: row.id,
      card_id: row.card_id,
      conversation_id: row.conversation_id,
      type: row.type,
      title: row.title,
      content: row.content,
      retrieval_text: row.retrieval_text,
      keywords: row.keywords || [],
      entities: row.entities || [],
      source_chunk_ids: row.source_chunk_ids || [],
      importance: row.importance,
      confidence: row.confidence,
      created_at: row.created_at
    }));
}

async function memorySearch(query, sourceId = '', limit = 10) {
  let cleanQuery = String(query || '').trim();
  if (/\bworion\b/i.test(cleanQuery)) cleanQuery = 'Worion';
  if (!cleanQuery) throw new Error('Query de memoria vazia.');
  const safeLimit = Math.min(Number(limit || 10), 50);

  const atomRows = await memoryAtomSearch(cleanQuery, Math.min(safeLimit, 12));
  if (atomRows.length) {
    const result = {
      success: true,
      query: cleanQuery,
      source_id: sourceId || null,
      source_table: 'memory_atoms_v1',
      results: atomRows
    };
    console.log(`[MEMORY SEARCH] Memory atoms encontrados: ${result.results.length}`);
    return result;
  }

  if (typeof worionApiMemorySearch === 'function') {
    console.log('[MEMORY SEARCH] Tentando Worion API local');
    const result = await worionApiMemorySearch(cleanQuery, {
      source_id: sourceId || '',
      limit: safeLimit
    });
    console.log(`[MEMORY SEARCH] Resultados encontrados: ${Array.isArray(result?.results) ? result.results.length : 0}`);
    return result;
  }
  const rows = await memoryFetchRows('memory_chunks', {
    select: 'conversation_id,source_id,chunk_index,role,content,created_at',
    content: `ilike.*${cleanQuery.replace(/\*/g, '')}*`,
    source_id: sourceId ? `eq.${sourceId}` : '',
    order: 'created_at.desc',
    limit: String(safeLimit)
  });

  const normalizedQuery = cleanQuery.toLowerCase();
  const scoredRows = rows
    .map(row => {
      const content = String(row.content || '');
      const titleWeight = /\bworion\b/i.test(content) ? 2 : 0;
      const directHits = (content.toLowerCase().match(new RegExp(normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      const topicHits = (content.match(/\b(arquitetura|funcionalidades|integra[cç][oõ]es|decis[oõ]es|roadmap|problemas|solu[cç][oõ]es|notion|supabase|mcp|electron|sidebar|mem[oó]ria)\b/gi) || []).length;
      return { row, score: titleWeight + directHits + Math.min(topicHits, 6) };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.row);

  const result = {
    success: true,
    query: cleanQuery,
    source_id: sourceId || null,
    results: scoredRows.map(row => ({
      conversation_id: row.conversation_id,
      source_id: row.source_id,
      role: row.role,
      chunk_index: row.chunk_index,
      snippet: memorySnippet(row.content, cleanQuery),
      created_at: row.created_at
    }))
  };
  console.log(`[MEMORY SEARCH] Resultados encontrados: ${result.results.length}`);
  return result;
}

async function memoryReadConversation(conversationId, maxChars = 60000) {
  const id = String(conversationId || '').trim();
  if (!id) throw new Error('conversation_id nao informado.');
  const conversations = await memoryFetchRows('memory_conversations', {
    select: 'id,source_id,external_id,title,summary,metadata,updated_at,imported_at',
    id: `eq.${id}`,
    limit: '1'
  });
  if (!conversations.length) throw new Error(`Conversa nao encontrada: ${id}`);

  const chunks = await memoryFetchRows('memory_chunks', {
    select: 'conversation_id,source_id,chunk_index,role,content,metadata,created_at',
    conversation_id: `eq.${id}`,
    order: 'chunk_index.asc',
    limit: '5000'
  });
  const messages = chunks.map(chunk => ({
    role: chunk.role || 'unknown',
    content: chunk.content || '',
    chunk_index: chunk.chunk_index,
    created_at: chunk.created_at
  }));
  let transcript = messages.map(message => `[${message.chunk_index}] ${message.role}: ${message.content}`).join('\n\n');
  const limit = Math.min(Number(maxChars || 60000), 120000);
  const truncated = transcript.length > limit;
  if (truncated) transcript = transcript.slice(0, limit);

  return {
    success: true,
    conversation_id: id,
    source_id: conversations[0].source_id,
    title: conversations[0].title || 'Conversa sem titulo',
    summary: conversations[0].summary || '',
    metadata: conversations[0].metadata || {},
    message_count: messages.length,
    truncated,
    messages,
    transcript
  };
}

async function summarizeMemoryText(text, instruction) {
  const data = await callOpenAIWithRetry({
    messages: [
      {
        role: 'system',
        content: `Voce e o consolidator de memoria do Worion.

Sua funcao e gerar um resumo objetivo e altamente relevante com base apenas nas informacoes diretamente relacionadas a consulta do usuario.

Regras:
- Ignore dados perifericos.
- Ignore trechos brutos de conversa.
- Ignore logs e instrucoes tecnicas.
- Organize em topicos claros.
- Retorne somente o conteudo final em Markdown.
- Nunca inclua cabecalhos como Resultado, Status ou Detalhes.`
      },
      {
        role: 'user',
        content: `${instruction}\n\nCONTEUDO:\n${String(text || '').slice(0, 90000)}`
      }
    ]
  });
  return data.choices?.[0]?.message?.content?.trim() || '';
}

function normalizeMemorySummary(summary) {
  const text = String(summary || '').trim();
  const firstHeader = text.search(/\*\*(Resumo|Temas principais|Decisoes|Decisões|Tarefas|Pendencias|Pendências|Links)/i);
  if (firstHeader > 0 && firstHeader < 500) return text.slice(firstHeader).trim();
  return text;
}

var WORION_TOOLS = Object.entries(TOOL_REGISTRY).map(([name, def]) => ({
  type: 'function',
  function: {
    name,
    description: def.description,
    parameters: {
      type: 'object',
      properties: Object.fromEntries(Object.entries(def.parameters || {}).map(([k, v]) => {
        const property = { type: v.type, description: v.description };
        if (v.type === 'array') property.items = { type: 'string' };
        return [k, property];
      })),
      required: def.required || []
    }
  }
}));

var worionRouteGuardState = null;
const WORION_PUBLIC_RESEARCH_TOOLS = new Set(['brave_search', 'tavily_search', 'fetch_url', 'web_search', 'tavily_extract']);

function isPrivateRouteGuardScope(scope = '') {
  const value = String(scope || '');
  return value.startsWith('private_') || value === 'uploaded_file_context';
}

function setWorionRouteGuard(questionScope, userMessage = '') {
  const active = isPrivateRouteGuardScope(questionScope);
  worionRouteGuardState = {
    questionScope,
    userMessage,
    active
  };
  if (typeof window !== 'undefined') {
    window.__worionRouteGuard = worionRouteGuardState;
  }
  return worionRouteGuardState;
}

function clearWorionRouteGuard() {
  worionRouteGuardState = null;
  if (typeof window !== 'undefined') {
    window.__worionRouteGuard = null;
  }
}

function getWorionRouteGuard() {
  return worionRouteGuardState || (typeof window !== 'undefined' ? window.__worionRouteGuard : null);
}

function getBlockedPublicResearchToolResult(name, args = {}) {
  const guard = getWorionRouteGuard();
  const toolName = String(name || '');

  // DIAGNÓSTICO: Ver estado completo do Guard
  console.log('[ROUTE GUARD DEBUG] Estado atual:', {
    guardExists: !!guard,
    guardActive: guard?.active,
    guardScope: guard?.questionScope,
    isPublicTool: WORION_PUBLIC_RESEARCH_TOOLS.has(toolName),
    toolName
  });

  if (!guard?.active || !WORION_PUBLIC_RESEARCH_TOOLS.has(toolName)) return null;

  console.warn('[ROUTE GUARD] blocked public research for private context request', {
    questionScope: guard.questionScope,
    userMessage: guard.userMessage
  });

  return {
    success: false,
    blocked: true,
    tool: toolName,
    args,
    questionScope: guard.questionScope,
    error: 'Pesquisa pública bloqueada: este pedido foi classificado como contexto privado.'
  };
}

function isNotionWriteTool(name) {
  return ['create_notion_page', 'memory_save_to_notion', 'notion_create_page'].includes(String(name || ''));
}

function hasDeferredTimeTrigger(text) {
  return /\b(ao final|depois|quando terminar|no fim da conversa|mais tarde)\b/i.test(String(text || ''));
}

function hasExplicitNotionWriteAuthorization(text) {
  const raw = String(text || '');
  if (/\b(ative o modo automatico|não precisa perguntar|nao precisa perguntar|pode salvar sempre|confio em voce)\b/i.test(raw)) return true;
  return /\b(salve|crie|registre|atualize|guarde|edite)\b[\s\S]{0,80}\bnotion\b/i.test(raw)
    || /\b(pode salvar)\b/i.test(raw);
}

function shouldEnableNotionAutoSave(text) {
  return /\b(pode salvar sempre|confio em voce|ative o modo automatico|não precisa perguntar|nao precisa perguntar)\b/i.test(String(text || ''));
}

function shouldExecuteDeferredActionsNow(text) {
  return /\b(agora pode|pode executar agora|execute agora|pode salvar agora|encerre e salve|finalize e salve)\b/i.test(String(text || ''));
}

function deferAction(tool, params, description, options = {}) {
  DEFERRED_ACTIONS.push({
    tool,
    params,
    description: description || tool,
    authorized: Boolean(options.authorized),
    createdAt: new Date().toISOString()
  });
  return DEFERRED_ACTIONS[DEFERRED_ACTIONS.length - 1];
}

async function executeDeferredActions(options = {}) {
  if (!Array.isArray(DEFERRED_ACTIONS) || DEFERRED_ACTIONS.length === 0) return [];

  const force = Boolean(options.force);
  const pending = [...DEFERRED_ACTIONS];
  DEFERRED_ACTIONS = [];
  const results = [];

  for (const action of pending) {
    const canWriteToNotion = !isNotionWriteTool(action.tool) || force || autoSaveNotion || action.authorized;
    if (!canWriteToNotion) {
      DEFERRED_ACTIONS.push(action);
      results.push({ success: false, deferred: true, blocked: true, tool: action.tool, description: action.description });
      continue;
    }

    try {
      const result = await executeToolCallWithFallback(action.tool, action.params, { bypassNotionGuard: true });
      results.push({ success: true, tool: action.tool, description: action.description, result });
    } catch (error) {
      results.push({ success: false, tool: action.tool, description: action.description, error: error.message });
    }
  }

  return results;
}

async function executeToolCall(name, argsJson) {
  const tool = TOOL_REGISTRY[name];
  if (!tool) return { error: `Ferramenta desconhecida: ${name}` };
  const args = typeof argsJson === 'string' ? JSON.parse(argsJson) : argsJson;
  const blockedPublicResearch = getBlockedPublicResearchToolResult(name, args);
  if (blockedPublicResearch) return blockedPublicResearch;
  const t0 = Date.now();
  const traceRun = typeof getCurrentTraceRun === 'function' ? getCurrentTraceRun() : null;
  const traceStepName = getTraceStepNameForTool(name);
  executionStatus = name;
  executionStatusLabel = TOOL_STATUS_LABELS?.[name] || TOOL_STATUS_LABELS?.default || 'Processando...';
  activeExecutionCount += 1;
  if (typeof showExecutionStatus === 'function') showExecutionStatus(executionStatusLabel);
  try {
    const result = await executeToolCallWithFallback(name, args);
    await traceToolCall(traceRun, traceStepName, name, args, result, Date.now() - t0);
    logAction(name, 'success', JSON.stringify(result), Date.now() - t0);
    return result;
  } catch (e) {
    await traceToolCallError(traceRun, traceStepName, name, args, e, Date.now() - t0);
    logAction(name, 'error', e.message, Date.now() - t0);
    return { error: e.message };
  } finally {
    activeExecutionCount = Math.max(0, activeExecutionCount - 1);
    if (activeExecutionCount === 0) {
      executionStatus = null;
      executionStatusLabel = '';
      if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
      else if (typeof updateExecutionStatus === 'function') updateExecutionStatus();
    }
  }
}

function getTraceStepNameForTool(name) {
  if (/^(notion_|create_notion_page)/i.test(name)) return 'notionToolCall';
  if (/^(brave_search|tavily_search|fetch_url|web_search)/i.test(name)) return 'externalSearch';
  return 'toolCall';
}

async function traceToolCall(traceRun, stepName, name, args, result, durationMs) {
  try {
    if (!traceRun || typeof logStep !== 'function') return;
    if (stepName === 'notionToolCall' && typeof markTraceFlag === 'function') markTraceFlag(traceRun, 'hasNotionCall', true);
    if (stepName === 'externalSearch' && typeof markTraceFlag === 'function') markTraceFlag(traceRun, 'hasExternalSearch', true);
    await logStep(traceRun, stepName, {
      toolName: name,
      args
    }, {
      toolName: name,
      durationMs,
      result
    });
  } catch {}
}

async function traceToolCallError(traceRun, stepName, name, args, error, durationMs) {
  try {
    if (!traceRun) return;
    if (stepName === 'notionToolCall' && typeof markTraceFlag === 'function') markTraceFlag(traceRun, 'hasNotionCall', true);
    if (stepName === 'externalSearch' && typeof markTraceFlag === 'function') markTraceFlag(traceRun, 'hasExternalSearch', true);
    if (typeof logStep === 'function') {
      await logStep(traceRun, stepName, { toolName: name, args }, {
        toolName: name,
        durationMs,
        error: error?.message || String(error)
      });
    }
    if (typeof traceError === 'function') await traceError(traceRun, stepName, error);
  } catch {}
}

async function executeToolCallRaw(name, args) {
  const blockedPublicResearch = getBlockedPublicResearchToolResult(name, args);
  if (blockedPublicResearch) return blockedPublicResearch;
  const tool = TOOL_REGISTRY[name];
  if (!tool) throw new Error(`Ferramenta desconhecida: ${name}`);
  return await tool.execute(args || {});
}

async function executeToolCallWithFallback(name, args, options = {}) {
  const blockedPublicResearch = getBlockedPublicResearchToolResult(name, args);
  if (blockedPublicResearch) return blockedPublicResearch;

  if (isNotionWriteTool(name) && !options.bypassNotionGuard) {
    const shouldDefer = Boolean(currentTurnPolicy?.deferNotionWrite);
    const isAuthorized = Boolean(autoSaveNotion || currentTurnPolicy?.explicitNotionWriteAuthorized);
    if (shouldDefer) {
      deferAction(name, args, `Escrita no Notion adiada: ${name}`, { authorized: isAuthorized });
      return {
        success: true,
        deferred: true,
        requires_end_of_conversation: true,
        message: 'A escrita no Notion foi armazenada para o fim da conversa.'
      };
    }
    if (!isAuthorized) {
      throw new Error('Escrita no Notion bloqueada por padrao. O usuario precisa autorizar explicitamente ou ativar o modo automatico.');
    }
  }

  try {
    return await executeToolCallRaw(name, args);
  } catch (error) {
    await logInternalAction('tool_error', 'error', { name, args, error: error.message });
    if (name.startsWith('notion_')) return await executeNotionFallback(name, args, error);
    if (name === 'supabase_select') return await executeSupabaseFallback(args, error);
    if (name.startsWith('filesystem_')) return await executeFilesystemFallback(name, args, error);
    if (name === 'brave_search') return await executeBraveFallback(args, error);
    if (name === 'tavily_search') return await executeTavilyFallback(args, error);
    throw error;
  }
}

async function executeNotionFallback(name, args, originalError) {
  const attempts = [];
  const pageRef = args?.page_ref || args?.query || '';
  const normalized = normalizeGoalSearchText(pageRef);
  const candidates = [
    normalized,
    normalized.slice(0, 80),
    normalized.split(/\s+/).find(part => part.length > 4) || normalized
  ].filter(Boolean);

  for (const candidate of [...new Set(candidates)]) {
    try {
      attempts.push(`notion_search_pages:${candidate}`);
      const found = await executeToolCallRaw('notion_search_pages', { query: candidate, limit: 10 });
      const page = found.pages?.[0];
      if (!page) continue;
      if (name === 'notion_read_page') {
        const read = await executeToolCallRaw('notion_read_page', { page_ref: page.id, max_chars: args?.max_chars || 12000 });
        return { ...read, fallback: true, attempts, originalError: originalError.message };
      }
      if (name === 'notion_list_children') {
        const children = await executeToolCallRaw('notion_list_children', { page_ref: page.id, limit: args?.limit || 100 });
        return { ...children, fallback: true, attempts, originalError: originalError.message };
      }
      return { ...found, fallback: true, attempts, originalError: originalError.message };
    } catch (fallbackError) {
      attempts.push(`erro:${fallbackError.message}`);
    }
  }

  try {
    attempts.push('notion_list_children:parent');
    const children = await executeToolCallRaw('notion_list_children', { page_ref: NOTION_PARENT_PAGE_ID, limit: 100 });
    return { ...children, fallback: true, attempts, originalError: originalError.message };
  } catch (fallbackError) {
    attempts.push(`erro:${fallbackError.message}`);
  }

  throw new Error(`Notion falhou apos fallbacks. Erro original: ${originalError.message}. Tentativas: ${attempts.join(' | ')}`);
}

async function executeSupabaseFallback(args, originalError) {
  const attempts = [];
  const relaxed = { ...args };
  delete relaxed.select;
  relaxed.limit = Math.min(Number(args?.limit || 10), 10);
  try {
    attempts.push('supabase_select:relaxed');
    const result = await executeToolCallRaw('supabase_select', relaxed);
    return { ...result, fallback: true, attempts, originalError: originalError.message };
  } catch (error) {
    attempts.push(`erro:${error.message}`);
  }

  if (args?.query) {
    try {
      attempts.push('memory_search:query');
      const result = await executeToolCallRaw('memory_search', { query: args.query, source_id: args.source_id || '', limit: 10 });
      return { ...result, fallback: true, attempts, originalError: originalError.message };
    } catch (error) {
      attempts.push(`erro:${error.message}`);
    }
  }

  throw new Error(`Supabase falhou apos fallback. Erro original: ${originalError.message}. Tentativas: ${attempts.join(' | ')}`);
}

async function executeFilesystemFallback(name, args, originalError) {
  const attempts = [];
  const rawPath = args?.relative_path || '.';
  const dir = String(rawPath).includes('/') || String(rawPath).includes('\\')
    ? String(rawPath).replace(/[\\/][^\\/]*$/, '')
    : '.';
  try {
    attempts.push(`filesystem_list:${dir}`);
    const result = await executeToolCallRaw('filesystem_list', { relative_path: dir || '.' });
    return { ...result, fallback: true, attempts, originalError: originalError.message };
  } catch (error) {
    attempts.push(`erro:${error.message}`);
  }
  throw new Error(`Filesystem falhou apos fallback. Erro original: ${originalError.message}. Tentativas: ${attempts.join(' | ')}`);
}

async function executeBraveFallback(args, originalError) {
  const result = await executeToolCallRaw('brave_search', { ...args, count: Math.min(Number(args?.count || 5), 5) });
  return { ...result, fallback: true, originalError: originalError.message };
}

async function executeTavilyFallback(args, originalError) {
  const result = await executeToolCallRaw('tavily_search', {
    ...args,
    count: Math.min(Number(args?.count || 5), 5),
    search_depth: 'basic',
    include_raw_content: false
  });
  return { ...result, fallback: true, originalError: originalError.message };
}

function getAgentSpecializationProfile(agent = currentAgent) {
  return agent?.specializationProfile || {
    hasSpecialization: false,
    domains: [],
    explicitAreas: [],
    authors: [],
    methodologies: [],
    schools: [],
    frameworks: [],
    terminology: [],
    queryAnchors: [],
    researchFocus: [],
    requiresResearch: false,
    summary: ''
  };
}

function normalizeAgentResearchText(text = '') {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLowValueAgentResearchRequest(text) {
  const normalized = normalizeAgentResearchText(text);
  if (!normalized) return true;
  if (/^(oi|ola|bom dia|boa tarde|boa noite|ok|sim|nao|valeu|obrigad[oa]|teste)[!.? ]*$/.test(normalized)) return true;
  if (/\b(leia|acesse|carregue|incorpore|entenda)\b/.test(normalized) && !/\b(resuma|analise|explique|compare|parecer|diagnostico|estrategia|decida|avalie)\b/.test(normalized)) return true;
  return false;
}

function shouldAutoResearchAgentDomain(text, agent = currentAgent, attachments = []) {
  const profile = getAgentSpecializationProfile(agent);
  const normalized = normalizeAgentResearchText(text);
  if (!profile.hasSpecialization || isLowValueAgentResearchRequest(text)) {
    return { shouldResearch: false, reason: 'sem especializacao aplicavel ou pedido simples' };
  }

  const asksForSpecializedWork = /\b(analise|analisar|avalie|avaliar|parecer|diagnostico|diagnosticar|explique|explicar|compare|comparar|decida|decidir|estrategia|plano|recomende|orientacao|fundamente|justifique|critique|interprete|modelo|framework|metodo|metodologia|risco|norma|lei|jurisprudencia|evidencia|cientifico|tecnico|clinico)\b/i.test(normalized);
  const asksCurrentOrReliable = /\b(atual|recente|vigente|jurisprudencia|norma|lei|paper|estudo|fonte|dados|mercado|versao|documentacao|referencia)\b/i.test(normalized);
  const questionLike = /\?/.test(String(text || '')) && normalized.length > 30;
  const hasAttachmentContext = Array.isArray(attachments) && attachments.some(file => file?.extractedText || file?.text);

  if (profile.requiresResearch && (asksForSpecializedWork || asksCurrentOrReliable || questionLike)) {
    return { shouldResearch: true, reason: 'dominio exige verificacao externa para resposta especializada' };
  }
  if (asksCurrentOrReliable) {
    return { shouldResearch: true, reason: 'pedido demanda informacao atual ou verificavel' };
  }
  if (asksForSpecializedWork && (profile.domains?.length || profile.queryAnchors?.length >= 3)) {
    return { shouldResearch: true, reason: 'pedido aciona especializacao derivada dos documentos do agente' };
  }
  if (hasAttachmentContext && asksForSpecializedWork && profile.queryAnchors?.length) {
    return { shouldResearch: true, reason: 'anexo sera interpretado por dominio especializado' };
  }

  return { shouldResearch: false, reason: 'especializacao disponivel, mas sem necessidade de pesquisa externa nesta rodada' };
}

function uniqueAgentResearchItems(items = [], limit = 10) {
  const seen = new Set();
  return items
    .map(item => String(item || '').replace(/\s+/g, ' ').trim())
    .filter(item => {
      if (!item) return false;
      const key = normalizeAgentResearchText(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function buildAgentDomainResearchQueries(text, agent = currentAgent) {
  const profile = getAgentSpecializationProfile(agent);
  const userQuery = normalizeGoalSearchText(text).slice(0, 180);
  const domains = uniqueAgentResearchItems((profile.domains || []).map(domain => domain.label), 4);
  const anchors = uniqueAgentResearchItems([
    ...(profile.explicitAreas || []),
    ...(profile.methodologies || []),
    ...(profile.schools || []),
    ...(profile.frameworks || []),
    ...(profile.authors || []),
    ...(profile.terminology || [])
  ], 8);
  const researchFocus = uniqueAgentResearchItems(profile.researchFocus || [], 4);
  const domainContext = uniqueAgentResearchItems([...domains, ...anchors, ...researchFocus], 12).join(' ');

  const queries = [];
  if (userQuery) queries.push(`${userQuery} ${domainContext}`.trim().slice(0, 240));
  if (domains.length || anchors.length) queries.push(`${domains.join(' ')} ${anchors.slice(0, 5).join(' ')} fundamentos fontes confiaveis`.trim().slice(0, 240));
  if ((profile.domains || []).some(domain => domain.id === 'law')) queries.push(`${userQuery} legislacao jurisprudencia doutrina Brasil`.trim().slice(0, 240));
  if ((profile.domains || []).some(domain => domain.id === 'science')) queries.push(`${userQuery} scientific review paper theory evidence`.trim().slice(0, 240));
  if ((profile.domains || []).some(domain => domain.id === 'software')) queries.push(`${userQuery} official documentation best practices`.trim().slice(0, 240));

  return uniqueAgentResearchItems(queries.filter(query => query.length > 12), 3);
}

function formatAgentDomainResearchResults(results = [], agent = currentAgent) {
  const profile = getAgentSpecializationProfile(agent);
  const lines = [];
  const seen = new Set();

  for (const batch of results) {
    if (batch.error) {
      lines.push(`Consulta: ${batch.query}\nFalha: ${batch.error}`);
      continue;
    }
    const items = [...(batch.results || []), ...(batch.news || []), ...(batch.discussions || [])];
    for (const item of items) {
      const url = item.url || '';
      if (!url || seen.has(url)) continue;
      seen.add(url);
      lines.push(`- ${item.title || 'Sem titulo'}\n  URL: ${url}\n  Sinal relevante: ${item.description || ''}`);
      if (lines.length >= 10) break;
    }
    if (lines.length >= 10) break;
  }

  if (!lines.length) return '';

  return [
    '## Pesquisa interna de aprofundamento do dominio do agente',
    '',
    profile.summary || '',
    '',
    'Use os sinais abaixo apenas para fundamentar o raciocinio especializado. Nao apresente como relatorio bruto, nao liste fontes salvo pedido explicito, e nao substitua a persona do agente por tom de pesquisador.',
    '',
    lines.join('\n')
  ].filter(Boolean).join('\n');
}

function normalizeGoalSearchText(value) {
  return String(value || '')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#*_`~[\](){}|>]/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectArtifactRequest(text) {
  if (/\b(gere|gerar|crie|criar|fa[cç]a|fazer)\b[\s\S]{0,80}\b(imagem|logo|ilustra[cç][aã]o|visual)\b/i.test(text)) {
    return { type: 'image', requestedAt: new Date().toISOString(), prompt: text };
  }
  if (/\b(pdf|documento em pdf|gerar documento|arquivo pdf)\b/i.test(text)) {
    return { type: 'pdf', requestedAt: new Date().toISOString(), prompt: text };
  }
  return null;
}

function detectVideoTranscriptionRequest(text) {
  const raw = String(text || '');

  // Detecta URLs de YouTube
  const youtubeMatch = raw.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/\s]+)/);

  // Detecta URLs de Instagram
  const instagramMatch = raw.match(/instagram\.com\/(?:p|reel)\/([^\/\?\s]+)/);

  // Detecta caminhos de arquivos locais (Windows: C:\..., Linux/Mac: /...)
  const filePathMatch = raw.match(/([A-Z]:\\[\w\s\-\\\.]+\.(mp3|mp4|wav|m4a|webm|mpeg|mpga|avi|mov)|\/[\w\s\-\/\.]+\.(mp3|mp4|wav|m4a|webm|mpeg|mpga|avi|mov))/i);

  // Detecta intenção de transcrição
  const wantsTranscription = /\b(extraia|extrair|transcreva|transcrever|transcri[cç][aã]o|pegue|pegar|obtenha|obter|busque|buscar|conte[uú]do|texto)\b/i.test(raw);

  // Prioridade 1: Arquivo local
  if (filePathMatch && (wantsTranscription || /\b(arquivo|video|v[ií]deo|audio|[aá]udio|baixei|download)\b/i.test(raw))) {
    return {
      type: 'local_file',
      file_path: filePathMatch[0],
      requestedAt: new Date().toISOString()
    };
  }

  // Prioridade 2: YouTube
  if (youtubeMatch && (wantsTranscription || /v[ií]deo/i.test(raw))) {
    return {
      type: 'youtube',
      url: raw.match(/(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[^&\?\s]+)/)?.[0] || `https://www.youtube.com/watch?v=${youtubeMatch[1]}`,
      videoId: youtubeMatch[1],
      requestedAt: new Date().toISOString()
    };
  }

  if (instagramMatch && (wantsTranscription || /v[ií]deo|post|reel/i.test(raw))) {
    return {
      type: 'instagram',
      url: raw.match(/(https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/[^\/\?\s]+)/)?.[0] || `https://www.instagram.com/p/${instagramMatch[1]}/`,
      shortcode: instagramMatch[1],
      requestedAt: new Date().toISOString()
    };
  }

  return null;
}

async function executeDirectVideoTranscription(text, streamCallback) {
  const detection = detectVideoTranscriptionRequest(text);

  if (!detection) {
    return {
      success: false,
      error: 'Nenhuma URL de vídeo detectada',
      type: 'video_transcription'
    };
  }

  try {
    if (detection.type === 'youtube') {
      // Envia cabeçalho imediatamente
      const header = `## 📹 Transcrição do YouTube\n\n**Vídeo:** ${detection.url}\n**Status:** Extraindo transcrição...\n\n---\n\n`;
      if (streamCallback) await streamCallback(header);

      const result = await TOOL_REGISTRY.youtube_transcript.execute({
        url: detection.url,
        language: 'pt'
      });

      if (result.success) {
        // Processa transcrição em chunks para streaming progressivo
        const words = result.fullText.split(' ');
        const chunkSize = 50; // 50 palavras por vez
        let accumulatedText = header + `**Idioma:** ${result.language}\n**Total de segmentos:** ${result.segmentCount}\n\n### Transcrição:\n\n`;

        // Envia chunks progressivamente
        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, i + chunkSize).join(' ');
          accumulatedText += chunk + ' ';

          if (streamCallback) {
            await streamCallback(accumulatedText);
            // Pequeno delay para dar sensação de streaming
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }

        const finalText = accumulatedText.trim();

        return {
          success: true,
          type: 'video_transcription',
          platform: 'youtube',
          videoId: result.videoId,
          transcript: result.fullText,
          segmentCount: result.segmentCount,
          reply: finalText
        };
      } else {
        return {
          success: false,
          type: 'video_transcription',
          platform: 'youtube',
          error: result.error,
          reply: `❌ Não foi possível extrair a transcrição do vídeo.\n\n**Erro:** ${result.error}\n\n**Possíveis motivos:**\n- O vídeo não possui legendas/transcrição disponível\n- O vídeo é privado ou restrito\n- A URL está incorreta`
        };
      }
    } else if (detection.type === 'local_file') {
      // Transcrição de arquivo local com Whisper
      const path = require('path');
      const fileName = path.basename(detection.file_path);

      // Envia cabeçalho imediatamente
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const header = `## 🎙️ Transcrição de Arquivo Local\n\n**Arquivo:** ${fileName}\n**Data:** ${dateStr}\n**Hora:** ${timeStr}\n**Status:** Transcrevendo...\n\n---\n\n`;
      if (streamCallback) await streamCallback(header);

      const result = await TOOL_REGISTRY.whisper_transcribe.execute({
        file_path: detection.file_path,
        language: 'pt'
      });

      if (result.success) {
        // Monta texto final com informações do arquivo
        const finalText = `## 🎙️ Transcrição de Arquivo Local\n\n**Arquivo:** ${fileName}\n**Data:** ${dateStr}\n**Hora:** ${timeStr}\n\n---\n\n${result.text}`;

        if (streamCallback) {
          await streamCallback(finalText);
        }

        return {
          success: true,
          type: 'video_transcription',
          platform: 'whisper',
          file_name: fileName,
          file_path: detection.file_path,
          transcript: result.text,
          duration_seconds: result.duration_seconds,
          language: result.language,
          transcription_date: dateStr,
          transcription_time: timeStr,
          reply: finalText
        };
      } else {
        const errorText = `## ❌ Erro na Transcrição\n\n**Arquivo:** ${fileName}\n**Erro:** ${result.error}\n\n${result.suggestion ? `**Sugestão:** ${result.suggestion}` : ''}`;

        if (streamCallback) {
          await streamCallback(errorText);
        }

        return {
          success: false,
          type: 'video_transcription',
          platform: 'whisper',
          error: result.error,
          file_path: detection.file_path,
          reply: errorText
        };
      }
    } else if (detection.type === 'instagram') {
      // Instagram é processado normalmente (geralmente conteúdo pequeno)
      if (streamCallback) {
        await streamCallback(`## 📸 Instagram\n\n**Post:** ${detection.url}\n**Status:** Extraindo conteúdo...\n\n`);
      }

      const result = await TOOL_REGISTRY.instagram_content.execute({
        url: detection.url,
        include_comments: false
      });

      if (result.success) {
        return {
          success: true,
          type: 'video_transcription',
          platform: 'instagram',
          content: result.caption || result.content,
          reply: `## 📸 Conteúdo do Instagram\n\n**Post:** ${detection.url}\n\n### Conteúdo extraído:\n\n${result.caption || result.content || 'Nenhum conteúdo textual encontrado.'}`
        };
      } else {
        return {
          success: false,
          type: 'video_transcription',
          platform: 'instagram',
          error: result.error,
          reply: `⚠️ ${result.error}\n\n${result.message || ''}\n\n**Alternativa:** ${result.alternative || 'Tente acessar o post manualmente e copiar o texto.'}`
        };
      }
    }
  } catch (error) {
    console.error('[executeDirectVideoTranscription] Erro:', error);
    return {
      success: false,
      type: 'video_transcription',
      error: error.message,
      reply: `❌ Erro ao processar o vídeo: ${error.message}`
    };
  }

  return {
    success: false,
    error: 'Tipo de vídeo não suportado',
    type: 'video_transcription'
  };
}

function extractNotionTitle(text) {
  const lines = String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const labelLine = lines.find(line => /^(nome|titulo|título)\s+da\s+p[aá]gina\s*:/i.test(line));
  if (labelLine) return labelLine.replace(/^(nome|titulo|título)\s+da\s+p[aá]gina\s*:/i, '').trim();

  const labelIndex = lines.findIndex(line => /^(nome|titulo|título)\s+da\s+p[aá]gina\s*:?\s*$/i.test(line));
  if (labelIndex >= 0 && lines[labelIndex + 1]) return lines[labelIndex + 1];

  const inline = String(text || '').match(/(?:p[aá]gina|page)\s+(?:chamada|com\s+o\s+nome|nomeada|intitulada)\s*:?\s*["'""]?([^"'""\n.;]+)["'""]?/i);
  if (inline?.[1]) return inline[1].trim();

  const quoted = String(text || '').match(/["'""]([^"'""]{3,120})["'""]/);
  if (quoted?.[1]) return quoted[1].trim();

  const upperLine = lines.find(line => /^[A-Z0-9_ -]{6,120}$/.test(line) && /[A-Z]/.test(line));
  if (upperLine) return upperLine;

  const compact = String(text || '')
    .replace(/\b(crie|criar|salve|salvar|gere|gerar|no|na|notion|uma|um|p[aá]gina|page)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return compact ? compact.slice(0, 80) : `Pagina Worion ${formatSessionDateTime(new Date())}`;
}

function extractNotionContent(text, title) {
  const raw = String(text || '').trim();

  // Se menciona "transcrição" ou "a transcrição", busca a última transcrição nas mensagens
  if (/\b(?:a\s+)?transcri[cç][aã]o\b/i.test(raw)) {
    if (typeof originMessages !== 'undefined' && Array.isArray(originMessages)) {
      // Busca a última mensagem do assistente que contenha transcrição
      for (let i = originMessages.length - 1; i >= 0; i--) {
        const msg = originMessages[i];
        if (msg.role === 'assistant' && msg.content) {
          // Verifica se é uma transcrição (contém timestamps ou muito texto)
          if (/\[\d{1,2}:\d{2}\]/.test(msg.content) || msg.content.length > 1000) {
            return msg.content;
          }
        }
      }
    }
  }

  // Se menciona "isso" ou "este texto", busca o contexto da conversa recente
  if (/\b(?:isso|este texto|essa informa[cç][aã]o|esse conte[uú]do|isto)\b/i.test(raw)) {
    if (typeof originMessages !== 'undefined' && Array.isArray(originMessages)) {
      // Pega a última mensagem do assistente (provavelmente o que "isso" se refere)
      for (let i = originMessages.length - 1; i >= 0; i--) {
        const msg = originMessages[i];
        if (msg.role === 'assistant' && msg.content && msg.content.length > 100) {
          return msg.content;
        }
      }
    }
  }

  const contentMatch = raw.match(/(?:conte[uú]do(?:\s+(?:inicial|da\s+p[aá]gina))?|texto)\s*:\s*([\s\S]+)/i);
  if (contentMatch?.[1]) return contentMatch[1].trim();

  const afterColon = raw.match(/(?:salve|salvar|gere|gerar|crie|criar)[\s\S]*?(?:no|na)\s+notion\s*:?\s*([\s\S]+)/i);
  if (afterColon?.[1] && afterColon[1].trim().length > title.length) return afterColon[1].trim();

  return `Pagina criada pelo Worion em ${formatSessionDateTime(new Date())}.\n\nPedido original:\n${raw}`;
}

function detectNotionPageRequest(text, options = {}) {
  const normalized = String(text || '').toLowerCase();
  const normalizedPlain = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const mentionsNotion = /\bnotion\b/i.test(normalized);
  const action = /\b(crie|criar|salve|salvar|gere|gerar|registre|registrar|guarde|guardar)\b/i.test(normalized);
  const pageOrSave = /\b(p[aá]gina|page|documento|nota|conte[uú]do|isso|este texto|essa informa[cç][aã]o)\b/i.test(normalized);
  const imperativePatterns = [
    /^salve no notion\s*:/i,
    /^salvar no notion\s*:/i,
    /^registre no notion\s*:/i,
    /^registrar no notion\s*:/i,
    /^crie no notion\s*:/i,
    /^criar no notion\s*:/i,
    /^crie uma pagina no notion\b/i,
    /^criar uma pagina no notion\b/i,
    /^salve isso no notion\b/i,
    /^salve este conteudo no notion\b/i,
    /^salve esse conteudo no notion\b/i,
    /^salve a transcricao no notion\b/i,
    /^pode salvar no notion\b/i,
    /^pode salvar agora no notion\b/i
  ];
  const imperative = imperativePatterns.some(pattern => pattern.test(normalizedPlain));

  if (!mentionsNotion || !action || (!pageOrSave && !imperative)) return null;
  if (options.imperativeOnly && !imperative && !(mentionsNotion && action && pageOrSave)) return null;

  const title = extractNotionTitle(text);
  const content = extractNotionContent(text, title);
  return { title, content };
}

function detectMemorySearchCommand(text) {
  const raw = String(text || '').trim();
  const normalized = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const direct = raw.match(/^(?:memory_search|mem[oó]ria|memoria)\s*:\s*([\s\S]+)$/i);
  if (direct?.[1]) return { query: direct[1].trim(), source_id: '', limit: 10 };

  const natural = normalized.match(/^(?:busque|buscar|procure|procurar|pesquise|pesquisar|consulte|consultar|verifique|verificar)\s+na\s+memoria(?:\s+(?:por|sobre|de))?\s*([\s\S]+)$/i);
  if (natural?.[1]) {
    const query = natural[1].replace(/[.?!]+$/g, '').trim();
    if (query) return { query, source_id: '', limit: 10 };
  }

  const cleanQuery = (value) => String(value || '')
    .replace(/^(?:por|sobre|de|do|da|dos|das)\s+/i, '')
    .replace(/[.?!]+$/g, '')
    .trim();

  const memoryNaturalPatterns = [
    /^o que (?:voce|vc|voc.) (?:tem|encontra|acha|sabe) (?:nas|sobre) (?:minhas |suas )?(?:memorias|memoria|mem.rias|mem.ria)(?:\s+(?:por|sobre|de)\s+([\s\S]+))?$/i,
    /^o que (?:eu|ja) (?:falei|conversei|disse|perguntei) sobre ([\s\S]+?)\s+(?:nas |na |no )?(?:memorias|memoria|mem.rias|mem.ria)$/i,
    /^(?:busque|procure|pesquise|consulte|verifique|veja|ache|encontre) (?:nas |na )?(?:memorias|memoria|mem.rias|mem.ria)(?:\s+(?:por|sobre|de)\s+([\s\S]+))?$/i,
    /^o que esta (?:nas |na )?(?:memorias|memoria|mem.rias|mem.ria) sobre ([\s\S]+)$/i,
    /^quais (?:memorias|mem.rias|registros|conversas) (?:voce|vc|voc.) (?:tem|possui|encontra) sobre ([\s\S]+)$/i
  ];

  for (const pattern of memoryNaturalPatterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const query = cleanQuery(match[1] || normalized);
    if (query) return { query, source_id: '', limit: 10 };
  }

  return null;
}

async function executeMemorySearchCommand(request) {
  const query = String(request?.query || '').trim();
  if (!query) return 'Não encontrei registros suficientes na memória local.';
  const result = await memorySearch(query, request.source_id || '', request.limit || 10);
  const rows = Array.isArray(result?.results) ? result.results : [];
  if (!rows.length) return 'Não encontrei registros suficientes na memória local.';
  const lines = rows.slice(0, 5).map((row, index) => [
    `${index + 1}. ${row.source_id || 'memória'} · ${row.conversation_id || 'sem conversa'} · chunk ${row.chunk_index ?? '-'}`,
    String(row.snippet || '').trim()
  ].filter(Boolean).join('\n'));
  return [
    `Encontrei ${rows.length} registros na memória sobre ${query}.`,
    '',
    ...lines
  ].join('\n');
}

function extractNotionUrl(text) {
  return String(text || '').match(/https?:\/\/(?:[\w-]+\.)?(?:notion\.so|notion\.site)\/\S+/i)?.[0]?.replace(/[).,;]+$/, '') || '';
}

function normalizeNotionIntentText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getRequestedNotionSessionCount(text) {
  const raw = normalizeNotionIntentText(text);
  const numeric = raw.match(/\b(\d{1,2})\s+(?:ultimas?|primeiras?|sessoes|paginas)\b/i);
  if (numeric) return Math.max(1, Math.min(10, Number(numeric[1])));
  if (/\btres\b|\b3\b/i.test(raw)) return 3;
  if (/\bduas\b|\b2\b/i.test(raw)) return 2;
  if (/\buma\b|\b1\b/i.test(raw)) return 1;
  return /\bultimas?\b/i.test(raw) ? 3 : 5;
}

function shouldExposeNotionReadDetails(text) {
  const raw = String(text || '');
  const normalized = normalizeNotionIntentText(raw);
  if (/\?/.test(raw)) return true;
  return /\b(resuma|resumir|resumo|sintetize|sintese|liste|listar|lista|mostre|mostrar|mostra|analise|analisar|analisa|explique|explicar|detalhe|detalhar|traga|pesquise|pesquisar|busque|buscar|procure|procurar|varredura|links?|pontos? principais|principais pontos|quais?|qual|o que|me diga|diga|conte|apresente|verifique se|confirme se)\b/i.test(normalized);
}

function shouldUseSilentNotionReadConfirmation(text) {
  const normalized = normalizeNotionIntentText(text);
  if (shouldExposeNotionReadDetails(text)) return false;
  return /\b(acesse|acessar|abra|abrir|leia|ler|carregue|carregar|incorpore|incorporar|entenda|entender|contexto|sessoes|sessao|pagina|page|daily reports?|workestria hq)\b/i.test(normalized);
}

function getSilentNotionConfirmation(text) {
  if (typeof generateContextualAssimilationResponse === 'function') {
    return generateContextualAssimilationResponse({
      sourceType: 'notion',
      activeAgent: typeof currentAgent !== 'undefined' ? currentAgent : null,
      userProfile: typeof userProfile !== 'undefined' ? userProfile : {},
      content: text
    });
  }
  return '';
}

function shouldHandleDirectNotionRead(text) {
  const raw = String(text || '');
  const normalized = normalizeNotionIntentText(raw);
  if (detectNotionPageRequest(raw)) return false;
  const explicitNotionTarget = /\b(notion|workestria hq|worion hq|worion workspace hq|daily reports?|sessoes|sessao|pagina|page|varredura)\b/i.test(normalized)
    || /notion\.(?:so|site)/i.test(raw);
  const hasNotionTarget = /\b(notion|workestria hq|worion hq|worion workspace hq|daily reports?|sessoes|sessao|pagina|page|subpagina|children|filhos|varredura)\b/i.test(normalized)
    || /notion\.(?:so|site)/i.test(raw);
  const wantsRead = /\b(acesse|acessar|abra|abrir|leia|ler|liste|listar|recupere|recuperar|puxe|busque|buscar|pesquise|pesquisar|procure|procurar|verifique|consulte|contexto|sessoes|sessao|varredura|carregue|carregar|incorpore|incorporar|entenda|entender|sobre)\b/i.test(normalized);
  return explicitNotionTarget || (hasNotionTarget && wantsRead);
}

function hasActiveNotionConnector() {
  return Boolean(
    typeof NOTION_PARENT_PAGE_ID !== 'undefined' &&
    String(NOTION_PARENT_PAGE_ID || '').trim() &&
    typeof notionHeaders === 'function' &&
    typeof searchNotionPages === 'function' &&
    typeof listNotionChildren === 'function'
  );
}

function shouldForceNotionToolAttempt(text) {
  return hasActiveNotionConnector() && shouldHandleDirectNotionRead(text);
}

function notionPageUrlFromId(id) {
  return `https://www.notion.so/${String(id || '').replace(/-/g, '')}`;
}

async function findNotionReadablePageRef(text) {
  const url = extractNotionUrl(text);
  if (url) return url;

  const raw = String(text || '');
  const normalized = normalizeNotionIntentText(raw);
  const targetQueries = [];
  if (/\bworkestria hq\b/i.test(normalized)) targetQueries.push('Workestria HQ');
  if (/\bworion workspace hq\b/i.test(normalized)) targetQueries.push('Worion Workspace HQ');
  if (/\bworion hq\b/i.test(normalized)) targetQueries.push('Worion HQ');
  if (/\bdaily reports?\b/i.test(normalized)) targetQueries.push('Daily Reports');
  const explicitSearch = raw.match(/\b(?:pesquise|pesquisar|busque|buscar|procure|procurar|varredura|consulte)\b[\s\S]{0,30}?\b(?:sobre|por|de)?\s*([^.\n?]+?)(?:\s+(?:no|na|em)\s+notion|\s*$)/i);
  if (explicitSearch?.[1]) {
    const query = explicitSearch[1]
      .replace(/\b(notion|pagina|página|sessoes|sessões|sessao|sessão)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (query && !/^(mim|me|eu)$/i.test(query)) targetQueries.push(query);
  }

  for (const query of targetQueries) {
    const pages = await searchNotionPages(query, 10);
    const found = pages.find(page => normalizeNotionIntentText(page.title || '').includes(normalizeNotionIntentText(query))) || pages[0];
    if (found) return found.id;
  }

  const root = await listNotionChildren(NOTION_PARENT_PAGE_ID, 100);
  const sessionChild = root.items.find(item =>
    item.type === 'child_page' && /sess[oõ]es?/i.test(item.title || '')
  );
  if (sessionChild) return sessionChild.id;

  const queries = ['Sessões de Desenvolvimento', 'Sessoes de Desenvolvimento', 'sessões', 'sessoes'];
  for (const query of queries) {
    const pages = await searchNotionPages(query, 10);
    const found = pages.find(page => /sess/i.test(normalizeSearchText(page.title || ''))) || pages[0];
    if (found) return found.id;
  }

  return NOTION_PARENT_PAGE_ID;
}

async function getLatestNotionChildPages(pageRef, count) {
  const listed = await listNotionChildren(pageRef, 100);
  return listed.items
    .filter(item => item.type === 'child_page')
    .sort((a, b) => new Date(b.lastEditedTime || b.createdTime || 0) - new Date(a.lastEditedTime || a.createdTime || 0))
    .slice(0, count)
    .map(item => ({
      id: item.id,
      title: item.title || '(sem titulo)',
      updatedAt: item.lastEditedTime || item.createdTime || '',
      url: notionPageUrlFromId(item.id)
    }));
}

function formatNotionReadSource(pagesWithContent = []) {
  return pagesWithContent.map((page, index) => [
    `# ${index + 1}. ${page.title}`,
    page.updatedAt ? `Atualizada em: ${formatDateTime(page.updatedAt)}` : 'Atualizada em: data indisponivel',
    `Link: ${page.url}`,
    '',
    page.content || '[Sem texto extraido pela API]'
  ].join('\n')).join('\n\n---\n\n');
}

function buildNotionReadResult({ text, pageId, pagesWithContent, source, reply = '', success = true }) {
  const assimilatedConfirmation = success && typeof generateContextualAssimilationResponse === 'function'
    ? generateContextualAssimilationResponse({
        sourceType: 'notion',
        activeAgent: typeof currentAgent !== 'undefined' ? currentAgent : null,
        userProfile: typeof userProfile !== 'undefined' ? userProfile : {},
        content: source || text,
        projects: typeof inferAssimilationProjects === 'function' ? inferAssimilationProjects(source || text) : [],
        extractedThemes: typeof inferAssimilationThemes === 'function' ? inferAssimilationThemes(source || text) : [],
        insights: typeof inferAssimilationInsights === 'function' ? inferAssimilationInsights(source || text) : [],
        sourceCount: Array.isArray(pagesWithContent) ? pagesWithContent.length : 0
      })
    : '';
  return {
    type: 'notion_read',
    success,
    silent: success && shouldUseSilentNotionReadConfirmation(text),
    confirmation: success ? (assimilatedConfirmation || getSilentNotionConfirmation(text)) : '',
    pageId,
    pageUrl: pageId ? notionPageUrlFromId(pageId) : '',
    pages: pagesWithContent.map(page => ({
      id: page.id,
      title: page.title,
      updatedAt: page.updatedAt || '',
      url: page.url,
      content: page.content || ''
    })),
    source,
    reply
  };
}

function buildNotionDetailedFallback(text, pagesWithContent, source) {
  const normalized = normalizeNotionIntentText(text);
  const wantsLinks = /\b(links?|paginas?|quais paginas|documentos?)\b/i.test(normalized);
  const lines = [`Li no Notion ${pagesWithContent.length} página(s) real(is).`];

  if (wantsLinks) {
    lines.push(
      '',
      ...pagesWithContent.map(page => `- ${page.title} (${page.updatedAt ? formatDateTime(page.updatedAt) : 'sem data'})\n  ${page.url}`)
    );
  }

  lines.push('', 'Conteúdo recuperado:', '', source.slice(0, 12000));
  return lines.join('\n');
}

async function synthesizeNotionReadReply(text, source, pagesWithContent) {
  if (typeof callOpenAIWithRetry !== 'function') {
    return buildNotionDetailedFallback(text, pagesWithContent, source);
  }

  try {
    const data = await callOpenAIWithRetry({
      messages: [
        {
          role: 'system',
          content: 'Você responde sobre páginas reais do Notion. Use somente o conteúdo fornecido. Responda apenas ao que o usuário pediu explicitamente. Não liste páginas, links ou documentos a menos que o pedido solicite lista, links ou fontes. Não invente títulos, datas, links ou sessões.'
        },
        {
          role: 'user',
          content: `Pedido do usuário: ${text}\n\nPáginas reais lidas no Notion:\n\n${source}\n\nSe o pedido for resumo, resuma. Se pedir análise, analise. Se pedir links ou páginas lidas, liste. Se pedir pontos principais, traga pontos principais. Não inclua seções extras que o usuário não pediu.`
        }
      ]
    }, 1);
    return data.choices?.[0]?.message?.content?.trim() || buildNotionDetailedFallback(text, pagesWithContent, source);
  } catch (error) {
    console.warn('[Notion] Sintese via OpenAI falhou; retornando leitura recuperada:', error.message);
    return buildNotionDetailedFallback(text, pagesWithContent, source);
  }
}

async function buildNotionReadResultFromFetch(text, fetched) {
  const pagesWithContent = Array.isArray(fetched?.pages)
    ? fetched.pages.map(page => ({
        id: page.id,
        title: page.title || 'Página do Notion',
        updatedAt: page.updatedAt || '',
        url: page.url || (page.id ? notionPageUrlFromId(page.id) : ''),
        content: String(page.content || '').slice(0, 12000)
      }))
    : [];
  const pageId = fetched?.pageId || pagesWithContent[0]?.id || '';
  const source = fetched?.source || formatNotionReadSource(pagesWithContent);

  if (!pagesWithContent.length || !source.trim()) {
    return buildNotionReadResult({
      text,
      pageId,
      pagesWithContent: [],
      source: '',
      success: false,
      reply: `Consegui acessar a rota local do Notion, mas ela não retornou texto legível pela API.\n\nPágina: ${pageId ? notionPageUrlFromId(pageId) : 'indisponível'}`
    });
  }

  const reply = shouldExposeNotionReadDetails(text)
    ? await synthesizeNotionReadReply(text, source, pagesWithContent)
    : '';
  return buildNotionReadResult({ text, pageId, pagesWithContent, source, reply });
}

async function executeDirectNotionReadRequest(text) {
  if (typeof worionApiNotionFetch === 'function') {
    try {
      console.log('[NOTION FETCH] Tentando Worion API local');
      const fetched = await worionApiNotionFetch(text, {
        count: getRequestedNotionSessionCount(text),
        max_chars: 12000
      });
      console.log('[NOTION FETCH] Worion API respondeu');
      return await buildNotionReadResultFromFetch(text, fetched);
    } catch (error) {
      console.warn('[NOTION FETCH] fallback acionado:', error.message);
    }
  }

  const count = getRequestedNotionSessionCount(text);
  const pageRef = await findNotionReadablePageRef(text);
  const pageId = extractNotionPageId(pageRef);
  const directUrl = extractNotionUrl(text);
  const wantsChildPages = /\b(ultimas?|recentes?|sessoes|sessao|subpaginas?|children|filhos|liste|listar|lista)\b/i.test(normalizeNotionIntentText(text));

  if (directUrl && !wantsChildPages) {
    const content = await loadPageText(pageId).catch(error => {
      const message = /403|404/i.test(error.message)
        ? 'A API do Notion recusou a leitura. O link pode estar correto, mas a página precisa estar compartilhada com a integração do Worion no Notion.'
        : `A API do Notion falhou ao ler a página: ${error.message}`;
      return buildNotionReadResult({
        text,
        pageId,
        pagesWithContent: [],
        source: '',
        success: false,
        reply: `${message}\n\nPágina: ${notionPageUrlFromId(pageId)}`
      });
    });
    if (content && typeof content === 'object' && content.type === 'notion_read') return content;
    if (!content.trim()) {
      return buildNotionReadResult({
        text,
        pageId,
        pagesWithContent: [],
        source: '',
        success: false,
        reply: `Consegui resolver o link para uma página do Notion, mas a API não retornou texto legível. Isso costuma acontecer quando a página não foi compartilhada com a integração do Worion ou quando o conteúdo está em blocos que a API não expõe.\n\nPágina: ${notionPageUrlFromId(pageId)}`
      });
    }

    const pagesWithContent = [{
      id: pageId,
      title: 'Página do Notion',
      updatedAt: '',
      url: notionPageUrlFromId(pageId),
      content: content.slice(0, 12000)
    }];
    const source = formatNotionReadSource(pagesWithContent);
    const reply = shouldExposeNotionReadDetails(text)
      ? await synthesizeNotionReadReply(text, source, pagesWithContent)
      : '';
    return buildNotionReadResult({ text, pageId, pagesWithContent, source, reply });
  }

  const latestPages = await getLatestNotionChildPages(pageId, count);

  if (!latestPages.length) {
    const content = await loadPageText(pageId);
    if (!content.trim()) {
      return buildNotionReadResult({
        text,
        pageId,
        pagesWithContent: [],
        source: '',
        success: false,
        reply: `Consegui abrir a página do Notion, mas ela não retornou subpáginas nem texto legível pela API.\n\nPágina: ${notionPageUrlFromId(pageId)}`
      });
    }

    const pagesWithContent = [{
      id: pageId,
      title: 'Página do Notion',
      updatedAt: '',
      url: notionPageUrlFromId(pageId),
      content: content.slice(0, 12000)
    }];
    const source = formatNotionReadSource(pagesWithContent);
    const reply = shouldExposeNotionReadDetails(text)
      ? await synthesizeNotionReadReply(text, source, pagesWithContent)
      : '';
    return buildNotionReadResult({ text, pageId, pagesWithContent, source, reply });
  }

  const pagesWithContent = [];
  for (const page of latestPages) {
    const content = await loadPageText(page.id).catch(error => `[Erro ao ler pagina: ${error.message}]`);
    pagesWithContent.push({
      ...page,
      content: String(content || '').slice(0, 12000)
    });
  }

  const source = formatNotionReadSource(pagesWithContent);
  const reply = shouldExposeNotionReadDetails(text)
    ? await synthesizeNotionReadReply(text, source, pagesWithContent)
    : '';
  return buildNotionReadResult({ text, pageId, pagesWithContent, source, reply });
}

async function executeNotionPageRequest(request) {
  const page = await createNotionPage(request.title, request.content);
  return [
    `Pagina criada no Notion: ${page.title}`,
    `Link: ${page.url}`,
    `Page ID: ${page.id}`
  ].join('\n');
}

async function executeArtifactWebhook(request, content) {
  if (!currentAgent?.webhookUrl) {
    // Para PDF, não mostrar mensagem de webhook pois existe a tool generate_pdf
    if (request.type === 'pdf') {
      return '';
    }
    return `Artefato solicitado: ${request.type.toUpperCase()}. Nenhum webhook esta configurado neste agente, entao deixei o conteudo estruturado pronto no chat. Configure o webhook do agente para o Worion gerar o arquivo automaticamente.`;
  }

  const response = await fetch(currentAgent.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: request.type,
      prompt: request.prompt,
      content,
      conversationId: currentConversationId,
      agent: {
        id: currentAgent.id,
        name: currentAgent.name,
        model: currentAgent.model
      },
      createdAt: new Date().toISOString()
    })
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Webhook de artefato retornou ${response.status}: ${text.slice(0, 240)}`);
  }

  let data = null;
  try {
    data = JSON.parse(text);
  } catch (error) {
    data = { message: text };
  }

  const url = data.url || data.pdfUrl || data.fileUrl || data.link;
  if (url) return `PDF gerado pelo Worion: ${url}`;
  return `Webhook de PDF executado. Resposta: ${data.message || JSON.stringify(data)}`;
}
