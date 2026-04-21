'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { PLANT_LIBRARY, SYMPTOMS, DIAGNOSES, SEASONS } from '@/lib/data';

const LEAF_SVG = (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 88 Q50 55 50 20" stroke="#5a7c3e" strokeWidth="2" fill="none" />
    <path d="M50 25 Q30 30 22 50 Q28 72 50 78 Q44 55 50 25 Z" fill="#5a9048" />
    <path d="M50 25 Q70 30 78 50 Q72 72 50 78 Q56 55 50 25 Z" fill="#6aa058" />
  </svg>
);

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

export default function DashboardClient({ initialPlants, userEmail }) {
  const router = useRouter();
  const supabase = createClient();
  const [plants, setPlants] = useState(initialPlants);
  const [tab, setTab] = useState('catalog');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [librarySearch, setLibrarySearch] = useState('');
  const [editingPlant, setEditingPlant] = useState(null);
  const [detailPlant, setDetailPlant] = useState(null);
  const [detailLib, setDetailLib] = useState(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState(new Set());
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [message, setMessage] = useState(null);

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

  const filteredPlants = useMemo(() => {
    const s = search.toLowerCase();
    return plants.filter(p =>
      (!s || p.name.toLowerCase().includes(s) || (p.latin || '').toLowerCase().includes(s)) &&
      (!filterType || p.type === filterType)
    );
  }, [plants, search, filterType]);

  const filteredLibrary = useMemo(() => {
    const s = librarySearch.toLowerCase();
    return PLANT_LIBRARY.filter(p =>
      !s || p.name.toLowerCase().includes(s) || p.latin.toLowerCase().includes(s) || p.type.toLowerCase().includes(s)
    );
  }, [librarySearch]);

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
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <input className="input" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: '1 1 180px' }} />
              <select className="select" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 'auto' }}>
                <option value="">Toutes</option>
                {['Intérieur', 'Extérieur', 'Fruitier', 'Aromatique', 'Potager', 'Succulente', 'Fleur'].map(t => <option key={t}>{t}</option>)}
              </select>
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
            key={editingPlant?.id || 'new'}
            plant={editingPlant}
            onSave={async (data) => {
              const ok = await savePlant(data);
              if (ok) {
                setEditingPlant(null);
                setTab('catalog');
              }
            }}
            onDelete={editingPlant ? () => deletePlant(editingPlant.id) : null}
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
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 400, marginBottom: '0.5rem' }}>Bibliothèque ({PLANT_LIBRARY.length} espèces)</h2>
            <p style={{ color: 'var(--ink-mute)', marginBottom: '1rem', fontSize: '0.92rem' }}>Fiches détaillées avec plantation, entretien, multiplication et problèmes fréquents.</p>
            <input className="input" placeholder="Rechercher..." value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} style={{ marginBottom: '1rem' }} />
            <div className="plant-grid">
              {filteredLibrary.map((p, i) => (
                <div key={i} className="plant-card" onClick={() => setDetailLib(p)}>
                  <div className="card-img">{LEAF_SVG}</div>
                  <div className="card-body">
                    <div className="card-name">{p.name}</div>
                    <div className="card-latin">{p.latin}</div>
                    <span className="card-tag">{p.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CALENDRIER */}
        {tab === 'cal' && (
          <div className="section">
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 400, marginBottom: '1rem' }}>Calendrier du jardinier</h2>
            <div className="alert success" style={{ marginBottom: '1.25rem' }}>
              Saison actuelle : <strong>{currentSeason.name}</strong> · {MONTHS[new Date().getMonth()]}
            </div>
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
        />
      )}

      {detailLib && <LibraryDetailModal plant={detailLib} onClose={() => setDetailLib(null)} />}
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

function PlantCard({ plant, onClick }) {
  return (
    <div className="plant-card" onClick={onClick}>
      <div className="card-img">
        {plant.photo ? <img src={plant.photo} alt={plant.name} /> : LEAF_SVG}
      </div>
      <div className="card-body">
        <div className="card-name">{plant.name}</div>
        <div className="card-latin">{plant.latin || '\u00A0'}</div>
        {plant.type && <span className="card-tag">{plant.type}</span>}
        {plant.location && <span className="card-tag">{plant.location}</span>}
      </div>
    </div>
  );
}

function PlantForm({ plant, onSave, onDelete, onCancel }) {
  const [name, setName] = useState(plant?.name || '');
  const [latin, setLatin] = useState(plant?.latin || '');
  const [type, setType] = useState(plant?.type || '');
  const [location, setLocation] = useState(plant?.location || '');
  const [light, setLight] = useState(plant?.light || '');
  const [water, setWater] = useState(plant?.water || '');
  const [notes, setNotes] = useState(plant?.notes || '');
  const [acquired, setAcquired] = useState(plant?.acquired || new Date().toISOString().split('T')[0]);
  const [photo, setPhoto] = useState(plant?.photo || null);
  const [saving, setSaving] = useState(false);

  async function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 800 / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        setPhoto(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      id: plant?.id,
      name, latin, type, location, light, water, notes, acquired: acquired || null, photo,
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
          <input className="input" type="file" accept="image/*" capture="environment" onChange={handlePhoto} />
          {photo && <img src={photo} style={{ marginTop: '0.5rem', maxHeight: 160, borderRadius: 'var(--radius-sm)' }} alt="" />}
        </div>

        <div className="form-group">
          <label className="label">Notes personnelles</label>
          <textarea className="textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observations, conseils persos..." />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button type="submit" className="btn accent" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
          {plant && <button type="button" className="btn" onClick={onCancel}>Annuler</button>}
          {plant && onDelete && <button type="button" className="btn danger" onClick={onDelete}>Supprimer</button>}
        </div>
      </form>
    </div>
  );
}

function PlantDetailModal({ plant, onClose, onEdit, onDelete }) {
  const lib = PLANT_LIBRARY.find(l =>
    l.name.toLowerCase() === (plant.name || '').toLowerCase() ||
    l.latin.toLowerCase() === (plant.latin || '').toLowerCase() ||
    (plant.name || '').toLowerCase().includes(l.name.toLowerCase().split(' ')[0])
  );

  const acquiredDate = plant.acquired ? new Date(plant.acquired).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

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
              {plant.light && <div className="care-item"><div className="care-label">Lumière</div><div className="care-value">{plant.light}</div></div>}
              {plant.water && <div className="care-item"><div className="care-label">Arrosage</div><div className="care-value">{plant.water}</div></div>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button className="btn sm" onClick={onEdit}>Modifier</button>
              <button className="btn sm danger" onClick={onDelete}>Supprimer</button>
            </div>
          </div>
        </div>

        {plant.notes && (
          <div className="detail-section">
            <h3>Notes personnelles</h3>
            <p style={{ color: 'var(--ink-soft)', whiteSpace: 'pre-wrap' }}>{plant.notes}</p>
          </div>
        )}

        {lib && (
          <>
            <div className="detail-section">
              <h3>Fiche de culture</h3>
              <p style={{ color: 'var(--ink-soft)', marginBottom: '0.75rem' }}>{lib.description}</p>
              <div className="care-grid">
                {Object.entries(lib.care).map(([k, v]) => (
                  <div key={k} className="care-item">
                    <div className="care-label">{k}</div>
                    <div className="care-value">{v}</div>
                  </div>
                ))}
              </div>
            </div>
            {lib.plantation && <div className="detail-section"><h3>Plantation</h3><p style={{ color: 'var(--ink-soft)' }}>{lib.plantation}</p></div>}
            {lib.propagation && <div className="detail-section"><h3>Multiplication</h3><p style={{ color: 'var(--ink-soft)' }}>{lib.propagation}</p></div>}
            {lib.harvest && <div className="detail-section"><h3>Récolte</h3><p style={{ color: 'var(--ink-soft)' }}>{lib.harvest}</p></div>}
            {lib.companions && <div className="detail-section"><h3>Compagnonnage</h3><p style={{ color: 'var(--ink-soft)' }}>{lib.companions}</p></div>}
            <div className="detail-section"><h3>Conseils</h3><ul>{lib.tips.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
            <div className="detail-section"><h3>Problèmes fréquents</h3><ul>{lib.problems.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
          </>
        )}
      </div>
    </div>
  );
}

function LibraryDetailModal({ plant, onClose }) {
  return (
    <div className="modal active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-inner">
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="detail-hero">
          <div className="detail-img">{LEAF_SVG}</div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 400 }}>{plant.name}</h2>
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--ink-mute)', marginBottom: '0.75rem' }}>{plant.latin}</p>
            <span className="card-tag">{plant.type}</span>
            <p style={{ marginTop: '0.5rem', color: 'var(--ink-soft)' }}>{plant.description}</p>
            <div className="care-grid">
              <div className="care-item"><div className="care-label">Lumière</div><div className="care-value">{plant.light}</div></div>
              <div className="care-item"><div className="care-label">Arrosage</div><div className="care-value">{plant.water}</div></div>
            </div>
          </div>
        </div>

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
        {plant.plantation && <div className="detail-section"><h3>Plantation</h3><p style={{ color: 'var(--ink-soft)' }}>{plant.plantation}</p></div>}
        {plant.propagation && <div className="detail-section"><h3>Multiplication</h3><p style={{ color: 'var(--ink-soft)' }}>{plant.propagation}</p></div>}
        {plant.harvest && <div className="detail-section"><h3>Récolte</h3><p style={{ color: 'var(--ink-soft)' }}>{plant.harvest}</p></div>}
        {plant.companions && <div className="detail-section"><h3>Compagnonnage</h3><p style={{ color: 'var(--ink-soft)' }}>{plant.companions}</p></div>}
        <div className="detail-section"><h3>Conseils</h3><ul>{plant.tips.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
        <div className="detail-section"><h3>Problèmes fréquents</h3><ul>{plant.problems.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
      </div>
    </div>
  );
}
