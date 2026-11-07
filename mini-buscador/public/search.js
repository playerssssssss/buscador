/**
 * Búsqueda en el cliente sobre el índice JSON generado por el crawler en Perl
 */

let INDEX = {};

async function loadIndex() {
  const statsEl = document.getElementById('stats');
  try {
    // El índice se sirve desde /data/index.json
    // Ajusta la ruta si lo pones en otro sitio
    const res = await fetch('../data/index.json');
    if (!res.ok) throw new Error('No se pudo cargar el índice');
    INDEX = await res.json();
    const count = Object.keys(INDEX).length;
    statsEl.textContent = `Páginas indexadas: ${count}`;
  } catch (err) {
    statsEl.textContent = 'No hay índice todavía. Ejecuta primero el crawler (crawler.pl).';
    console.error(err);
  }
}

function search(query) {
  query = query.trim().toLowerCase();
  if (!query) return [];

  const terms = query.split(/\s+/).filter(Boolean);
  const scored = [];

  for (const [url, doc] of Object.entries(INDEX)) {
    const title = (doc.title || '').toLowerCase();
    const text  = (doc.text  || '').toLowerCase();
    let score = 0;

    for (const term of terms) {
      // El título pesa mucho más
      score += countOccurrences(title, term) * 12;
      score += countOccurrences(text, term);
    }

    if (score > 0) {
      scored.push({
        url,
        title: doc.title || url,
        snippet: makeSnippet(doc.text || '', terms),
        score
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 25);
}

function countOccurrences(str, term) {
  if (!term) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = str.indexOf(term, pos)) !== -1) {
    count++;
    pos += term.length;
  }
  return count;
}

function makeSnippet(text, terms) {
  text = text.replace(/\s+/g, ' ').trim();
  const lower = text.toLowerCase();
  let pos = -1;

  for (const term of terms) {
    const p = lower.indexOf(term);
    if (p !== -1) {
      pos = p;
      break;
    }
  }

  let snippet;
  if (pos === -1) {
    snippet = text.slice(0, 200);
  } else {
    const start = Math.max(0, pos - 70);
    snippet = text.slice(start, start + 220);
    if (start > 0) snippet = '…' + snippet;
  }
  if (text.length > 220) snippet += '…';

  // Resaltar términos
  for (const term of terms) {
    const re = new RegExp('(' + escapeRegExp(term) + ')', 'gi');
    snippet = snippet.replace(re, '<mark>$1</mark>');
  }

  return snippet;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderResults(results, query) {
  const container = document.getElementById('results');
  const statsEl   = document.getElementById('stats');

  if (!query) {
    container.innerHTML = '';
    return;
  }

  statsEl.textContent = `Resultados para “${query}”: ${results.length}  ·  Índice: ${Object.keys(INDEX).length} páginas`;

  if (results.length === 0) {
    container.innerHTML = '<p class="empty">No se encontraron resultados.</p>';
    return;
  }

  container.innerHTML = results.map(r => `
    <div class="result">
      <a class="title" href="${escapeHtml(r.url)}" target="_blank" rel="noopener">
        ${escapeHtml(r.title)}
      </a>
      <div class="url">${escapeHtml(r.url)}</div>
      <div class="snippet">${r.snippet}</div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Eventos
document.getElementById('search-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const q = document.getElementById('q').value;
  const results = search(q);
  renderResults(results, q);
});

// Búsqueda mientras escribes (opcional)
document.getElementById('q').addEventListener('input', function () {
  const q = this.value;
  if (q.length >= 2 || q.length === 0) {
    const results = search(q);
    renderResults(results, q);
  }
});

// Cargar índice al inicio
loadIndex();
