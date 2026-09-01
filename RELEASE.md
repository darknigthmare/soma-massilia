# Livraison 0.6.0 — Corps incarnés — 1er septembre 2026

- Jeu public : https://soma-massilia.vercel.app
- Dépôt public : https://github.com/darknigthmare/soma-massilia
- Commit applicatif audité, poussé sur `main` et déployé :
  `db9efe06d8db2c5769a074d873d2774c6f650a00` (`db9efe0`).
- GitHub Actions `validate` :
  [run 33484061608, job 99779925849](https://github.com/darknigthmare/soma-massilia/actions/runs/33484061608/job/99779925849),
  `completed/success` pour ce SHA.
- Déploiement Vercel : `dpl_2qfzQ742yDiC1upK88dNkHKDLtCG`, cible
  production, état **READY**.
- URL immuable vérifiée via `vercel inspect` :
  https://soma-massilia-964fh6bor-darknigthmares-projects.vercel.app. Son accès
  anonyme redirige en HTTP 302 vers Vercel SSO.
- Alias de production attaché et contrôlé :
  https://soma-massilia.vercel.app

## Portes de publication

- `npm run qa` : lint sans diagnostic, **315/315 tests dans 16 fichiers**,
  TypeScript et build Next.js 16.3.3 réussis.
- `tsc --noEmit --incremental false` : succès indépendant.
- `npm audit --audit-level=high` : **0 vulnérabilité connue**.
- `git diff --check` et contrôle `oxfmt` ciblé : succès.
- Prébuild déterministe : huit acteurs WebP alpha 768×768, quatre armes WebP
  alpha 512×512 et manifeste de douze entrées.
- Postbuild : manifeste hors ligne 0.6.0 de **23 assets**.
- Le composite natif des quatre armes a été inspecté sur fonds noir, magenta et
  blanc par deux revues indépendantes : aucun damier, bloc ou halo structuré.
- Workflow GitHub `validate` du commit applicatif : succès.
- Déploiement Vercel de production : READY.

## Contrôles publics réellement exécutés

L’alias public a répondu :

- `/` : HTTP **200**, `text/html`, **9 953 octets** ;
- `/sw.js` : HTTP **200**, `application/javascript`, **2 758 octets** ;
- `/precache.json` : HTTP **200**, version **0.6.0**, **23 assets**,
  **1 454 octets** ;
- `/art/runtime/sprites.json` : HTTP **200**, `application/json`, manifeste de
  **12 entrées**, **5 040 octets** ;
- `/art/runtime/viewmodels/pistol.webp` : HTTP **200**, `image/webp`,
  **22 716 octets** ;
- `/art/runtime/viewmodels/smg.webp` : HTTP **200**, `image/webp`,
  **32 526 octets** ;
- `/art/runtime/viewmodels/rifle.webp` : HTTP **200**, `image/webp`,
  **31 534 octets** ;
- `/art/runtime/viewmodels/blade.webp` : HTTP **200**, `image/webp`,
  **27 694 octets**.

Le HTML public contient le titre et l’identité SOMA//MASSILIA attendus. Après
les requêtes de contrôle,
`vercel logs <deployment> --level error --since 1h` a répondu
`No logs found for darknigthmares-projects/soma-massilia`. Aucun log d’erreur
n’a été observé dans cette fenêtre bornée ; ce scan ne constitue pas une
observabilité applicative complète.

## Parcours navigateur et PWA

Le même arbre applicatif a été construit puis servi localement en mode
production. Une session Chromium isolée a réellement vérifié :

- menu 0.6.0, contrat, briefing **La Dette de Chair** et entrée dans le
  gameplay Chair ;
- pistolet, mitraillette, fusil et lame dans le canvas, avec une fixture locale
  explicitement limitée aux déverrouillages nécessaires ;
- responsive 1280×720 et 390×844, sans débordement horizontal ni cible visible
  sous 44 px ;
- pause manette atomique, réparation d’un WebP volontairement corrompu,
  remplacement du cache sur `cache: reload` et reprise hors ligne ;
- gameplay mobile axe-core : **0 violation, 0 contrôle incomplet, 19 règles** ;
- console et erreurs de page vides sur les parcours documentés.

Les captures vérifiées sont conservées dans
[docs/screenshots/0.6.0](docs/screenshots/0.6.0/README.md). Le runtime Browser
intégré à la session Codex n’a pas pu s’initialiser après publication à cause
d’un échec ACL Windows. Aucun second parcours navigateur sur l’alias public
n’est donc prétendu : les contrôles publics ci-dessus sont HTTP, CI et Vercel,
distincts de la QA Chromium locale.

## Provenance et périmètre

L’archive annoncée « Vertical Slice 0.1.0 », SHA-256
`c9bcf405d04a86cc0f5a4b82580786b9aec26a95f4e6764f443b38d6d7563c05`,
n’a pas été récupérée et cette empreinte n’a pas été recalculée. La 0.6.0 est
une **reconstruction originale documentée**, pas l’archive binaire
authentifiée.

Les quatre viewmodels sont des générations OpenAI originales sans image de
référence, puis détourées, normalisées et compressées localement par un
pipeline déterministe. Les sources reçues étaient opaques avec un damier
visuel, pas des PNG à transparence native. Prompts, dérivés et SHA-256 figurent
dans [ART_VIEWMODEL_PROMPTS.md](ART_VIEWMODEL_PROMPTS.md) et
[ASSET_PROVENANCE.md](ASSET_PROVENANCE.md).

La qualification ne couvre pas une manette physique, Safari/iOS/Android réel,
un téléphone bas de gamme, un lecteur d’écran réel, une session multi-heures,
un playtest externe ni une campagne naturellement rejouée de bout en bout dans
ce dernier parcours navigateur. La suite automatisée couvre progression,
migrations, opérations et conclusions. Cette production web demeure une
campagne solo compacte, pas une certification console ni une production AAA.
Les thèmes adultes concernent uniquement des adultes et restent non explicites
dans la présentation publique.

Ni le launcher global, ni Stargate, SNL ou Unreal Engine n’ont été modifiés.
L’historique des versions antérieures reste conservé dans
[VALIDATION.md](VALIDATION.md) et [CHANGELOG.md](CHANGELOG.md).
