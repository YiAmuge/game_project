import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist');
const [template, css, roster, atlas, atlasExtra, atlasV05, atlasV06, atlasV08, atlasV10, atlasV12, atlasV13, atlasV17, bundle] = await Promise.all([
  readFile(resolve(root, 'index.html'), 'utf8'),
  readFile(resolve(root, 'src/style.css'), 'utf8'),
  readFile(resolve(root, 'src/roster.json'), 'utf8'),
  readFile(resolve(root, 'src/assets/champions.png')),
  readFile(resolve(root, 'src/assets/champions-extra.png')),
  readFile(resolve(root, 'src/assets/champions-v05.png')),
  readFile(resolve(root, 'src/assets/champions-v06.png')),
  readFile(resolve(root, 'src/assets/champions-v08.png')),
  readFile(resolve(root, 'src/assets/champions-v10.png')),
  readFile(resolve(root, 'src/assets/champions-v12.png')),
  readFile(resolve(root, 'src/assets/champions-v13.png')),
  readFile(resolve(root, 'src/assets/champions-v17.png')),
  build({
    absWorkingDir: root,
    entryPoints: ['src/main.js'],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: ['chrome100', 'firefox100', 'safari15.4'],
    charset: 'utf8',
    minify: false,
    legalComments: 'none',
    // HTML parser end tags must never occur inside an embedded script.
    supported: { 'inline-script': true },
  }),
]);

const styleTag = '<link rel="stylesheet" href="./src/style.css">';
const moduleTag = '<script type="module" src="./src/main.js"></script>';
if (!template.includes(styleTag) || !template.includes(moduleTag)) {
  throw new Error('HTML entry tags changed: update the standalone builder.');
}
// Inline the JSON as data, without making it executable or allowing HTML end tags.
const thirdPartyLicense=await readFile(resolve(root,'src/vendor/THREE-LICENSE.txt'),'utf8');
const data = JSON.stringify(JSON.parse(roster)).replace(/</g, '\\u003c');
const augmentSheets=['combat','survival','tech','mourning','mask','carrier','antimatter'];
const augmentData=(await Promise.all(augmentSheets.map(async key=>{const image=await readFile(resolve(root,`src/assets/augments-${key}.png`));return `<script id="augment-data-${key}" type="application/json">${JSON.stringify('data:image/png;base64,'+image.toString('base64'))}</script>`;}))).join('\n');
const backstreetImage=await readFile(resolve(root,'src/assets/backstreet-materials.png'));
const backstreetData=`<script id="backstreet-data" type="application/json">${JSON.stringify('data:image/png;base64,'+backstreetImage.toString('base64'))}</script>`;
const rooftopData=(await Promise.all(['rooftop-skyline','rooftop-smoke','rooftop-windows','rooftop-garden'].map(async name=>`<script id="${name}-data" type="application/json">${JSON.stringify('data:image/png;base64,'+(await readFile(resolve(root,`src/assets/${name}.png`))).toString('base64'))}</script>`))).join('\n');
const latestSpriteData=(await Promise.all([['sprite-data-v36','champions-v36'],['weapon-data-v36','weapons-v36'],['clerk-data-v49','clerks-v49'],['minion-data-v52','minions-v52'],['needle-data-v54','needles-v54'],['boss-data-v55','boss-v55']].map(async([id,name])=>`<script id="${id}" type="application/json">${JSON.stringify('data:image/png;base64,'+(await readFile(resolve(root,`src/assets/${name}.png`))).toString('base64'))}</script>`))).join('\n');
const html = template
  .replace(moduleTag,rooftopData+'\n'+latestSpriteData+'\n'+moduleTag)
  .replace(styleTag, () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`)
  .replace(moduleTag, () => `${backstreetData}${augmentData}<script id="roster-data" type="application/json">${data}</script>\n<script id="sprite-data" type="application/json">${JSON.stringify('data:image/png;base64,'+atlas.toString('base64'))}</script>\n<script id="sprite-data-extra" type="application/json">${JSON.stringify('data:image/png;base64,'+atlasExtra.toString('base64'))}</script>\n<script id="sprite-data-v05" type="application/json">${JSON.stringify('data:image/png;base64,'+atlasV05.toString('base64'))}</script>\n<script id="sprite-data-v06" type="application/json">${JSON.stringify('data:image/png;base64,'+atlasV06.toString('base64'))}</script>\n<script id="sprite-data-v08" type="application/json">${JSON.stringify('data:image/png;base64,'+atlasV08.toString('base64'))}</script>\n<script id="sprite-data-v10" type="application/json">${JSON.stringify('data:image/png;base64,'+atlasV10.toString('base64'))}</script>\n<script id="sprite-data-v12" type="application/json">${JSON.stringify('data:image/png;base64,'+atlasV12.toString('base64'))}</script>\n<script id="sprite-data-v13" type="application/json">${JSON.stringify('data:image/png;base64,'+atlasV13.toString('base64'))}</script>\n<script id="sprite-data-v17" type="application/json">${JSON.stringify('data:image/png;base64,'+atlasV17.toString('base64'))}</script>\n<script>/* Three.js · MIT License\n${thirdPartyLicense}*/\n${bundle.outputFiles[0].text}</script>`);
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'city-border.html'), html);
await writeFile(resolve(output, 'index.html'), html);
console.log(`Built dist/city-border.html (${Buffer.byteLength(html).toLocaleString()} bytes). No server or external files required.`);
