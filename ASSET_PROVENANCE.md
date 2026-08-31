# Provenance des assets — 0.2.0

Les contenus graphiques et audio du jeu sont originaux. Aucune ressource d’une franchise existante n’a été importée.

## Images OpenAI, 31 août 2026

Génération intégrée `image_gen.imagegen`, sans image de référence externe. Les PNG livrés restent inchangés. Prompts exacts et caractéristiques : [sprites](ART_PROMPTS.md), [port](ART_HARBOR_PROMPT.md).

| Fichier dans public/art | Format | SHA-256 |
| --- | --- | --- |
| nara-velvet-chroma.png | RGB 1254×1254, 4×2 orientations | 2451c02f7f0d02176c0395cdd4dbea64edcb5af348f1a76791488a9b3e837870 |
| soma-guard-chroma.png | RGB 1254×1254, 4×2 orientations | 2f25e05b355f45c824249d477d4108851b4cd7deada157ae1871e1612f58b75e |
| neo-massilia-port.png | RGB 1536×1024, illustration sans texte | 47d066d33377fe1ac5c9b31e384ec671a9e570bd0a2d47ded17b7a0bfa000467 |

Le moteur interprète le fond magenta en mémoire, atténue les franges et calcule les limites de chaque orientation. Les sources ne sont pas des PNG transparents. Les lourds et Le Collecteur sont des variantes de taille/teinte de la planche de garde, pas des planches distinctes. Nara dispose de sa propre planche.

La couverture représente une réinterprétation du port méditerranéen, pas un relevé géographique. Le titre est en HTML, jamais incrusté dans l’image.

## Créations par code

- Matériaux pixel déterministes : pierre, panneaux industriels, terminaux et bandes de sécurité.
- Skyline, machines, ancres, caches, extraction, armes subjectives et interface Canvas.
- Ambiance et effets WebAudio synthétisés, sans échantillon externe.
- Icône SVG originale remplacée en 0.2.0 ; dérivés PNG 192/512 produits par le build.
- Polices Geist/Geist Mono et bibliothèques d’interface distribuées avec leurs licences respectives ; ce ne sont pas des assets de gameplay créés pour SOMA.

## Historique conservé

`public/og.png` appartient à la reconstruction 0.1.0 (ancienne illustration OpenAI, SHA-256 ea92138604d4f4e38592d5348b0b25de6ded8c7b2c4232d72b5f48f9dbf5af1e). Elle n’est plus référencée par le menu, les métadonnées sociales ou le cache PWA. La nouvelle couverture est propre à Néo-Massilia.

La provenance générative est documentée ; elle ne constitue pas, à elle seule, une certification d’exclusivité juridique de chaque détail visuel.

## Équipiers incarnés — ajout 0.3.0

Deux nouvelles planches originales ont été générées avec l’outil intégré `image_gen.imagegen` le 31 août 2026, un appel sans référence par personnage. Prompts exacts, fichiers sources et contrôles : [ART_COMPANION_PROMPTS.md](ART_COMPANION_PROMPTS.md).

| Fichier dans public/art | Format | SHA-256 |
| --- | --- | --- |
| idris-senn-chroma.png | RGB 1254×1254, fond vert, 4×2 orientations | f30419c94cc2aed9f150ebca3f2e30da54ac5c8b3941f016afc4c465d94b30aa |
| salome-craie-chroma.png | RGB 1254×1254, fond vert, 4×2 orientations | 23ca24a226f03bb087bb7459f701d790abfae7e794916db592a66931def74b44 |

Idris Senn et Salomé Craie disposent chacun d’une identité bitmap distincte, et non d’une simple teinte de Nara. Leurs huit vues ont été inspectées. Les PNG restent inchangés : le registre retire le fond vert, atténue les franges et calcule les cadres en mémoire. Les accents cyan de Salomé sont préservés. Aucune alpha native ni animation supplémentaire n’est revendiquée.
