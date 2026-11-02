"""Bake the two user-provided impact recordings into one simultaneous mix."""
from array import array
from pathlib import Path
import subprocess
import sys
import wave

ROOT=Path(__file__).resolve().parents[1]
RATE=48000
START=.085
DURATION=.455
SOURCES=['freesound_community-slashkut-108175.mp3','u_xjrmmgxfru-flesh-impact-266316.mp3']

def decode(path):
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-ss',str(START),'-t',str(DURATION),'-f','f32le','-ac','1','-ar',str(RATE),'-'])
 data=array('f');data.frombytes(raw)
 if sys.byteorder!='little':data.byteswap()
 count=round(RATE*DURATION);data=data[:count];data.extend([0.]*(count-len(data)))
 peak=max(map(abs,data),default=0.)
 if peak<=.0001:raise ValueError('Silent impact source: '+str(path))
 return [x/peak for x in data]

def mix(a,b):
 # Both inputs use the same timeline and start together, at equal peak weight.
 data=[(x+y)*.5 for x,y in zip(a,b)];peak=max(map(abs,data))
 fade_in=round(RATE*.003);fade_out=round(RATE*.02)
 return [x*.82/peak*min(1,i/fade_in,(len(data)-1-i)/fade_out) for i,x in enumerate(data)]

def main():
 inputs=[decode(ROOT/'src/assets/audio/source'/name) for name in SOURCES]
 data=mix(*inputs);pcm=array('h',(round(max(-1,min(1,x))*32767) for x in data))
 if sys.byteorder!='little':pcm.byteswap()
 out=ROOT/'src/assets/audio/mixed-impact.wav'
 with wave.open(str(out),'wb')as f:
  f.setnchannels(1);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(pcm.tobytes())
 print(f'Mixed both impact sources simultaneously: {out.name}, {len(data)/RATE:.3f}s, mono {RATE}Hz.')

if __name__=='__main__':main()
