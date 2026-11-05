The game loads nine runtime recordings, with one fixed source per effect:

- `floraphonic-swing-whoosh-weapon-3-189823.mp3`: general swings (0.030–0.235 s).
- `daviddumaisaudio-sword-slash-with-metallic-impact-185435.mp3`: base-form Yan greatsword only (0.040–0.980 s).
- `yodguard-spear_thrust-1-382402.mp3`: spear/lance/nail thrusts, including Kromer impales (0.060–0.680 s).
- `Sword_Hori.wav`: slash impacts from swords, axes, claws, scythes and other cutting weapons.
- `Sword_Stab.wav`: piercing impacts from spears, harpoons, nails, needles, drills and bullets.
- `Sword_Vert.wav`: blunt impacts from clubs, hammers, maces, fists and other non-cutting impacts.
- `stu9-shatter-363188.mp3`: Yi Q deployment and R use, with Q's gain 1.45 and R's gain 0.82.
- `koiroylers-shine-02-355934.mp3`: a sustained nearby Ogamdo buff sound.
- `yi-glass-impact.wav`: Yi basic/Q contact, pre-mixed from `source/blendertimer-glass-bottle-shatter-13847.mp3` plus `Sword_Vert.wav` at 15% volume.


Swing/thrust movement uses a 0.5 mixer gain multiplier, including base Yan, physical casts and the synthesized loading fallback. Movement keeps its weapon-specific pitch, duration and accelerating/decelerating rate. Impact and firearm levels are independent of this multiplier.

The three impact WAVs retain their complete stereo recordings and native tails in the decoded buffers. Playback varies pitch by at most 0.30 semitones, speed by at most 3% and the requested duration by at most 0.6%. A conservative source-duration cap and a short edge fade prevent truncation clicks. Shield contacts keep the attacking weapon's impact category; transformed Yan's hands use blunt impacts. Other non-physical contacts use the blunt source. Periodic and special synthesized cues retain their existing classification.

Original audio files are unchanged and decoded once per audio context. Stereo is preserved, with no filter, added reverb or synthetic layers over recorded events. Decoder overshoot is attenuated, near-simultaneous copies share volume, and all nine sources are embedded in `weapon-swing-audio` for offline playback with their correct MP3/WAV MIME types.

Yi uses `yi-audio.js` for his skill and contact profiles (pitch at most 0.15 semitones, speed within 3%). Q deploys sound at the zone's actual position, R at its landing, and ongoing Q contacts keep Q metadata when later skills are used. Run `python tools/mix-yi-impact.py` with FFmpeg installed to rebuild the stereo glass contact; the complete recordings are aligned at time zero, peak-attenuated only if necessary and stored as one playback buffer. The source MP3 is retained for reproducibility and is not separately loaded or embedded.

The shine has one positional loop for the nearest visible, living buff recipient within hearing range, including allied recipients. It follows that recipient and uses slight pitch/rate changes, without adding the same loop per ally. It fades and disconnects on expiry, loss of all audible recipients, death, mute, pause, match change or exit. The loop uses replicated buff state in online matches and needs no gameplay authority or network timers.
