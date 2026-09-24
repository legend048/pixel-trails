# Art notes

Sunhaven's `assets/island.png` is retained from the earlier Pixel Trails game. Moonveil and Emberfall are new generated map illustrations created for this update. Each map is 1536 × 1024 pixels and is drawn at 2× logical scale.

The new map briefs called for a detailed overhead pixel-art landscape with warm pale paths that clearly contrast with blocked terrain: an indigo crystal forest with stone bridges and clearings for Moonveil; volcanic ruins with sandstone paths, lava channels, bridges and a guardian arena for Emberfall. No characters, interface text or controls were included in the map artwork.

Characters, enemies, portals, crates, chests, runes, combat effects and sound are created in code. The collision authoring script reads map pixels without editing the illustrations. Bridge and building geometry is specified separately and checked against reachable routes.
