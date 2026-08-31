# Audit de fidélité et de production SOMA//MASSILIA

Audit documentaire et de code du 31 août 2026, état de travail **0.3.0**, sauvegarde de schéma 5. Ce document ne constitue ni une annonce de publication de cette version, ni une certification commerciale. Les contrôles effectivement terminés et la publication sont consignés séparément dans [VALIDATION.md](VALIDATION.md) et [RELEASE.md](RELEASE.md).

## Conclusion

**Non, tout le postulat de base n'est pas réalisé.** La reconstruction contient un jeu jouable, un prologue complet, une campagne compacte, des combats, des missions avec extraction et une progression persistante. La 0.3 ajoute des systèmes réellement reliés entre eux : huit quartiers parcourables, Station Zéro physique, trois agents, implants, dette corporelle, objectifs narratifs, contrôle territorial et cinq conclusions.

Elle reste une adaptation compacte de la vision initiale. La ville verticale dense, les véhicules, la personnalisation anatomique et sociale, la richesse des ordres d'escouade, les conséquences économiques émergentes et les sprites modifiés par couches ne sont pas livrés à la profondeur décrite par le postulat. Présenter ces éléments comme achevés serait incorrect. Aucune durée de campagne de 25–60 heures n'a été démontrée ; cette durée n'apparaît pas non plus dans l'extrait source accessible.

## Source et portée de la comparaison

La référence est [POSTULAT_SOURCE.md](POSTULAT_SOURCE.md), transcription de la conversation ChatGPT `6a8f1417-f404-83eb-9684-6957b3425a3a`, message `5c80e9df-f387-4d1b-99f0-72e090e36f2a`. La surface de lecture a renvoyé au maximum 20 000 caractères et signale explicitement une troncature à la dernière fin. Ce n'est pas une transcription intégrale garantie de la conversation ou du document de lore annoncé.

L'archive « Vertical Slice 0.1.0 » annoncée par le message `dd244765-0b5d-4160-9389-dea4cf5c0416`, SHA-256 `c9bcf405d04a86cc0f5a4b82580786b9aec26a95f4e6764f443b38d6d7563c05`, n'a pas été récupérée. Le dépôt contient une reconstruction originale, pas son contenu binaire authentifié. Dialogues détaillés, cartes, règles chiffrées et nouveaux personnages sont des réalisations de cette reconstruction ; leur présence ne prouve pas leur existence dans l'archive perdue.

Dans les tableaux ci-dessous, « présent » signifie observable dans les données et le code, « partiel » une réalisation limitée avec un écart identifié, et « absent » une fonction non implémentée. Un système présent n'est pas automatiquement validé sur tous les navigateurs ou équilibré pour une sortie commerciale.

## Conformité fonctionnelle au postulat

| Domaine | Réalisation présente en 0.3 | Écart restant |
| --- | --- | --- |
| Identité et scénario | Néo-Massilia, 2197 ; propriété corporelle, Cellule NULL, VÉNUS et Protocole Incarnation ; dialogues et journal. | Dialogues et mise en scène reconstruits, non récupérés de l'archive. La manipulation des désirs est surtout narrative, pas une simulation sociale générale. |
| Prologue | La Dette de Chair, révocation, combat/infiltration, transfert vers le châssis militaire MÔLE-9, libération/recrutement de Nara, Collecteur avec transfert de conscience, arrivée à Station Zéro. | La révocation applique des paliers réels de mobilité/recul avant l'échéance fatale ; elle ne simule pas séparément immunité, organes, publicités rétiniennes et armes internes. |
| Monde | Huit cartes de quartiers distinctes de 24 × 24 cases, palettes propres, entrées selon l'approche, PNJ, objectifs, relais et extraction ; Station Zéro de 32 × 32 cases. | Raycasting sur une grille essentiellement plane, pas une ville entièrement 3D et verticale. Pas de conduite, canaux navigables, métro parcouru en véhicule, ascenseurs industriels ni écosystèmes autonomes. |
| Campagne principale | Six opérations après le prologue reprennent les missions représentatives : Apparence, If, Velours, Mistral, Bonne Mère, Dernier Abonnement. Objectifs physiques, décisions à l'extraction, récompenses et déblocages persistants. | Missions compactes, souvent trois objectifs. Les approches modifient les accès et l'opposition, mais ne constituent pas l'ensemble des solutions sociales, identitaires, économiques et politiques du postulat. |
| La Nuit de Velours | Quartier et mission sans ennemis hostiles ; tirs et impulsion interdits, armes masquées ; objectifs sociaux et réseau. | Pas de simulation complète d'invitation, apparence, préférences individuelles, manipulation des invités ou spectacle vivant. |
| Mode Chair | Vue subjective, tir, lame, infiltration, interaction, recul, rechargement, munitions, blindage et franchissement contextuel de rambardes basses avec coût neural et contrôle d'atterrissage. | Franchissement ponctuel, pas de parkour libre, escalade, plusieurs étages ni parcours acrobatiques. |
| Armement et dommages | Pistolet, mitraillette, fusil, lame ; ciblage torse/moteur/arme/optique avec effets sur mouvement, tir ou détection. | Quatre armes, pas toutes les familles de la source. Tir instantané calculé sur la carte, pas des projectiles physiques 3D. Un système neutralisé par acteur, pas une anatomie complète avec énergie, processeur, stockage cortical et liaison réseau indépendants. |
| Ennemis et conscience | Gardes, lourds, drones, Collecteur ; détection, suspicion, déplacement et ligne de vue ; ancres de transfert du boss. | IA compacte ; pas de population capable de sauvegardes, copies, remplacements et guerres autonomes. La destruction du corps/conscience n'est pas un système universel appliqué à tous les personnages. |
| Mode Cortex | Ralentissement réel, sélection séparée de trois agents recrutables, ordres suivre/couvrir/tenir/cibler/interagir/déplacer ; déplacement ciblé sur la carte. | La caméra principale reste subjective avec carte tactique, pas la caméra surélevée décrite. Pas de véritable tir synchronisé, règles d'engagement, capture non létale, extraction de corps, protection de civil ou planification multi-ordres. |
| Agents | Nara Velvet, Idris Senn et Salomé Craie sont des acteurs de terrain distincts. Nara aide au piratage/sabotage, Idris protège, Salomé soigne. Confiance et fatigue ont des effets ; transfert d'urgence sous conditions. | Corps et conscience ont des champs distincts, mais pas d'inventaire libre d'enveloppes pour toute l'escouade, souvenirs privés jouables, relations croisées évolutives ou dettes individuelles exploitées en mission. Les convictions ne pilotent pas une IA sociale générale. |
| Mode Spectre | Piratage à distance d'objectifs réseau, contrôle de drone et de gardes/lourds sous condition de compétence/implant ; dépenses de charge et corps laissé exposé. | Réseau local d'entités interactives, pas une seconde ville numérique libre. Pas de possession arbitraire de civil, véhicule, implant individuel ou conscience de boss. |
| Piratage | Grilles jouables avec trace, glace, ressources et programmes ; intégration aux objectifs et au programme Marionnette. | Mini-jeu dédié, pas une topologie réseau persistante de la ville avec services et conséquences autonomes. |
| Trois corps | Trois profils aux statistiques et capacités différentes ; changement à la base, frais, tension et perte mémorielle. | Ce sont des châssis prédéfinis, pas un créateur complet de silhouette, sexe, voix, vêtements, signature hormonale et anatomie. |
| Quatre tensions | Charge neurale, capacité d'implants, tension somatique, intégrité mémorielle et dette sont enregistrées et influent sur les actions/statistiques. Loyer périodique après des opérations narratives, paiement et repos possibles. | Représentation chiffrée bornée. Pas d'adaptation à six bras/quadrupédie, souvenirs contradictoires jouables, hallucinations techniques ou fiabilité juridique propre à chaque implant. |
| Implants | Huit implants achetables/équipables, un par famille ; capacité selon le corps ; bonus réellement consommés par la simulation : intégrité, blindage, charge, vitesse, dégâts, discrétion, impulsion, possession, régénération. | Une entrée par famille n'équivaut pas à une gamme complète. Les implants sociaux restent des effets simplifiés ; les modifications de membres, peau, visage, posture et silhouette par couches visuelles sont absentes. |
| Progression | Cinq branches, quinze compétences avec prérequis, effets et coût en points ; budget partagé avec les talents historiques. | Trois niveaux linéaires par branche, pas cinq arbres riches couvrant toutes les capacités citées dans la source. |
| Syndicat et factions | Sept factions nommées, réputation, contrôle/agitation des quartiers, choix politiques et relais physiques libérables ; effets de réputation sur la détection, gardes de secteur libéré neutres jusqu'à agression. | Pas de guerres inter-factions autonomes, pénuries d'implants, chaîne de production, marché dynamique, diplomatie détaillée ou bataille finale entièrement recomposée par chaque alliance et territoire. |
| Station Zéro | Treize espaces/services améliorables dans la carte, résidents et dialogues ; effets concrets des niveaux sur capacité, transfert, confiance, repos, récompenses et statistiques. Les six installations historiques sont conservées. | Les salles représentent des services à niveaux. Pas de calendrier de personnel, recherche avec recettes, aménagement libre, vie quotidienne autonome, véhicules fonctionnels ou interrogatoires/captures jouables. La « salle des témoignages » est une adaptation originale de l'installation source. |
| Conclusions | Cinq conclusions principales avec conséquences sur dette, factions, territoires et état de la cellule ; distinctes des trois épilogues historiques du prologue. Chair/Exode verrouillent les mutations et déplacements après la conclusion. | Conclusions textuelles et modifications d'état, pas cinq campagnes post-finales ou simulations sociétales complètes. |
| Présentation | Sprites directionnels découpés en huit vues, rendu avec distance/occlusion, interfaces et art originaux. Idris et Salomé ont leurs planches distinctes et sont visibles ensemble avec Nara à Station Zéro. | Huit angles ne sont pas huit cycles d'animation. Pas de planches complètes marche/tir/recharge/blessure/mort ni de couches visuelles d'implants. |
| Audio et accessibilité | Audio synthétisé, volumes/réglages, sous-titres textuels, options de confort et contraste, difficulté, clavier ZQSD/WASD, commandes tactiles et mapping manette ; sauvegarde, export/import, PWA. | Pas de doublage, production sonore enregistrée/masterisée ni campagne de tests matériels exhaustive. Présence du mapping manette ou du tactile ne vaut pas validation sur manette et téléphone physiques. |

Les implémentations se trouvent principalement dans [campaign-data.ts](game/campaign-data.ts), [campaign.ts](game/campaign.ts), [districts.ts](game/districts.ts), [simulation.ts](game/simulation.ts), [save.ts](game/save.ts), [RaycastViewport.tsx](components/game/RaycastViewport.tsx) et [ContinuityHub.tsx](components/game/ContinuityHub.tsx). Le rendu et ses limites sont visibles dans [renderer.ts](game/renderer.ts) et [sprite-assets.ts](game/sprite-assets.ts).

La présentation publique non explicite et les personnages adultes respectent la demande de livraison. L'absence de scènes sexuelles explicites n'est donc pas un défaut à corriger. En revanche, les interactions sociales individualisées, relations optionnelles et réactions aux modifications corporelles restent des écarts fonctionnels au postulat, même dans une présentation non explicite.

## P0 — Fiabilité et conditions de publication

Les défauts critiques constatés sur la reconstruction initiale ont reçu des corrections en 0.2 : chargeurs renouvelés gratuitement au changement d'arme, simulation active dans les menus/piratages, intrusions insolubles, entités dans les murs, réinitialisation du Collecteur pendant son transfert et checkpoints ne conservant pas l'état réel du combat. Cette version avait fait l'objet d'un parcours navigateur documenté ; ce résultat historique ne valide pas automatiquement les nouveaux chemins 0.3.

Pour la 0.3, les critères critiques de validation sont :

- Rejouer un nouveau contrat jusqu'à Station Zéro, puis la campagne ajoutée par commandes normales, avec les vrais passages dialogue → objectif → choix → extraction → mission suivante.
- Confirmer la reprise après mort et rechargement pendant une opération, sans disparition d'objectif, récompense gratuite, reset d'ancre ou incohérence de corps.
- Vérifier les migrations et l'import/export des anciennes sauvegardes ainsi que les sauvegardes de schéma 5.
- Exécuter la suite complète, le contrôle de types, le lint, le build, l'audit des dépendances et les contrôles PWA après les dernières modifications, puis vérifier réellement la production publiée.

L'audit de code ne déclare pas ces portes franchies à la place des preuves de [VALIDATION.md](VALIDATION.md). Une compilation ou un HTTP 200 ne prouve pas à lui seul que toute la campagne est terminable.

## P1 — Défauts d'intégration corrigés pendant la passe 0.3

| Défaut identifié | Correction présente | Couverture ou réserve |
| --- | --- | --- |
| Les agents générés par les quartiers recevaient tous les dégâts génériques d'un allié. | Priorité à leur identité : dégâts distincts Idris/Nara/Salomé, sans confondre un drone allié avec un agent. | Tests sur les véritables acteurs produits par les cartes, avant et après aller-retour JSON. |
| Le guidage disparaissait lorsque les objectifs étaient terminés ; sortie de Station Zéro peu identifiable. | Objectif de navigation dédié : objectif restant, puis métro/extraction, avec marqueur et libellé adaptés. | Tests sur vraie mission, reprise sauvegardée, chemin et interaction de sortie de Station Zéro. |
| Un relais facultatif accompli pendant une mission narrative n'était pas conservé comme objectif valide. | Objectif facultatif reconnu, sauvegardé et récompensé à l'extraction ; libération non répétable et non exigée pour finir la mission. | Cas dédiés dans les tests de campagne. |
| Les nouveaux points de progression pouvaient être comptés indépendamment des talents historiques. | Budget partagé et normalisation des achats/prérequis. | Tests de progression/campagne ; l'équilibrage global reste une question distincte. |
| Une branche de piratage d'objectif court-circuitait l'effet Marionnette. | Récompense d'intrusion centralisée, appelée aussi par les objectifs narratifs. | Branchement courant inspecté ; validation end-to-end du programme à consigner avec la QA finale. |
| Certaines activités de base pouvaient contredire les fins Chair/Exode. | Fins terminales : consultation du journal, de la ville et de la cellule, sans achats, transferts, améliorations ou nouveaux voyages. | Garde au niveau des règles et interface désactivée ; ne pas confondre cette fermeture avec un softlock de mission. |

## P1 — Écarts de fidélité encore ouverts

Ces écarts ne sont pas de simples finitions visuelles ; ils demandent de nouveaux systèmes et du contenu, puis des tests dédiés :

- Étendre les approches au-delà des variantes d'accès et des choix conclusifs : identité, négociation, corruption, chantage, capture, extraction de cible ou remplacement synthétique réellement jouables.
- Donner aux agents des règles d'engagement, ordres combinés, mémoire personnelle, relations entre membres et séparation conscience/enveloppe utilisable sur toute l'escouade.
- Développer les conséquences urbaines : alliances opérantes, affrontements entre factions, production/pénurie, contrôle influençant effectivement plusieurs séquences de l'assaut final.
- Donner une fonction propre aux laboratoires, garage, interrogatoire/témoignages, personnalisation des quartiers personnels et spécialistes recrutés, au-delà de bonus de niveau.
- Relier les modifications corporelles à une anatomie, une apparence et des réactions sociales individualisées ; rendre les huit familles d'implants plus diversifiées.
- Réaliser les couches visuelles d'implants et les animations d'actions, sans présenter les huit orientations actuelles comme une animation complète.

La verticalité structurelle, les véhicules et une ville semi-ouverte très dense supposent également une évolution du moteur et des cartes. Le franchissement des rambardes ajouté en 0.3 ne les remplace pas.

## P2 — Présentation, équilibrage et qualité commerciale

Les principales réserves de production sont la variété limitée des silhouettes ennemies/PNJ, l'animation d'action, la direction sonore, la densité de dialogues et de mise en scène, l'équilibrage des récompenses/répétitions, la lisibilité des nombreux panneaux et les performances sur matériel modeste. Les opérations répétables prolongent la boucle, mais ne prouvent ni une grande durée de contenu scénarisé ni une progression équilibrée sur plusieurs heures.

Une qualification commerciale demanderait notamment des sessions prolongées avec de nouveaux joueurs, la vérification matérielle de la manette et du tactile, Safari/iOS/Android, les reprises hors-ligne après mise à jour, les téléchargements d'export natifs et les parcours d'accessibilité. Les mesures de contraste/focus et un contrôle automatisé ne remplacent pas un essai complet avec les technologies d'assistance.

Les nouvelles images OpenAI doivent être évaluées comme de véritables assets : identité des personnages, cadrage des huit directions, lisibilité en jeu, détourage, occlusion et taille de téléchargement. Une image générée n'est pas considérée validée parce que son fichier existe. Sa provenance doit rester consignée dans le dépôt ; elle ne doit pas être attribuée à l'archive originale.

## Contrôles exécutés pour cette passe d'audit

La passe systèmes a réellement exécuté avec succès :

- `npx vitest run --config vitest.config.ts tests/deep-simulation.test.ts tests/simulation.test.ts` : **68 tests ciblés, 2 fichiers** au moment du contrôle.
- `npx oxlint game/simulation.ts components/game/RaycastViewport.tsx tests/deep-simulation.test.ts` : aucun avertissement ni erreur.
- `npx tsc --noEmit` : succès.

Ce nombre n'est pas le total final du dépôt. La suite complète et la QA navigateur, y compris le contrôle runtime des nouvelles planches, sont consignées dans [VALIDATION.md](VALIDATION.md). Le contrôle HTTP de la production appartient à [RELEASE.md](RELEASE.md).

Le bon statut est donc : **reconstruction originale fortement enrichie, avec systèmes jouables et écarts de fidélité explicités ; validation finale et promesse commerciale à distinguer de la quantité de fonctions présentes.**
