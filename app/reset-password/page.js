'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase pose automatiquement la session en lisant le token dans l'URL (#access_token=...)
  // Il émet alors un événement PASSWORD_RECOVERY. On attend ce signal avant d'autoriser la soumission.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setSessionReady(true);
      }
    });

    // Si la session est déjà posée (rechargement de page par ex.)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => listener?.subscription?.unsubscribe();
  }, [supabase]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("Impossible de mettre à jour le mot de passe : " + error.message);
      setLoading(false);
    } else {
      setSuccess("Mot de passe mis à jour ! Redirection vers votre herbier...");
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-brand">
          <h1>Mon Herbier</h1>
          <p>Nouveau mot de passe</p>
        </div>

        <div className="card">
          {!sessionReady && !success && (
            <div className="alert error">
              Ce lien est invalide ou a expiré. Demandez un nouveau lien depuis la page &laquo;&nbsp;mot de passe oublié&nbsp;&raquo;.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {error && <div className="alert error">{error}</div>}
            {success && <div className="alert success">{success}</div>}

            <div className="form-group">
              <label className="label">Nouveau mot de passe (6 caractères minimum)</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                disabled={!sessionReady}
              />
            </div>

            <div className="form-group">
              <label className="label">Confirmer le nouveau mot de passe</label>
              <input
                className="input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                disabled={!sessionReady}
              />
            </div>

            <button
              type="submit"
              className="btn accent"
              disabled={loading || !sessionReady}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              {loading ? 'Mise à jour...' : 'Enregistrer le nouveau mot de passe'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--ink-mute)' }}>
          <Link href="/login">Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
}
