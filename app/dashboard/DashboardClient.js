'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { PLANT_LIBRARY, SYMPTOMS, DIAGNOSES, SEASONS, getTasksForPlant, getRecurringTasksForPlant, getShoppingList } from '@/lib/data';

const LEAF_SVG = (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 88 Q50 55 50 20" stroke="#5a7c3e" strokeWidth="2" fill="none" />
    <path d="M50 25 Q30 30 22 50 Q28 72 50 78 Q44 55 50 25 Z" fill="#5a9048" />
    <path d="M50 25 Q70 30 78 50 Q72 72 50 78 Q56 55 50 25 Z" fill="#6aa058" />
  </svg>
);

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

// Redimensionne une image (File) et retourne un Blob JPEG.
function resizeImage(file, maxW = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image invalide'));
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Compression échouée'))),
          'image/jpeg',
          quality
        );
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function DashboardClient({ initialPlants, userEmail }) {
  const router = useRouter();
  const supabase = createClient();
  const [plants, setPlants] = useState(initialPlants);
  const [customLibrary, setCustomLibrary] = useState([]);
  const [tab, setTab] = useState('catalog');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [sortMode, setSortMode] = useState('recent');
  const [librarySearch, setLibrarySearch] = useState('');
  const [libFilterType, setLibFilterType] = useState('');
  const [libFilterSource, setLibFilterSource] = useState('all');
  const [editingPlant, setEditingPlant] = useState(null);
  const [editingLibrary, setEditingLibrary] = useState(null);
  const [detailPlant, setDetailPlant] = useState(null);
  const [detailLib, setDetailLib] = useState(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState(new Set());
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [message, setMessage] = useState(null);

  // Charger la bibliothèque custom au montage
  useEffect(() => {
    refreshCustomLibrary();
  }, []);

  async function refreshCustomLibrary() {
    const { data } = await supabase
      .from('library_plants')
      .select('*')
      .order('created_at', { ascending: false });
    setCustomLibrary(data || []);
  }

  const currentSeason = useMemo(() => {
    const m = new Date().getMonth();
    return SEASONS.find(s => s.months.includes(m));
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  async function refreshPlants() {
    const { data } = await supabase
      .from('plants')
      .select('*')
      .order('created_at', { ascending: false });
    setPlants(data || []);
  }

  async function savePlant(formData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = { ...formData, user_id: user.id };

    if (formData.id) {
      const { error } = await supabase
        .from('plants')
        .update(payload)
        .eq('id', formData.id);
      if (error) {
        setMessage({ type: 'error', text: 'Erreur : ' + error.message });
        return false;
      }
      setMessage({ type: 'success', text: 'Plante modifiée' });
    } else {
      delete payload.id;
      const { error } = await supabase.from('plants').insert(payload);
      if (error) {
        setMessage({ type: 'error', text: 'Erreur : ' + error.message });
        return false;
      }
      setMessage({ type: 'success', text: 'Plante ajoutée' });
    }

    await refreshPlants();
    setTimeout(() => setMessage(null), 3000);
    return true;
  }

  async function deletePlant(id) {
    if (!confirm('Supprimer cette plante ?')) return;
    const { error } = await supabase.from('plants').delete().eq('id', id);
    if (!error) {
      await refreshPlants();
      setEditingPlant(null);
      setDetailPlant(null);
      setMessage({ type: 'success', text: 'Plante supprimée' });
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function saveLibraryPlant(formData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const payload = { ...formData, user_id: user.id };
    if (formData.id) {
      const { error } = await supabase
        .from('library_plants')
        .update(payload)
        .eq('id', formData.id);
      if (error) {
        setMessage({ type: 'error', text: 'Erreur : ' + error.message });
        return false;
      }
      setMessage({ type: 'success', text: 'Fiche bibliothèque modifiée' });
    } else {
      delete payload.id;
      const { error } = await supabase.from('library_plants').insert(payload);
      if (error) {
        setMessage({ type: 'error', text: 'Erreur : ' + error.message });
        return false;
      }
      setMessage({ type: 'success', text: 'Ajoutée à votre bibliothèque' });
    }
    await refreshCustomLibrary();
    setTimeout(() => setMessage(null), 3000);
    return true;
  }

  async function deleteLibraryPlant(id) {
    if (!confirm('Supprimer cette fiche de votre bibliothèque ?')) return;
    const { error } = await supabase.from('library_plants').delete().eq('id', id);
    if (!error) {
      await refreshCustomLibrary();
      setEditingLibrary(null);
      setDetailLib(null);
      setMessage({ type: 'success', text: 'Fiche supprimée' });
      setTimeout(() => setMessage(null), 3000);
    }
  }

  // Copier une fiche de bibliothèque vers "Mes plantes"
  function exportLibToPlants(lib) {
    // Les fiches builtin ont care (objet) + tips/problems (array), les custom ont light/water (string) + tips/problems (texte multi-lignes)
    const isBuiltin = lib._source === 'builtin';
    const tipsStr = Array.isArray(lib.tips) ? lib.tips.join('\n') : (lib.tips || '');
    const problemsStr = Array.isArray(lib.problems) ? lib.problems.join('\n') : (lib.problems || '');
    const lightStr = isBuiltin ? (lib.care?.Lumière || lib.light || '') : (lib.light || '');
    const waterStr = isBuiltin ? (lib.care?.Arrosage || lib.water || '') : (lib.water || '');

    setEditingPlant({
      id: null, // nouvelle plante
      name: lib.name || '',
      latin: lib.latin || '',
      type: lib.type || '',
      location: '',
      light: lightStr,
      water: waterStr,
      notes: '',
      photo: lib.photo || null,
      acquired: new Date().toISOString().split('T')[0],
      description: lib.description || '',
      plantation: lib.plantation || '',
      propagation: lib.propagation || '',
      harvest: lib.harvest || '',
      companions: lib.companions || '',
      tips: tipsStr,
      problems: problemsStr,
    });
    setDetailLib(null);
    setTab('add');
    setMessage({ type: 'success', text: 'Pré-rempli depuis la bibliothèque. Complétez et enregistrez.' });
    setTimeout(() => setMessage(null), 4000);
  }

  // Ouvrir le formulaire d'édition d'une fiche bibliothèque.
  // Pour une fiche custom : édition directe. Pour une fiche builtin : copie en custom (id: null).
  function editLibraryEntry(lib) {
    if (lib._source === 'custom') {
      setEditingLibrary(lib);
      setDetailLib(null);
      return;
    }
    // Builtin : on pré-remplit une nouvelle fiche custom avec les données
    const tipsStr = Array.isArray(lib.tips) ? lib.tips.join('\n') : (lib.tips || '');
    const problemsStr = Array.isArray(lib.problems) ? lib.problems.join('\n') : (lib.problems || '');
    setEditingLibrary({
      id: null,
      name: lib.name || '',
      latin: lib.latin || '',
      type: lib.type || '',
      description: lib.description || '',
      light: lib.care?.Lumière || lib.light || '',
      water: lib.care?.Arrosage || lib.water || '',
      plantation: lib.plantation || '',
      propagation: lib.propagation || '',
      harvest: lib.harvest || '',
      companions: lib.companions || '',
      tips: tipsStr,
      problems: problemsStr,
      photo: lib.photo || null,
    });
    setDetailLib(null);
    setMessage({ type: 'success', text: 'Fiche pré-remplie. Modifiez-la et enregistrez pour créer votre version.' });
    setTimeout(() => setMessage(null), 4000);
  }

  // Copier une plante vers la bibliothèque personnelle
  function exportPlantToLib(plant) {
    setEditingLibrary({
      id: null,
      name: plant.name || '',
      latin: plant.latin || '',
      type: plant.type || '',
      description: plant.notes || '',
      light: plant.light || '',
      water: plant.water || '',
      plantation: '',
      propagation: '',
      harvest: '',
      companions: '',
      tips: '',
      problems: '',
      photo: plant.photo || null,
    });
    setDetailPlant(null);
    setMessage({ type: 'success', text: 'Fiche pré-remplie. Complétez-la et enregistrez dans la bibliothèque.' });
    setTimeout(() => setMessage(null), 4000);
  }

  const availableLocations = useMemo(() => {
    const set = new Set();
    plants.forEach(p => { if (p.location) set.add(p.location); });
    return Array.from(set).sort();
  }, [plants]);

  const filteredPlants = useMemo(() => {
    const s = search.toLowerCase();
    const filtered = plants.filter(p =>
      (!s || p.name.toLowerCase().includes(s) || (p.latin || '').toLowerCase().includes(s) || (p.location || '').toLowerCase().includes(s)) &&
      (!filterType || p.type === filterType) &&
      (!filterLocation || p.location === filterLocation)
    );
    const sorted = [...filtered];
    if (sortMode === 'az') sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr'));
    else if (sortMode === 'za') sorted.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'fr'));
    else if (sortMode === 'old') sorted.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    else if (sortMode === 'recent') sorted.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return sorted;
  }, [plants, search, filterType, filterLocation, sortMode]);

  const libraryTypes = useMemo(() => {
    const set = new Set();
    PLANT_LIBRARY.forEach(p => { if (p.type) set.add(p.type); });
    customLibrary.forEach(p => { if (p.type) set.add(p.type); });
    return Array.from(set).sort();
  }, [customLibrary]);

  const filteredLibrary = useMemo(() => {
    const s = librarySearch.toLowerCase();
    const custom = customLibrary.map(p => ({ ...p, _source: 'custom' }));
    // Dédup : si un custom a le même nom (casse insensible) qu'un builtin, on masque le builtin
    const customNames = new Set(custom.map(p => (p.name || '').trim().toLowerCase()));
    const builtin = PLANT_LIBRARY
      .filter(p => !customNames.has((p.name || '').trim().toLowerCase()))
      .map(p => ({ ...p, _source: 'builtin' }));
    let merged = [...custom, ...builtin];
    if (libFilterSource === 'custom') merged = merged.filter(p => p._source === 'custom');
    else if (libFilterSource === 'builtin') merged = merged.filter(p => p._source === 'builtin');
    return merged.filter(p =>
      (!s ||
        (p.name || '').toLowerCase().includes(s) ||
        (p.latin || '').toLowerCase().includes(s) ||
        (p.type || '').toLowerCase().includes(s)) &&
      (!libFilterType || p.type === libFilterType)
    );
  }, [librarySearch, customLibrary, libFilterType, libFilterSource]);

  const stats = useMemo(() => {
    const byType = plants.reduce((a, p) => { a[p.type] = (a[p.type] || 0) + 1; return a; }, {});
    return { total: plants.length, fruitier: byType['Fruitier'] || 0, interieur: byType['Intérieur'] || 0, aromatique: byType['Aromatique'] || 0 };
  }, [plants]);

  function toggleSymptom(id) {
    const next = new Set(selectedSymptoms);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedSymptoms(next);
  }

  function runDiagnosis() {
    if (selectedSymptoms.size === 0) {
      setDiagnosisResult({ type: 'warn', text: 'Cochez au moins un symptôme.' });
      return;
    }
    const selected = Array.from(selectedSymptoms);
    const scored = DIAGNOSES
      .map(d => {
        const matched = d.symptoms.filter(s => selected.includes(s));
        const score = (matched.length / d.symptoms.length) * 0.6 + (matched.length / selected.length) * 0.4;
        return { ...d, matched: matched.length, score };
      })
      .filter(d => d.matched > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    if (scored.length === 0) {
      setDiagnosisResult({ type: 'warn', text: 'Combinaison de symptômes non reconnue. Essayez de cocher moins de symptômes.' });
    } else {
      setDiagnosisResult({ type: 'diagnoses', list: scored });
    }
  }

  const symptomsByCategory = useMemo(() => {
    const g = {};
    SYMPTOMS.forEach(s => {
      if (!g[s.cat]) g[s.cat] = [];
      g[s.cat].push(s);
    });
    return g;
  }, []);

  return (
    <>
      <nav className="dash-nav">
        <div className="container dash-nav-inner">
          <div className="dash-brand">Mon Herbier</div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span className="user-chip">{userEmail}</span>
            <button className="btn sm" onClick={handleLogout}>Déconnexion</button>
          </div>
        </div>
      </nav>

      <div className="container" style={{ padding: '1.5rem 1.25rem 4rem' }}>
        <div className="tabs">
          {[
            { k: 'catalog', label: 'Plantes' },
            { k: 'add', label: 'Ajouter' },
            { k: 'diag', label: 'Diagnostic' },
            { k: 'lib', label: 'Bibliothèque' },
            { k: 'cal', label: 'Calendrier' },
          ].map(t => (
            <button
              key={t.k}
              className={`tab ${tab === t.k ? 'on' : ''}`}
              onClick={() => { setTab(t.k); setMessage(null); }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {message && <div className={`alert ${message.type}`}>{message.text}</div>}

        {/* CATALOGUE */}
        {tab === 'catalog' && (
          <div className="section">
            {plants.length > 0 && (
              <div className="stats-row">
                <Stat label="Total" value={stats.total} />
                <Stat label="Fruitiers" value={stats.fruitier} />
                <Stat label="Intérieur" value={stats.interieur} />
                <Stat label="Aromatiques" value={stats.aromatique} />
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input className="input" placeholder="Rechercher (nom, latin, emplacement)..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: '1 1 220px' }} />
              <select className="select" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 'auto' }}>
                <option value="">Tous types</option>
                {['Intérieur', 'Extérieur', 'Fruitier', 'Aromatique', 'Potager', 'Succulente', 'Fleur'].map(t => <option key={t}>{t}</option>)}
              </select>
              <select className="select" value={filterLocation} onChange={e => setFilterLocation(e.target.value)} style={{ width: 'auto' }} disabled={availableLocations.length === 0}>
                <option value="">Tous emplacements</option>
                {availableLocations.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select className="select" value={sortMode} onChange={e => setSortMode(e.target.value)} style={{ width: 'auto' }}>
                <option value="recent">Plus récentes</option>
                <option value="old">Plus anciennes</option>
                <option value="az">A → Z</option>
                <option value="za">Z → A</option>
              </select>
              {(search || filterType || filterLocation || sortMode !== 'recent') && (
                <button
                  className="btn sm"
                  onClick={() => { setSearch(''); setFilterType(''); setFilterLocation(''); setSortMode('recent'); }}
                  title="Réinitialiser les filtres"
                >Réinitialiser</button>
              )}
              <span style={{ color: 'var(--ink-mute)', fontSize: '0.85rem', marginLeft: 'auto' }}>{filteredPlants.length} / {plants.length}</span>
            </div>

            {plants.length === 0 ? (
              <div className="empty">
                <h3>Pas encore de plante</h3>
                <p>Ajoutez votre première plante pour commencer votre herbier.</p>
                <button className="btn accent" onClick={() => setTab('add')}>Ajouter une plante</button>
              </div>
            ) : filteredPlants.length === 0 ? (
              <div className="empty"><h3>Aucun résultat</h3><p>Essayez une autre recherche.</p></div>
            ) : (
              <div className="plant-grid">
                {filteredPlants.map(p => (
                  <PlantCard key={p.id} plant={p} onClick={() => setDetailPlant(p)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* AJOUTER */}
        {tab === 'add' && (
          <PlantForm
            key={editingPlant?.id || (editingPlant ? 'prefill' : 'new')}
            plant={editingPlant}
            supabase={supabase}
            onSave={async (data) => {
              const ok = await savePlant(data);
              if (ok) {
                setEditingPlant(null);
                setTab('catalog');
              }
            }}
            onDelete={editingPlant && editingPlant.id ? () => deletePlant(editingPlant.id) : null}
            onCancel={() => setEditingPlant(null)}
          />
        )}

        {/* DIAGNOSTIC */}
        {tab === 'diag' && (
          <div className="section">
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 400, marginBottom: '0.5rem' }}>Diagnostic par symptômes</h2>
            <p style={{ color: 'var(--ink-mute)', marginBottom: '1.25rem', fontSize: '0.92rem' }}>Cochez les symptômes observés sur votre plante. L'analyseur croise les symptômes avec 25 diagnostics courants pour proposer les causes les plus probables, avec les remèdes naturels associés.</p>

            {Object.entries(symptomsByCategory).map(([cat, syms]) => (
              <div key={cat} className="symptom-group">
                <div className="symptom-group-title">{cat}</div>
                <div className="symptoms-grid">
                  {syms.map(s => (
                    <label key={s.id} className={`symptom-check ${selectedSymptoms.has(s.id) ? 'on' : ''}`}>
                      <input type="checkbox" checked={selectedSymptoms.has(s.id)} onChange={() => toggleSymptom(s.id)} />
                      <span>{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn accent" onClick={runDiagnosis}>Diagnostiquer</button>
              {selectedSymptoms.size > 0 && (
                <button className="btn" onClick={() => { setSelectedSymptoms(new Set()); setDiagnosisResult(null); }}>Réinitialiser</button>
              )}
            </div>

            {diagnosisResult && (
              <div style={{ marginTop: '1.25rem' }}>
                {diagnosisResult.type === 'warn' && <div className="alert warn">{diagnosisResult.text}</div>}
                {diagnosisResult.type === 'diagnoses' && diagnosisResult.list.map((d, i) => (
                  <div key={d.name} className="diag-card">
                    <div className="diag-name">{d.name}{i === 0 ? ' — hypothèse principale' : ''}</div>
                    <div className="diag-conf">Confiance : {d.score > 0.7 ? 'élevée' : d.score > 0.4 ? 'moyenne' : 'faible'} · {d.matched} symptôme{d.matched > 1 ? 's' : ''} concordant{d.matched > 1 ? 's' : ''}</div>
                    <div className="diag-cause">{d.cause}</div>
                    <div className="diag-remedies">
                      <div className="diag-remedies-title">Remèdes naturels</div>
                      <ul>{d.remedies.map((r, j) => <li key={j}>{r}</li>)}</ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BIBLIOTHÈQUE */}
        {tab === 'lib' && (
          <div className="section">
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 400, marginBottom: '0.5rem' }}>Bibliothèque ({PLANT_LIBRARY.length + customLibrary.length} espèces)</h2>
            <p style={{ color: 'var(--ink-mute)', marginBottom: '1rem', fontSize: '0.92rem' }}>Fiches détaillées avec plantation, entretien, multiplication et problèmes fréquents. Vos fiches perso sont modifiables.</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input className="input" placeholder="Rechercher (nom, latin, type)..." value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} style={{ flex: '1 1 220px' }} />
              <select className="select" value={libFilterType} onChange={e => setLibFilterType(e.target.value)} style={{ width: 'auto' }}>
                <option value="">Tous types</option>
                {libraryTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className="select" value={libFilterSource} onChange={e => setLibFilterSource(e.target.value)} style={{ width: 'auto' }}>
                <option value="all">Toutes sources</option>
                <option value="custom">Mes fiches</option>
                <option value="builtin">Par défaut</option>
              </select>
              {(librarySearch || libFilterType || libFilterSource !== 'all') && (
                <button
                  className="btn sm"
                  onClick={() => { setLibrarySearch(''); setLibFilterType(''); setLibFilterSource('all'); }}
                >Réinitialiser</button>
              )}
              <span style={{ color: 'var(--ink-mute)', fontSize: '0.85rem', marginLeft: 'auto' }}>{filteredLibrary.length} fiches</span>
              <button className="btn accent" onClick={() => setEditingLibrary({ id: null })}>+ Ajouter à la bibliothèque</button>
            </div>
            {filteredLibrary.length === 0 ? (
              <div className="empty"><h3>Aucune fiche</h3><p>Aucune fiche ne correspond à ces filtres.</p></div>
            ) : (
            <div className="plant-grid">
              {filteredLibrary.map((p, i) => (
                <div key={p._source === 'custom' ? `c-${p.id}` : `b-${i}`} className="plant-card" onClick={() => setDetailLib(p)}>
                  <div className="card-img">{p.photo ? <img src={p.photo} alt={p.name} /> : LEAF_SVG}</div>
                  <div className="card-body">
                    <div className="card-name">{p.name}</div>
                    <div className="card-latin">{p.latin || '\u00A0'}</div>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {p.type && <span className="card-tag">{p.type}</span>}
                      {p._source === 'custom' && <span className="card-tag" style={{ background: 'var(--accent-soft, #dcebd1)', color: 'var(--accent-dark, #2d5016)' }}>Ma fiche</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        )}

        {/* CALENDRIER */}
        {tab === 'cal' && (
          <div className="section">
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 400, marginBottom: '1rem' }}>Calendrier du jardinier</h2>
            <div className="alert success" style={{ marginBottom: '1.25rem' }}>
              Saison actuelle : <strong>{currentSeason.name}</strong> · {MONTHS[new Date().getMonth()]}
            </div>

            {/* VUE D'ENSEMBLE : aujourd'hui / semaine / mois / liste de courses */}
            {plants.length > 0 && (
              <CalendarOverview plants={plants} seasonId={currentSeason.id} />
            )}

            {/* CALENDRIER DETAILLE PAR PLANTE - tuiles avec photo + slider jour/sem/mois */}
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 400, marginBottom: '0.75rem', marginTop: '2rem' }}>Rappels par plante</h3>
            {plants.length === 0 ? (
              <div className="empty" style={{ marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--ink-mute)' }}>Ajoutez des plantes à votre herbier pour voir le calendrier détaillé.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {plants.map(p => (
                  <PlantTaskTile key={p.id} plant={p} seasonId={currentSeason.id} onPlantClick={() => setDetailPlant(p)} />
                ))}
              </div>
            )}

            {/* VUE D'ENSEMBLE DES SAISONS */}
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 400, marginBottom: '0.75rem' }}>Vue d'ensemble des saisons</h3>
            <div className="seasons-grid">
              {SEASONS.map(s => (
                <div key={s.id} className={`season-card ${s.id === currentSeason.id ? 'current' : ''}`}>
                  <div className="season-head">
                    <h3>{s.name}</h3>
                    <div className="season-months">{s.months.map(m => MONTHS[m]).join(' · ')}</div>
                  </div>
                  <div className="season-body">
                    <ul>{s.tasks.map((t, i) => <li key={i}>{t}</li>)}</ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {detailPlant && (
        <PlantDetailModal
          plant={detailPlant}
          onClose={() => setDetailPlant(null)}
          onEdit={() => { setEditingPlant(detailPlant); setDetailPlant(null); setTab('add'); }}
          onDelete={() => deletePlant(detailPlant.id)}
          onExportToLib={() => exportPlantToLib(detailPlant)}
        />
      )}

      {detailLib && (
        <LibraryDetailModal
          plant={detailLib}
          onClose={() => setDetailLib(null)}
          onExportToPlants={() => exportLibToPlants(detailLib)}
          onEdit={() => editLibraryEntry(detailLib)}
          onDelete={detailLib._source === 'custom' ? () => deleteLibraryPlant(detailLib.id) : null}
        />
      )}

      {editingLibrary !== null && (
        <LibraryForm
          key={editingLibrary?.id || 'newlib'}
          entry={editingLibrary}
          supabase={supabase}
          onSave={async (data) => {
            const ok = await saveLibraryPlant(data);
            if (ok) setEditingLibrary(null);
          }}
          onDelete={editingLibrary && editingLibrary.id ? () => deleteLibraryPlant(editingLibrary.id) : null}
          onCancel={() => setEditingLibrary(null)}
        />
      )}
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

// Emoji selon le nom ou le type de la plante (cherche d'abord par nom)
function plantEmoji(plant) {
  const name = (plant?.name || '').toLowerCase();
  const lat = (plant?.latin || '').toLowerCase();
  const both = name + ' ' + lat;
  if (/monstera|philodendron|pothos/.test(both)) return '🪴';
  if (/orchid/.test(both)) return '🪻';
  if (/sansevier|aloe|cactus|cact|crass|echeveria|haworthia|succulente/.test(both)) return '🌵';
  if (/tomate|tomat/.test(both)) return '🍅';
  if (/fraise|fraisier|fragaria/.test(both)) return '🍓';
  if (/framboise|framboisier|rubus/.test(both)) return '🫐';
  if (/citron|orange|calamondin|citrus|kumquat|pamplemousse|mandarin|clementin/.test(both)) return '🍊';
  if (/pomme|malus/.test(both)) return '🍎';
  if (/figue|figuier|ficus carica/.test(both)) return '🫒';
  if (/raisin|vigne|vitis/.test(both)) return '🍇';
  if (/peche|pecher|prunus persica/.test(both)) return '🍑';
  if (/cerise|cerisier|prunus avium/.test(both)) return '🍒';
  if (/poire|poirier/.test(both)) return '🍐';
  if (/banan|musa/.test(both)) return '🍌';
  if (/avocat|persea/.test(both)) return '🥑';
  if (/courgette|cucurbita|courge|potiron|citrouille/.test(both)) return '🥒';
  if (/carotte|carrot|daucus/.test(both)) return '🥕';
  if (/salade|lactuca|laitue/.test(both)) return '🥬';
  if (/radis|raphanus/.test(both)) return '🌶';
  if (/poivron|piment|capsicum/.test(both)) return '🌶';
  if (/oignon|allium cepa|ail|poireau|allium/.test(both)) return '🧅';
  if (/basilic|basil|ocimum/.test(both)) return '🌿';
  if (/menthe|mentha/.test(both)) return '🌿';
  if (/persil|petroselinum/.test(both)) return '🌿';
  if (/ciboulette|schoenoprasum/.test(both)) return '🌿';
  if (/thym|thymus/.test(both)) return '🌿';
  if (/romarin|rosmarinus|salvia rosmarinus/.test(both)) return '🌿';
  if (/lavande|lavandula/.test(both)) return '💜';
  if (/sauge|salvia/.test(both)) return '🌿';
  if (/origan|origanum/.test(both)) return '🌿';
  if (/rose|rosier/.test(both)) return '🌹';
  if (/tulipe|tulipa/.test(both)) return '🌷';
  if (/marguerite|tournesol|helianthus/.test(both)) return '🌻';
  if (/hibiscus|fleur d''hibiscus/.test(both)) return '🌺';
  if (/pivoine|paeonia|hortensia|hydrangea|geranium|pelargonium/.test(both)) return '🌸';
  // Fallbacks par type
  switch (plant?.type) {
    case 'Intérieur': return '🪴';
    case 'Fruitier': return '🍎';
    case 'Aromatique': return '🌿';
    case 'Potager': return '🥬';
    case 'Succulente': return '🌵';
    case 'Fleur': return '🌸';
    case 'Extérieur': return '🌳';
    default: return '🌱';
  }
}

// Vue d'ensemble du jardinier : aujourd'hui / semaine / mois / liste de courses
// Agrege les taches recurrentes de toutes les plantes + propose des achats par saison + types
function CalendarOverview({ plants, seasonId: defaultSeasonId }) {
  const [seasonId, setSeasonId] = useState(defaultSeasonId);
  const [filterPlantId, setFilterPlantId] = useState('');
  // Filtrage par plante choisie
  const filteredPlants = useMemo(
    () => filterPlantId ? plants.filter(p => p.id === filterPlantId) : plants,
    [plants, filterPlantId]
  );
  const overview = useMemo(() => {
    const today = new Date();
    const todayDow = today.getDay();
    const dayOfWeek = (todayDow + 6) % 7;
    const allTasks = { daily: [], weekly: [], monthly: [], season: [] };

    for (const p of filteredPlants) {
      const r = getRecurringTasksForPlant(p, seasonId);
      r.daily.forEach(t => allTasks.daily.push({ ...t, plant: p }));
      r.weekly.forEach(t => allTasks.weekly.push({ ...t, plant: p }));
      r.monthly.forEach(t => allTasks.monthly.push({ ...t, plant: p }));
      const seasonal = getTasksForPlant(p, seasonId);
      seasonal.forEach(t => allTasks.season.push({ label: t, priority: 'normal', plant: p }));
    }

    const weeklyForToday = allTasks.weekly.filter((_, i) => i % 7 === dayOfWeek);

    return {
      today: { daily: allTasks.daily, weeklySuggested: weeklyForToday },
      week: allTasks.weekly,
      month: allTasks.monthly,
      season: allTasks.season,
    };
  }, [filteredPlants, seasonId]);

  const shoppingList = useMemo(() => getShoppingList(filteredPlants, seasonId), [filteredPlants, seasonId]);
  const [activeTab, setActiveTab] = useState('today');

  const TABS = [
    { key: 'today', label: 'Aujourd\'hui', icon: '☀', count: overview.today.daily.length + overview.today.weeklySuggested.length },
    { key: 'week', label: 'Cette semaine', icon: '◷', count: overview.week.length },
    { key: 'month', label: 'Ce mois', icon: '⌐', count: overview.month.length },
    { key: 'season', label: 'Cette saison', icon: '✿', count: overview.season.length },
    { key: 'shop', label: 'À acheter', icon: '⛁', count: shoppingList.length },
  ];

  return (
    <div className="season-card" style={{ marginBottom: '1.5rem', padding: '0' }}>
      <div style={{ padding: '1rem 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 400, margin: 0, marginRight: 'auto' }}>
          🪴 Vue d'ensemble du jardinier
        </h3>
        <select
          className="select"
          value={filterPlantId}
          onChange={e => setFilterPlantId(e.target.value)}
          style={{ width: 'auto', minHeight: 36, fontSize: '0.85rem' }}
        >
          <option value="">Toutes les plantes ({plants.length})</option>
          {plants.map(p => (
            <option key={p.id} value={p.id}>{plantEmoji(p)} {p.name}</option>
          ))}
        </select>
        <select
          className="select"
          value={seasonId}
          onChange={e => setSeasonId(e.target.value)}
          style={{ width: 'auto', minHeight: 36, fontSize: '0.85rem' }}
          title="Changer la saison consultée"
        >
          {SEASONS.map(s => (
            <option key={s.id} value={s.id}>
              {s.id === defaultSeasonId ? '⊙ ' : ''}{s.name}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', gap: '4px', padding: '0.75rem 1.25rem 0', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '0.5rem 0.85rem',
              border: 'none',
              borderBottom: activeTab === t.key ? '2px solid var(--accent-deep, #2d7a3e)' : '2px solid transparent',
              background: 'transparent',
              fontWeight: activeTab === t.key ? 600 : 400,
              color: activeTab === t.key ? 'var(--accent-deep, #2d7a3e)' : 'var(--ink-mute)',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '-1px',
            }}
          >
            <span style={{ marginRight: '0.35rem' }}>{t.icon}</span>
            {t.label}
            {t.count > 0 && (
              <span style={{
                marginLeft: '0.4rem',
                background: activeTab === t.key ? 'var(--accent-soft, #d8ecd6)' : 'var(--bg-subtle)',
                color: activeTab === t.key ? 'var(--accent-deep, #2d7a3e)' : 'var(--ink-mute)',
                padding: '1px 7px',
                borderRadius: '10px',
                fontSize: '0.72rem',
                fontWeight: 600,
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>
      <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
        {activeTab === 'today' && (
          <OverviewTaskList
            sections={[
              { label: 'À faire chaque jour', tasks: overview.today.daily, color: '#c9302c' },
              { label: 'Suggestion du jour', tasks: overview.today.weeklySuggested, color: '#2b6f9c' },
            ].filter(s => s.tasks.length > 0)}
            emptyText="Rien d'urgent aujourd'hui."
          />
        )}
        {activeTab === 'week' && (
          <OverviewTaskList sections={[{ label: 'Tâches hebdomadaires', tasks: overview.week, color: '#2b6f9c' }]} emptyText="Pas de tâche hebdomadaire pour cette saison." />
        )}
        {activeTab === 'month' && (
          <OverviewTaskList sections={[{ label: 'Tâches mensuelles', tasks: overview.month, color: '#8a5b00' }]} emptyText="Pas de tâche mensuelle pour cette saison." />
        )}
        {activeTab === 'season' && (
          <OverviewTaskList sections={[{ label: 'Grandes tâches de la saison', tasks: overview.season, color: '#3a7a3a' }]} emptyText="Pas de tâche saisonnière pour ces plantes." />
        )}
        {activeTab === 'shop' && (
          <ShoppingListView items={shoppingList} />
        )}
      </div>
    </div>
  );
}

function OverviewTaskList({ sections, emptyText }) {
  if (sections.length === 0) {
    return <p style={{ color: 'var(--ink-mute)', fontSize: '0.9rem', fontStyle: 'italic' }}>{emptyText}</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {sections.map((section, si) => (
        <div key={si}>
          <h4 style={{ fontSize: '0.85rem', color: section.color, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            {section.label}
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {section.tasks.map((t, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem', padding: '0.5rem 0.75rem', background: 'var(--bg-subtle, #f4f4f0)', borderRadius: '8px', borderLeft: `3px solid ${section.color}` }}>
                {t.plant && (
                  <span
                    title={t.plant.name}
                    style={{ fontSize: '1.1rem', flexShrink: 0, lineHeight: 1.2 }}
                  >
                    {plantEmoji(t.plant)}
                  </span>
                )}
                <span style={{ flex: 1 }}>
                  {t.priority === 'high' && <span style={{ color: '#c9302c', marginRight: '0.3rem', fontWeight: 700 }}>!</span>}
                  <span style={{ color: 'var(--ink)' }}>{t.label}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ShoppingListView({ items }) {
  const [bought, setBought] = useState({});
  useEffect(() => {
    try { const raw = localStorage.getItem('mh-shopping'); if (raw) setBought(JSON.parse(raw)); } catch (e) {}
  }, []);
  function toggle(item) {
    const next = { ...bought, [item]: !bought[item] };
    setBought(next);
    try { localStorage.setItem('mh-shopping', JSON.stringify(next)); } catch (e) {}
  }
  if (items.length === 0) {
    return <p style={{ color: 'var(--ink-mute)', fontSize: '0.9rem', fontStyle: 'italic' }}>Rien à acheter pour cette saison selon ton herbier.</p>;
  }
  const remaining = items.filter(i => !bought[i.item]).length;
  return (
    <div>
      <p style={{ color: 'var(--ink-mute)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
        Suggestions d'achats pour t'occuper de tes plantes cette saison · <strong>{remaining}/{items.length}</strong> à prévoir
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.5rem' }}>
        {items.map((it, i) => {
          const done = !!bought[it.item];
          return (
            <li key={i}
              onClick={() => toggle(it.item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 0.75rem',
                background: done ? 'var(--accent-soft, #d8ecd6)' : 'white',
                border: `1px solid ${done ? 'var(--accent, #2d7a3e)' : 'var(--border)'}`,
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <input type="checkbox" checked={done} readOnly style={{ accentColor: 'var(--accent, #2d7a3e)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: done ? 'var(--ink-mute)' : 'var(--ink)', textDecoration: done ? 'line-through' : 'none', fontWeight: 500, fontSize: '0.92rem' }}>
                  {it.item}
                </div>
                <div style={{ color: 'var(--ink-mute)', fontSize: '0.72rem', marginTop: '0.1rem' }}>
                  pour {it.forTypes.join(', ').toLowerCase()}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Carte calendrier d'une plante : tâches jour / semaine / mois / saison
// Les cases cochées sont sauvegardees dans localStorage par plante + tache + periode (jour ISO / semaine ISO / mois)
function PlantScheduleCard({ plant, seasonId, onPlantClick }) {
  const recurring = useMemo(() => getRecurringTasksForPlant(plant, seasonId), [plant, seasonId]);
  const seasonalTasks = useMemo(() => getTasksForPlant(plant, seasonId), [plant, seasonId]);

  const today = new Date();
  const dayKey = today.toISOString().slice(0, 10);
  // Numéro semaine ISO simplifié
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekKey = weekStart.toISOString().slice(0, 10);
  const monthKey = today.toISOString().slice(0, 7);

  const [doneTasks, setDoneTasks] = useState({});
  const [collapsed, setCollapsed] = useState(false);
  const storageKey = `mh-schedule-${plant.id}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setDoneTasks(JSON.parse(raw));
    } catch (e) { /* ignore */ }
  }, [storageKey]);

  function toggle(period, label) {
    const key = period === 'daily' ? `d:${dayKey}:${label}` : period === 'weekly' ? `w:${weekKey}:${label}` : period === 'monthly' ? `m:${monthKey}:${label}` : `s:${seasonId}:${label}`;
    const next = { ...doneTasks, [key]: !doneTasks[key] };
    setDoneTasks(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch (e) { /* ignore */ }
  }
  function isDone(period, label) {
    const key = period === 'daily' ? `d:${dayKey}:${label}` : period === 'weekly' ? `w:${weekKey}:${label}` : period === 'monthly' ? `m:${monthKey}:${label}` : `s:${seasonId}:${label}`;
    return !!doneTasks[key];
  }

  const totalTasks = recurring.daily.length + recurring.weekly.length + recurring.monthly.length + seasonalTasks.length;
  const doneCount =
    recurring.daily.filter(t => isDone('daily', t.label)).length +
    recurring.weekly.filter(t => isDone('weekly', t.label)).length +
    recurring.monthly.filter(t => isDone('monthly', t.label)).length +
    seasonalTasks.filter(t => isDone('season', t)).length;

  // Fusion : la rubrique "Cette semaine" regroupe semaine + mois + saison.
  // Chaque tâche garde un badge de fréquence pour rester lisible.
  const weeklyMerged = [
    ...recurring.weekly.map(t => ({ ...t, freq: 'sem', period: 'weekly' })),
    ...recurring.monthly.map(t => ({ ...t, freq: 'mois', period: 'monthly' })),
    ...seasonalTasks.map(t => ({ label: t, priority: 'normal', freq: 'saison', period: 'season' })),
  ];
  const PERIODS = [
    { key: 'daily', label: 'Aujourd\'hui', color: '#c9302c', tasks: recurring.daily.map(t => ({ ...t, period: 'daily' })), periodLabel: dayKey },
    { key: 'weekly', label: 'Cette semaine et ce mois', color: '#2b6f9c', tasks: weeklyMerged, periodLabel: `Sem du ${weekKey.slice(8)}/${weekKey.slice(5,7)} · ${MONTHS[today.getMonth()]}` },
  ];

  return (
    <div className="season-card" style={{ overflow: 'hidden' }}>
      <div className="season-head" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setCollapsed(c => !c)}>
        <div onClick={(e) => { e.stopPropagation(); onPlantClick(); }} style={{ width: 56, height: 56, borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0, background: 'var(--card-bg, #f4f6f2)', cursor: 'pointer' }}>
          {plant.photo ? <img src={plant.photo} alt={plant.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : LEAF_SVG}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: '1.05rem', margin: 0 }}>{plant.name}</h3>
          <div className="season-months" style={{ fontSize: '0.8rem' }}>
            {plant.type}{plant.location ? ` · ${plant.location}` : ''} · {doneCount}/{totalTasks} tâches faites
          </div>
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--ink-mute)' }}>{collapsed ? '▸ déplier' : '▾ replier'}</span>
      </div>
      {!collapsed && (
        <div className="season-body">
          {totalTasks === 0 ? (
            <p style={{ color: 'var(--ink-mute)', fontSize: '0.85rem', fontStyle: 'italic' }}>Pas de tâche spécifique. Renseignez le type de la plante pour obtenir des rappels.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: recurring.daily.length > 0 ? '220px 1fr' : '1fr', gap: '1.25rem' }}>
              {PERIODS.map(p => p.tasks.length > 0 && (
                <div key={p.key}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem', borderBottom: `2px solid ${p.color}`, paddingBottom: '0.2rem' }}>
                    <strong style={{ color: p.color, fontSize: '0.92rem' }}>{p.label}</strong>
                    {p.periodLabel && <span style={{ fontSize: '0.72rem', color: 'var(--ink-mute)' }}>· {p.periodLabel}</span>}
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {p.tasks.map((t, i) => {
                      const taskPeriod = t.period || p.key;
                      const done = isDone(taskPeriod, t.label);
                      const freqColors = { sem: '#dbeafe', mois: '#fdf3d8', saison: '#dcebd1' };
                      const freqTextColors = { sem: '#1e4f7a', mois: '#8a5b00', saison: '#2d5016' };
                      return (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.88rem', cursor: 'pointer' }}
                            onClick={() => toggle(taskPeriod, t.label)}>
                          <input type="checkbox" checked={done} readOnly style={{ marginTop: '0.25rem', flexShrink: 0, accentColor: p.color, transform: 'scale(1.1)' }} />
                          <span style={{ flex: 1 }}>
                            {t.freq && (
                              <span style={{ background: freqColors[t.freq] || '#eee', color: freqTextColors[t.freq] || '#333', fontSize: '0.66rem', padding: '1px 6px', borderRadius: '8px', marginRight: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                {t.freq}
                              </span>
                            )}
                            <span style={{
                              color: done ? 'var(--ink-mute)' : 'var(--ink-soft)',
                              textDecoration: done ? 'line-through' : 'none',
                              fontWeight: t.priority === 'high' && !done ? 600 : 400
                            }}>
                              {t.priority === 'high' && !done && <span style={{ color: '#c9302c', marginRight: '0.25rem' }}>!</span>}
                              {t.label}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Tuile compacte par plante : photo carrée + slider jour/sem/mois + cases à cocher localStorage
function PlantTaskTile({ plant, seasonId, onPlantClick }) {
  const recurring = useMemo(() => getRecurringTasksForPlant(plant, seasonId), [plant, seasonId]);
  const seasonalTasks = useMemo(() => getTasksForPlant(plant, seasonId), [plant, seasonId]);
  const [period, setPeriod] = useState('day');
  const [doneTasks, setDoneTasks] = useState({});
  const storageKey = `mh-schedule-${plant.id}`;

  const today = new Date();
  const dayKey = today.toISOString().slice(0, 10);
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekKey = weekStart.toISOString().slice(0, 10);
  const monthKey = today.toISOString().slice(0, 7);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setDoneTasks(JSON.parse(raw));
    } catch (e) {}
  }, [storageKey]);

  function makeKey(p, label) {
    if (p === 'day') return `d:${dayKey}:${label}`;
    if (p === 'week') return `w:${weekKey}:${label}`;
    if (p === 'month') return `m:${monthKey}:${label}`;
    return `s:${seasonId}:${label}`;
  }
  function isDone(p, label) { return !!doneTasks[makeKey(p, label)]; }
  function toggle(p, label) {
    const k = makeKey(p, label);
    const next = { ...doneTasks, [k]: !doneTasks[k] };
    setDoneTasks(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch (e) {}
  }

  // Pour la vue jour : on combine daily + une rotation des weekly suggérée pour aujourd'hui
  const todayDow = (today.getDay() + 6) % 7;
  const weeklySuggested = recurring.weekly.filter((_, i) => i % 7 === todayDow);
  const tasksByPeriod = {
    day: { tasks: [...recurring.daily, ...weeklySuggested.map(t => ({ ...t, _source: 'sem' }))], color: '#c9302c', label: "Aujourd'hui", icon: '☀' },
    week: { tasks: recurring.weekly, color: '#2b6f9c', label: 'Cette semaine', icon: '◷' },
    month: { tasks: recurring.monthly, color: '#8a5b00', label: 'Ce mois', icon: '⌐' },
    season: { tasks: seasonalTasks.map(t => ({ label: t, priority: 'normal' })), color: '#3a7a3a', label: 'Saison', icon: '✿' },
  };
  const current = tasksByPeriod[period];
  const totalAll = Object.values(tasksByPeriod).reduce((sum, p) => sum + p.tasks.length, 0);
  const doneAll = Object.entries(tasksByPeriod).reduce((sum, [k, p]) =>
    sum + p.tasks.filter(t => isDone(k === 'season' ? 'season' : k, t.label)).length, 0);

  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.2s',
    }}>
      {/* En-tête : photo carrée + nom + emoji */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
        <div
          onClick={onPlantClick}
          style={{
            width: 56,
            height: 56,
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            flexShrink: 0,
            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            cursor: 'pointer',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
          }}
        >
          {plant.photo ? <img src={plant.photo} alt={plant.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : plantEmoji(plant)}
        </div>
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onPlantClick}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {plantEmoji(plant)} {plant.name}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-mute)' }}>
            {plant.type}{plant.location ? ` · ${plant.location}` : ''}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--ink-mute)', marginTop: '0.15rem' }}>
            {doneAll}/{totalAll} faites
          </div>
        </div>
      </div>

      {/* Slider jour / sem / mois / saison */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {['day', 'week', 'month', 'season'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              flex: 1,
              padding: '0.5rem 0.25rem',
              border: 'none',
              borderBottom: period === p ? `2px solid ${tasksByPeriod[p].color}` : '2px solid transparent',
              background: period === p ? 'var(--bg-subtle, #f4f4f0)' : 'white',
              color: period === p ? tasksByPeriod[p].color : 'var(--ink-mute)',
              fontSize: '0.72rem',
              fontWeight: period === p ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            <span style={{ fontSize: '0.95rem' }}>{tasksByPeriod[p].icon}</span>
            <span>{p === 'day' ? 'Jour' : p === 'week' ? 'Sem' : p === 'month' ? 'Mois' : 'Saison'}</span>
            <span style={{ background: period === p ? tasksByPeriod[p].color : 'var(--bg-subtle)', color: period === p ? 'white' : 'var(--ink-mute)', borderRadius: '8px', padding: '0 5px', fontSize: '0.62rem', minWidth: '14px', display: 'inline-block' }}>
              {tasksByPeriod[p].tasks.length}
            </span>
          </button>
        ))}
      </div>

      {/* Liste de tâches selon période */}
      <div style={{ padding: '0.75rem', flex: 1, minHeight: '160px' }}>
        {current.tasks.length === 0 ? (
          <p style={{ color: 'var(--ink-mute)', fontSize: '0.82rem', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>
            Rien à faire pour cette période.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {current.tasks.map((t, i) => {
              const periodKey = period === 'season' ? 'season' : period;
              const done = isDone(periodKey, t.label);
              return (
                <li
                  key={i}
                  onClick={() => toggle(periodKey, t.label)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', padding: '0.3rem 0.4rem', borderRadius: '6px', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle, #f4f4f0)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <input type="checkbox" checked={done} readOnly style={{ marginTop: '0.2rem', flexShrink: 0, accentColor: current.color }} />
                  <span style={{
                    color: done ? 'var(--ink-mute)' : 'var(--ink-soft)',
                    textDecoration: done ? 'line-through' : 'none',
                    fontWeight: t.priority === 'high' && !done ? 600 : 400,
                  }}>
                    {t._source === 'sem' && <span style={{ background: '#dbeafe', color: '#1e4f7a', fontSize: '0.6rem', padding: '1px 5px', borderRadius: '6px', marginRight: '0.3rem', fontWeight: 600 }}>SEM</span>}
                    {t.priority === 'high' && !done && <span style={{ color: '#c9302c', marginRight: '0.2rem' }}>!</span>}
                    {t.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// Icones de soin selon le type (auto, fallback)
const TYPE_CARE_ICONS = {
  'Intérieur':  { sun: '☼', sunLabel: 'Lumière vive indirecte', drop: '💧',   dropLabel: 'Modéré (1×/sem)' },
  'Fruitier':   { sun: '☀', sunLabel: 'Plein soleil',           drop: '💧💧', dropLabel: 'Régulier' },
  'Aromatique': { sun: '◑', sunLabel: 'Soleil à mi-ombre',      drop: '💧',   dropLabel: 'Sol toujours frais' },
  'Potager':    { sun: '☀', sunLabel: 'Plein soleil',           drop: '💧💧', dropLabel: 'Régulier au pied' },
  'Succulente': { sun: '☀', sunLabel: 'Plein soleil',           drop: '·',    dropLabel: 'Rare (2-3 sem)' },
  'Fleur':      { sun: '◑', sunLabel: 'Soleil à mi-ombre',      drop: '💧',   dropLabel: 'Modéré régulier' },
  'Extérieur':  { sun: '◐', sunLabel: 'Selon exposition',       drop: '💧',   dropLabel: 'Selon saison' },
};

function PlantCard({ plant, onClick }) {
  const care = TYPE_CARE_ICONS[plant.type];
  return (
    <div className="plant-card" onClick={onClick}>
      <div className="card-img">
        {plant.photo ? <img src={plant.photo} alt={plant.name} /> : LEAF_SVG}
      </div>
      <div className="card-body">
        <div className="card-name">{plant.name}</div>
        <div className="card-latin">{plant.latin || '\u00A0'}</div>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {plant.type && <span className="card-tag">{plant.type}</span>}
          {care && (
            <>
              <span
                title={`Lumière conseillée (${plant.type}) : ${care.sunLabel}`}
                style={{ fontSize: '0.78rem', color: '#8a5b00', background: '#fdf3d8', borderRadius: '4px', padding: '2px 6px', lineHeight: 1.3, whiteSpace: 'nowrap' }}
              >
                {care.sun} {care.sunLabel}
              </span>
              <span
                title={`Arrosage conseillé (${plant.type}) : ${care.dropLabel}`}
                style={{ fontSize: '0.78rem', color: '#1e4f7a', background: '#dbeafe', borderRadius: '4px', padding: '2px 6px', lineHeight: 1.3, whiteSpace: 'nowrap' }}
              >
                {care.drop} {care.dropLabel}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PlantForm({ plant, supabase, onSave, onDelete, onCancel }) {
  const [name, setName] = useState(plant?.name || '');
  const [latin, setLatin] = useState(plant?.latin || '');
  const [type, setType] = useState(plant?.type || '');
  const [location, setLocation] = useState(plant?.location || '');
  const [light, setLight] = useState(plant?.light || '');
  const [water, setWater] = useState(plant?.water || '');
  const [notes, setNotes] = useState(plant?.notes || '');
  const [acquired, setAcquired] = useState(plant?.acquired || new Date().toISOString().split('T')[0]);
  const [photo, setPhoto] = useState(plant?.photo || null);
  // Champs détaillés (comme dans la bibliothèque)
  const [description, setDescription] = useState(plant?.description || '');
  const [plantation, setPlantation] = useState(plant?.plantation || '');
  const [propagation, setPropagation] = useState(plant?.propagation || '');
  const [harvest, setHarvest] = useState(plant?.harvest || '');
  const [companions, setCompanions] = useState(plant?.companions || '');
  const [tips, setTips] = useState(plant?.tips || '');
  const [problems, setProblems] = useState(plant?.problems || '');
  const [showDetails, setShowDetails] = useState(!!(plant?.description || plant?.plantation || plant?.propagation || plant?.harvest || plant?.companions || plant?.tips || plant?.problems));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const blob = await resizeImage(file, 1200, 0.82);
      if (!supabase) {
        // fallback base64 si pas de client supabase (ne devrait pas arriver)
        const reader = new FileReader();
        reader.onload = () => setPhoto(reader.result);
        reader.readAsDataURL(blob);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');
      const filename = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('plant-photos')
        .upload(filename, blob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('plant-photos').getPublicUrl(filename);
      setPhoto(publicUrl);
    } catch (err) {
      alert("Impossible d'uploader la photo : " + (err.message || err));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      id: plant?.id,
      name, latin, type, location, light, water, notes, acquired: acquired || null, photo,
      description, plantation, propagation, harvest, companions, tips, problems,
    });
    setSaving(false);
  }

  return (
    <div className="section">
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 400, marginBottom: '1rem' }}>
        {plant ? 'Modifier la plante' : 'Ajouter une plante'}
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label className="label">Nom usuel *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} required placeholder="Basilic, Pommier..." />
          </div>
          <div className="form-group">
            <label className="label">Nom latin</label>
            <input className="input" value={latin} onChange={e => setLatin(e.target.value)} placeholder="Ocimum basilicum" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label">Catégorie *</label>
            <select className="select" value={type} onChange={e => setType(e.target.value)} required>
              <option value="">—</option>
              {['Intérieur', 'Extérieur', 'Fruitier', 'Aromatique', 'Potager', 'Succulente', 'Fleur'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Emplacement</label>
            <input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="Jardin, Salon, Balcon..." />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label">Lumière</label>
            <select className="select" value={light} onChange={e => setLight(e.target.value)}>
              <option value="">—</option>
              {['Plein soleil', 'Soleil à mi-ombre', 'Mi-ombre', 'Lumière vive indirecte', 'Ombre claire', 'Ombre'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Arrosage</label>
            <select className="select" value={water} onChange={e => setWater(e.target.value)}>
              <option value="">—</option>
              {['Très fréquent (tous les jours)', 'Fréquent (2-3×/semaine)', 'Modéré (1×/semaine)', 'Espacé (tous les 10-15j)', 'Rare (tous les 3 semaines)', 'Très rare (1×/mois)'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="label">Date d'acquisition</label>
          <input className="input" type="date" value={acquired} onChange={e => setAcquired(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="label">Photo</label>
          <input className="input" type="file" accept="image/*" capture="environment" onChange={handlePhoto} disabled={uploading} />
          {uploading && <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--ink-mute)' }}>Envoi de la photo en cours...</div>}
          {photo && !uploading && <img src={photo} style={{ marginTop: '0.5rem', maxHeight: 160, borderRadius: 'var(--radius-sm)' }} alt="" />}
          {photo && !uploading && (
            <button type="button" className="btn sm" style={{ marginTop: '0.5rem' }} onClick={() => setPhoto(null)}>Retirer la photo</button>
          )}
        </div>

        <div className="form-group">
          <label className="label">Notes personnelles</label>
          <textarea className="textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observations, conseils persos..." />
        </div>

        <div style={{ marginTop: '1rem', marginBottom: '0.75rem' }}>
          <button
            type="button"
            className="btn sm"
            onClick={() => setShowDetails(s => !s)}
            style={{ width: '100%' }}
          >
            {showDetails ? '▼ Masquer les détails de culture' : '▶ Ajouter les détails de culture (description, plantation, récolte, conseils...)'}
          </button>
        </div>

        {showDetails && (
          <div style={{ padding: '1rem', background: 'var(--card-bg, #f4f6f2)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="label">Description</label>
              <textarea className="textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Présentation générale de la plante..." />
            </div>
            <div className="form-group">
              <label className="label">Plantation</label>
              <textarea className="textarea" value={plantation} onChange={e => setPlantation(e.target.value)} placeholder="Période, substrat, profondeur..." />
            </div>
            <div className="form-group">
              <label className="label">Multiplication</label>
              <textarea className="textarea" value={propagation} onChange={e => setPropagation(e.target.value)} placeholder="Semis, bouturage, division..." />
            </div>
            <div className="form-group">
              <label className="label">Récolte</label>
              <textarea className="textarea" value={harvest} onChange={e => setHarvest(e.target.value)} placeholder="Quand et comment récolter..." />
            </div>
            <div className="form-group">
              <label className="label">Compagnonnage</label>
              <textarea className="textarea" value={companions} onChange={e => setCompanions(e.target.value)} placeholder="Plantes amies et à éviter..." />
            </div>
            <div className="form-group">
              <label className="label">Conseils (une ligne par conseil)</label>
              <textarea className="textarea" value={tips} onChange={e => setTips(e.target.value)} placeholder="Tailler en mars&#10;Pailler l'été" />
            </div>
            <div className="form-group">
              <label className="label">Problèmes fréquents (une ligne par problème)</label>
              <textarea className="textarea" value={problems} onChange={e => setProblems(e.target.value)} placeholder="Feuilles jaunes : manque d'eau&#10;Taches noires : marsonia" />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button type="submit" className="btn accent" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
          {plant && <button type="button" className="btn" onClick={onCancel}>Annuler</button>}
          {plant && onDelete && <button type="button" className="btn danger" onClick={onDelete}>Supprimer</button>}
        </div>
      </form>
    </div>
  );
}

// Recommandations génériques par type quand aucune fiche bibliothèque n'est trouvée
const TYPE_DEFAULTS = {
  'Intérieur': { light: 'Lumière vive indirecte', water: 'Modéré (1×/semaine)' },
  'Fruitier': { light: 'Plein soleil (5-6h/jour)', water: 'Régulier en période de fructification' },
  'Aromatique': { light: 'Soleil à mi-ombre', water: 'Régulier, sol toujours frais' },
  'Potager': { light: 'Plein soleil', water: 'Régulier au pied' },
  'Succulente': { light: 'Plein soleil', water: 'Rare (2-3 semaines)' },
  'Fleur': { light: 'Soleil à mi-ombre', water: 'Modéré régulier' },
  'Extérieur': { light: 'Selon exposition', water: 'Selon saison' },
};

function findLibMatch(plant) {
  const pname = (plant.name || '').toLowerCase();
  const plat = (plant.latin || '').toLowerCase();
  return PLANT_LIBRARY.find(l => {
    const lname = (l.name || '').toLowerCase();
    const llat = (l.latin || '').toLowerCase();
    if (!lname && !llat) return false;
    if (lname && pname && (lname === pname || pname.includes(lname) || lname.includes(pname.split(' ')[0]))) return true;
    if (llat && plat && (llat === plat || plat.includes(llat.split(' ')[0]) || llat.includes(plat.split(' ')[0]))) return true;
    if (lname && pname && pname.includes(lname.split(' ')[0])) return true;
    return false;
  });
}

// Decoupe intelligente d'un texte long en bullets quand possible
function splitTextToBullets(text) {
  if (!text) return [];
  // Si retours a la ligne explicites : un bullet par ligne
  const lines = text.split(/\n+/).map(s => s.trim()).filter(Boolean);
  if (lines.length > 1) return lines;
  // Sinon : decoupe sur ". " si ca produit plus de 2 morceaux significatifs
  const parts = text.split(/\.\s+(?=[A-ZÉÈÀÂÎÔÛ])/g)
    .map(s => s.trim())
    .filter(s => s.length > 30);
  if (parts.length >= 3) {
    return parts.map(p => p.endsWith('.') ? p : p + '.');
  }
  return [];
}

// Detecte si une ligne est de type "Label : valeur" pour mise en forme speciale
function parseLabelValue(line) {
  const m = line.match(/^([A-ZÉÈÀÂÎÔÛ][^:]{2,40})\s*:\s*(.+)$/);
  if (m) return { label: m[1].trim(), value: m[2].trim() };
  return null;
}

// Affiche une rubrique avec icone, titre colore et texte intelligemment decoupe
function DetailRubric({ icon, title, color, text, forceParagraph }) {
  const bullets = forceParagraph ? [] : splitTextToBullets(text);
  return (
    <div style={{
      background: 'white',
      border: `1px solid var(--border)`,
      borderLeft: `4px solid ${color}`,
      borderRadius: 'var(--radius-sm)',
      padding: '0.85rem 1.1rem',
      marginBottom: '0.85rem',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <h3 style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        margin: '0 0 0.6rem 0',
        fontSize: '1.05rem',
        fontWeight: 600,
        color: color,
      }}>
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
        {title}
      </h3>
      {bullets.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {bullets.map((b, i) => {
            const lv = parseLabelValue(b);
            return (
              <li key={i} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.92rem', color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                <span style={{ color: color, fontWeight: 700, flexShrink: 0 }}>•</span>
                <span style={{ flex: 1 }}>
                  {lv ? (
                    <><strong style={{ color: 'var(--ink)' }}>{lv.label} :</strong> {lv.value}</>
                  ) : b}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p style={{ color: 'var(--ink-soft)', whiteSpace: 'pre-wrap', margin: 0, fontSize: '0.92rem', lineHeight: 1.55 }}>{text}</p>
      )}
    </div>
  );
}

// Variante pour les listes deja prepared (Conseils, Problemes)
function DetailRubricList({ icon, title, color, items }) {
  return (
    <div style={{
      background: 'white',
      border: `1px solid var(--border)`,
      borderLeft: `4px solid ${color}`,
      borderRadius: 'var(--radius-sm)',
      padding: '0.85rem 1.1rem',
      marginBottom: '0.85rem',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <h3 style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        margin: '0 0 0.6rem 0',
        fontSize: '1.05rem',
        fontWeight: 600,
        color: color,
      }}>
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
        {title}
      </h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {items.map((it, i) => {
          const lv = parseLabelValue(it);
          return (
            <li key={i} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.92rem', color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              <span style={{ color: color, fontWeight: 700, flexShrink: 0 }}>•</span>
              <span style={{ flex: 1 }}>
                {lv ? (
                  <><strong style={{ color: 'var(--ink)' }}>{lv.label} :</strong> {lv.value}</>
                ) : it}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PlantDetailModal({ plant, onClose, onEdit, onDelete, onExportToLib }) {
  const lib = findLibMatch(plant);
  const typeDefault = TYPE_DEFAULTS[plant.type] || null;
  const recommendedLight = (lib && lib.light) || (typeDefault && typeDefault.light) || '';
  const recommendedWater = (lib && lib.water) || (typeDefault && typeDefault.water) || '';
  const recommendedSource = lib ? `fiche ${lib.name}` : (typeDefault ? `type ${plant.type}` : '');

  const acquiredDate = plant.acquired ? new Date(plant.acquired).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  // Champs affichés : priorité aux données propres de la plante, sinon celles de la bibliothèque (lib)
  const description = plant.description || (lib ? lib.description : '');
  const plantation = plant.plantation || (lib ? lib.plantation : '');
  const propagation = plant.propagation || (lib ? lib.propagation : '');
  const harvest = plant.harvest || (lib ? lib.harvest : '');
  const companions = plant.companions || (lib ? lib.companions : '');
  const tipsArray = plant.tips
    ? (Array.isArray(plant.tips) ? plant.tips : plant.tips.split('\n').filter(Boolean))
    : (lib?.tips || []);
  const problemsArray = plant.problems
    ? (Array.isArray(plant.problems) ? plant.problems : plant.problems.split('\n').filter(Boolean))
    : (lib?.problems || []);
  const hasAnyDetail = description || plantation || propagation || harvest || companions || tipsArray.length > 0 || problemsArray.length > 0 || (lib && lib.care);

  return (
    <div className="modal active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-inner">
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="detail-hero">
          <div className="detail-img">{plant.photo ? <img src={plant.photo} alt="" /> : LEAF_SVG}</div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 400 }}>{plant.name}</h2>
            {plant.latin && <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--ink-mute)', marginBottom: '0.75rem' }}>{plant.latin}</p>}
            {plant.type && <span className="card-tag">{plant.type}</span>}
            {plant.location && <p style={{ marginTop: '0.5rem', fontSize: '0.88rem', color: 'var(--ink-mute)' }}>Emplacement : {plant.location}</p>}
            {acquiredDate && <p style={{ fontSize: '0.88rem', color: 'var(--ink-mute)' }}>Depuis le {acquiredDate}</p>}
            <div className="care-grid">
              {plant.light && (
                <div className="care-item">
                  <div className="care-label">Lumière</div>
                  <div className="care-value">{plant.light}</div>
                  {recommendedLight && recommendedLight.trim().toLowerCase() !== (plant.light || '').trim().toLowerCase() && (
                    <div style={{ marginTop: '0.25rem', fontSize: '0.78rem', color: 'var(--accent-dark, #2d5016)', background: 'var(--accent-soft, #dcebd1)', borderRadius: '4px', padding: '2px 6px', display: 'inline-block' }} title={`Recommandation issue de la ${recommendedSource}`}>
                      Conseillé : {recommendedLight}
                    </div>
                  )}
                </div>
              )}
              {!plant.light && recommendedLight && (
                <div className="care-item">
                  <div className="care-label">Lumière conseillée</div>
                  <div className="care-value">{recommendedLight}</div>
                  <div style={{ marginTop: '0.15rem', fontSize: '0.72rem', color: 'var(--ink-mute)' }}>({recommendedSource})</div>
                </div>
              )}
              {plant.water && (
                <div className="care-item">
                  <div className="care-label">Arrosage</div>
                  <div className="care-value">{plant.water}</div>
                  {recommendedWater && recommendedWater.trim().toLowerCase() !== (plant.water || '').trim().toLowerCase() && (
                    <div style={{ marginTop: '0.25rem', fontSize: '0.78rem', color: 'var(--accent-dark, #2d5016)', background: 'var(--accent-soft, #dcebd1)', borderRadius: '4px', padding: '2px 6px', display: 'inline-block' }} title={`Recommandation issue de la ${recommendedSource}`}>
                      Conseillé : {recommendedWater}
                    </div>
                  )}
                </div>
              )}
              {!plant.water && recommendedWater && (
                <div className="care-item">
                  <div className="care-label">Arrosage conseillé</div>
                  <div className="care-value">{recommendedWater}</div>
                  <div style={{ marginTop: '0.15rem', fontSize: '0.72rem', color: 'var(--ink-mute)' }}>({recommendedSource})</div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button className="btn sm" onClick={onEdit}>Modifier</button>
              {onExportToLib && <button className="btn sm" onClick={onExportToLib}>→ Bibliothèque</button>}
              <button className="btn sm danger" onClick={onDelete}>Supprimer</button>
            </div>
          </div>
        </div>

        {plant.notes && <DetailRubric icon="✏️" title="Notes personnelles" color="#7a5b9c" text={plant.notes} />}

        {hasAnyDetail && (
          <>
            {description && <DetailRubric icon="🌱" title="Description" color="#3a7a3a" text={description} forceParagraph />}
            {lib && lib.care && !plant.description && (
              <div className="detail-section">
                <h3>Fiche de culture</h3>
                <div className="care-grid">
                  {Object.entries(lib.care).map(([k, v]) => (
                    <div key={k} className="care-item">
                      <div className="care-label">{k}</div>
                      <div className="care-value">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {plantation && <DetailRubric icon="🪴" title="Plantation" color="#8b5a2b" text={plantation} />}
            {propagation && <DetailRubric icon="🌿" title="Multiplication" color="#2d7a3e" text={propagation} />}
            {harvest && <DetailRubric icon="🧺" title="Récolte" color="#c89028" text={harvest} />}
            {companions && <DetailRubric icon="🤝" title="Compagnonnage" color="#2b6f9c" text={companions} />}
            {tipsArray.length > 0 && (
              <DetailRubricList icon="💡" title="Conseils" color="#d97706" items={tipsArray} />
            )}
            {problemsArray.length > 0 && (
              <DetailRubricList icon="⚠️" title="Problèmes fréquents" color="#c0392b" items={problemsArray} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LibraryDetailModal({ plant, onClose, onExportToPlants, onEdit, onDelete }) {
  const isCustom = plant._source === 'custom';
  // Pour les fiches custom, tips/problems sont stockés en texte multi-lignes
  const tipsArray = Array.isArray(plant.tips) ? plant.tips : (plant.tips ? plant.tips.split('\n').filter(Boolean) : []);
  const problemsArray = Array.isArray(plant.problems) ? plant.problems : (plant.problems ? plant.problems.split('\n').filter(Boolean) : []);
  return (
    <div className="modal active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-inner">
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="detail-hero">
          <div className="detail-img">{plant.photo ? <img src={plant.photo} alt={plant.name} /> : LEAF_SVG}</div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 400 }}>{plant.name}</h2>
            {plant.latin && <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--ink-mute)', marginBottom: '0.75rem' }}>{plant.latin}</p>}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              {plant.type && <span className="card-tag">{plant.type}</span>}
              {isCustom && <span className="card-tag" style={{ background: 'var(--accent-soft, #dcebd1)', color: 'var(--accent-dark, #2d5016)' }}>Ma fiche</span>}
            </div>
            {plant.description && <p style={{ marginTop: '0.5rem', color: 'var(--ink-soft)' }}>{plant.description}</p>}
            <div className="care-grid">
              {plant.light && <div className="care-item"><div className="care-label">Lumière</div><div className="care-value">{plant.light}</div></div>}
              {plant.water && <div className="care-item"><div className="care-label">Arrosage</div><div className="care-value">{plant.water}</div></div>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              {onExportToPlants && <button className="btn sm accent" onClick={onExportToPlants}>+ Ajouter à mes plantes</button>}
              {onEdit && <button className="btn sm" onClick={onEdit}>{isCustom ? 'Modifier' : 'Modifier (créer ma version)'}</button>}
              {onDelete && <button className="btn sm danger" onClick={onDelete}>Supprimer</button>}
            </div>
          </div>
        </div>

        {plant.care && typeof plant.care === 'object' && Object.keys(plant.care).length > 0 && (
          <div className="detail-section">
            <h3>Soins détaillés</h3>
            <div className="care-grid">
              {Object.entries(plant.care).map(([k, v]) => (
                <div key={k} className="care-item">
                  <div className="care-label">{k}</div>
                  <div className="care-value">{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {plant.plantation && <div className="detail-section"><h3>Plantation</h3><p style={{ color: 'var(--ink-soft)', whiteSpace: 'pre-wrap' }}>{plant.plantation}</p></div>}
        {plant.propagation && <div className="detail-section"><h3>Multiplication</h3><p style={{ color: 'var(--ink-soft)', whiteSpace: 'pre-wrap' }}>{plant.propagation}</p></div>}
        {plant.harvest && <div className="detail-section"><h3>Récolte</h3><p style={{ color: 'var(--ink-soft)', whiteSpace: 'pre-wrap' }}>{plant.harvest}</p></div>}
        {plant.companions && <div className="detail-section"><h3>Compagnonnage</h3><p style={{ color: 'var(--ink-soft)', whiteSpace: 'pre-wrap' }}>{plant.companions}</p></div>}
        {tipsArray.length > 0 && <div className="detail-section"><h3>Conseils</h3><ul>{tipsArray.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
        {problemsArray.length > 0 && <div className="detail-section"><h3>Problèmes fréquents</h3><ul>{problemsArray.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
      </div>
    </div>
  );
}

function LibraryForm({ entry, supabase, onSave, onDelete, onCancel }) {
  const [name, setName] = useState(entry?.name || '');
  const [latin, setLatin] = useState(entry?.latin || '');
  const [type, setType] = useState(entry?.type || '');
  const [description, setDescription] = useState(entry?.description || '');
  const [light, setLight] = useState(entry?.light || '');
  const [water, setWater] = useState(entry?.water || '');
  const [plantation, setPlantation] = useState(entry?.plantation || '');
  const [propagation, setPropagation] = useState(entry?.propagation || '');
  const [harvest, setHarvest] = useState(entry?.harvest || '');
  const [companions, setCompanions] = useState(entry?.companions || '');
  const [tips, setTips] = useState(entry?.tips || '');
  const [problems, setProblems] = useState(entry?.problems || '');
  const [photo, setPhoto] = useState(entry?.photo || null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const blob = await resizeImage(file, 1200, 0.82);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');
      const filename = `${user.id}/lib-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('plant-photos')
        .upload(filename, blob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('plant-photos').getPublicUrl(filename);
      setPhoto(publicUrl);
    } catch (err) {
      alert("Impossible d'uploader la photo : " + (err.message || err));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      id: entry?.id,
      name, latin, type, description,
      light, water, plantation, propagation, harvest, companions,
      tips, problems, photo,
    });
    setSaving(false);
  }

  return (
    <div className="modal active" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-inner">
        <button className="modal-close" onClick={onCancel}>×</button>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 400, marginBottom: '1rem' }}>
          {entry?.id ? 'Modifier la fiche bibliothèque' : 'Nouvelle fiche bibliothèque'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="label">Nom usuel *</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="label">Nom latin</label>
              <input className="input" value={latin} onChange={e => setLatin(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">Catégorie</label>
              <select className="select" value={type} onChange={e => setType(e.target.value)}>
                <option value="">—</option>
                {['Intérieur', 'Extérieur', 'Fruitier', 'Aromatique', 'Potager', 'Succulente', 'Fleur'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Lumière</label>
              <input className="input" value={light} onChange={e => setLight(e.target.value)} placeholder="Plein soleil, mi-ombre..." />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Arrosage</label>
            <input className="input" value={water} onChange={e => setWater(e.target.value)} placeholder="Modéré, rare..." />
          </div>

          <div className="form-group">
            <label className="label">Description</label>
            <textarea className="textarea" value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="label">Photo</label>
            <input className="input" type="file" accept="image/*" onChange={handlePhoto} disabled={uploading} />
            {uploading && <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--ink-mute)' }}>Envoi en cours...</div>}
            {photo && !uploading && <img src={photo} style={{ marginTop: '0.5rem', maxHeight: 160, borderRadius: 'var(--radius-sm)' }} alt="" />}
            {photo && !uploading && <button type="button" className="btn sm" style={{ marginTop: '0.5rem' }} onClick={() => setPhoto(null)}>Retirer la photo</button>}
          </div>

          <div className="form-group">
            <label className="label">Plantation</label>
            <textarea className="textarea" value={plantation} onChange={e => setPlantation(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Multiplication</label>
            <textarea className="textarea" value={propagation} onChange={e => setPropagation(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Récolte</label>
            <textarea className="textarea" value={harvest} onChange={e => setHarvest(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Compagnonnage</label>
            <textarea className="textarea" value={companions} onChange={e => setCompanions(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Conseils (une ligne par conseil)</label>
            <textarea className="textarea" value={tips} onChange={e => setTips(e.target.value)} placeholder="Tailler en mars&#10;Pailler l'été" />
          </div>
          <div className="form-group">
            <label className="label">Problèmes fréquents (une ligne par problème)</label>
            <textarea className="textarea" value={problems} onChange={e => setProblems(e.target.value)} placeholder="Feuilles jaunes : manque eau&#10;Taches noires : marsonia" />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <button type="submit" className="btn accent" disabled={saving || uploading}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
            <button type="button" className="btn" onClick={onCancel}>Annuler</button>
            {onDelete && <button type="button" className="btn danger" onClick={onDelete}>Supprimer</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
