The runtime loads three sound buffers:

- `floraphonic-swing-whoosh-weapon-3-189823.mp3`: shared weapon movement.
- `daviddumaisaudio-sword-slash-with-metallic-impact-185435.mp3`: base-form Yan greatsword attacks and physical casts only.
- `mixed-impact.wav`: a single simultaneous mix of the two user-supplied impact recordings in `source/`.

Run `python tools/mix-impact-audio.py` with FFmpeg installed to rebuild the mix. Both impact sources use the same 0.085–0.540 second timeline, are peak-normalized separately, mixed at equal weight and normalized together to 0.82 peak with short edge fades. They are never concatenated or played as two independent runtime sources. The raw source files are retained only for reproducibility and are not loaded or embedded by the game.

The playback buffers are decoded once per audio context. Pitch, length and acceleration/deceleration vary by weapon weight. Each recorded event uses one buffer without extra synthesized weapon or elemental layers. Distorted Yan uses the shared whoosh. The standalone builder embeds all three runtime buffers, including the proper WAV MIME type, for offline playback.
