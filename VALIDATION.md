# Validation 0.2.0 — 31 août 2026

## Contrôles locaux exécutés

- `npm run qa` : lint, **52 tests dans 4 fichiers**, TypeScript et build Next.js 16.3.3 réussis.
- `npm audit --json` : zéro vulnérabilité sur l’ensemble des dépendances après mise à niveau de Sharp.
- Formatage de 32 fichiers de code, puis nouvelle exécution de la QA.
- Génération des icônes 192/512 et du manifeste de précache de 23 fichiers JS/CSS/polices.
- Les tests exécutent réellement 250 grilles de piratage, 40 solutions assistées, les règles de tir/stun/Cortex, les cartes accessibles, la sauvegarde, les ancres coupées, les récompenses et les commandes.
- CI `Quality` ajoutée, permissions lecture seule, actions officielles épinglées, sans secret de déploiement. Son résultat distant sera vérifié après push.

## Parcours navigateur réellement joué

Chromium via agent-browser, session neuve et isolée `soma-qa-20260831-isolated`, build de production sur localhost:3003. Le navigateur intégré Codex était indisponible (échec ACL du noyau) ; le navigateur CLI a servi de repli.

Aucune sauvegarde de progression injectée pour franchir la campagne. Les auxiliaires dans `scripts/qa-*.js` lisent uniquement la carte/HUD affichés et utilisent déplacements, visée, tirs, impulsions et boutons ordinaires. Ils ne téléportent pas, ne donnent pas d’invulnérabilité et n’accèdent pas à la simulation privée.

1. Nouveau contrat MISTRAL-3, fausse identité, difficulté Standard.
2. Docks parcourus, cache récupérée, gardes déclenchés et dégâts subis ; registre piraté par huit actions.
3. Révocation parcourue avant expiration ; racine piratée.
4. Prison parcourue, consignation piratée, Nara libérée et recrutée par dialogue (confiance 45).
5. Cortex, ordre Tenir, sélection du fusil ; combat provoquant **un transfert du Collecteur**.
6. Ordre Ancres donné à Nara ; défaite réelle. Options de difficulté, fermeture, rechargement de page et réincarnation vérifiés. Passage en difficulté Récit pour la suite du parcours.
7. Ancres coupées, Collecteur vaincu, arrivée à Station Zéro.
8. Clinique, talents Soma/Exécuteur, fondation et les trois choix d’épilogue, retour à la base.
9. Contrat Corniche joué avec SIBYLLE : archives piratées puis retour effectif à l’extraction ; récompense et rang 2 affichés.
10. Possession d’un drone : déplacement de (10.5,6.5) à (9.7,6.1), dépense de charge, retour du corps à (13.4,1.4).
11. Achats Arsenal, Cortex, Spectre et Syndicat avec les ressources réellement gagnées.
12. Nouveau départ avec MÔLE : 175 intégrité et 130 blindage, effets de la clinique et du talent présents.

État portable inspecté : 1170 XP, 1 transfert, 1 mort, 4 piratages, 3 conclusions vues, un contrat Corniche terminé. Le temps actif d’environ huit minutes inclut les actions de cette session automatisée ; ce n’est pas une estimation de durée normale du jeu.

## Sauvegarde et portabilité

- Reprise de page sur la progression gagnée, conservation de la défaite explicite et des ancres, puis réincarnation.
- Munitions conservées après pause/rechargement de page.
- Export JSON v4 visible puis **copié sans transformation dans un fichier**, réimporté via le vrai champ de sélection de fichier ; confirmation de migration et conservation de la base.
- **Limite constatée** : le téléchargement direct a été annulé par le navigateur de QA, avec l’ancien Blob puis avec le lien explicite. La cause n’a pas été établie. Le panneau propose désormais le JSON sélectionnable en secours. Le téléchargement natif n’est pas compté comme validé.
- Rejet des fichiers étrangers/futurs et normalisation des paramètres couverts par tests unitaires.

## Desktop, mobile, accessibilité et hors ligne

- Captures inspectées : menu 1440×900, scènes, épilogue, export 390×844, combat mobile.
- Portrait 390×844 et paysage 844×390 : pas de débordement horizontal, HUD et sept commandes tactiles présents.
- Boutons tactiles réellement pressés/relâchés : déplacement (13.5 vers 13.2 en Y), tirs et munitions consommées.
- 60 FPS affichés dans ces instantanés de la machine de test : **pas un benchmark matériel garanti**.
- Audit axe-core 4.12.1 : zéro violation automatique sur la surface testée ; deux catégories de contrôles manuels restent signalées (focus des dialogues et contrastes sur images).
- Hors ligne : service worker activé et contrôleur présent. Test décisif avec **serveur local réellement arrêté** : rechargement de l’application depuis le cache, menu de reprise, canvas, styles et mission disponibles ; requête non cachée `precache.json?probe` échouant avec `NETWORK_UNAVAILABLE`.
- Le basculement réseau émulé du CLI affichait encore `navigator.onLine=true` ; il n’a pas été utilisé seul comme preuve.
- Pas d’erreur d’application relevée ; les erreurs de requêtes volontairement provoquées pendant le test serveur arrêté ne sont pas des crashs du jeu.

## Limites de validation / commercialisation

Pas de test physique de manette, de Safari iOS, de téléphones modestes, de sessions longues multi-heures ni d’équilibrage avec joueurs externes. L’audio a été déclenché par les interactions, pas évalué comme un mixage masterisé. Les huit lieux du Codex ne sont pas huit niveaux livrés. Les contrats partagent trois cartes existantes. Les lourds et le boss utilisent des variantes de la planche de garde.

Ce rapport décrit une édition jouable consolidée, pas une certification commerciale ou une promesse de campagne de grande ampleur.

## Publication

La publication 0.2.0 intervient uniquement après les contrôles ci-dessus. Les références Git/Vercel et le contrôle HTTP public seront consignés dans le rapport de livraison après exécution.
