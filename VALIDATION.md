# Validation

Controle reel du jalon `0.1.0`, execute le 2026-08-30 avant publication.

## Gates locaux

- `npm run qa`: OK.
- `npm run lint`: OK sur `app`, `components/game`, `game`, `tests`, `public`.
- `npm run test`: OK, 3 fichiers, 14 tests.
- `npm run build`: OK, Next.js 16.3.3, TypeScript et prerendu statique de `/`.
- `npm audit`: OK, 0 vulnerabilite sur l'audit complet.
- `curl -I http://127.0.0.1:4177/`: HTTP 200.
- `curl http://127.0.0.1:4177/manifest.webmanifest`: OK.
- `curl -I http://127.0.0.1:4177/sw.js`: HTTP 200.
- Le build Vinext original a aussi ete valide en 5 phases avant le port Next-only de publication.

## QA navigateur locale

Outil utilise: `npx agent-browser`.

- Chargement `http://127.0.0.1:4177/`: OK.
- Contrat initial: boutons corps, routes et `SIGNER ET INCARNER` visibles.
- Lancement de partie: canvas raycaste et controles Chair/Cortex/Spectre/armes visibles.
- Overlay framework: `OK`, aucun overlay Next detecte.
- Console navigateur et erreurs de page: vides.
- Manifest detecte et service worker actif avec controleur.
- Captures du menu et du HUD inspectees visuellement.

## Publication

A completer apres commit, push, deploiement Vercel production et controle HTTP public.
