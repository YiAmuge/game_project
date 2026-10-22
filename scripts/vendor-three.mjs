import { build } from 'esbuild';
import { mkdir,copyFile,readFile,writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
await mkdir(root+'src/vendor',{recursive:true});
await build({absWorkingDir:root,stdin:{contents:`export { WebGLRenderer, Scene, Color, Fog, OrthographicCamera, Vector2, Vector3, Raycaster, Plane, AmbientLight, DirectionalLight, Mesh, Group, BoxGeometry, PlaneGeometry, CylinderGeometry, ConeGeometry, TorusGeometry, MeshLambertMaterial, MeshStandardMaterial, MeshBasicMaterial, CanvasTexture, Sprite, SpriteMaterial, LinearFilter, SRGBColorSpace, DoubleSide } from 'three';`,resolveDir:root},bundle:true,format:'esm',minify:true,legalComments:'eof',outfile:root+'src/vendor/three.js'});
// Normalize insignificant trailing spaces in bundled GLSL template strings.
await writeFile(root+'src/vendor/three.js',(await readFile(root+'src/vendor/three.js','utf8')).replace(/[\t ]+$/gm,''));
await copyFile(root+'node_modules/three/LICENSE',root+'src/vendor/THREE-LICENSE.txt');
console.log('Bundled Three.js locally; gameplay needs no CDN or network connection.');
