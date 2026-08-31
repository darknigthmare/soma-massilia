# Validation 0.3.0 — 31 août 2026

## Gates reproductibles

- `npm run qa` : lint sans erreur, **200 tests dans 7 fichiers**, build Next.js 16.3.3, TypeScript et génération statique réussis.
- `npm audit --json --logs-max=0` : 0 vulnérabilité connue (597 dépendances recensées).
- `git diff --check` : aucune erreur d'espace.
- Le build génère les icônes et un manifeste hors ligne de 23 bundles/polices. Le service worker précache aussi les cinq images de gameplay originales.

Les 200 tests couvrent moteur, progression, sauvegarde/migrations, huit quartiers 24×24, Station Zéro 32×32, trois approches, escouade, systèmes ciblés, transferts, dette, implants, compétences, installations, relais, six missions, cinq fins, tempête EM et reprise d'expédition.

## Parcours navigateur réellement joué

Chromium via `agent-browser`, session neuve et isolée `soma-depth-20260831-isolated`, build de production localhost:3004. Le navigateur intégré Codex ne pouvait pas démarrer à cause de ses ACL ; ce repli est documenté plutôt que masqué.

Aucun état de progression, téléportation ou invulnérabilité n'a été injecté. Les auxiliaires `scripts/qa-*.js` lisent seulement la carte/HUD publics et envoient les mêmes touches/boutons que le joueur. La difficulté Récit et l'aide Spectre ont été activées dans les options.

1. Nouveau contrat MISTRAL, fausse identité : Docks, registre, révocation, transfert dans MÔLE, prison, recrutement de Nara, combat contre Le Collecteur, transfert de sa conscience, trois ancres et arrivée à Station Zéro.
2. Les six missions post-prologue ont toutes été jouées objectif par objectif, avec piratage, dialogues/sabotages, métro, extraction et décision : Apparence, If, Velours, Mistral, Bonne Mère et Dernier Abonnement.
3. Idris et Salomé ont été recrutés ; les trois agents apparaissent en Cortex et physiquement à Station Zéro avec leurs planches distinctes.
4. SIBYLLE a été incarnée ; Passerelle corticale et Marée synaptique ont été acquises puis équipées. Trois aptitudes et trois installations ont été acquises avec les ressources gagnées. La dette a été payée partiellement puis soldée, et le repos a modifié mémoire/tension/fatigue.
5. Partie portable avant fin : 6 missions archivées, 3 agents, 3070 XP, 9 intrusions, 1 transfert du Collecteur, 0 mort dans cette session assistée. Environ 8,6 minutes actives automatisées : ce n'est pas une durée normale ni une estimation de contenu.
6. Les cinq conclusions ont été activées à partir de cet export réellement gagné. Exode numérique et Retour à la chair ferment bien voyages/transferts/achats ; les trois autres laissent l'exploration active.

## Sauvegarde, PWA et surfaces

- Export JSON v5 lu depuis le vrai panneau, puis réimporté par le vrai champ fichier avec le message « Sauvegarde importée. Migration vérifiée ». Un premier essai relatif a été refusé par Chromium ; le même fichier en chemin absolu a réussi. Ce n'était pas un rejet du format.
- Rechargement à Station Zéro : coordonnées `15.5 / 27.5`, carte `0 0 320 320` et progression conservées.
- Service worker réinstallé sur cache vide : contrôleur actif, cache `soma-massilia-v0.3.0`, planches Idris/Salomé présentes.
- Serveur réellement arrêté : rechargement hors ligne réussi, canvas et pause restaurés ; une requête non précachée a échoué avec `NETWORK_UNAVAILABLE`.
- 390×844 : largeur document 390, sept contrôles tactiles, déplacement tactile de Y 27.5 à 24.7. 844×390 : largeur document 844 et sept contrôles. Le débordement du sélecteur de système découvert à 431 px a été corrigé puis revérifié.
- Aucun message `agent-browser errors` ou console applicative après le parcours en ligne. L'échec réseau provoqué pour le test hors ligne est attendu.

## Limites de qualification

Pas de manette physique, Safari/iOS/Android réel, téléphone modeste, lecteur d'écran complet, session multi-heures ni playtest externe d'équilibrage. L'audio a été déclenché mais pas masterisé sur plusieurs appareils. Les boutons tactiles ont été testés dans Chromium, pas sur une dalle réelle. Le téléchargement natif du fichier n'a pas été retesté ; la copie JSON et l'import l'ont été.

Cette validation établit une campagne compacte et jouable. Elle ne constitue ni certification console, ni promesse de durée AAA, ni qualification commerciale complète. Voir [AUDIT.md](AUDIT.md).
