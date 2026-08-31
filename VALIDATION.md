# Validation 0.4.0 — 1er septembre 2026

## Gates reproductibles

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

## Parcours navigateur réellement exécuté

Chromium a été piloté avec `agent-browser 0.35.2` sur la build de production locale `127.0.0.1:3210`. Le navigateur intégré Codex est resté indisponible avant démarrage à cause de son helper ACL Windows ; ce repli est déclaré, pas masqué.

### Parcours sans fixture

Session neuve `soma04`, 1440 × 900 :

1. Menu 0.4.0, trois corps, trois approches, sélection MISTRAL-3 et fausse identité.
2. Entrée jouable dans La Dette de Chair, canvas interne 720 × 320 rendu sur 1440 × 639, sans overlay Next ni débordement horizontal.
3. Déplacement continu au clavier et collision : quai `X 2.5 / Y 14.2` vers le registre `X 13.9 / Y 3.0`.
4. Intrusion Spectre résolue nœud par nœud jusqu'à Ω, à **72 % de trace**, puis injection de la commande.
5. Transition réelle vers la révocation corporelle, compteur 210 s, nouveau monde et objectif de racine clandestine.

Ce parcours a été réalisé pendant la passe 0.4 avant les derniers correctifs P1. La build finale fusionnée a ensuite été reconstruite et contrôlée sur les surfaces directement modifiées ci-dessous. La campagne complète sans injection, du prologue aux six opérations, demeure la preuve historique 0.3 ; elle n'est pas présentée comme rejouée intégralement après chaque modification 0.4.

Après les deux derniers correctifs tactiques et le chargement séquentiel des sprites, une session neuve `soma04-final` a ressigné un contrat, ouvert le prologue et créé le canvas jouable sans débordement horizontal. Les sept ressources bitmap du décor et des six personnages ont toutes été observées dans les entrées réseau, dont le lourd à 1 916 623 octets et Le Collecteur à 1 933 284 octets. `agent-browser errors` n'a remonté aucune erreur. Les régressions boss non létal et horloge tactique sont couvertes par la suite automatisée, pas revendiquées comme rejouées manuellement à travers toute la campagne.

### Fixture avancée isolée

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

## Responsive, tactile et accessibilité

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

## PWA et hors-ligne

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

## Limites de qualification

Pas de manette physique, Safari/iOS/Android réel, téléphone bas de gamme, lecteur d'écran complet, session multi-heures ni playtest externe d'équilibrage. Le téléchargement natif de l'export n'a pas été refait pendant cette passe ; les migrations et aller-retour JSON sont couverts par les tests.

La validation établit une release web compacte, cohérente et vérifiée sur son périmètre. Elle ne constitue ni certification console, ni promesse de durée AAA, ni preuve que les écarts structurels listés dans [AUDIT.md](AUDIT.md) sont réalisés.
