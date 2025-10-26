# AudioVersets V1 🕌

Application complète de **Quiz Coran** avec mode hors ligne.

## Fonctionnalités

- 📖 114 Surahs complets du Coran (6234 versets)
- 🎵 Audio haute qualité (Récitateur Hudhaify 128kbps)
- 📝 Mode Quiz Texte
- 🎧 Mode Quiz Audio
- 🌙 Fonctionne 100% HORS LIGNE
- 💾 Sauvegarde automatique du quiz
- 📱 Progressive Web App (PWA)
- 🔒 Service Worker intelligent
- ⏱️ Wake Lock (évite mise en veille)

## Installation

1. Clonez le repo
2. Ouvrez un terminal dans le dossier
3. Tapez : `python -m http.server 8000`
4. Allez à : `http://localhost:8000`

## Utilisation

- Sélectionnez une surah
- Sélectionnez le nombre de versets
- Choisissez le mode (texte ou audio)
- Cliquez "ابدأ الاختبار" pour commencer
- Répondez aux questions

## Structure

```
AudioVersets_V1/
├── index.html (1042 lignes - interface)
├── app-complet.js (logique application)
├── bdd-audio.js (gestion IndexedDB)
├── manifest.json (configuration PWA)
├── service-worker.js (cache offline)
├── sw.js (ancien SW)
├── icon.png (icône app)
├── data/
│   └── verses.json (tous les versets)
└── audios/
    └── Hudhaify_128kbps/ (tous les MP3)
```

## Technologies

- HTML5, CSS3, JavaScript ES6+
- Service Workers
- IndexedDB
- Progressive Web App (PWA)
- Cache API (Offline First)

## Status

✅ **COMPLÈTEMENT FONCTIONNEL**

## Auteur

[Votre nom]

## Date

26 Octobre 2025
