# Livraison 0.3.0 — 31 août 2026

- Jeu public au moment de la livraison : https://soma-massilia.vercel.app
- Dépôt public : https://github.com/darknigthmare/soma-massilia
- Commit de campagne : `2a6dd59833806e92df23d70843b4f5b351848931`.
- Révision déployée : `21b08904f8045c8c3c1c8c2bcd9dd5a81e234820`.
- Projet Vercel : `soma-massilia`, `prj_m2ds8ZdjlwbkmWHE5RK7sV4em4Ax`.
- Déploiement : `dpl_Ggv6xXBFkJzWcRiLhCeynvRoBtQS`, **READY**, cible production.
- URL immuable : https://soma-massilia-6h1a91vic-darknigthmares-projects.vercel.app
- Inspecteur : https://vercel.com/darknigthmares-projects/soma-massilia/Ggv6xXBFkJzWcRiLhCeynvRoBtQS
- CI finale : https://github.com/darknigthmare/soma-massilia/actions/runs/33440606252 — succès.
- CI campagne : https://github.com/darknigthmare/soma-massilia/actions/runs/33440521937 — succès.

## Contrôles après déploiement

HTTP **200** avait été contrôlé sur l’alias pour la racine, le manifeste, `sw.js`, `precache.json` et les planches Idris/Salomé. Le manifeste de précache public annonçait `0.3.0` et 23 ressources construites.

Une session Chromium de production neuve `soma-public-030-isolated` avait vérifié :

- titre public correct et chaîne `0.3.0` présente dans l’application ;
- écran de contrat avec trois corps et trois approches ;
- service worker contrôleur après rechargement ;
- cache `soma-massilia-v0.3.0` ;
- planches Idris et Salomé présentes dans le cache ;
- aucune erreur applicative remontée.

Les preuves 0.3 sont figées dans [VALIDATION.md au commit déployé](https://github.com/darknigthmare/soma-massilia/blob/21b08904f8045c8c3c1c8c2bcd9dd5a81e234820/VALIDATION.md) et [AUDIT.md au même commit](https://github.com/darknigthmare/soma-massilia/blob/21b08904f8045c8c3c1c8c2bcd9dd5a81e234820/AUDIT.md). Les fichiers relatifs de `main` décrivent désormais la version courante et ne sont pas utilisés comme preuves historiques 0.3.

## Provenance et périmètre

L’archive historique annoncée n’a pas été récupérée. La livraison était une reconstruction originale ; [POSTULAT_SOURCE.md au commit 0.3](https://github.com/darknigthmare/soma-massilia/blob/21b08904f8045c8c3c1c8c2bcd9dd5a81e234820/POSTULAT_SOURCE.md) conserve les 20 000 caractères accessibles et marque la troncature.

Ni launcher global, ni Stargate, SNL ou Unreal Engine n’ont été modifiés. La version 0.2 reste archivée dans [RELEASE_0.2.md](RELEASE_0.2.md).
