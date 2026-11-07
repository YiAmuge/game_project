"""Extract a short stereo chime phrase; the uploaded ambience remains in source/."""
from pathlib import Path
import subprocess,wave
import numpy as np
ROOT=Path(__file__).resolve().parents[1]/'src/assets/audio'
SOURCE=ROOT/'source/designerschoice-ambdsgn-cu_rain-wind-chimes-magic-ambience_nicholas-judy_tdc-475656.mp3'
RATE=48000
raw=subprocess.check_output(['ffmpeg','-v','error','-ss','2.65','-i',str(SOURCE),'-t','3.9','-ac','2','-ar',str(RATE),'-f','f32le','-'])
x=np.frombuffer(raw,dtype='<f4').reshape(-1,2).copy();peak=float(np.max(np.abs(x)));x*=.88/max(peak,.0001)
for seconds,reverse in[(.015,False),(.12,True)]:
 count=round(seconds*RATE);ramp=np.linspace(0,1,count)[:,None]
 if reverse:x[-count:]*=ramp[::-1]
 else:x[:count]*=ramp
out=ROOT/'dongbaek-wind-chimes.wav'
with wave.open(str(out),'wb')as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE);w.writeframes((x*32767).astype('<i2').tobytes())
print(f'{out.name}: {len(x)/RATE:.2f}s stereo, source 2.65–6.55s, peak {np.max(np.abs(x)):.3f}')
