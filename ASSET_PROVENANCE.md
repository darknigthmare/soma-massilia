# Provenance des assets — 0.5.0

Les contenus graphiques et audio du jeu sont originaux. Aucune ressource d’une franchise existante n’a été importée.

## Images OpenAI, 31 août 2026

Génération intégrée `image_gen.imagegen`, sans image de référence externe. Les PNG livrés restent inchangés. Prompts exacts et caractéristiques : [sprites](ART_PROMPTS.md), [port](ART_HARBOR_PROMPT.md).

| Fichier dans public/art | Format                                 | SHA-256                                                          |
| ----------------------- | -------------------------------------- | ---------------------------------------------------------------- |
| nara-velvet-chroma.png  | RGB 1254×1254, 4×2 orientations        | 2451c02f7f0d02176c0395cdd4dbea64edcb5af348f1a76791488a9b3e837870 |
| soma-guard-chroma.png   | RGB 1254×1254, 4×2 orientations        | 2f25e05b355f45c824249d477d4108851b4cd7deada157ae1871e1612f58b75e |
| neo-massilia-port.png   | RGB 1536×1024, illustration sans texte | 47d066d33377fe1ac5c9b31e384ec671a9e570bd0a2d47ded17b7a0bfa000467 |

Les sources ne sont pas des PNG transparents. Depuis la 0.5.0, le prébuild interprète leur chroma avec tolérance, atténue les franges, calcule les limites de chaque orientation et produit les dérivés runtime décrits plus bas. Le navigateur ne détoure plus ces grandes sources au chargement. Nara dispose de sa propre planche. En 0.2.0 et 0.3.0, les lourds et Le Collecteur utilisaient encore la planche de garde avec une variante de taille/teinte ; cette dette visuelle est levée en 0.4.0 ci-dessous.

La couverture représente une réinterprétation du port méditerranéen, pas un relevé géographique. Le titre est en HTML, jamais incrusté dans l’image.

## Créations par code

- Matériaux pixel déterministes : pierre, panneaux industriels, terminaux et bandes de sécurité.
- Skyline, machines, ancres, caches, extraction, armes subjectives et interface Canvas.
- Ambiance et effets WebAudio synthétisés, sans échantillon externe. La 0.5 ajoute des timbres procéduraux pour tirs alliés/ennemis, capture, défaite et synchronisation, panoramiqués selon la source et le corps ou drone écouté.
- Icône SVG originale remplacée en 0.2.0 ; dérivés PNG 192/512 produits par le build.
- Polices Geist/Geist Mono et bibliothèques d’interface distribuées avec leurs licences respectives ; ce ne sont pas des assets de gameplay créés pour SOMA.

## Historique conservé

`public/og.png` appartient à la reconstruction 0.1.0 (ancienne illustration OpenAI, SHA-256 ea92138604d4f4e38592d5348b0b25de6ded8c7b2c4232d72b5f48f9dbf5af1e). Elle n’est plus référencée par le menu, les métadonnées sociales ou le cache PWA. La nouvelle couverture est propre à Néo-Massilia.

La provenance générative est documentée ; elle ne constitue pas, à elle seule, une certification d’exclusivité juridique de chaque détail visuel.

## Équipiers incarnés — ajout 0.3.0

Deux nouvelles planches originales ont été générées avec l’outil intégré `image_gen.imagegen` le 31 août 2026, un appel sans référence par personnage. Prompts exacts, fichiers sources et contrôles : [ART_COMPANION_PROMPTS.md](ART_COMPANION_PROMPTS.md).

| Fichier dans public/art | Format                                     | SHA-256                                                          |
| ----------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| idris-senn-chroma.png   | RGB 1254×1254, fond vert, 4×2 orientations | f30419c94cc2aed9f150ebca3f2e30da54ac5c8b3941f016afc4c465d94b30aa |
| salome-craie-chroma.png | RGB 1254×1254, fond vert, 4×2 orientations | 23ca24a226f03bb087bb7459f701d790abfae7e794916db592a66931def74b44 |

Idris Senn et Salomé Craie disposent chacun d’une identité bitmap distincte, et non d’une simple teinte de Nara. Leurs huit vues ont été inspectées. Les PNG sources restent inchangés : le prébuild retire le fond vert, atténue les franges et calcule les cadres dans les dérivés WebP alpha. Les accents cyan de Salomé sont préservés. Aucune alpha native sur les sources ni animation supplémentaire n’est revendiquée.

## Lourd SÔMA et Collecteur — ajout 0.4.0

Deux planches originales ont été générées le 1er septembre 2026 avec l’outil
intégré OpenAI `image_gen.imagegen`, sans référence externe. Les résultats ont
été contrôlés dans la surface de génération, matérialisés depuis les données
PNG retournées, puis vérifiés localement par métadonnées, empreinte et analyse
des huit cellules. Les consignes complètes et les limites du chroma sont
conservées dans [ART_PROMPTS.md](ART_PROMPTS.md).

| Fichier dans public/art   | Format                                                 | SHA-256                                                          |
| ------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| soma-heavy-v04-chroma.png | RGB 1254×1254, fond magenta tolérant, 4×2 orientations | 3635bcf479b762a9e099e0815129ac3b07b2d41a23bd1348c6cff2cdebf39c54 |
| collector-v04-chroma.png  | RGB 1254×1254, fond magenta tolérant, 4×2 orientations | 6c1198a856addff6d6cd1ecb72a790cd76492538c13e006e31edaa760e2b5d0b |

Le registre runtime emploie désormais les types `heavy` et `collector`
distincts. Les effets d’action 0.4.0 restent des transformations de rendu
(déplacement, tir, impact, incapacité, contention) appliquées aux huit poses ;
il ne s’agit pas de planches image-par-image supplémentaires.

## Civils distincts — ajout 0.5.0

Deux planches originales ont été générées le 1er septembre 2026 avec l’outil
intégré OpenAI `image_gen.imagegen`. Il s’agit de **deux générations NEW
distinctes**, sans image de référence et sans opération d’édition. Les sorties
ont été inspectées visuellement dans la surface de génération : huit corps
entiers séparés en quatre colonnes et deux rangées, directions cohérentes, fond
magenta opaque, aucun texte ni filigrane visible. Les personnages représentés
sont adultes, entièrement vêtus et non sexualisés.

| Fichier source dans `public/art`       | Format                                               | SHA-256                                                          |
| -------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| `soma-civilian-worker-v05-chroma.png`  | RGB opaque 1254×1254, fond magenta, 4×2 orientations | 733B926FEABA940094E27C3F0B36192313D7CE9B8002E2C733C7920B3E6F1C8C |
| `soma-civilian-witness-v05-chroma.png` | RGB opaque 1254×1254, fond magenta, 4×2 orientations | 6E9A1FDB009A709A39ABC85E78AA6724802ED09DD6FE1E72234D9B52D98BA70D |

`soma-civilian-worker-v05-chroma.png` représente un ouvrier adulte de
maintenance portuaire ; il est affecté aux résidents et acteurs de Station
Zéro. `soma-civilian-witness-v05-chroma.png` représente une témoin/coursière
de données adulte ; elle est affectée aux témoins, objectifs sociaux et
courtiers génériques. Ces rôles et affectations sont des créations de la
reconstruction, pas des fichiers récupérés de l’archive 0.1.0.

Le texte exact des deux requêtes ImageGen n’a pas été conservé dans les pièces
de provenance disponibles. [ART_PROMPTS.md](ART_PROMPTS.md) en consigne donc
le cahier des charges descriptif sans le présenter comme une citation mot pour
mot.

## Dérivés runtime 0.5.0

`scripts/prepare-sprites.mjs` transforme au prébuild les huit planches source
(garde, lourd, Collecteur, Nara, Idris, Salomé et les deux civils) en WebP
**lossless** 768×768 avec alpha, sous `public/art/runtime/`. Le script produit
également `public/art/runtime/sprites.json`, qui contient les dimensions et
les huit cadres calculés pour chaque type. Les fichiers WebP et le manifeste
sont des dérivés déterministes des sources conservées dans le dépôt ; ils ne
sont pas des sorties ImageGen supplémentaires.

Le runtime charge paresseusement les seuls types requis par la scène et libère
les planches qui ne le sont plus. Cette chaîne réduit téléchargement et pic
mémoire par rapport au détourage navigateur des huit PNG 1254×1254. Elle ne
crée ni cycles d’animation image-par-image ni couches visuelles d’implants.
