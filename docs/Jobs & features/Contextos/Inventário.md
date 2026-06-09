Pra criar o notion do Worion com mais clareza você precisa conhecer e entender esse documento. Ele contém quase tudo que já foi feito, a partir desse documento, vamos organizar a casa como deve ser feita. O Foco deve ser o Worion Desktop, mas vc precisa conhecer tudo que está dentro do Notion, para que não apague coisas que eu precisarei depois.

Briefing Completo: Workestria & Worion Desktop

Quem é Glaydson
Glaydson é um empreendedor solo brasileiro, baseado em Montes Claros - MG. Tem background em gestão de varejo (negócio familiar, múltiplas lojas, todos os departamentos) — sem formação formal em programação. Começou a codar há aproximadamente 2 meses. Trabalha ~10h/dia, em blocos focados com pausas cognitivas. Tem ADHD tratado e pensa em padrões não-lineares, tipo constelação. Pratica Hermetismo, mediunidade Umbanda e o framework do Bashar. Vive com a mãe e tem uma gata chamada Dharma. Email principal: leedermix@gmail.com.

Instância 1: Workestria
O que é
Workestria é uma plataforma SaaS de automação para lojistas brasileiros que usam Shopify + Bling (ERP). Foi construída em aproximadamente 45 dias de trabalho focado, começando do zero em torno de março de 2026. Surgiu de um protótipo em Make e evoluiu para uma infraestrutura self-hosted completa.
Stack
CamadaTecnologiaAutomaçãon8n self-hosted, Docker, Queue ModeBancoPostgreSQL + Redis (Hetzner CX23, IP: 46.225.92.64, porta :5678)SecretsSupabase Vault (api_keys_vault_v2, projeto zhdnqjwfpeexjrofosez)IAGPT-4o-mini, Claude Sonnet API, gpt-image-1ImagensCloudinary, rembg, Flux, SharpFrontendNext.js + Tailwind no Vercel (/admin e /dashboard)ArmazenamentoGoogle Drive
Módulos prontos e funcionando

Orquestrador V2.0 — cérebro central que coordena os demais módulos
Organizador — organiza e categoriza produtos
Buscador de Imagens HD — busca imagens de alta qualidade para produtos
Body HTML — gera descrições com GPT-4o + campo descricaoCurta do Bling
SEO + Metadados — otimização completa de SEO por produto
Calculadora de Preços — Simples Nacional + taxa Shopify + arredondamento emocional + log em calculadora_log
Storytelling — gera imagens com gpt-image-1, sobe no Cloudinary e publica no Shopify
Dashboard — painel Next.js com /admin e /dashboard no Vercel

Arquitetura e regras de negócio

Cada cliente usa suas próprias API keys — sistema stateless e LGPD-compliant
n8n em Queue Mode para escala
Pipeline de imagem: rembg + Flux + Sharp (~R$0,035/imagem)
Regra de ouro Bling/Shopify: Bling é dono de preço/estoque/SKU. Workestria é dona de body_html, SEO, metafields e imagens. Conflito resolvido via: metafield custom.descricao_ia + Liquid theme + Guardian webhook + tabela workestria_content no Supabase
48 workflows mapeados em mapa_workflows.md, Claude Code em C:\Workestria com CLAUDE.md

Planos e modelo de negócio
PlanoPreçoStarterR$97/mêsProR$197/mêsWhite LabelR$397/mês
Backlog (ordenado)

Auth ML API via Supabase
Melhorias no Storytelling (logo do cliente + texto disclaimer + migrar para dall-e-3)
Dashboard com dispatch de jobs + monitor em tempo real
Orquestrador final via tabela clientes_modulos no Supabase
Stripe por módulo
Primeiro cliente onboardado


Instância 2: Worion Desktop
O que é e como surgiu
Worion Desktop é um cockpit de IA pessoal para Glaydson, construído em Electron. Ele nasceu depois da Workestria, como uma ferramenta para o próprio Glaydson operar com mais inteligência — não é um produto para clientes da Workestria, é uma instância separada e independente.
A primeira versão foi acidentalmente deletada. A versão atual foi reconstruída do zero em 15 de maio de 2026, em aproximadamente 15 dias de desenvolvimento intenso. É implantado em ai.workestria.cloud via Cloudflare Tunnel (ID 43474cd7).

Relação com Workestria: o domínio workestria.cloud é compartilhado por conveniência de infraestrutura, mas Worion é uma entidade separada, com Supabase próprio, lógica própria e propósito próprio. Um não depende do outro.

Stack
CamadaTecnologiaShellElectron (Windows)Módulo principaljs/chat.js (~4.500+ linhas — candidato a refatoração)Outros módulosjs/ui.js, js/tools.js, js/prompt.js, js/connectors.jsBancoSupabase próprioTúnelCloudflare TunnelCLI localdeepworion.js (Windows-only, lazy-loading, flag --exec)Agente VPSjamesbond.js (logging + persistência Supabase)
Roteamento de modelos (Model Router dinâmico)
O Worion não usa um modelo fixo. Ele possui um dispatcher dinâmico que escolhe entre:

DeepSeek — tarefas de raciocínio pesado
OpenAI — tarefas gerais
Anthropic (Claude) — tarefas específicas definidas por Glaydson

A decisão é feita por turno. Para evitar alucinações sobre qual modelo foi usado, existe um Runtime Truth Source: _runtimeMetadata e window.lastAssistantRuntimeFacts — variáveis que registram a verdade do que aconteceu, não o que o modelo acha que aconteceu.
Sistemas construídos
SistemaStatusLangSmith Tracing✅ ativo (vault: provider=langSmith)Dynamic Model Router✅ ativoRuntime Truth Source✅ ativoVerification Engine (window.WorionVerificationEngine)✅ implementadoGrounding Gate + Narrative Claim Validator⚠️ convertidos para observabilidade apenas (não são bloqueadores)Research Pipeline (runDeterministicResearchRoute())✅ implementado (bug de fetch_url diagnosticado e corrigido)Memory Cards V2🔄 em estabilizaçãoDual-write de conversas (local + Supabase worion_memory_conversations)✅ implementadoSkill /advogado-civilista✅ construída e usadaSkill packs pessoais (user_skill_packs/glaydson/)✅ extraídos do coredocs/architecture.json manifest✅ reescrito
Memory Cards V2 — o que é e o que falta
Memory Cards V2 é o sistema de memória persistente e navegável do Worion. A UI foi desenhada e aprovada: sidebar de navegação, grid de cards com ícones SVG coloridos e painel de chat deslizante.
O que ainda falta para estabilizar:

Conteúdo real do Supabase fluindo para os cards (hoje há descrições genéricas)
Fluxo de abrir/fechar o painel de chat estabilizado
Geração de cards a partir do contexto de conversas

O Worion tem 5.786 chunks de memória no Supabase. O próximo nível é clustering semântico — agrupar esses chunks por similaridade vetorial para revelar conexões entre conversas. Glaydson identifica isso como a peça que falta para o Worion servir outras pessoas além dele.
Segurança — Security Sprint 1
Existe uma vulnerabilidade conhecida e reconhecida: o renderer do Electron tem acesso à chave de serviço do Vault. Isso é o Security Sprint 1 — e ele está bloqueando qualquer migração para VPS ou exposição web adicional. Nada avança em termos de deployment público enquanto isso não for fechado.
Notion como fonte da verdade
O workspace Notion é o source of truth do projeto Worion Desktop.
PáginaUUIDWorion HQ root3638bcbf-b9ad-805c-8545-c4c696275b49Sessões & Commits3638bcbf-b9ad-8105-b584-fed329c495b5Codex Audit (pág. 15)dentro do HQ root
Token MCP Notion: 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
Contexto de identidade
O Worion conhece Glaydson por 3 arquivos de contexto:

WORKESTRIA.md — contexto do negócio
IDENTITY.md — identidade do Worion
USER.md — quem é Glaydson

Localização: C:\Users\User\.openclaw\workspace
Claude Code se refere a Glaydson como "Boss".

Resumo da relação entre os dois
Workestria (março 2026)
  └── Produto SaaS B2B para lojistas Shopify brasileiros
  └── n8n + Hetzner + Supabase + Next.js
  └── Foco: automação de catálogo, imagens, SEO, preços

        ↓ surgiu depois, mas é instância separada ↓

Worion Desktop (maio 2026)
  └── Cockpit de IA pessoal para o próprio Glaydson
  └── Electron + Supabase próprio + Cloudflare Tunnel
  └── Foco: memória, pesquisa, raciocínio, skills, ferramentas
  └── Compartilha domínio workestria.cloud por conveniência
      mas NÃO compartilha lógica, banco nem propósito
Os dois coexistem na mesma infraestrutura de forma pragmática, mas são produtos com identidades, bases de dados, objetivos e públicos completamente diferentes.