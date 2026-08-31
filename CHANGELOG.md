# Changelog

## 0.4.0 — 1er septembre 2026

- **La Nuit des identités** : trois rencontres sociales jouables dans La Nuit de Velours, avec couverture, négociation, corruption, chantage, retrait, coûts et prérequis prévisualisés, conséquences persistantes et garde-fous de consentement.
- Cortex enrichi de files de trois ordres par agent, tir synchronisé, repli, neutralisation/contention et quatre règles d’engagement persistantes. Les agents possèdent désormais des états d’action visibles : déplacement, attaque, impact, interaction, incapacité et contention.
- Treize services actifs à Station Zéro, un par installation, avec coûts, niveaux, recharge par cycle, options et effets persistants. Le stabilisateur réduit réellement le coût d’un changement de corps ; preuves sociales et préparation d’expédition sont journalisées.
- Planche huit directions originale distincte pour le lourd SÔMA et Le Collecteur, générée avec OpenAI ImageGen sans référence externe ; prompts, caractéristiques, limites du chroma et SHA-256 documentés.
- Rechargement routé vers son timbre audio dédié. Réactions tactiques, capture et files d’ordres survivent à une reprise de partie.
- Les préparations de l’armurerie, des drones, du transfert et du garage sont consommées dès le départ, tout en restant dans le snapshot de retry. Retraite, abandon et succès ne permettent plus de les réutiliser.
- Les décisions sociales sont mémorisées hors de l’expédition : quitter puis relancer Velours ne peut plus répéter les gains. Les tirs synchronisés impossibles expirent au temps tactique avec un feedback ; le non-létal incapacite aussi un boss sans autoriser sa capture ; le relais d’urgence réévalue recrutement, présence, vie et confiance avant tout transfert.
- Navigation Cortex au clavier renforcée : focus après sortie du pointer lock, statut live de la case, activation native par Espace, noms accessibles distincts et files groupées. Les commandes principales atteignent 44 px sur mobile.
- Les six grandes planches de sprites sont décodées et détourées séquentiellement pour réduire le pic mémoire au chargement sur mobile.
- Sauvegarde v6 et migration v5 : règles d’engagement, relations sociales, preuves, captifs, préparation des installations, files tactiques et états d’action sont normalisés sans exécuter de donnée importée.
- Couverture automatisée étendue aux systèmes sociaux, installations, tactiques, capture et migration. Les limites restantes — niveaux verticaux réels, véhicules pilotables, animations image-par-image et certification matérielle longue — restent explicites dans l’audit.

## 0.3.0 — 31 août 2026

- Ajout de la transcription accessible du postulat, avec limite de 20 000 caractères et fin tronquée explicites. L’archive binaire originale reste non récupérée.
- Rétablissement de VÉNUS comme IA du désir, d’Incarnation comme mise à jour corporelle obligatoire et du transfert clandestin dans un châssis militaire pendant le prologue.
- Huit cartes de quartiers distinctes et Station Zéro physiquement parcourable; secteurs compacts, services et personnages représentés dans le monde.
- Six missions post-prologue jusqu’au Dernier Abonnement, décisions à conséquences et extraction obligatoire avant récompense. La Nuit de Velours est désarmée.
- Cinq fins reprenant les orientations source. Exode numérique et Retour à la chair deviennent des conclusions consultables sans reprise des transferts ou des expéditions corporelles.
- Nara, Idris et Salomé : recrutement, confiance, fatigue et ordres individuels; carte tactique et déplacement par agent. Idris et Salomé sont des personnages originaux de reconstruction.
- Treize installations améliorables, huit familles d’implants équipables, quinze compétences à prérequis et budget partagé avec les talents historiques.
- Dette locative avec paiement partiel, compatibilité/capacité corporelle, mémoire, soins et repos; sept réputations et contrôle des quartiers.
- Relais facultatifs utilisables aussi pendant les missions, sauvegardés et récompensés une seule fois à l’extraction.
- Ciblage de systèmes adverses, projection/possession conditionnelle de châssis, transfert d’urgence et franchissement d’obstacles bas avec B.
- Sauvegarde v5 et migrations, dont reprise des fins du prologue sans recommencer celui-ci pour accéder à la nouvelle campagne.
- Tests supplémentaires de campagne, cartes, simulation, progression, sauvegarde, coûts, prérequis et non-duplication des récompenses; corrections des boutons de ressources et de fins terminales.
- Révision de la documentation pour distinguer fonctionnalités implémentées, limites du postulat, vérifications automatiques, parcours navigateur et publication. Voir [VALIDATION.md](VALIDATION.md), [AUDIT.md](AUDIT.md) et [RELEASE.md](RELEASE.md) pour l’état effectivement constaté; aucune durée de campagne commerciale n’est annoncée.

## 0.2.0 — 31 août 2026

- Audit P0/P1/P2, simulation indépendante et 52 tests.
- Correction des chargeurs, de la pause, de la détection, du stun, du Cortex, des transferts et des objectifs murés.
- Sauvegarde v4 de l’affrontement ; reprise après défaite et ancres coupées conservées.
- Trois conclusions, contrats avec extraction et récompenses réelles, talents et bonus effectifs de base.
- Contrôles clavier/souris, standard gamepad et tactile ; guide, contraste, réduction des flashs/mouvements.
- Sprites OpenAI huit directions, nouvelle couverture Néo-Massilia, matériaux et armes originaux.
- Export portable avec copie JSON de secours ; précache des bundles, polices et art.
- Workflow de qualité reproductible et provenance détaillée.

## 0.1.0

- Reconstruction jouable de la Vertical Slice SOMA//MASSILIA.
- Ajout du moteur raycast, gameplay Chair/Cortex/Spectre, hub Syndicat/Station Zéro.
- Ajout sauvegarde/migrations/export-import, audio WebAudio, accessibilite, PWA/offline.
- Ajout tests moteur, progression et sauvegarde.
- Port du runtime de publication vers Next.js 16 natif pour Vercel.
- Correction des resets d'arene lors du changement d'arme ou de la destruction d'une ancre.
- Unification de la mort du Collecteur pour les tirs, l'impulsion et Nara, avec tests de non-regression.
