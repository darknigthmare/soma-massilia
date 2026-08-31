# Livraison 0.4.0 — La Nuit des identités — 1er septembre 2026

- Jeu public : https://soma-massilia.vercel.app
- Dépôt public : https://github.com/darknigthmare/soma-massilia
- Commit de jeu audité et déployé : `0cf7a4da1398a1e4e1c982130c4565ae02c32a68`.
- Projet Vercel : `soma-massilia`, `prj_m2ds8ZdjlwbkmWHE5RK7sV4em4Ax`.
- Déploiement vérifié : `dpl_BEZ34Qt5Z5vKgeZnBjQY5UtYK6Rz`, **READY**, cible production.
- URL immuable : https://soma-massilia-4kkz8056a-darknigthmares-projects.vercel.app
- Inspecteur : https://vercel.com/darknigthmares-projects/soma-massilia/BEZ34Qt5Z5vKgeZnBjQY5UtYK6Rz
- CI Quality du commit : https://github.com/darknigthmare/soma-massilia/actions/runs/33452536346 — succès.

## Portes de publication

- `npm run lint` : succès.
- `tsc --noEmit` : succès.
- `npm test -- --reporter=dot` : **273/273**, 10 fichiers.
- `npm audit --omit=dev` : **0 vulnérabilité**.
- Contrôle `oxfmt` ciblé et `git diff --check` : succès.
- `npm run build` local puis build Vercel Next.js 16.3.3 : succès ; 23 ressources construites dans le manifeste hors ligne.
- Scan Vercel des logs de niveau erreur sur l’heure suivant le déploiement : aucun événement retourné.

## Contrôles publics réellement exécutés

HTTP **200** sur l’alias public pour :

- la racine, 9 295 octets ;
- `manifest.webmanifest`, 638 octets ;
- `sw.js`, 2 409 octets ;
- `precache.json`, version `0.4.0`, 23 ressources ;
- `soma-heavy-v04-chroma.png`, 1 916 623 octets ;
- `collector-v04-chroma.png`, 1 933 284 octets.

Une session Chromium de production neuve `soma04-production` a vérifié :

- menu 0.4.0 et rendu desktop sans défaut bloquant visible ;
- signature d’un nouveau contrat, entrée dans La Dette de Chair et création du canvas jouable ;
- zéro débordement horizontal et aucune erreur applicative remontée ;
- chargement des sept bitmaps attendus : décor, garde, lourd, Collecteur, Nara, Idris et Salomé ;
- service worker contrôleur après rechargement, cache unique `soma-massilia-v0.4.0` ;
- racine, manifeste, lourd et Collecteur présents dans le cache ;
- hors ligne simulé : rechargement du canvas réussi, requête non précachée en échec `TypeError: Failed to fetch`, planche lourd toujours servie en HTTP 200.

Les parcours détaillés, la fixture jetable déclarée, les mesures responsive, axe WCAG A/AA et les limites matérielles se trouvent dans [VALIDATION.md](VALIDATION.md). La comparaison honnête au postulat et les écarts structurels encore ouverts se trouvent dans [AUDIT.md](AUDIT.md).

## Provenance et périmètre

L’archive « Vertical Slice 0.1.0 » annoncée, SHA-256 `c9bcf405d04a86cc0f5a4b82580786b9aec26a95f4e6764f443b38d6d7563c05`, n’a pas été récupérée et ce hash n’a pas été recalculé. La 0.4.0 publiée est une reconstruction originale documentée, pas l’archive binaire authentifiée. Les nouvelles planches lourd/Collecteur sont des créations OpenAI ImageGen originales sans référence externe ; prompts, caractéristiques et SHA-256 figurent dans [ART_PROMPTS.md](ART_PROMPTS.md) et [ASSET_PROVENANCE.md](ASSET_PROVENANCE.md).

Ni launcher global, ni Stargate, SNL ou Unreal Engine n’ont été modifiés. La livraison 0.3 est archivée dans [RELEASE_0.3.md](RELEASE_0.3.md).
