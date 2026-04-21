'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError("Impossible d'envoyer l'email : " + error.message);
      setLoading(false);
    } else {
      setSuccess("Un email a été envoyé à " + email + ". Cliquez sur le lien qu'il contient pour définir un nouveau mot de passe. Pensez à vérifier le dossier spam.");
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-brand">
          <h1>Mon Herbier</h1>
          <p>Mot de passe oublié</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            {error && <div className="alert error">{error}</div>}
            {success && <div className="alert success">{success}</div>}

            <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--ink-mute)' }}>
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>

            <div className="form-group">
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <button type="submit" className="btn accent" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
              {loading ? 'Envoi...' : "Envoyer le lien de réinitialisation"}
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
