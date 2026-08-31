# SOMA//MASSILIA — La Chair sous Licence

**Version 0.3.0 — Le Protocole Incarnation.** Action-RPG cyberpunk original à Néo-Massilia, en 2197.

[Jouer](https://soma-massilia.vercel.app) · [Dépôt](https://github.com/darknigthmare/soma-massilia) · [Révision réellement publiée](RELEASE.md)

Votre corps est un abonnement. Votre identité, une clause révocable.

## Du corps révoqué au Dernier Abonnement

Le prologue **La Dette de Chair** commence aux Docks de Velours : choisissez un corps loué et une approche, subissez la révocation progressive de vos systèmes, puis transférez clandestinement votre conscience dans un châssis militaire abandonné. Libérez Nara Velvet, coupez les ancres du Collecteur et fondez la Cellule NULL à Station Zéro.

La campagne 0.3 ajoute six opérations : **Une Apparence de Trop**, **Les Années d’If**, **La Nuit de Velours**, **Mistral Noir**, **Bonne Mère, Mauvaise Foi** et **Le Dernier Abonnement**. VÉNUS n’est pas seulement une aide : ce fragment d’IA a été conçu pour prévoir et manipuler les désirs. Le Protocole Incarnation prépare une mise à jour obligatoire des émotions, de l’apparence et du comportement des corps sous licence.

Les missions demandent des objectifs sur le terrain, une décision puis une extraction. Les récompenses ne sont pas accordées au simple lancement. Les choix influencent les factions, les territoires, la confiance et les recrutements. Les relais de quartier sont des objectifs facultatifs persistants, récompensés une seule fois à l’extraction.

Les cinq conclusions reprennent les orientations du postulat : **Libération somatique**, **Le Nouveau Syndicat**, **Conscience commune**, **Exode numérique** et **Retour à la chair**. Les deux dernières ferment les expéditions corporelles et les transferts; le parcours reste consultable.

## Systèmes implémentés

- **Chair** : vue subjective raycastée, personnages en sprites 2D huit directions, pistolet/mitraillette/fusil/lame, rechargement, recul, blindage et frappe furtive. Ciblage du moteur, des armes ou des optiques; franchissement d’obstacles bas.
- **Cortex** : ralentissement, carte tactique, sélection et ordres individuels aux trois agents recrutables. Nara, Idris et Salomé conservent confiance, fatigue et corps actif.
- **Spectre** : piratage en grille, programmes réseau, possession de drones et de certains châssis humains sous condition de compétence ou d’implant. La charge, la portée et le corps laissé derrière soi comptent.
- **Syndicat** : huit cartes de quartiers distinctes, Station Zéro physiquement parcourable, missions, relais, relations avec sept factions et contrôle territorial.
- **Corps et progression** : trois châssis aux statistiques distinctes, huit implants représentant huit familles, capacité d’équipement limitée, tension somatique, mémoire et dette locative. Paiement partiel, soins et repos sont disponibles à la base.
- **Station Zéro** : treize installations améliorables avec effets sur les capacités, les transferts, les récompenses ou la récupération; présence physique de personnages et de services.
- **Aptitudes** : quinze compétences dans cinq branches avec prérequis. Leur budget de points est partagé avec les talents historiques du prologue.
- **Continuité** : sauvegarde v5, migrations v1–v4, sauvegarde locale de secours, reprise d’affrontement et d’expédition, export/import JSON et copie de secours.
- **Présentation** : audio synthétisé, clavier/souris, mappage manette standard, commandes tactiles, options d’accessibilité et PWA hors ligne.

Les quatre cartes du prologue, les trois contrats rejouables et les équipements historiques sont conservés. Les trois anciens épilogues de la reconstruction ne remplacent pas les cinq fins de la nouvelle campagne.

## Périmètre et limites

Cette version étend une reconstruction jouable. **Huit cartes de quartiers ne signifient pas huit vastes quartiers semi-ouverts de production commerciale.** Les secteurs restent compacts et les missions structurées autour de points d’interaction. Station Zéro possède une carte et des personnages, pas une simulation exhaustive de leur vie quotidienne.

Le postulat décrit une ambition plus large : nombreuses armes et transformations visuelles, infrastructures 3D complexes, véhicules pilotables, réseaux et relations sociales plus riches, conséquences économiques systémiques. Tout cet éventail n’est pas implémenté. Les sprites partagent encore des planches et ne reflètent pas chaque implant par des couches graphiques spécifiques.

Aucune durée de campagne de 25–60 heures ni qualification de « jeu commercial complet » n’est revendiquée. Les tests automatiques, la vérification de navigateur, la couverture matérielle mobile/manette et la publication sont des contrôles distincts : consulter [l’audit](AUDIT.md), [la validation réelle](VALIDATION.md) et [la livraison](RELEASE.md). Une fonctionnalité listée ici n’atteste pas à elle seule qu’elle a été jouée de bout en bout dans un navigateur.

Fiction adulte non explicite : dette corporelle, consentement, exploitation économique et violence stylisée. Tous les personnages sont adultes.

## Commandes

WASD/ZQSD : mouvement · souris/flèches : regard · espace/clic : tir · **E** : action · **R** : rechargement · **F** : impulsion · **B** : franchir un obstacle bas · **1–4** : armes · Maj/Ctrl : course/furtivité · **C/V** : Cortex/Spectre · **M** : carte · Échap : pause.

Dans le Cortex, sélectionnez l’agent et son ordre; un clic sur la carte donne un point de déplacement. Le sélecteur « Système visé » choisit le torse, le moteur, l’arme ou les optiques. La Nuit de Velours interdit les armes et l’impulsion, même si une sauvegarde demande une approche offensive.

Manette standard : sticks, RT tir, A action, X recharge, Y impulsion, LB Cortex, RB arme, Select Spectre, Start pause. Les boutons d’interface restent disponibles pour les actions supplémentaires. Guide et activation tactile manuelle dans le menu. Le mappage n’est pas une certification de tous les périphériques.

## Développement et contrôles reproductibles

Node ≥22.13 et npm; verrou de dépendances inclus.

```sh
npm ci
npm run qa
npm start
```

`npm run qa` exécute le lint, la suite de tests puis le build Next.js. Les tests couvrent notamment moteur, simulation, campagne, progression, cartes et sauvegardes. Le build génère les icônes et le manifeste des ressources hors ligne. Le workflow GitHub `Quality` reprend les contrôles automatisés sur les pushes et PR, sans secret de déploiement.

Pour un contrôle TypeScript distinct : `npx tsc --noEmit`. Pour le développement : `npm run dev`.

Testez le hors ligne sur **le build de production**, pas sur le serveur de développement. Chargez une première fois en ligne et laissez le service worker terminer son installation avant de couper le réseau. Un test hors ligne d’une version précédente ne valide pas automatiquement les nouveaux parcours.

## Documents permanents

[Postulat accessible](POSTULAT_SOURCE.md) · [Lore et interprétations](LORE_BIBLE.md) · [Reconstruction](RECONSTRUCTION.md) · [Provenance des assets](ASSET_PROVENANCE.md) · [Audit](AUDIT.md) · [Contrôles exécutés](VALIDATION.md) · [Livraison](RELEASE.md) · [Journal des versions](CHANGELOG.md).

La transcription source disponible est limitée à 20 000 caractères et explicitement tronquée. L’archive binaire annoncée n’a jamais été récupérée. Ce dépôt ne prétend pas en restaurer les fichiers exacts.
