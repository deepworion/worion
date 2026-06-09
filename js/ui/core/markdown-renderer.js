/**
 * @module ui/core/markdown-renderer
 * @description Renderização de markdown com suporte a links locais
 * @dependencies Nenhuma (usa marked.js global)
 * @exports renderMarkdown, createFileLink, convertFileLinksToHtml, repairLooseMarkdownMarkers, balancePartialMarkdown
 */

// ============================================
// ESCAPE HTML (importado de utils.js)
// ============================================

// Nota: escapeHtml é importado de utils.js no ui.js principal
// Aqui assumimos que está disponível globalmente ou será injetado

// ============================================
// RENDERIZAÇÃO DE MARKDOWN
// ============================================

/**
 * Colapsa quebras de linha excessivas (3+ quebras → 2 quebras)
 * @param {string} text - Texto para processar
 * @returns {string} Texto com quebras colapsadas
 */
function collapseExcessiveBreaks(text) {
  const str = String(text || '');
  const codeBlocks = [];
  let index = 0;

  // Extrai e preserva blocos de código
  const withPlaceholders = str.replace(/```[\s\S]*?```/g, (match) => {
    const placeholder = `___CODE_BLOCK_${index}___`;
    codeBlocks.push(match);
    index++;
    return placeholder;
  });

  // Colapsa quebras excessivas (3+ → 2)
  const collapsed = withPlaceholders.replace(/\n{3,}/g, '\n\n');

  // Restaura blocos de código
  return collapsed.replace(/___CODE_BLOCK_(\d+)___/g, (match, i) => {
    return codeBlocks[parseInt(i)] || match;
  });
}

function escapeMarkdownHtml(text) {
  const escapeHtml = window.escapeHtml || (value => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;'));
  return escapeHtml(String(text || ''));
}

function renderInlineMarkdown(text) {
  return escapeMarkdownHtml(text)
    .replace(/\*\*([^*\n][\s\S]*?[^*\n])\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n][^*\n]*?[^*\n])\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>');
}

function renderMarkdownFallback(text) {
  const blocks = collapseExcessiveBreaks(text).split(/\n{2,}/);
  const html = [];

  for (const block of blocks) {
    const lines = block.split('\n').filter(line => line.trim());
    if (!lines.length) continue;

    const isUnorderedList = lines.every(line => /^\s*[-*]\s+/.test(line));
    const isOrderedList = lines.every(line => /^\s*\d+\.\s+/.test(line));

    if (isUnorderedList || isOrderedList) {
      const tag = isOrderedList ? 'ol' : 'ul';
      const items = lines.map(line => {
        const item = line.replace(/^\s*(?:[-*]|\d+\.)\s+/, '');
        return `<li>${renderInlineMarkdown(item)}</li>`;
      }).join('');
      html.push(`<${tag}>${items}</${tag}>`);
      continue;
    }

    const heading = lines.length === 1 ? lines[0].match(/^\s*(#{1,3})\s+(.+)$/) : null;
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${renderInlineMarkdown(heading[2].trim())}</h${level}>`);
      continue;
    }

    html.push(`<p>${lines.map(renderInlineMarkdown).join('<br>')}</p>`);
  }

  return html.join('\n');
}

/**
 * Renderiza markdown para HTML com suporte a links file://
 * @param {string} text - Texto markdown
 * @returns {string} HTML renderizado
 */
export function renderMarkdown(text) {
  if (!window.WORION_UX_CONFIG?.enableRichMarkdown || typeof marked === 'undefined') {
    const renderedFallback = renderMarkdownFallback(text);
    if (window.WORION_UX_CONFIG?.debugMarkdown) {
      console.debug('[MARKDOWN DEBUG] raw assistant content:', text);
      console.debug('[MARKDOWN DEBUG] rendered html:', renderedFallback);
    }
    return convertFileLinksToHtml(renderedFallback);
  }
  try {
    // Limpa quebras excessivas antes de processar
    const cleanContent = collapseExcessiveBreaks(text);

    // Configure marked to open external links in new tab
    const renderer = new marked.Renderer();
    const originalLinkRenderer = renderer.link.bind(renderer);
    renderer.link = (...args) => {
      const token = args[0];
      const href = typeof token === 'object' ? token.href : token;
      const text = typeof token === 'object' ? (token.text || token.href) : args[2];
      const safeHref = String(href || '');
      const html = originalLinkRenderer(...args);
      if (safeHref.startsWith('http://') || safeHref.startsWith('https://')) {
        return html.replace('<a', '<a target="_blank" rel="noopener noreferrer"');
      }
      // Handle local file links
      if (safeHref.startsWith('file://')) {
        return createFileLink(safeHref, text);
      }
      return html;
    };
    const rendered = marked.parse(cleanContent, {
      breaks: true,
      gfm: true,
      renderer: renderer
    });
    if (window.WORION_UX_CONFIG?.debugMarkdown) {
      console.debug('[MARKDOWN DEBUG] raw assistant content:', text);
      console.debug('[MARKDOWN DEBUG] rendered html:', rendered);
    }
    // Post-process to catch any remaining file:// links
    return convertFileLinksToHtml(rendered);
  } catch (err) {
    console.error('[UI] Markdown rendering error:', err);
    const renderedFallback = renderMarkdownFallback(text);
    if (window.WORION_UX_CONFIG?.debugMarkdown) {
      console.debug('[MARKDOWN DEBUG] raw assistant content:', text);
      console.debug('[MARKDOWN DEBUG] rendered html:', renderedFallback);
    }
    return convertFileLinksToHtml(renderedFallback);
  }
}

// ============================================
// LINKS FILE://
// ============================================

/**
 * Cria link HTML para arquivo local
 * @param {string} filePath - Caminho file://
 * @param {string} linkText - Texto do link
 * @returns {string} HTML do link
 */
export function createFileLink(filePath, linkText) {
  const escapeHtml = window.escapeHtml || (s => s);
  const cleanPath = filePath.replace('file://', '').replace(/^\/+/, '');
  const fileName = linkText || cleanPath.split('/').pop();
  return `<a href="#" class="artifact-link" data-path="${escapeHtml(cleanPath)}" style="color: #f5f5f5; text-decoration: underline; font-weight: 500;">📄 ${escapeHtml(fileName)}</a>`;
}

/**
 * Converte links file:// em HTML clicável
 * @param {string} html - HTML para processar
 * @returns {string} HTML processado
 */
export function convertFileLinksToHtml(html) {
  // Detect markdown-style file links: [text](file://path) or **[text]**(file://path)
  const markdownPattern = /\*?\*?\[([^\]]+)\]\*?\*?\(file:\/\/([^)]+)\)/g;
  html = html.replace(markdownPattern, (match, text, path) => {
    return createFileLink('file://' + path, text);
  });

  // Detect plain file:// URLs
  const urlPattern = /(file:\/\/[^\s<)"]+)/g;
  html = html.replace(urlPattern, (match) => {
    return createFileLink(match, match.split('/').pop());
  });

  return html;
}

// ============================================
// REPARAÇÃO DE MARKDOWN
// ============================================

/**
 * Repara marcadores de markdown mal formatados
 * @param {string} text - Texto para reparar
 * @returns {string} Texto reparado
 */
export function repairLooseMarkdownMarkers(text) {
  return String(text || '')
    // Corrige pseudo-cabeçalhos gerados como ##Titulo## ou #Titulo#.
    .replace(/(^|\n)\s*#{1,3}\s*([^#\n]{3,120}?)\s*#{1,3}\s*(?=\n|$)/g, (match, prefix, title) => {
      return `${prefix}**${title.trim()}**`;
    })
    .replace(/(^|[\s(])##\s*([^#\n]{3,100}?)\s*##(?=[\s).,:;!?]|$)/g, (match, prefix, title) => {
      return `${prefix}**${title.trim()}**`;
    })
    .replace(/(^|[\s(])#\s*([^#\n]{3,100}?)\s*#(?=[\s).,:;!?]|$)/g, (match, prefix, title) => {
      const clean = title.trim();
      if (/^https?:\/\//i.test(clean)) return match;
      return `${prefix}**${clean}**`;
    });
}

/**
 * Balanceia marcadores de markdown parciais
 * @param {string} text - Texto para balancear
 * @returns {string} Texto balanceado
 */
export function balancePartialMarkdown(text) {
  let balanced = String(text || '');
  const fenceCount = (balanced.match(/```/g) || []).length;
  if (fenceCount % 2 === 1) balanced += '\n```';

  const boldCount = (balanced.match(/\*\*/g) || []).length;
  if (boldCount % 2 === 1) balanced += '**';

  const inlineCodeCount = (balanced.replace(/```[\s\S]*?```/g, '').match(/(?<!`)`(?!`)/g) || []).length;
  if (inlineCodeCount % 2 === 1) balanced += '`';

  return balanced;
}

// ============================================
// INICIALIZAÇÃO
// ============================================

/**
 * Inicializa event listeners para links de arquivo
 */
export function initializeFileLinks() {
  // Setup artifact link listeners
  document.addEventListener('click', (event) => {
    const link = event.target.closest('.artifact-link');
    if (!link) return;

    event.preventDefault();
    const filePath = link.dataset.path;
    if (filePath && window.openLocalFile) {
      window.openLocalFile(filePath);
    }
  });
}
