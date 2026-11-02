"""Bake the two user-provided impact recordings into one simultaneous mix."""
from array import array
from pathlib import Path
import subprocess
import sys
import wave

ROOT=Path(__file__).resolve().parents[1]
RATE=48000
SOURCES=['freesound_community-slashkut-108175.mp3','u_xjrmmgxfru-flesh-impact-266316.mp3']

def decode(path):
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-ac','2','-ar',str(RATE),'-'])
 data=array('f');data.frombytes(raw)
 if sys.byteorder!='little':data.byteswap()
 peak=max(map(abs,data),default=0.)
 if peak<=.0001:raise ValueError('Silent impact source: '+str(path))
 return [x/peak for x in data]

def mix(a,b):
 # Preserve both complete recordings and their stereo channels on the same timeline.
 count=max(len(a),len(b));a=a+[0.]*(count-len(a));b=b+[0.]*(count-len(b))
 data=[(x+y)*.5 for x,y in zip(a,b)];peak=max(map(abs,data))
 return [x*.82/peak for x in data]

def main():
 inputs=[decode(ROOT/'src/assets/audio/source'/name) for name in SOURCES]
 data=mix(*inputs);pcm=array('h',(round(max(-1,min(1,x))*32767) for x in data))
 if sys.byteorder!='little':pcm.byteswap()
 out=ROOT/'src/assets/audio/mixed-impact.wav'
 with wave.open(str(out),'wb')as f:
  f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(pcm.tobytes())
 print(f'Mixed both complete impact sources simultaneously: {out.name}, {len(data)/RATE/2:.3f}s, stereo {RATE}Hz.')

if __name__=='__main__':main()
