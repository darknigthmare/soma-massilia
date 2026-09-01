# Livraison 0.5.0 — Lignes de confiance — 1er septembre 2026

- Jeu public : https://soma-massilia.vercel.app
- Dépôt public : https://github.com/darknigthmare/soma-massilia
- Commit de release audité, poussé sur `main` et déployé :
  `07deb8bc879066ecd6e05d94f8ff85d37f5dd0d0` (`07deb8b`).
- GitHub Actions `validate` :
  [run 33472979351, job 99746336388](https://github.com/darknigthmare/soma-massilia/actions/runs/33472979351/job/99746336388),
  `completed/success` pour ce SHA.
- Statut GitHub Vercel : succès.
- Déploiement Vercel :
  `dpl_5M8dyuDSNQxQiKT5jYTdagfCaGUg`, cible production, **READY**.
- URL immuable :
  https://soma-massilia-qu9pqasqu-darknigthmares-projects.vercel.app
- L’alias de production vérifié inclut https://soma-massilia.vercel.app.

## Portes de publication

- `npm test` : **296/296**, 15 fichiers.
- `npm run lint` : succès.
- `npx tsc --noEmit` : succès.
- `npm audit` : **0 vulnérabilité connue**.
- `git diff --check` et contrôle `oxfmt` ciblé : succès.
- `npm run build` : Next.js 16.3.3, prébuild des huit planches WebP alpha,
  génération statique et postbuild de 23 assets hors ligne réussis.
- Workflow GitHub `validate` du commit publié : succès.
- Déploiement Vercel de production : READY.

## Contrôles publics réellement exécutés

L’alias public a répondu :

- `/` : HTTP **200**, `text/html` ;
- `/precache.json` : version **0.5.0**, **23 assets** ;
- `/art/runtime/sprites.json` : HTTP **200**, `application/json`,
  **3 398 octets** ;
- `/art/runtime/civilian-worker.webp` : HTTP **200**, `image/webp`,
  **402 948 octets** ;
- `/favicon.ico` : HTTP **200**, `image/vnd.microsoft.icon`,
  **1 252 octets**.

Une session Chromium neuve sur la production, à **1440 × 900**, a vérifié :

- titre et version 0.5.0 visibles, sans débordement horizontal ;
- signature du contrat ouvrant réellement le prologue **La Dette de Chair** ;
- canvas raycast créé, dialogue de VÉNUS affiché, puis gameplay actif ;
- `agent-browser errors` et console vides ;
- capture visuelle du prologue inspectée : overlay lisible, hiérarchie
  professionnelle et aucun défaut bloquant visible.

La PWA publique a également été contrôlée : service worker activé et
contrôleur présent, cache unique `soma-massilia-v0.5.0` et manifeste de
précache de 23 assets.

Après la QA, `vercel logs <deployment> --level error --since 1h` a renvoyé
`No logs found for darknigthmares-projects/soma-massilia`. Aucun log de
niveau erreur n’a été observé dans cette fenêtre ; ce scan borné ne constitue
pas une observabilité applicative complète.

Les parcours locaux détaillés, la fixture avancée déclarée, les mesures
responsive, les contrôles Axe et le rechargement hors ligne se trouvent dans
[VALIDATION.md](VALIDATION.md). La comparaison au postulat et les écarts
structurels encore ouverts sont consignés dans [AUDIT.md](AUDIT.md).

## Provenance et périmètre

L’archive « Vertical Slice 0.1.0 » annoncée, SHA-256
`c9bcf405d04a86cc0f5a4b82580786b9aec26a95f4e6764f443b38d6d7563c05`,
n’a pas été récupérée et cette empreinte n’a pas été recalculée. La 0.5.0
publiée est une **reconstruction originale documentée**, pas l’archive binaire
authentifiée.

Les planches de garde, Nara, Idris, Salomé, lourd, Collecteur, ouvrier civil et
témoin civil sont des créations originales. Les deux nouveaux civils ont été
produits par deux générations OpenAI `image_gen.imagegen` NEW distinctes,
sans image de référence ; sources, inspections et SHA-256 figurent dans
[ART_PROMPTS.md](ART_PROMPTS.md) et
[ASSET_PROVENANCE.md](ASSET_PROVENANCE.md).

La qualification publique ne couvre pas une manette physique,
Safari/iOS/Android réel, un téléphone bas de gamme, un lecteur d’écran réel,
une session multi-heures ou un playtest externe. Cette release web compacte
n’est ni une certification console, ni une production AAA. Les thèmes adultes
concernent uniquement des adultes et restent non explicites dans la
présentation publique.

Ni le launcher global, ni Stargate, SNL ou Unreal Engine n’ont été modifiés.
La livraison 0.4 est remplacée par ce document ; son historique de validation
reste conservé dans [VALIDATION.md](VALIDATION.md).
