The game loads six original recordings, with one fixed source per effect:

- `floraphonic-swing-whoosh-weapon-3-189823.mp3`: general swings (0.030–0.235 s).
- `daviddumaisaudio-sword-slash-with-metallic-impact-185435.mp3`: base-form Yan greatsword only (0.040–0.980 s).
- `yodguard-spear_thrust-1-382402.mp3`: spear/lance/nail thrusts, including Kromer impales (0.060–0.680 s).
- `Sword_Hori.wav`: slash impacts from swords, axes, claws, scythes and other cutting weapons.
- `Sword_Stab.wav`: piercing impacts from spears, harpoons, nails, needles, drills and bullets.
- `Sword_Vert.wav`: blunt impacts from clubs, hammers, maces, fists and other non-cutting impacts.

Swing/thrust movement uses a 0.5 mixer gain multiplier, including base Yan, physical casts and the synthesized loading fallback. Movement keeps its weapon-specific pitch, duration and accelerating/decelerating rate. Impact and firearm levels are independent of this multiplier.

The three impact WAVs retain their complete stereo recordings and native tails in the decoded buffers. Playback varies pitch by at most 0.30 semitones, speed by at most 3% and the requested duration by at most 0.6%. A conservative source-duration cap and a short edge fade prevent truncation clicks. Shield contacts keep the attacking weapon's impact category; transformed Yan's hands use blunt impacts. Other non-physical contacts use the blunt source. Periodic and special synthesized cues retain their existing classification.

Original audio files are unchanged and decoded once per audio context. Stereo is preserved, with no filter, added reverb or synthetic layers over recorded events. Decoder overshoot is attenuated, near-simultaneous copies share volume, and all six sources are embedded in `weapon-swing-audio` for offline playback with their correct MP3/WAV MIME types.
