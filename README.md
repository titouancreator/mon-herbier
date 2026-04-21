# 🌿 Mon Herbier

Votre jardin botanique personnel : répertoriez vos plantes, consultez la bibliothèque de 28 espèces, et diagnostiquez les problèmes grâce au questionnaire de symptômes (25 diagnostics).

**Chaque utilisateur a son propre compte et ne voit que ses propres plantes.**

---

## 📋 Fonctionnalités

- ✅ Comptes utilisateurs (email + mot de passe)
- ✅ Ajout/modification/suppression de plantes avec photos
- ✅ Bibliothèque de 28 plantes avec fiches détaillées (plantation, multiplication, récolte, compagnonnage)
- ✅ Diagnostic par questionnaire de symptômes (39 symptômes, 25 diagnostics, remèdes naturels)
- ✅ Calendrier saisonnier du jardinier
- ✅ Données privées et sécurisées (Row Level Security Postgres)

---

## 🚀 Déploiement complet (étape par étape)

Durée totale : **~20 minutes**. Aucune compétence technique requise.

### Étape 1 — Créer un compte Supabase (base de données + auth)

1. Allez sur [supabase.com](https://supabase.com) → **Start your project**
2. Connectez-vous avec GitHub ou email
3. Cliquez sur **New project**
4. Remplissez :
   - **Name** : `mon-herbier`
   - **Database Password** : choisissez un mot de passe fort (notez-le)
   - **Region** : `West EU (Paris)` ou proche de vous
5. Cliquez sur **Create new project** et patientez 2 minutes

### Étape 2 — Configurer la base de données

1. Dans votre projet Supabase, cliquez sur **SQL Editor** dans le menu de gauche
2. Cliquez **New query**
3. Ouvrez le fichier `supabase/schema.sql` de ce projet
4. Copiez tout son contenu et collez-le dans l'éditeur SQL
5. Cliquez sur **Run** (en bas à droite)
6. Vous devriez voir "Success. No rows returned" — c'est bon

### Étape 3 — Récupérer les clés Supabase

1. Dans Supabase, cliquez sur **Project Settings** (icône engrenage en bas à gauche)
2. Allez dans **API**
3. Notez ces deux valeurs :
   - **Project URL** (ex: `https://abcdef.supabase.co`)
   - **anon public** key (une longue chaîne qui commence par `eyJ...`)

### Étape 4 — Configurer l'authentification

1. Dans Supabase → **Authentication** → **Providers**
2. Vérifiez que **Email** est activé
3. (Optionnel) Pour simplifier les tests : dans **Authentication** → **URL Configuration**, vous pouvez désactiver **Confirm email** en allant dans **Email Templates** → **Confirm signup** et activant directement les comptes. Sinon Supabase enverra un email de confirmation à chaque inscription.

### Étape 5 — Déployer sur Vercel

**Option A — Via GitHub (recommandé)**

1. Créez un compte sur [github.com](https://github.com) si pas déjà fait
2. Créez un nouveau dépôt `mon-herbier` (public ou privé)
3. Uploadez tous les fichiers de ce projet dans ce dépôt (via l'interface web ou `git`)
4. Allez sur [vercel.com](https://vercel.com) → **Sign up** (connectez avec GitHub)
5. Cliquez **Add New** → **Project**
6. Sélectionnez le dépôt `mon-herbier`
7. Dans **Environment Variables**, ajoutez :
   - `NEXT_PUBLIC_SUPABASE_URL` = votre Project URL de l'étape 3
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = votre anon public key de l'étape 3
8. Cliquez **Deploy**
9. Après 1-2 minutes, votre app est en ligne sur `https://mon-herbier-xxx.vercel.app`

**Option B — Via Vercel CLI**

```bash
npm install -g vercel
cd mon-herbier-app
vercel
# Suivez les instructions et ajoutez les variables d'environnement via le dashboard Vercel
```

### Étape 6 — Premier test

1. Ouvrez l'URL Vercel de votre app
2. Cliquez **Créer un compte**
3. Entrez votre email et un mot de passe (6 caractères min)
4. Si la confirmation email est activée, cliquez sur le lien reçu
5. Connectez-vous et commencez à ajouter vos plantes

### Étape 7 — Ajouter d'autres utilisateurs

Simple ! Chaque personne va sur votre URL Vercel, clique **Créer un compte**, et a son propre herbier isolé du vôtre. Pas d'admin à gérer.

---

## 💻 Développement local

```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.local.example .env.local

# Remplir .env.local avec vos valeurs Supabase

# Lancer en développement
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

---

## 📁 Structure du projet

```
mon-herbier-app/
├── app/
│   ├── page.js              → Page d'accueil
│   ├── login/page.js        → Connexion
│   ├── signup/page.js       → Inscription
│   ├── dashboard/
│   │   ├── page.js          → Dashboard (serveur)
│   │   └── DashboardClient.js → UI principale
│   ├── layout.js
│   └── globals.css
├── lib/
│   ├── data.js              → Bibliothèque, symptômes, diagnostics
│   ├── supabase-browser.js  → Client Supabase navigateur
│   └── supabase-server.js   → Client Supabase serveur
├── supabase/
│   └── schema.sql           → Script SQL à exécuter
├── middleware.js            → Protection des routes privées
├── package.json
└── next.config.js
```

---

## 🔒 Sécurité

- **Row Level Security** activé sur PostgreSQL : même en cas de fuite de la clé anon, un utilisateur ne peut jamais voir les plantes d'un autre
- **Mots de passe** hashés par Supabase (bcrypt)
- **Sessions** gérées via cookies httpOnly sécurisés
- La clé `anon` est publique par design — ce qui protège, c'est les politiques RLS côté base

---

## 💰 Coûts

Tout peut rester **gratuit** tant que vous êtes raisonnable :

- **Vercel** : hobby gratuit (100 GB/mois de bande passante)
- **Supabase** : gratuit jusqu'à 500 MB de DB, 50 000 utilisateurs actifs/mois, 1 Go de stockage

Pour un usage familial ou personnel, vous ne dépasserez jamais les limites gratuites.

---

## 🛠 Personnalisation

- **Ajouter des plantes à la bibliothèque** : modifiez `lib/data.js` (constante `PLANT_LIBRARY`)
- **Ajouter des symptômes/diagnostics** : même fichier
- **Changer les couleurs** : modifiez les variables CSS dans `app/globals.css`
- **Changer le nom** : `metadata` dans `app/layout.js` et titre dans `app/globals.css`

---

## ❓ Problèmes fréquents

**"Failed to fetch" au login**
→ Vérifiez que les variables d'environnement Vercel sont bien `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (pas de typo)

**Email de confirmation non reçu**
→ Vérifiez les spams. Ou désactivez la confirmation email dans Supabase pour simplifier (Authentication → Email Templates)

**Plantes d'un autre utilisateur visibles**
→ Cela signifie que le script SQL n'a pas été exécuté complètement. Re-exécutez `supabase/schema.sql` en entier.

**Build Vercel qui échoue**
→ Vérifiez que les variables d'environnement sont bien ajoutées AVANT le premier déploiement. Sinon, allez dans Settings → Environment Variables, ajoutez-les, puis redéployez.

---

Enjoy votre jardin numérique ! 🌿
