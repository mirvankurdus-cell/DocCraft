# DocCraft v2 — 6 outils IA · Vercel + Google Gemini (gratuit)

## Nouveaux outils ajoutés
- ✅ Générateur de CV (existant)
- ✅ Résumé de texte (existant)
- ✅ **Générateur de logos SVG** (nouveau)
- ✅ **Posts réseaux sociaux** Instagram / LinkedIn / Twitter / TikTok (nouveau)
- ✅ **Résumé YouTube** (nouveau)
- ✅ Page conformité RGPD / droits d'auteur (nouveau)

## Structure
```
doccraft/
├── api/
│   ├── generate.js   ← CV, résumé texte, posts sociaux
│   ├── logo.js       ← Génération logos SVG
│   └── youtube.js    ← Transcription + résumé YouTube
├── public/
│   └── index.html    ← Site complet
├── package.json      ← Dépendance youtube-transcript
├── vercel.json
└── README.md
```

---

## DÉPLOIEMENT (même procédure qu'avant)

### 1. Clé Gemini gratuite
→ https://aistudio.google.com → Get API Key

### 2. Déployer sur Vercel
→ https://vercel.com → glisser le dossier → Deploy

### 3. Variable d'environnement
Settings → Environment Variables → Ajouter :
- Name: GEMINI_API_KEY
- Value: AIzaSy...

### 4. Redeploy → C'est bon !

---

## Conformité & Légal

### RGPD
- Aucune donnée utilisateur stockée
- Pas de cookies de tracking
- Chaque requête est indépendante

### Droits d'auteur
- Logos SVG : générés de zéro par l'IA, appartiennent à l'utilisateur
- Posts sociaux : contenus originaux générés par l'IA
- Résumés YouTube : utilisation des sous-titres publics (fair use éducatif)

### YouTube Terms of Service
- Utilise uniquement les sous-titres publics fournis par YouTube
- Usage personnel et éducatif uniquement
- Ne pas reproduire le contenu des créateurs sans permission
- Conforme à la Section 5.B des CGU YouTube

### Apple App Store / Google Play
- Si déployé comme PWA : respecte App Store Review Guidelines §5
- Pas de contenu généré nuisible
- Pas de collecte de données sans consentement
- Conforme aux règles de confidentialité Google Play

---

## Limites gratuites Gemini
- 15 requêtes/minute
- 1500 requêtes/jour
- Modèle : gemini-1.5-flash
