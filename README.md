# SOMA//MASSILIA — La Chair sous Licence

**Édition 0.2.0 — La Dette de Chair.** Action-RPG cyberpunk original à Néo-Massilia, en 2197.

[Jouer](https://soma-massilia.vercel.app) · [Dépôt](https://github.com/darknigthmare/soma-massilia)

Votre corps est un abonnement. Votre identité, une clause révocable.

## Un parcours jouable, du contrat à la Cellule NULL

Choisissez MISTRAL-3, MÔLE-9 ou SIBYLLE-6 et une approche combat, fausse identité ou sabotage. Traversez les Docks, survivez à votre révocation, libérez Nara Velvet puis affrontez Le Collecteur et ses ancres de conscience. Développez Station Zéro, choisissez une des trois conclusions et poursuivez avec trois contrats rejouables.

- Vue subjective raycastée, personnages 2D huit directions, matériaux et armes originaux.
- Pistolet, mitraillette, fusil et lame : chargeurs persistants, rechargement, recul, blindage et attaque dans le dos.
- Gardes, lourds et drones : vision, bruit, suspicion, poursuite et perte de contact.
- Cortex : ralentissement cohérent, carte et cinq ordres pour Nara.
- Spectre : intrusion en grille, quatre programmes, assistance facultative et possession de drones. Votre corps reste sur place.
- Syndicat : récupération d’archives **et extraction** avant récompense ; difficulté des contrats augmentant avec les répétitions.
- Six installations, cinq branches de talents à trois rangs, trois corps aux bonus distincts.
- Sauvegarde v4, migration v1–v3, secours local, reprise exacte, export/import JSON.
- Audio procédural, clavier, souris, manette standard, tactile, options d’accessibilité et PWA hors ligne.

## Périmètre honnête

Cette édition contient le **prologue complet**, quatre cartes de campagne et trois contrats réutilisant des cartes avec objectifs/extraction/rangs. Elle ne contient pas huit quartiers entièrement explorables, une longue campagne doublée, un monde ouvert, du multijoueur ou une certification console. Nara est l’unique équipière jouable par ordres. Une validation sur matériel mobile/manette réel et des essais d’équilibrage longue durée restent nécessaires avant de présenter le projet comme un produit commercial finalisé.

Fiction adulte non explicite : dette corporelle, coercition et violence stylisée. Tous les personnages sont adultes.

## Commandes

WASD/ZQSD : mouvement · souris/flèches : regard · espace/clic : tir · E : action · R : rechargement · F : impulsion · 1–4 : armes · Maj/Ctrl : course/furtivité · C/V : Cortex/Spectre · M : carte · Échap : pause.

Manette standard : sticks, RT tir, A action, X recharge, Y impulsion, LB Cortex, RB arme, Select Spectre, Start pause. Guide complet et activation tactile manuelle dans le menu.

## Développement et validation

Node 24 recommandé, npm et verrou de dépendances inclus.

```sh
npm ci
npm run qa
npm start
```

`npm run qa` exécute lint, 52 tests de moteur/progression/sauvegarde et build TypeScript/Next.js. Le build génère les icônes puis le manifeste des ressources hors ligne. Le workflow GitHub `Quality` refait ces contrôles sur les pushes/PR, sans secret de déploiement.

Pour tester le hors ligne, utilisez **le build de production**, pas le serveur de développement. Chargez une première fois en ligne puis laissez le service worker finir l’installation avant de couper le réseau.

## Documents permanents

[Audit](AUDIT.md), [contrôles réellement exécutés](VALIDATION.md), [canon](LORE_BIBLE.md), [reconstruction](RECONSTRUCTION.md), [provenance des assets](ASSET_PROVENANCE.md), [journal](CHANGELOG.md).

L’archive originale annoncée n’a pas été récupérée. Ce dépôt prolonge une reconstruction et ne prétend pas restaurer ses fichiers binaires exacts.
