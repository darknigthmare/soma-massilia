# Audit de production SOMA//MASSILIA

Base inspectée le 31 août 2026 : `187da27db84c4405fe49628577b2660d536d7195`.
L'archive historique n'a pas été récupérée. Cette édition prolonge la reconstruction publiée.

## Défauts constatés avant correction

| Priorité | Constat | Conséquence |
| --- | --- | --- |
| P0 | Le changement d'arme crée un chargeur neuf | Munitions infinies |
| P0 | Menus, piratage et mort ne suspendent pas la simulation | Mort hors contrôle, progression fragile |
| P0 | Piratage vérifié comme graphe, sans tenir compte de la glace/trace | Intrusions insolubles |
| P0 | Placement d'entités dans des murs et transfert du boss non validé | Navigation et combat bloqués |
| P0 | Remontage du monde sur transfert du Collecteur | Réinitialisation du combat |
| P0 | Sauvegarde sans position, chargeurs ni état des ennemis | Rechargement de page exploitable, reprise imprécise |
| P1 | Impulsion désactive les ennemis indéfiniment | Combat sans contrepartie |
| P1 | Tir allié sans ligne de vue, dégâts non ralentis en Cortex | Incohérence tactique |
| P1 | Ordres Focus/Interaction, progression et installations sans effet complet | Boutons sans boucle de jeu |
| P1 | Pas de tactile/manette, clavier physique/logique mélangé | Contrôles incomplets |
| P1 | Dialogue seulement superposé sur grand écran | Narration absente sur mobile |
| P1 | Titre débordant, police de repli sérif, panneaux superposés | Lisibilité insuffisante |
| P1 | Fin bloquant l'accès à Station Zéro, opérations à récompense instantanée | Absence de boucle après campagne |
| P2 | Sprites humains géométriques, rendu d'occlusion approximatif | Présentation trop sommaire |



## Corrections livrées en 0.2.0

Les P0 ci-dessus ont reçu une correction de moteur et des tests ; le parcours navigateur
confirme Docks → révocation → Nara → Collecteur → Station Zéro.
La simulation est indépendante de React, le checkpoint conserve l’affrontement, les intrusions
ont des solutions réellement exécutables, et la mort/reprise ne rétablit pas les ancres coupées.

Les P1 de boucle et de commandes sont implémentés : ordres, possession de drone, installations,
talents, contrats à extraction et retour après conclusion. Des tests et une session jouée
les couvrent, sans remplacer les essais matériels/équilibrage restants.

La présentation reçoit trois images OpenAI originales, de nouveaux matériaux et armes,
un HUD adaptable et un panneau d’export de secours. Le téléchargement natif reste non validé
dans le harness ; l’export par copie et l’import ont été vérifiés.

## Critères de sortie et réserves

Campagne complète depuis un nouveau contrat par commandes normales ; mort/reprise ;
intrusions finissables ; sauvegarde/export/import ; mission de Station Zéro ;
interfaces desktop/mobile ; absence d'erreur navigateur ; tests de règles de jeu ;
build et audit dépendances ; vérification HTTP de production après déploiement.

Les contrôles effectivement exécutés et les limites restantes sont consignés dans `VALIDATION.md`.
Une compilation réussie ne constitue pas une certification commerciale ou une validation complète du jeu.
