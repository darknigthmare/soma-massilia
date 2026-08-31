# Équipiers originaux OpenAI — Idris et Salomé

Générés le 31 août 2026 par deux appels distincts à l’outil intégré OpenAI `image_gen.imagegen`, sans références externes, sans édition et sans CLI/API de substitution. Sources copiées à l’identique dans `public/art`. Les PNG ne sont pas transparents : leur fond vert est interprété dans le Canvas du moteur.

## Sources et contrôles

| Équipier | Asset livré | Source générée | Format réel | SHA-256 |
| --- | --- | --- | --- | --- |
| Idris Senn, 44 ans | `public/art/idris-senn-chroma.png` | `exec-f7661121-55de-4c1c-bc44-54579ef3d4c5.png` | PNG RGB 8 bits, 1254×1254 | `f30419c94cc2aed9f150ebca3f2e30da54ac5c8b3941f016afc4c465d94b30aa` |
| Salomé Craie, 38 ans | `public/art/salome-craie-chroma.png` | `exec-9bb96de9-7db7-4904-a877-f95abecc1ddf.png` | PNG RGB 8 bits, 1254×1254 | `23ca24a226f03bb087bb7459f701d790abfae7e794916db592a66931def74b44` |

Les originaux sont conservés dans le dossier génératif local `C:\Users\chuck\.codex\generated_images\01a058ed-e145-73d3-8a07-1c154781266f`. La dimension demandée 1024×1024 n’a pas été respectée par le générateur; le registre utilise les dimensions réelles et des limites de cellules proportionnelles.

Inspection visuelle directe des deux retours : huit silhouettes entières, vêtements et équipements cohérents, armure orange/ivoire d’Idris, tenue clinique claire et masque au col de Salomé. Aucune lettre ni ombre au sol visible. Les huit directions suivent exactement le contrat visuel existant de Nara et du garde : face, trois-quarts vers la droite de l’image, profil droit, dos trois-quarts droit, dos, dos trois-quarts gauche, profil gauche, face trois-quarts gauche. Les cases 4 et 6 sont bien opposées. Il s’agit de postures directionnelles, pas d’une animation de marche ou de tir.

Le pipeline existant `game/sprite-assets.ts` a été étendu aux clés `idris` et `salome` : chroma verte pour ces deux sources, chroma magenta conservée pour Nara et le garde. Le détourage et la réduction des franges se font uniquement en mémoire, puis les limites de chaque silhouette sont calculées par cellule. Aucun retrait de fond, recadrage, rééchantillonnage ou retouche n’a été enregistré dans les sources.

Validation numérique : exécution du module réel de normalisation Canvas dans un adaptateur mémoire Node, alimenté par les PNG décodés avec Sharp. Les 32 cadres des quatre atlases sont non vides et restent strictement dans leur cellule. Idris : 1 053 838 pixels transparents en mémoire, cadres de 510 à 526 pixels de haut. Salomé : 1 126 079 pixels transparents en mémoire, cadres de 532 à 540 pixels de haut. Les 14 667 pixels cyan identifiés dans la source de Salomé restent tous opaques après détourage. Ce contrôle valide les pixels et les cadres, pas à lui seul le rendu final du navigateur.

## Prompt exact — Idris

```text
Use case: stylized-concept
Asset type: final production eight-direction 2D runtime character sprite sheet for the original retro raycast FPS SOMA//MASSILIA, Néo-Massilia 2197. A game-ready sprite source, not concept art.
BACKGROUND, CRITICAL: solid opaque pure chroma-key GREEN, exact #00FF00, RGB 0,255,0, over the entire canvas behind the sprites. Completely uniform flat green. NO transparency, NO checkerboard, no floor, no cast shadow, no backdrop, no gradient, no texture, no frame or grid. Do not put chroma-key green on the character or equipment.
Subject: one and the same original adult male squad member, IDRIS SENN, 44 years old, former prisoner and former guard of If. He inhabits a MOLE armored human body: broad heavy build, practical orange-and-ivory segmented protective armor over a dark graphite undersuit, heavy boots and gloves, weathered but functional equipment. His adult face remains visible, short dark hair with a little gray, restrained non-graphic healed facial scars, no fresh injury or blood. A compact dark rifle is held naturally in the same neutral low-ready pose in every view. The armor is individual and original, without corporate logos, prisoner numbers or franchise insignia. Strong readable human silhouette, not a robot.
Style/medium: detailed crisp pixel art with painted retro-FPS shading, readable pixel clusters, neutral even lighting on the character only. Warm worn orange armor panels, ivory plates, charcoal joints and weapon; no green highlights. Same identity, anatomy, armor, colors, weapon, standing height and neutral pose in all eight views, only rotated.
Canvas/layout: square 1024x1024, EXACTLY FOUR COLUMNS by TWO ROWS, eight equal invisible cells of 256x512. Exactly one full-body figure centered in each cell. All head, rifle, hands and both feet entirely inside that cell with generous solid-green padding. Identical height and foot baseline relative to each row. Nothing touches or crosses a cell boundary.
EXACT VISUAL ORIENTATION ORDER, read left to right:
TOP ROW 1 front, facing viewer. TOP ROW 2 front three-quarter, face turned toward IMAGE RIGHT. TOP ROW 3 full right-facing profile, nose toward the RIGHT edge of the image. TOP ROW 4 rear three-quarter RIGHT: back dominates, head/nose directed toward IMAGE RIGHT, looking away to the upper-right.
BOTTOM ROW 5 complete back view, looking away, face invisible. BOTTOM ROW 6 rear three-quarter LEFT: back dominates, head/nose directed toward IMAGE LEFT, looking away to the upper-left. BOTTOM ROW 7 full left-facing profile, nose toward the LEFT edge of the image. BOTTOM ROW 8 front three-quarter, face turned toward IMAGE LEFT.
The fourth and sixth cells MUST show opposite rear-quarter directions, not duplicates. All eight views are distinct and retain the same outfit and carried rifle.
Strict exclusions: no text, no letters, no captions, no numerals, no logos, no watermark, no border, no extra person, no extra standalone object, no muzzle flash, no gore, no nudity, no copyrighted game-character copy. No green clothing. The ONLY background is flat #00FF00 GREEN.
```

## Prompt exact — Salomé

```text
Use case: stylized-concept
Asset type: final production eight-direction 2D runtime character sprite sheet for the original retro raycast FPS SOMA//MASSILIA, Néo-Massilia 2197. A game-ready sprite source, not concept art.
BACKGROUND, CRITICAL: solid opaque pure chroma-key GREEN, exact #00FF00, RGB 0,255,0, over the entire canvas behind the sprites. Completely uniform flat green. NO transparency, NO checkerboard, no floor, no cast shadow, no backdrop, no gradient, no texture, no frame or grid. Do not put chroma-key green on the character or equipment.
Subject: one and the same original adult female squad member, SALOMÉ CRAIE, 38 years old, a neuro-surgeon and field physician. She inhabits a SIBYLLE human body: agile realistic adult proportions, practical fully covering LIGHT IVORY clinical tactical outfit with subdued CYAN accents over charcoal technical clothing, knee-length utilitarian medical coat, fitted protective vest, cargo trousers and practical boots. A pale surgical mask is carried LOWERED AT THE COLLAR, leaving the entire adult face visible. Short neatly controlled dark hair, subtle cyan neural implants, small medical equipment pockets with no lettering or emblems. Neutral professional standing pose, both gloved hands holding a compact dark sidearm at low ready. Not sexualized, no exposed torso, no heels. A readable original physician silhouette, not a copied game character.
Style/medium: detailed crisp pixel art with painted retro-FPS shading, readable pixel clusters, neutral even lighting on the character only. Ivory-white coat and armor plates, desaturated cyan technical accents, graphite pants and sidearm; NO green clothing, NO bright-green lighting. Same identity, anatomy, outfit, mask at collar, hairstyle, weapon, standing height and neutral pose in all eight views, only rotated.
Canvas/layout: square 1024x1024, EXACTLY FOUR COLUMNS by TWO ROWS, eight equal invisible cells of 256x512. Exactly one full-body figure centered in each cell. All head, sidearm, hands, coat and both feet entirely inside that cell with generous solid-green padding. Identical height and foot baseline relative to each row. Nothing touches or crosses a cell boundary.
EXACT VISUAL ORIENTATION ORDER, read left to right:
TOP ROW 1 front, facing viewer. TOP ROW 2 front three-quarter, face turned toward IMAGE RIGHT. TOP ROW 3 full right-facing profile, nose toward the RIGHT edge of the image. TOP ROW 4 rear three-quarter RIGHT: back dominates, head/nose directed toward IMAGE RIGHT, looking away to the upper-right.
BOTTOM ROW 5 complete back view, looking away, face invisible. BOTTOM ROW 6 rear three-quarter LEFT: back dominates, head/nose directed toward IMAGE LEFT, looking away to the upper-left. BOTTOM ROW 7 full left-facing profile, nose toward the LEFT edge of the image. BOTTOM ROW 8 front three-quarter, face turned toward IMAGE LEFT.
The fourth and sixth cells MUST show opposite rear-quarter directions, not duplicates. All eight views are distinct and retain the same outfit, lowered collar mask and carried sidearm.
Strict exclusions: no text, no letters, no captions, no numerals, no logos, no medical cross emblem, no watermark, no border, no extra person, no extra standalone object, no muzzle flash, no gore, no nudity, no copyrighted game-character copy. No green clothing. The ONLY background is flat #00FF00 GREEN.
```
