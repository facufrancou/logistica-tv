// Aplica data-label a celdas para tablas responsive estilo 'stack'
export function enhanceResponsiveTables(selector = '.table-mobile') {
  const tables = document.querySelectorAll(selector);
  tables.forEach(table => {
    if (table.dataset.enhanced) return;
    const headers = Array.from(table.querySelectorAll('thead th')).map(h => h.textContent.trim());
    table.querySelectorAll('tbody tr').forEach(tr => {
      Array.from(tr.children).forEach((td, idx) => {
        if (!td.getAttribute('data-label') && headers[idx]) {
          td.setAttribute('data-label', headers[idx]);
        }
      });
    });
    table.dataset.enhanced = 'true';
  });
}

// Observa mutaciones para actualizar tablas dinámicas
export function observeTableMutations(selector = '.table-mobile') {
  const observer = new MutationObserver(() => enhanceResponsiveTables(selector));
  observer.observe(document.body, { childList: true, subtree: true });
  enhanceResponsiveTables(selector);
  return observer;
}
