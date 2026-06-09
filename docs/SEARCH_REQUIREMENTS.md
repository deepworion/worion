# Search Requirements — Worion

Este documento define a hierarquia desejada para o sistema de busca do Worion.

## 1. Classificar a intenção

Antes de buscar, o Worion deve identificar:

- se é pergunta factual;
- se é diagnóstico interno;
- se depende de arquivo enviado;
- se depende de Notion, GitHub ou Gmail;
- se precisa de informação atual;
- se pode ser respondida sem ferramenta externa.

## 2. Escolher ferramenta

A ferramenta deve ser escolhida conforme a intenção:

- web pública;
- arquivos anexados;
- Notion;
- GitHub;
- Gmail;
- cálculo;
- clima;
- finanças;
- calendário;
- outras ferramentas disponíveis.

## 3. Buscar ou abrir fontes

A busca deve priorizar conteúdo real, não apenas snippets.

Regras:

- snippet serve para descoberta, não como prova final;
- quando houver URL relevante, abrir a página;
- extrair conteúdo real;
- descartar fonte vazia, fraca ou irrelevante;
- preferir fonte primária quando disponível;
- usar fonte secundária apenas como apoio.

## 4. Registrar evidência

Cada evidência coletada deve registrar:

- fonte;
- URL, arquivo ou conector;
- trecho útil;
- ferramenta que coletou;
- momento da coleta;
- tipo de fonte;
- nível de confiança quando aplicável.

## 5. Responder com base no corpus coletado

A resposta deve usar o corpus coletado como base principal.

Regras:

- não depender apenas de conhecimento interno quando houver fonte aberta;
- separar fato confirmado, inferência e lacuna;
- não inventar dado ausente;
- quando algo não estiver no corpus, marcar como não confirmado;
- quando houver conflito entre fontes, declarar o conflito.

## 6. Citar evidência

A resposta deve citar a origem da evidência:

- web: URL ou título da página aberta;
- arquivo: nome do arquivo e trecho;
- Notion/GitHub/Gmail: item consultado;
- outras ferramentas: referência retornada pela ferramenta.

## 7. Observação de teste

Neste momento, os bloqueios automáticos de validação factual podem estar desativados para teste.

A ausência de bloqueio não significa ausência de requisito.

O objetivo final é reconstruir o sistema de busca com evidência rastreável, mas sem bloquear indevidamente respostas durante o desenvolvimento.
