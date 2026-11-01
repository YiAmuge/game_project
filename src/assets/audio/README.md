The user supplied these five original MP3 recordings on 2026-11-02:

- `daviddumaisaudio-sword-slash-and-swing-185432.mp3`
- `freesound_community-slashkut-108175.mp3`
- `floraphonic-metal-whoosh-hit-2-201903.mp3`
- `yodguard-sword_slashing-2-382396.mp3` — cutting swings.
- `universfield-sword-blade-slicing-flesh-352708.mp3` — cutting impact.

The files are preserved unchanged. `slash-samples.js` decodes them once per audio context, trims silence, mixes to mono for positional audio, normalizes peaks and fades the edges. The standalone builder embeds all five recordings in `slash-audio-data` for offline playback.

Each cutting weapon uses one fixed swing recording for both attacks and skill casts. Pitch, speed curves and envelope length vary without switching the source. Recorded events do not add synthesized weapon or elemental layers. Cutting impacts use the separate `flesh` recording.

| Weapon | Fixed swing source |
| --- | --- |
| Blade, glaive, claw | `yodguard-sword_slashing-2-382396.mp3` |
| Katana, greatsword | `daviddumaisaudio-sword-slash-and-swing-185432.mp3` |
| Knife | `freesound_community-slashkut-108175.mp3` |
| Axe, scythe | `floraphonic-metal-whoosh-hit-2-201903.mp3` |
