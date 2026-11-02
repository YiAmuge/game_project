The user supplied `floraphonic-swing-whoosh-weapon-3-189823.mp3` on 2026-11-03. It is the only recorded sound used by the game.

`weapon-swings.js` uses this whoosh for weapon movement, including blades, spears, blunt weapons, staves, chains, fists and claws. Weapon weight changes pitch, duration and acceleration/deceleration; every variant uses the same source. Recorded swings do not add synthesized weapon or elemental layers.

Impacts and other cues use the original synthesis. The five previous uploaded recordings and their sound assignments have been removed.

The MP3 is preserved unchanged. It is decoded once per audio context, trimmed, mixed to mono, normalized and faded in the playback buffer. The standalone builder embeds it in `weapon-swing-audio` for offline playback.
