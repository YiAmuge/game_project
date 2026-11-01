The user supplied these three original MP3 recordings on 2026-11-02:

- `daviddumaisaudio-sword-slash-and-swing-185432.mp3`
- `freesound_community-slashkut-108175.mp3`
- `floraphonic-metal-whoosh-hit-2-201903.mp3`

The files are preserved unchanged. `slash-samples.js` decodes them once per audio context, trims silence, mixes to mono for positional audio, normalizes peaks and fades the edges. Weapon families vary pitch, playback speed curves and envelope length at runtime. The standalone builder embeds all three recordings in `slash-audio-data` for offline playback.
