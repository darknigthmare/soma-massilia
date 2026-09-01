# Validation SOMA//MASSILIA

## 0.6.0 — candidate locale vérifiée du 1er septembre 2026

Cette section distingue les contrôles du build local des preuves de publication
qui seront ajoutées après push, CI et déploiement. Elle ne réutilise aucun
résultat 0.5 comme preuve de la 0.6.

### Gates locales reproductibles

- `npm test -- --reporter=dot` : **315 tests dans 16 fichiers**, tous
  réussis.
- `tsc --noEmit --incremental false` : succès.
- `npm run lint` : aucun diagnostic.
- `npm run build` : Next.js **16.3.3**, compilation, TypeScript, génération
  statique et postbuild réussis.
- `npm audit --audit-level=high` : **0 vulnérabilité connue**.
- `git diff --check` : aucune erreur ; seuls les avertissements Windows
  LF/CRLF attendus ont été émis.
- Prébuild : huit planches d’acteurs WebP alpha 768×768, quatre armes
  subjectives WebP alpha 512×512, manifeste fusionné de **12 entrées** et
  manifeste hors ligne de **23 assets**.
- La porte alpha redécode les quatre WebP et refuse les composantes
  significatives de moins de 64 pixels ; les tests vérifient aussi le budget
  décodé inférieur à 32 Mio.

Les nouveaux tests couvrent notamment les délais bloqués, l’annulation pendant
chargement ou attente, les échecs de décodage, les réussites partielles, la
reprise forcée du manifeste, le cache PWA réparé, les accords de boutons
manette et les quatre armes runtime.

### Parcours navigateur du build de production

Le build final a été servi par `npm run start` et piloté avec
`agent-browser 0.36.0`, session Chromium isolée `soma060prod`.

À **1280×720** :

- menu 0.6.0 inspecté visuellement, sans coupe ni défaut bloquant ;
- contrat signé, briefing **La Dette de Chair** ouvert puis entrée réelle dans
  le prologue ;
- canvas Chair actif, objectif du registre, HUD, carte, armes et interactions
  présents ;
- pistolet P-12 rendu en jeu sans damier ni halo visible ;
- fixture QA locale déclarée : seuls les drapeaux de déverrouillage du SMG et
  du fusil ont été activés dans la sauvegarde de session, afin de sélectionner
  et capturer réellement pistolet, mitraillette, fusil et lame dans le même
  canvas. Les quatre rendus ont été inspectés ; cette fixture ne simule aucune
  progression gagnée ;
- `agent-browser console` et `agent-browser errors` sont restés vides.

Manette standard simulée dans le navigateur :

- RT et Start pressés dans la même image ont ouvert **Jeu en pause** tout en
  conservant les munitions à `12 / 72` ;
- une seconde impulsion Start a fermé le dialogue et repris le jeu ;
- ce test valide le routage navigateur, mais ne remplace pas une manette
  physique.

### Dégradation et réparation visuelles

Une réponse WebP invalide de quatre octets a été placée volontairement dans
Cache Storage pour le pistolet, puis la page a été rechargée :

- trois tentatives bornées ont échoué et le bouton **Réessayer** est apparu
  dans le HUD ;
- le fallback procédural a conservé un jeu exploitable ;
- **Réessayer** a contourné l’entrée cache-first, récupéré le vrai WebP et fait
  disparaître le statut ;
- l’entrée Cache Storage réparée répondait `image/webp`, HTTP 200,
  **22 716 octets**.

### Responsive et accessibilité

À **390×844** :

- largeur document 390, débordement horizontal **0** ;
- canvas actif 390×402,5 px ;
- aucun bouton visible mesuré sous 44 px ;
- le HUD, les modes, la carte, les armes et les actions restent lisibles ;
- la build active renvoie **0 violation, 0 contrôle incomplet, 19 règles
  réussies** avec axe-core 4.12.1, tags WCAG 2 A/AA.

Le menu renvoie 0 violation et un contrôle manuel de contraste sur l’image de
fond ; la capture a été inspectée et les textes restent lisibles sur la couche
sombre. Le dialogue Pause renvoie 0 violation ; axe demande une revue de deux
gardes de focus internes Base UI et, au viewport mobile, du texte secondaire.
Le contenu principal possède pourtant `inert=true` et le texte contrôlé a
`rgb(185, 200, 211)` sur un fond opaque `rgb(16, 25, 34)`. Ces revues ne
sont pas transformées en succès automatique ; un lecteur d’écran réel reste
nécessaire.

### PWA et hors-ligne locaux

- service worker prêt et contrôleur présent ;
- cache unique `soma-massilia-v0.6.0`, 44 réponses après navigation QA ;
- `precache.json` version 0.6.0, **23 assets** ;
- pistolet servi en HTTP 200, `image/webp`, **22 716 octets** ;
- une entrée `sprites.json` volontairement périmée est restée servie par le
  cache-first ordinaire, puis `cache: reload` a récupéré le manifeste frais
  et remplacé Cache Storage ;
- sous interception réseau totale, une ressource inconnue a échoué tandis que
  le rechargement du jeu, le canvas, l’objectif courant et le pistolet précaché
  sont restés disponibles.

### Limites de qualification 0.6.0

Pas de manette physique, Safari/iOS/Android réel, téléphone bas de gamme,
lecteur d’écran réel, session multi-heures ni playtest externe. Cette passe a
rejoué menu, contrat, briefing et gameplay initial, mais pas naturellement
l’intégralité du prologue, des six opérations et des cinq fins dans le
navigateur ; progression, migrations et fins restent couvertes par la suite
automatisée. Les quatre armes ont été atteintes par une fixture explicitement
déclarée.

### Publication GitHub, CI et Vercel

En attente du commit, du push, de GitHub Actions, du déploiement Vercel et des
contrôles HTTP publics. Aucun état 0.5 n’est présenté ici comme preuve 0.6.

## 0.5.0 — publication vérifiée du 1er septembre 2026

Cette section réunit les portes locales puis les preuves GitHub, CI, Vercel,
HTTP, navigateur et PWA de la publication 0.5.0. Les validations locales et
publiques restent distinguées : une réponse HTTP 200 ne remplace pas les tests,
et un parcours Chromium ne constitue pas une qualification matérielle.

### Gates locales reproductibles

Les contrôles ont été relancés après les correctifs de portée des formations,
de synchronisation ARIA et de favicon :

- `npm test` : **296 tests dans 15 fichiers**, tous réussis.
- `npx tsc --noEmit` : succès.
- `npm run lint` : aucun diagnostic.
- `npm run build` : Next.js **16.3.3**, compilation, TypeScript, génération
  statique et postbuild réussis.
- `npm audit` : **0 vulnérabilité connue**.
- `git diff --check` : aucune erreur d’espace ; seuls les avertissements
  Windows LF/CRLF attendus ont été émis.
- Prébuild : **8 planches WebP alpha lossless 768×768**, manifeste de cadres
  `public/art/runtime/sprites.json`, favicon ICO déterministe et manifeste
  hors ligne de **23 assets** produits.

La couverture comprend notamment la réservation des positions des agents,
la portée des replis de formation, le rejet des poches inatteignables,
`aria-pressed` dans le Cortex, les relations dirigées, l’audio spatial,
l’accessibilité des acteurs, les sprites civils et les migrations de
sauvegarde.

### Parcours navigateur desktop

La build de production locale a été servie par
`npm run start -- -p 4173` et pilotée avec
`agent-browser 0.35.2`, session `soma05-final`.

À **1440 × 900** :

- menu 0.5.0 rendu sans débordement horizontal ;
- import effectué par le menu et le sélecteur de fichier public avec
  `.qa-local\05-local\station-all-agents.json` ;
- Station Zéro restaurée, puis opération **Une Apparence de Trop** lancée ;
- relations dirigées visibles dans la Cellule NULL ;
- ouvrier/résident et témoin Maëlle inspectés comme silhouettes distinctes
  dans le raycaster ;
- dialogue de Maëlle déclenché avec **E**, puis objectif suivant activé ;
- Cortex ouvert en formation **Coin**, ordre de Salomé placé en file, puis
  clic sur **Repli** : seul Repli expose `aria-pressed="true"` ;
- manifeste runtime et planches demandées servis en HTTP 200 ;
- `agent-browser errors` et la console sont restés vides.

La sauvegarde avancée est une **fixture QA explicitement déclarée**. Elle a été
importée par l’interface publique afin d’atteindre rapidement Station Zéro,
les trois agents et la mission ; elle ne prouve pas que cette progression a
été rejouée naturellement pendant cette passe.

### Mobile et accessibilité automatisée

À **390 × 844**, aucun débordement horizontal n’a été observé. Dans une session
précédente exécutant la même build visuelle, le panneau Cortex mesurait
`clientHeight 322` pour `scrollHeight 1521` : son contenu restait
accessible par défilement.

Axe-core **4.12.1**, tags WCAG 2 A/AA :

- Cortex final : **0 violation**, 21 règles réussies, 1 contrôle incomplet ;
- Cellule NULL finale : **0 violation**, 21 règles réussies, 2 contrôles
  incomplets.

Les contrôles incomplets ne sont pas comptés comme des succès manuels :
contraste sur certains rendus et comportements de focus demandent encore un
essai avec technologies d’assistance réelles.

### PWA, hors-ligne et réponses HTTP locales

La validation PWA finale a constaté :

- service worker prêt, actif et contrôlant la page ;
- cache unique `soma-massilia-v0.5.0` ;
- `favicon.ico`, `civilian-worker.webp` et
  `civilian-witness.webp` présents dans le cache ;
- passage réellement hors ligne, rechargement réussi jusque dans le jeu
  jouable en pause, puis réseau restauré.

Réponses locales observées :

- `favicon.ico` : HTTP 200, `image/x-icon`, environ **1 252 octets** ;
- `civilian-worker.webp` : HTTP 200, **402 948 octets** ;
- `sprites.json` : HTTP 200, **3 398 octets** ;
- `precache.json` : HTTP 200, **1 254 octets**.

### Limites de qualification 0.5.0

Pas de manette physique, Safari/iOS/Android réel, téléphone bas de gamme,
lecteur d’écran réel, session multi-heures ni playtest externe. Les tests de
manette sont des contrôles de mapping et d’arêtes logiques ; le responsive
Chromium ne certifie pas un appareil mobile. La fixture avancée ne remplace pas
un nouveau parcours naturel intégral du prologue aux cinq conclusions.

### Publication GitHub, CI et Vercel

- Commit de release :
  `07deb8bc879066ecd6e05d94f8ff85d37f5dd0d0` (`07deb8b`).
- Branche `main` poussée vers le dépôt public
  https://github.com/darknigthmare/soma-massilia.
- GitHub Actions `validate` :
  [run 33472979351, job 99746336388](https://github.com/darknigthmare/soma-massilia/actions/runs/33472979351/job/99746336388),
  état `completed/success` pour ce SHA.
- Statut GitHub Vercel : succès.
- Déploiement
  `dpl_5M8dyuDSNQxQiKT5jYTdagfCaGUg`, cible production, **READY**.
- URL immuable :
  https://soma-massilia-qu9pqasqu-darknigthmares-projects.vercel.app.
- Liste des alias contrôlée, incluant
  https://soma-massilia.vercel.app.

Après la QA, un scan
`vercel logs <deployment> --level error --since 1h` a renvoyé
`No logs found for darknigthmares-projects/soma-massilia`. Aucun log de
niveau erreur n’a donc été observé dans cette fenêtre ; ce résultat n’est pas
présenté comme une observabilité applicative complète.

### HTTP, navigateur et PWA de production

L’alias public a répondu :

- `/` : HTTP **200**, `text/html` ;
- `/precache.json` : version **0.5.0**, **23 assets** ;
- `/art/runtime/sprites.json` : HTTP **200**, `application/json`,
  **3 398 octets** ;
- `/art/runtime/civilian-worker.webp` : HTTP **200**, `image/webp`,
  **402 948 octets** ;
- `/favicon.ico` : HTTP **200**, `image/vnd.microsoft.icon`,
  **1 252 octets**.

Une session Chromium de production à **1440 × 900** a contrôlé :

- titre et version 0.5.0 visibles, sans débordement horizontal ;
- signature du contrat puis ouverture réelle de **La Dette de Chair** ;
- canvas raycast, dialogue de VÉNUS puis gameplay actif ;
- `agent-browser errors` et console vides ;
- capture du prologue inspectée : overlay lisible, hiérarchie professionnelle
  et aucun défaut bloquant visible.

La PWA de production a atteint les états service worker activé et page
contrôlée. Le cache unique `soma-massilia-v0.5.0` et les 23 entrées du
précache ont été constatés.

La publication 0.5.0 est vérifiée sur ce périmètre. Elle ne signifie pas que
l’archive 0.1.0 perdue a été récupérée, ni que les limites matérielles et
structurelles ont disparu.

## Historique — 0.4.0, 1er septembre 2026

### Gates reproductibles

La chaîne finale, exécutée après les derniers correctifs tactiles, a réussi :

- `npm run lint` : aucun diagnostic.
- `npx tsc --noEmit` : succès.
- `npm test -- --reporter=dot` : **273 tests dans 10 fichiers**, tous réussis.
- Contrôle `oxfmt --check` ciblé sur les fichiers texte modifiés : succès. Les deux PNG originaux sont contrôlés séparément par dimensions et SHA-256. Le dépôt contient aussi des composants UI historiques hors périmètre dont le formatage global n'a pas été imposé.
- `npm audit --omit=dev` : **0 vulnérabilité connue**.
- `npm run build` : Next.js 16.3.3, compilation, TypeScript, génération statique et postbuild réussis.
- `node scripts/precache.mjs` : manifeste hors ligne **0.4.0**, 23 ressources.
- `git diff --check` : aucune erreur d'espace ; seuls les avertissements Windows LF/CRLF attendus ont été émis.

Les tests couvrent moteur raycast, progression, migrations, reprise d'affrontement, tactique, règles d'engagement, synchronisation, capture non létale, consentement du relais d'urgence, actions des treize installations, consommation des préparations, rencontres sociales, historique anti-répétition et sauvegarde portable.

### Parcours navigateur réellement exécuté

Chromium a été piloté avec `agent-browser 0.35.2` sur la build de production locale `127.0.0.1:3210`. Le navigateur intégré Codex est resté indisponible avant démarrage à cause de son helper ACL Windows ; ce repli est déclaré, pas masqué.

#### Parcours sans fixture

Session neuve `soma04`, 1440 × 900 :

1. Menu 0.4.0, trois corps, trois approches, sélection MISTRAL-3 et fausse identité.
2. Entrée jouable dans La Dette de Chair, canvas interne 720 × 320 rendu sur 1440 × 639, sans overlay Next ni débordement horizontal.
3. Déplacement continu au clavier et collision : quai `X 2.5 / Y 14.2` vers le registre `X 13.9 / Y 3.0`.
4. Intrusion Spectre résolue nœud par nœud jusqu'à Ω, à **72 % de trace**, puis injection de la commande.
5. Transition réelle vers la révocation corporelle, compteur 210 s, nouveau monde et objectif de racine clandestine.

Ce parcours a été réalisé pendant la passe 0.4 avant les derniers correctifs P1. La build finale fusionnée a ensuite été reconstruite et contrôlée sur les surfaces directement modifiées ci-dessous. La campagne complète sans injection, du prologue aux six opérations, demeure la preuve historique 0.3 ; elle n'est pas présentée comme rejouée intégralement après chaque modification 0.4.

Après les deux derniers correctifs tactiques et le chargement séquentiel des sprites, une session neuve `soma04-final` a ressigné un contrat, ouvert le prologue et créé le canvas jouable sans débordement horizontal. Les sept ressources bitmap du décor et des six personnages ont toutes été observées dans les entrées réseau, dont le lourd à 1 916 623 octets et Le Collecteur à 1 933 284 octets. `agent-browser errors` n'a remonté aucune erreur. Les régressions boss non létal et horloge tactique sont couvertes par la suite automatisée, pas revendiquées comme rejouées manuellement à travers toute la campagne.

#### Fixture avancée isolée

Une deuxième session jetable `soma04-fixture` a d'abord créé sa propre sauvegarde par l'interface. Seul son stockage isolé a ensuite été transformé en état valide de Station Zéro ; aucune sauvegarde du parcours principal ou de l'utilisateur n'a été écrasée. Cette fixture sert à atteindre rapidement les nouveaux systèmes, pas à prétendre que sa progression a été gagnée.

Contrôles effectués :

- Station Zéro : onglet des **treize installations** présent, options et indisponibilités lisibles.
- Armurerie : confirmation de Précision, message de réussite, données `900 → 894` et ferraille `1400 → 1376`.
- Exploration physique de Station Zéro, rotation vers le métro, invite d'extraction puis retour au commandement.
- La Nuit de Velours : mission désarmée, trajet jusqu'au portier, cinq méthodes et leurs prérequis/coûts/conséquences, négociation confirmée et objectif suivant activé.
- Cortex à deux agents : sélection Nara/Idris, quatre règles d'engagement, files 0/3, carte décrite par un statut live. Une case bloquée a refusé Entrée ; une case libre `X 2.5 / Y 12.5` a ajouté le déplacement 1/3. Espace sur Repli a ajouté l'ordre 2/3.
- Focus du panneau Cortex, sortie du pointer lock, groupes sémantiques et libellés d'ordres ont été inspectés sur la build finale.
- La rencontre sociale résolue annonce le vrai titre « Le seuil des apparences » et conserve un bouton Fermer sticky de 44 px visible en tête.

Aucune erreur applicative n'a été remontée par `agent-browser errors` sur ces parcours.

### Responsive, tactile et accessibilité

À 390 × 844 sur la build finale :

- menu : largeur document 390, débordement horizontal 0, version 0.4.0 visible ;
- Codex, Options, Menu, les trois approches et l'aide mesurent 44 px de haut ;
- gameplay : les trois modes, les sept actions, la carte et le sélecteur de système mesurent 44 px ;
- Cortex : panneau de `top 213` à `bottom 589`, hauteur 376, contenu défilable 1116, aucune coupe par le HUD et aucun débordement horizontal ;
- canvas mobile : 390 × 363 après agrandissement des cibles.

Axe-core 4.12.1, tags WCAG 2 A/AA :

- menu mobile : **0 violation**, 17 règles réussies ;
- gameplay avancé : **0 violation**, 19 règles réussies ;
- rencontre sociale : **0 violation**, 21 règles réussies.

Les éléments « incomplete » concernent la mesure automatique du contraste sur gradients/images et les gardes de focus internes de Base UI ; ils ne sont pas comptés comme des passes manuelles. Un lecteur d'écran réel reste nécessaire pour une qualification commerciale.

### PWA et hors-ligne

Session neuve `soma04-pwa` :

- service worker activé et contrôleur présent après rechargement ;
- cache unique `soma-massilia-v0.4.0` ;
- `precache.json` annonce 0.4.0 et 23 ressources ;
- racine, manifeste, lourd et Collecteur sont présents dans le cache ;
- planche lourd : HTTP 200, 1 916 623 octets ; Collecteur : HTTP 200, 1 933 284 octets ;
- les deux planches ont été chargées par le moteur, avec leurs tailles décodées observées dans les ressources navigateur ;
- le registre traite désormais les six planches séquentiellement afin d'éviter le pic de six décodages RGBA concurrents ; aucun téléphone physique bas de gamme n'est toutefois revendiqué comme qualifié ;
- réseau simulé hors ligne : une requête non précachée a échoué avec `TypeError: Failed to fetch`, tandis que la planche lourd est restée servie en HTTP 200 ;
- après rechargement hors ligne, un nouveau contrat a pu être signé et le canvas jouable du prologue a été créé.

### Limites de qualification

Pas de manette physique, Safari/iOS/Android réel, téléphone bas de gamme, lecteur d'écran complet, session multi-heures ni playtest externe d'équilibrage. Le téléchargement natif de l'export n'a pas été refait pendant cette passe ; les migrations et aller-retour JSON sont couverts par les tests.

La validation établit une release web compacte, cohérente et vérifiée sur son périmètre. Elle ne constitue ni certification console, ni promesse de durée AAA, ni preuve que les écarts structurels listés dans [AUDIT.md](AUDIT.md) sont réalisés.
