# PHASES – image-wizard-cli Rewrite + Riftborn Assets

Stil: Pixel-Art (Entscheidung Lukas, 2026-10-30). Worker: OpenCode `kilo/kilo-auto/free`. Kein Push, kein Commit durch Worker.

| #   | Phase                                                                                                                                         | Status | Done-Kriterium                               | Prüfbefehl                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------- | ----------------------------------------------------- | ----------- | ------------------------------------------------------------------------------- |
| 1   | Secrets raus: `bing_create/create.py` mit Cookies entfernen, Cookie-Logging in `src/python.ts` redigieren                                     | done   | keine Cookie-Werte mehr im Repo, Checks grün | `rg -n "\_U=                                          | SRCHHPGUSR= | auth_cookie_u" .`(nur Platzhalter/Feldnamen) ;`bun run typecheck; bun run lint` |
| 2   | Bing-Provider in TS (`src/providers/bing.ts`): Prompt encoden, rt=4 dann rt=3, Polling, Parsen, Blocked/Out-of-boosts erkennen                | offen  | ein Live-Prompt speichert Bilder             | `bun run src/cli.ts gen "test sword icon"`            |
| 3   | Manifest + Runner (`src/manifest.ts`, `src/runner.ts`): JSON-Jobs, `out/<category>/<id>_<n>.png`, skip existing, Backoff, Tageszähler max 200 | offen  | zweiter Lauf überspringt alles               | 2x `bun run src/cli.ts batch jobs.json`               |
| 4   | Presets + Pixel-Art-Stil (`src/presets.ts`: character, enemy, icon, tile, prop, ui) mit festem Stil-Suffix                                    | offen  | Snapshot-Tests grün                          | `bun test`                                            |
| 5   | Post-Processing mit sharp (`src/post.ts`): Hintergrund → Alpha, trim, Downscale nearest-neighbor auf Zielgröße, Palette reduzieren            | offen  | Output hat Alpha, Zielgröße, ≤32 Farben      | Python/PIL-Check                                      |
| 6   | Riftborn: `src/render/WorldArt.ts` + `public/assets/tiles/tile_hub_{0..3}.png` in `drawHubTiles`, Farbfläche als Fallback                     | offen  | Tiles sichtbar, Checks grün                  | `bun run typecheck; bun run test:smoke`               |
| 7   | Riftborn: Hub-Props `public/assets/props/prop_<HubDecorKind>.png` in `makeHubDecor`                                                           | offen  | Props sichtbar, Checks grün                  | `bun run typecheck; bun run test:smoke`               |
| 8   | Metadaten `out/manifest.json` + Fallback-Provider Cloudflare/Pollinations                                                                     | offen  | je ein Bild pro Provider                     | `bun run src/cli.ts gen --provider cloudflare "test"` |
| 9   | Riftborn: Dungeon-Tiles/Props, neue Gegner, Icon-Lücken                                                                                       | offen  | Checks + Build grün                          | `bun run build`                                       |

## Grosse Aufgaben fuer spaetere Cursor-Sessions (Auto-Modus)

Nur starten, wenn Lukas es fuer die Session ausdruecklich sagt. Jede Aufgabe auf eigenem Branch, Checks muessen gruen sein, kein Push ohne Lukas.

| # | Aufgabe | Repo | Ziel | Done-Kriterium | Pruefbefehl |
|---|---------|------|------|----------------|-------------|
| C1 | CLI-Rewrite ohne Python | image-wizard-cli | Bing-Provider nativ in TS (`src/providers/bing.ts`), Python + postinstall raus, Provider-Interface fuer Cloudflare/Pollinations | Einzel- und Batch-Lauf liefern Bilder ohne Python | `bun run src/index.ts batch manifests/riftborn-pixel.json --dry-run; bun test; bun run build` |
| C2 | Asset-Pipeline komplett | image-wizard-cli | `post.ts` (sharp): Magenta -> Alpha, trim, nearest-neighbor Downscale je Kategorie (Tile 64x32, Prop 64-96, Enemy 64, Icon 32), Palette <=32; Sprite-Sheet-Export | Output hat Alpha, Zielgroesse, <=32 Farben | PIL-Check-Skript `scripts/check-assets.py` |
| C3 | Pixel-Art-Umstellung Riftborn | riftborn | Gesamter Look auf Pixel-Art: `pixelArt: true`, Kamera-Zoom ganzzahlig, gemalte Helden/Icons durch generierte Pixel-Varianten ersetzen | Kein gemaltes Asset mehr im Hub sichtbar, Smoke-Test gruen | `bun run typecheck; bun run test:smoke; bun run build` |
| C4 | Welt fuellen | riftborn | `WorldArt.ts` mit Tiles + Props fuer Hub und Dungeon, Deko-Dichte pro Biom, Fallback auf Graphics | Hub und Rift voll texturiert, FPS stabil | `bun run test:smoke` + Screenshot |
| C5 | Gegner-Pipeline | riftborn + CLI | Batch-Manifest fuer Animationsframes (idle/walk/attack), `process-sprites.mjs` an neue Sheets anbinden, 4 neue Gegner im Spawn-Pool | Gegner erscheinen animiert in Rifts | `bun run sprites:process; bun run build; bun run test:smoke` |
| C6 | Audio + Juice | riftborn | SFX/Musik laut Roadmap in `AudioBus`, Screen-Shake, Hit-Flash, Damage-Numbers | Audio in Hub und Kampf hoerbar, Checks gruen | `bun run typecheck; bun run lint; bun run build` |
| C7 | Jam-Theme-Pivot (ab 1. Nov) | riftborn | Theme analysieren, Mechanik + Assets-Manifest fuer Theme, Intro-Text | Theme im ersten Spielminute erkennbar | Playtest + `bun run build` |
