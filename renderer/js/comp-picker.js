const CompPicker = (() => {
  let list = [];

  async function load() {
    if (!window.api) return [];
    list = await window.api.invoke('competitors:load') || [];
    return list;
  }

  function attach(nameId, clubId, extras = {}) {
    const nameEl = document.getElementById(nameId);
    if (!nameEl) return;
    const listId = nameId + 'List';
    let dl = document.getElementById(listId);
    if (!dl) {
      dl = document.createElement('datalist');
      dl.id = listId;
      document.body.appendChild(dl);
      nameEl.setAttribute('list', listId);
    }
    dl.innerHTML = '';
    list.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.fullName || '';
      opt.label = [c.club, c.belt].filter(Boolean).join(' · ');
      dl.appendChild(opt);
    });
    nameEl.addEventListener('change', () => {
      const found = list.find(c => (c.fullName || '').toLowerCase() === nameEl.value.trim().toLowerCase());
      if (!found) return;
      const clubEl = document.getElementById(clubId);
      if (clubEl && found.club) clubEl.value = found.club;
      if (extras.countryId && found.country) {
        const el = document.getElementById(extras.countryId);
        if (el) el.value = found.country;
      }
    });
  }

  async function initPairs(pairs) {
    await load();
    pairs.forEach(p => attach(p.nameId, p.clubId, p));
  }

  return { load, attach, initPairs, getList: () => list };
})();
window.CompPicker = CompPicker;
