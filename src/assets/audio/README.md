The game loads four original recordings, with one fixed source per effect:

- `floraphonic-swing-whoosh-weapon-3-189823.mp3`: general swings (0.030–0.235 s).
- `daviddumaisaudio-sword-slash-with-metallic-impact-185435.mp3`: base-form Yan greatsword only (0.040–0.980 s).
- `yodguard-spear_thrust-1-382402.mp3`: spear/lance/nail thrusts, including Kromer impales (0.060–0.680 s).
- `ragecore29-sword-stabbing-flesh-with-splatter-2-4x-604103.mp3`: normal impacts, using only the first complete strike and its tail (0.130–0.850 s) from the four-strike source.

Swings and thrusts vary pitch, duration and accelerating/decelerating playback rate by weapon weight. The flesh impact is deliberately subtle: pitch stays within 0.30 semitones of the source and speed stays within 3%; its first complete strike remains recognisable. Every weapon keeps the same source across variants. Stereo is preserved, with no low-pass filter, added reverb or synthetic layers over recorded events.

Original MP3 files are unchanged. Each is decoded once per audio context; only playback buffers select the listed intervals and attenuate decoder overshoot. Near-simultaneous copies share volume to avoid clipping, and playback edges fade briefly to prevent clicks. All four originals are embedded in `weapon-swing-audio` for offline playback. The previous mixed-impact WAV, its inputs and mix-generation script are no longer used.
