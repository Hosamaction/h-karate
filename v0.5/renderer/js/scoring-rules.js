const ScoringRules = (() => {
  const PRESETS = {
    wkf: { name: 'WKF', yuko: 1, wazaari: 2, ippon: 3, pointGap: 8, maxPenalties: 5 },
    jka: { name: 'JKA', yuko: 1, wazaari: 2, ippon: 3, pointGap: 8, maxPenalties: 4 },
    custom: { name: 'Custom', yuko: 1, wazaari: 2, ippon: 3, pointGap: 8, maxPenalties: 5 }
  };

  let current = { ...PRESETS.wkf };

  async function load() {
    if (!window.api) return current;
    const s = await window.api.invoke('settings:get-all');
    if (!s) return current;
    const preset = s.scoringPreset || 'wkf';
    current = { ...(PRESETS[preset] || PRESETS.wkf) };
    if (preset === 'custom') {
      current.yuko = parseInt(s.yukoPoints, 10) || 1;
      current.wazaari = parseInt(s.wazaariPoints, 10) || 2;
      current.ippon = parseInt(s.ipponPoints, 10) || 3;
      current.pointGap = parseInt(s.pointGap, 10) || 8;
      current.maxPenalties = parseInt(s.maxPenalties, 10) || 5;
    }
    return current;
  }

  function get() { return current; }
  function scoreOf(corner) {
    return (corner.yuko * current.yuko) + (corner.wazaari * current.wazaari) + (corner.ippon * current.ippon);
  }

  return { PRESETS, load, get, scoreOf };
})();
window.ScoringRules = ScoringRules;
