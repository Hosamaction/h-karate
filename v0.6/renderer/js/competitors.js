/**
 * Competitors Database Renderer
 */

let competitors = [];
let filteredCompetitors = [];
let editingId = null;

async function loadCompetitors() {
  competitors = await window.api.invoke('competitors:load') || [];
  filteredCompetitors = [...competitors];
  renderCompetitors();
}

function renderCompetitors() {
  const container = document.getElementById('competitorsList');
  if (!container) return;

  if (filteredCompetitors.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:3rem; color:var(--text-muted)">
        <div style="font-size:3rem">👤</div>
        <p data-i18n="comp_noCompetitors" style="font-size:1.1rem; margin:1rem 0">No competitors yet</p>
        <p data-i18n="comp_addFirst" style="font-size:0.9rem">Add your first competitor to get started</p>
      </div>
    `;
    I18N.apply();
    return;
  }

  container.innerHTML = `
    <div class="competitor-grid" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px;">
      ${filteredCompetitors.map(comp => `
        <div class="competitor-card">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
            <div class="comp-avatar">${escapeHtml(comp.fullName).charAt(0).toUpperCase()}</div>
            <div style="flex:1;">
              <div class="comp-name">${escapeHtml(comp.fullName)}</div>
              ${comp.belt ? `<span class="comp-belt belt-${comp.belt}" style="display:inline-block; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:600;">🥋 ${escapeHtml(comp.belt)}</span>` : ''}
            </div>
          </div>
          <div class="comp-info" style="display:flex; flex-direction:column; gap:4px; font-size:0.85rem; color:var(--text-muted); margin-bottom:8px;">
            ${comp.club ? `<div>🏛️ ${escapeHtml(comp.club)}</div>` : ''}
            ${comp.country ? `<div>🌍 ${escapeHtml(comp.country)}</div>` : ''}
            ${comp.age ? `<div>📅 ${comp.age} years</div>` : ''}
            ${comp.category ? `<div>📊 ${escapeHtml(comp.category)}</div>` : ''}
          </div>
          ${comp.notes ? `<div class="comp-notes" style="font-size:0.8rem; color:var(--text-secondary); margin-top:8px; padding-top:8px; border-top:1px solid var(--border);">${escapeHtml(comp.notes)}</div>` : ''}
          <div class="comp-actions" style="display:flex; gap:8px; margin-top:12px;">
            <button class="btn btn-ghost btn-sm" onclick="editCompetitor(${comp.id})" style="flex:1;">✏️ Edit</button>
            <button class="btn btn-ghost btn-sm" onclick="deleteCompetitor(${comp.id})" style="color:var(--red);">🗑️</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function searchCompetitors() {
  const query = document.getElementById('searchComp')?.value.toLowerCase() || '';
  const belt = document.getElementById('filterBelt')?.value || 'all';

  filteredCompetitors = competitors.filter(comp => {
    const matchesSearch = !query || 
      comp.fullName.toLowerCase().includes(query) ||
      comp.club.toLowerCase().includes(query) ||
      comp.belt.toLowerCase().includes(query) ||
      comp.country.toLowerCase().includes(query);

    const matchesBelt = belt === 'all' || comp.belt === belt;

    return matchesSearch && matchesBelt;
  });

  renderCompetitors();
}

function openAddModal() {
  editingId = null;
  document.getElementById('modalTitle').textContent = I18N.t('comp_addNew');
  document.getElementById('compForm').reset();
  document.getElementById('compModal').classList.add('active');
}

function editCompetitor(id) {
  const comp = competitors.find(c => c.id === id);
  if (!comp) return;

  editingId = id;
  document.getElementById('modalTitle').textContent = `Edit ${comp.fullName}`;
  document.getElementById('compFullName').value = comp.fullName || '';
  document.getElementById('compClub').value = comp.club || '';
  document.getElementById('compCountry').value = comp.country || '';
  document.getElementById('compBelt').value = comp.belt || '';
  document.getElementById('compCategory').value = comp.category || '';
  document.getElementById('compAge').value = comp.age || '';
  document.getElementById('compWeight').value = comp.weight || '';
  document.getElementById('compNotes').value = comp.notes || '';
  
  document.getElementById('compModal').classList.add('active');
}

function closeModal() {
  document.getElementById('compModal').classList.remove('active');
  editingId = null;
}

function saveCompetitor() {
  const fullName = document.getElementById('compFullName')?.value.trim();
  if (!fullName) {
    Toast.error('Error', 'Full name is required');
    return;
  }

  const compData = {
    id: editingId || Date.now(),
    fullName: fullName,
    club: document.getElementById('compClub')?.value.trim() || '',
    country: document.getElementById('compCountry')?.value.trim() || '',
    belt: document.getElementById('compBelt')?.value || '',
    category: document.getElementById('compCategory')?.value.trim() || '',
    age: document.getElementById('compAge')?.value || '',
    weight: document.getElementById('compWeight')?.value || '',
    notes: document.getElementById('compNotes')?.value.trim() || '',
    createdAt: editingId ? competitors.find(c => c.id === editingId)?.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (editingId) {
    const idx = competitors.findIndex(c => c.id === editingId);
    if (idx !== -1) competitors[idx] = compData;
  } else {
    competitors.unshift(compData);
  }

  window.api.send('competitors:save', competitors);
  filteredCompetitors = [...competitors];
  renderCompetitors();
  closeModal();
  
  Toast.success('Saved', editingId ? 'Competitor updated' : 'Competitor added');
}

function deleteCompetitor(id) {
  const comp = competitors.find(c => c.id === id);
  if (!comp) return;

  if (!confirm(`Delete ${comp.fullName}? This cannot be undone.`)) return;

  competitors = competitors.filter(c => c.id !== id);
  window.api.send('competitors:save', competitors);
  filteredCompetitors = [...competitors];
  renderCompetitors();
  
  Toast.warning('Deleted', `${comp.fullName} removed`);
}

async function importCompetitors() {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const text = await file.text();
      const imported = JSON.parse(text);

      if (!Array.isArray(imported)) {
        Toast.error('Error', 'Invalid JSON format');
        return;
      }

      // Merge with existing, avoiding duplicates
      imported.forEach(comp => {
        if (!competitors.find(c => c.fullName === comp.fullName && c.club === comp.club)) {
          competitors.push({ ...comp, id: Date.now() + Math.random() });
        }
      });

      window.api.send('competitors:save', competitors);
      filteredCompetitors = [...competitors];
      renderCompetitors();
      Toast.success('Imported', `${imported.length} competitors imported`);
    };
    input.click();
  } catch (err) {
    Toast.error('Import Failed', err.message);
  }
}

async function exportCompetitors() {
  try {
    const dataStr = JSON.stringify(competitors, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `competitors-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    Toast.success('Exported', 'Competitors exported successfully');
  } catch (err) {
    Toast.error('Export Failed', err.message);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
loadCompetitors();

// Close modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});
