# Cahier des charges des armes subjectives — 0.6.0

## Statut des requêtes

Quatre créations NEW originales et quatre éditions de suppression de fond ont
été exécutées le 1er septembre 2026 avec ImageGen OpenAI intégré, sans image de
référence externe pour les créations. Le texte exact des requêtes n’est pas
conservé dans les pièces de provenance disponibles. Les sections suivantes
résument donc les contraintes utilisées sans prétendre les citer mot pour mot.

## Direction commune

- Vue subjective de jeu, caméra centrée, avant-bras et mains adultes gantés
  entrant depuis le bord inférieur.
- Arme entièrement visible dans le tiers inférieur et l’axe central, conçue
  pour rester lisible sur un canvas raycasté desktop ou mobile.
- Industrie cyberpunk méditerranéenne de 2197 : métal sombre, polymères usés,
  faible accent cyan, silhouette fonctionnelle et non décorative.
- Éclairage cohérent, anatomie plausible, aucune main ou arme supplémentaire.
- Aucun texte, logo, interface, réticule, filigrane, collage ni élément sexuel.
- Fond demandé transparent ; les sorties étant restées opaques sur damier, le
  détourage final appartient au pipeline local documenté ci-dessous.

## Variantes

- **P-12 TRAME / pistolet** : arme de poing compacte, prise à deux mains,
  silhouette courte adaptée au corps d’infiltration.
- **MISTRAL-9 / mitraillette** : carcasse plus large, magasin et garde-main
  reconnaissables, posture stable de combat rapproché.
- **DARSE-47 / fusil** : arme longue industrielle, viseur et rail lisibles,
  masse visuelle compatible avec le châssis lourd.
- **ÉCLAT / lame** : mono-lame sombre tenue à droite, main gauche ouverte pour
  l’équilibre, filet énergétique cyan discret et pointe intégralement visible.

## Dérivation et contrôles

`scripts/prepare-viewmodels.mjs` :

1. vérifie une source carrée d’au moins 1024 px ;
2. détecte les deux couleurs dominantes du damier ;
3. détoure seulement les régions de fond reliées aux bords et adoucit le
   contour ;
4. réduit en RGBA 512×512, annule les très faibles alphas et retire les petits
   îlots ;
5. encode un WebP qualité 92, alpha 100, puis redécode le résultat ;
6. refuse une séparation fond/sujet invraisemblable, plus de quatre composantes
   alpha significatives ou une composante de moins de 64 pixels.

La planche-contact sur fond sombre et la lame sur fond magenta ont été
inspectées pendant la QA 0.6.0. Au seuil alpha 24, pistolet, mitraillette et
fusil forment chacun une composante continue ; la lame en forme deux, l’arme et
la main gauche séparée, sans fragment significatif.
