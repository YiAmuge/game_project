"""Build Firearm contacts with the existing piercing impact at 30% volume."""
from array import array
from pathlib import Path
import subprocess
import sys
import wave

ROOT = Path(__file__).resolve().parents[1] / 'src/assets/audio'
RATE = 48000
BASE_GAIN = .30


def decode(path):
    result = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ar', str(RATE),
                             '-ac', '2', '-f', 'f32le', 'pipe:1'], capture_output=True, check=True)
    samples = array('f')
    samples.frombytes(result.stdout)
    if sys.byteorder != 'little':
        samples.byteswap()
    return samples


def main():
    bullet = decode(ROOT / 'source/u_68csiaifb5-bulletimpact3-442719.mp3')
    base = decode(ROOT / 'Sword_Stab.wav')
    mixed = array('f', [0]) * max(len(bullet), len(base))
    for i in range(len(mixed)):
        mixed[i] = (bullet[i] if i < len(bullet) else 0) + BASE_GAIN * (base[i] if i < len(base) else 0)
    scale = min(1, .9 / max(max(abs(n) for n in mixed), 1e-9))
    pcm = array('h', (round(max(-1, min(1, n * scale)) * 32767) for n in mixed))
    if sys.byteorder != 'little':
        pcm.byteswap()
    output = ROOT / 'firearm-impact.wav'
    with wave.open(str(output), 'wb') as file:
        file.setnchannels(2)
        file.setsampwidth(2)
        file.setframerate(RATE)
        file.writeframes(pcm.tobytes())
    print(f'Built {output.name}: {len(pcm) / 2 / RATE:.3f}s, bullet + {BASE_GAIN:.0%} existing impact')


if __name__ == '__main__':
    main()
