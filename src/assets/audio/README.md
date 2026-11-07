The game loads twenty-six runtime recordings, with one fixed source per effect:

- `floraphonic-swing-whoosh-weapon-3-189823.mp3`: general swings (0.030–0.235 s).
- `daviddumaisaudio-sword-slash-with-metallic-impact-185435.mp3`: base-form Yan greatsword only (0.040–0.980 s).
- `yodguard-spear_thrust-1-382402.mp3`: spear/lance/nail thrusts, including Kromer impales (0.060–0.680 s).
- `Sword_Hori.wav`: slash impacts from swords, axes, claws, scythes and other cutting weapons.
- `Sword_Stab.wav`: piercing impacts from spears, harpoons, nails, needles and drills; it also supplies the quiet base layer for firearm contacts.
- `Sword_Vert.wav`: blunt impacts from clubs, hammers, maces, fists and other non-cutting impacts.
- `stu9-shatter-363188.mp3`: Yi Q deployment and R use, with Q's gain 1.45 and R's gain 0.82.
- `koiroylers-shine-02-355934.mp3`: a sustained nearby Ogamdo buff sound.
- `yi-glass-impact.wav`: Yi basic/Q contact, pre-mixed from `source/blendertimer-glass-bottle-shatter-13847.mp3` plus `Sword_Vert.wav` at 15% volume.
- `freesound_community-clean-machine-gun-burst-98224.mp3`: one isolated final round (1.345–1.632 s), played once per Jamila/Myo rifle projectile.
- `dragon-studio-gun-reload-2-511308.mp3`: Jamila reload start and Gubo Q; unchanged pitch, fixed 1x speed, full 1.512 s recording, no loop or completion replay.
- `firearm-impact.wav`: the supplied `source/u_68csiaifb5-bulletimpact3-442719.mp3` plus the existing `Sword_Stab.wav` at 30% volume.
- `freesound_community-sniper-rifle-5989.mp3`: Gubo normal / Q-enhanced / ultimate shots at 0 / -2 / -4.5 semitones, with progressively greater gain and longer tails.
- `freesound_community-080902_shotgun-39753.mp3`: Outis R's second area attack, played once at the shotgun recoil.
- `freesound_community-electrocute-6247.mp3`: Hohenheim basic charge and Q activation.
- `daviddumaisaudio-electric-whoosh-01-204487.mp3`: Hohenheim R growing attacks use only 0–0.98 s; full-expansion attacks start at 1.08 s in the impact section.
- `freesound_gamestudio-rpg-sword-attack-combo-11-388931.mp3`: Hohenheim beam, using 0.26–0.78 s of the source, pitched down about 4.5 semitones with a 3.6 kHz low-pass and controlled gain.
- `universfield-water-splash-199583.mp3`: Hong Lu Q's healing ripple, R's first splash and subsequent successful healing pulses (0.15–2.25 s).
- `universfield-body-hit-ground-250958.mp3`: actual landing shockwaves from Heathcliff Q, base Sora Q and Starbuck R (0.10–1.40 s).
- `floraphonic-metal-whoosh-hit-2-201903.mp3`: Nelly's basic and Q throws, with separate pitch/rate profiles (0.045–0.580 s).
- `yodguard-iced-magic-6-378606.mp3`: Rodion R ice-axe contacts (0.015–1.600 s).
- `yodguard-earth-magic-5-378598.mp3`: Marton ranged-root contacts (0–2.050 s).
- `yodguard-wind-magic-6-378626.mp3`: Dongbaek basic/ultimate weapon movement (0.250–1.500 s). The uploaded MP3 remains unchanged.
- `dongbaek-wind-chimes.wav`: a 3.9 s stereo phrase from the supplied 105 s rain/wind-chime ambience. The complete original is preserved in `source/designerschoice-ambdsgn-cu_rain-wind-chimes-magic-ambience_nicholas-judy_tdc-475656.mp3`. Rebuild with `python3 tools/import-dongbaek-audio.py`.





Swing/thrust movement uses a 0.5 mixer gain multiplier, including base Yan, physical casts and the synthesized loading fallback. Movement keeps its weapon-specific pitch, duration and accelerating/decelerating rate. Impact and firearm levels are independent of this multiplier.

The three impact WAVs retain their complete stereo recordings and native tails in the decoded buffers. Playback varies pitch by at most 0.30 semitones, speed by at most 3% and the requested duration by at most 0.6%. A conservative source-duration cap and a short edge fade prevent truncation clicks. Shield contacts keep the attacking weapon's impact category; transformed Yan's hands use blunt impacts. Other non-physical contacts use the blunt source. Periodic and special synthesized cues retain their existing classification.

Original audio files are unchanged and decoded once per audio context. Stereo is preserved, with no added reverb or synthetic layers over recorded events. Hohenheim’s beam alone uses a low-pass to soften the high end. Decoder overshoot is attenuated, near-simultaneous copies share volume, and all twenty-two sources are embedded in `weapon-swing-audio` for offline playback with their correct MP3/WAV MIME types.

Yi uses `yi-audio.js` for his skill and contact profiles (pitch at most 0.15 semitones, speed within 3%). Q deploys sound at the zone's actual position, R at its landing, and ongoing Q contacts keep Q metadata when later skills are used. Run `python tools/mix-yi-impact.py` with FFmpeg installed to rebuild the stereo glass contact; the complete recordings are aligned at time zero, peak-attenuated only if necessary and stored as one playback buffer. The source MP3 is retained for reproducibility and is not separately loaded or embedded.

The shine plays once per nearby Ogamdo application and fades linearly to zero over 1.5 seconds, with no repetition while the buff remains active. A single positional source follows the nearest visible living recipient. Expiry, death, mute, pause or leaving play stops it early; resuming the same application does not replay it. A new application can play again. Online uses the replicated buff state.

Jamila emits one round per projectile at its actual firing time, with every fourth shield round pitched up two semitones. Her troopers use ordinary rounds. Myo Q emits four rounds at the scheduled 75 ms intervals, without an extra cast shot. Gubo Q plays the reload once; empowered basic shots use the middle profile, and the ultimate shot uses its strongest profile after the 1.2 s aim completes. Rejected/cancelled casts produce no shot.

Run `python tools/mix-firearm-impact.py` to rebuild the firearm contact. The complete supplied impact and the existing piercing impact at 30% are aligned, mixed into one stereo WAV and attenuated only if needed for headroom. Firearm impact variants change pitch naturally (about -1.4 to +1.25 semitones depending on gun type) and vary playback rate within roughly 4%. Spear/harpoon/nail contacts keep their separate piercing source.

Outis basic projectile contacts and Gregor Q carry explicit piercing metadata. Marton ranged-root contacts use the earth recording; his melee keeps blunt contacts. Projectile impact metadata stays attached to the projectile when subsequent actions change the caster state. Outis's shotgun firing recording is separate from the thrust and from its firearm-contact mix.

Hohenheim charge audio follows replicated active charge, at most three nearby visible living champions, and stops on release/cancel, movement, control, death, mute, pause or leaving play. It uses a low-level electrocute loop with gentle pitch/rate changes as charging progresses. Q uses one short electrocute excerpt. R emits the windup section at each of its seven growth attacks and the impact section at each of its three full-expansion attacks, with fixed R metadata and zone position. Each basic beam uses the softened sample at the actual 120 ms beam intervals.

Firearm contact playback uses 70% of its prior gain (0.476 before weight adjustment), lasts about 0.38 s, with a short final fade. Its original mix recipe remains the supplied bullet impact plus the old piercing recording at 30%; only playback level and envelope are shortened.

Rudolph basic/ultimate sounds share the existing electrocute recording rather than decoding another copy. His ultimate cast and delayed detonation use lower pitch, longer envelopes and greater gain than his basic. Hong Lu Q plays at the healing ripple; R's louder first splash represents its simultaneous first attack/heal, so first-hit generic contacts are marked `silent` for the audio mixer only. Subsequent pulses emit one splash if any allied champion actually gains health, regardless of recipient count.

Landing recordings play at the shockwave, never the start of airborne travel. Nelly basic and Q use the same fixed metal source with Q pitched higher and played faster; a five-knife fan is grouped into one throw and has no extra synthetic cast shot. Rodion's axe and its health-based bonus carry identical R/ice contact metadata, which merges them into one sound even after later casts. The ice and earth files omit their long silent tails. All effects use the same voice budget, spatial mixer and offline embedding as the other recordings.

Dongbaek emits a separate petal bloom once per basic attack and once for the whole ultimate, including misses. Ultimate chimes play from the designated bloom location. The same extracted recording uses a short 1.05 s basic envelope and a louder, lower, 2.6 s ultimate envelope; both fade from near the start. The ultimate event retains its duration so mixer cleanup preserves the complete fade. Existing impact recordings, pitch, speed and duration stay intact, with only Dongbaek impact gain multiplied by 0.8. Other champion impacts retain their levels.

Queen of Hatred uses `humordome-fairy-sparkle-451414.mp3` (0.015–1.500 s) for each basic projectile launch. Q/R charging and firing reuse the existing `yiShine` buffer from `koiroylers-shine-02-355934.mp3`, whose bytes match the new upload. `QueenChargeAudio` follows replicated preparing/charging states with one nonlooping source per spell, spatialized at its casting seal, with a maximum of four nearby visible charge voices. Release, cancellation, death, range/vision loss, mute, pause and match changes clean up these sources. Charge pitch/gain is lower than firing; each complete beam gets one brighter louder firing recording while gameplay keeps every damage pulse. Yi playback is unchanged.

Alisa basic and tactical activation share the supplied `yodguard-fire-magic-5-378639.mp3` at 0.040–1.050 s. Basic playback is slightly lower-pitched and shorter; Q is roughly 2.75 semitones brighter and 0.12 s longer. Existing impact/burn/detonation recordings remain in their original roles.
