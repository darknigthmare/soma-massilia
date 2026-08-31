# SOMA//MASSILIA final chroma source sprites

Generated on 2026-08-31 with the built-in OpenAI `image_gen.imagegen` tool. Two separate NEW generations, one per original character variant, with NO input images and NO edit operation. No CLI fallback. No local image processing. Originals remain unchanged in the generated_images directory; they are copied unchanged into public/art and referenced at runtime.

## Verified output properties

- Both files: PNG, 1254x1254, 8-bit RGB, color type 2, intentionally opaque, no alpha channel. Dimensions read from the tool-returned PNG headers in memory without filesystem helper.
- Visually inspected directly from image_gen outputs: flat vivid magenta background, eight full-body sprites in 4 columns x 2 rows, clear spacing, no checkerboard, no floor or cast shadows. No text or watermarks visible.
- Both directional orders are visually correct: front, front-right three-quarter, right profile, rear-right three-quarter, back, rear-left three-quarter, left profile, front-left three-quarter. Nara fourth and sixth views are now opposite rear-quarter views.
- Background requested as exact RGB(255,0,255) #FF00FF. Uniformity is visually confirmed but exact per-pixel RGB equality was NOT measured; runtime chromakey should allow a small tolerance and optional spill handling.
- Requested 1024x1024 was not respected; actual 1254x1254 needs proportional source cells or normalization. Width divided by 4 is 313.5; height divided by 2 is 627. All sprites visibly remain separated within proportional cells. Minor sprite-height/centering differences should be normalized by the consuming renderer.
- These are original runtime chroma-source sheets. Renderer must remove chroma background while preserving dark desaturated plum coat on Nara. Do not claim pre-existing alpha transparency.

## Guard final path

Source artifact: `exec-1ce5dffd-38f2-4365-be32-5564933a12cf.png`. See ASSET_PROVENANCE.md for the shipped file and SHA-256.

## Exact guard prompt

```text
Use case: stylized-concept
Asset type: final production eight-direction 2D runtime sprite sheet for an original retro raycast FPS, SOMA//MASSILIA, Néo-Massilia 2197.
BACKGROUND, CRITICAL: the entire canvas is opaque perfectly flat SOLID PURE MAGENTA, exactly hexadecimal #FF00FF, RGB 255,0,255. Draw the sprites over this flat chroma-key color. This is an intentional MAGENTA CHROMA-KEY sprite sheet. Do NOT create transparency. Do NOT draw a checkerboard. Do NOT draw any floor, shadow, backdrop, gradient, texture, frame or grid. Every background pixel must be the same vivid solid pure magenta.
Subject: one identical original adult corporate security guard seen from eight directions, graphite-black futuristic combat armor, enclosed protective helmet with bright amber visor, compact graphite rifle held naturally at a neutral low ready position. Practical boots and equipment, a clear readable full-body silhouette, no insignia or logos. All eight cells depict the same guard, same body, same armor, same equipment, same standing pose rotated in place.
Style: detailed crisp pixel art with painted retro-FPS shading, readable pixel clusters, restrained graphite tones and amber details, neutral studio illumination on the guard only. No existing franchise character copied. No text. Do not put pure chroma magenta on the character or weapon.
Canvas and layout: square 1024x1024, EXACTLY FOUR COLUMNS AND TWO ROWS, eight equal invisible cells of 256x512 pixels. Each full-body guard is centered in its cell with identical height and identical foot baseline relative to its row. All heads, rifles, hands and feet fully visible within their own cells. Generous solid-magenta margins between every sprite and every cell boundary. No sprite touches or crosses a cell boundary.
EXACT ORIENTATION ORDER:
Top row cell 1: front view, facing viewer.
Top row cell 2: front three-quarter view, face turned toward the RIGHT edge of the image.
Top row cell 3: right profile, helmet nose and body point toward the RIGHT edge of the image.
Top row cell 4: rear three-quarter view, back visible, helmet nose pointing toward the RIGHT edge of the image.
Bottom row cell 5: complete back view, facing away from viewer.
Bottom row cell 6: rear three-quarter view, back visible, helmet nose pointing toward the LEFT edge of the image.
Bottom row cell 7: left profile, helmet nose and body point toward the LEFT edge of the image.
Bottom row cell 8: front three-quarter view, face turned toward the LEFT edge of the image.
The fourth and sixth cells must be opposite rear-quarter views. No repeated view. Full body all eight views. No additional character or object. No muzzle flash. No cast shadow. No text, labels, logos, captions, watermark or border. OPAQUE SOLID #FF00FF BACKGROUND ONLY.
```

## Nara final path

Source artifact: `exec-c5c2d0c8-b492-48f9-8f3b-1c301c52cef1.png`. See ASSET_PROVENANCE.md for the shipped file and SHA-256.

## Exact Nara prompt

```text
Use case: stylized-concept
Asset type: final production eight-direction 2D runtime sprite sheet for an original retro raycast FPS, SOMA//MASSILIA, Néo-Massilia 2197.
BACKGROUND, CRITICAL: the entire canvas is opaque perfectly flat SOLID PURE MAGENTA, exactly hexadecimal #FF00FF, RGB 255,0,255. Draw the sprites over this flat chroma-key color. This is an intentional MAGENTA CHROMA-KEY sprite sheet. Do NOT create transparency. Do NOT draw a checkerboard. Do NOT draw any floor, shadow, backdrop, gradient, texture, frame or grid. Every background pixel must be the same vivid solid pure magenta.
Subject: one identical original adult woman, Nara Velvet age 32, medium tan skin, short black hair, wearing a LONG DARK MAGENTA practical utility coat over fully covering dark clothing, dark cargo trousers, sturdy boots, subtle turquoise cybernetic implants, compact dark pistol held naturally in both hands at neutral low ready. Practical non-sexualized character, strong readable full-body silhouette. All eight cells depict the same woman, same face, body, outfit, equipment and standing pose rotated in place. Her coat is VERY DARK DESATURATED PLUM MAGENTA, strongly distinct from the flat pure #FF00FF chroma background. No pure #FF00FF pixels on the character.
Style: detailed crisp pixel art with painted retro-FPS shading, readable pixel clusters, neutral studio illumination on the character only. No existing franchise character copied. No text, insignia or logos.
Canvas and layout: square 1024x1024, EXACTLY FOUR COLUMNS AND TWO ROWS, eight equal invisible cells of 256x512 pixels. Each full-body Nara is centered in her cell with identical height and identical foot baseline relative to her row. All heads, pistols, hands, coat edges and feet fully visible within their own cells. Generous solid-magenta margins between every sprite and every cell boundary. No sprite touches or crosses a cell boundary.
EXACT ORIENTATION ORDER:
Top row cell 1: front view, face looks straight at viewer.
Top row cell 2: front three-quarter view, face turned toward the RIGHT edge of the image.
Top row cell 3: RIGHT profile, her nose and pistol point toward the RIGHT edge of the image.
Top row cell 4: rear three-quarter RIGHT view; show the back of her coat and the RIGHT-facing side of her head, her NOSE POINTS TO THE RIGHT EDGE OF THE IMAGE. She looks away toward the upper-right. Her back is dominant and her visible face is on the right side of her head. This is NOT rear-left.
Bottom row cell 5: complete back view, face not visible, looking directly away from viewer.
Bottom row cell 6: rear three-quarter LEFT view; show the back of her coat and the LEFT-facing side of her head, her NOSE POINTS TO THE LEFT EDGE OF THE IMAGE. She looks away toward the upper-left. Her back is dominant and her visible face is on the left side of her head. This is NOT rear-right.
Bottom row cell 7: LEFT profile, her nose and pistol point toward the LEFT edge of the image.
Bottom row cell 8: front three-quarter view, face turned toward the LEFT edge of the image.
The fourth and sixth cells MUST be opposite rear-quarter views. DO NOT duplicate them. Full body all eight views. No additional character or object. No muzzle flash. No cast shadow. No text, labels, logos, captions, watermark or border. OPAQUE SOLID #FF00FF BACKGROUND ONLY.
```
