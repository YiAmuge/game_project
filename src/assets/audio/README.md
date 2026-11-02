The runtime loads three sound buffers:

- `floraphonic-swing-whoosh-weapon-3-189823.mp3`: shared weapon movement.
- `daviddumaisaudio-sword-slash-with-metallic-impact-185435.mp3`: base-form Yan greatsword attacks and physical casts only.
- `mixed-impact.wav`: a single simultaneous mix of the two user-supplied impact recordings in `source/`.

Run `python tools/mix-impact-audio.py` with FFmpeg installed to rebuild the mix. Both complete stereo sources start together at time zero, are peak-normalized separately, mixed at equal weight and normalized together to 0.82 peak. The shorter source is padded with silence; neither source is cropped, time-stretched or filtered. They are never concatenated or played as two independent runtime sources. The raw source files are retained only for reproducibility and are not loaded or embedded by the game.

The playback buffers are decoded once per audio context. Playback preserves original pitch, fixed 1× speed, full duration, stereo channels and the native envelope. There are no low-pass filters or added reverb sends. Only output volume and decoder-overshoot attenuation are applied. Identical sources started within 20 ms share volume to avoid coherent clipping; solo playback is unchanged and no attacks are dropped. Each recorded event uses one buffer without extra synthesized weapon or elemental layers. Distorted Yan uses the shared whoosh. The standalone builder embeds all three runtime buffers, including the proper WAV MIME type, for offline playback.
