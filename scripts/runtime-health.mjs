import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

export const SERVICE = 'city-border';
export const PROTOCOL = 1;
export const projectId = root => createHash('sha256').update(resolve(root)).digest('hex').slice(0, 16);
export async function serverFingerprint(root) {
  const files = await Promise.all(['serve.mjs', 'runtime-health.mjs'].map(name => readFile(resolve(root, 'scripts', name))));
  return createHash('sha256').update(Buffer.concat(files)).digest('hex');
}

// Read the actual checkout: an HTML response alone does not validate an ES-module game.
export async function inspectRuntime(root) {
  root = resolve(root);
  const problems = [], files = new Set(['index.html', 'src/main.js']);
  let version = 'unknown';
  const problem = (path, message) => problems.push(`${path}: ${message}`);
  try { version = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')).version; }
  catch { problem('package.json', '읽을 수 없거나 JSON 형식이 잘못되었습니다'); }
  async function collect(folder) {
    for (const entry of await readdir(resolve(root, folder), { withFileTypes: true })) {
      const path = `${folder}/${entry.name}`;
      if (entry.isDirectory()) await collect(path);
      else if (/\.(js|json|css|png|svg)$/.test(entry.name)) files.add(path);
    }
  }
  try { await collect('src'); } catch { problem('src', '게임 소스 폴더를 읽을 수 없습니다'); }
  for (const path of files) {
    try {
      const absolute = resolve(root, path), info = await stat(absolute);
      if (!info.isFile() || !info.size) { problem(path, '파일이 비어 있습니다'); continue; }
      if (/\.(js|json|html|css)$/.test(path)) {
        const source = await readFile(absolute, 'utf8');
        if (path === 'src/main.js' && source.includes('./src/roster.json')) files.add('src/roster.json');
        if (path === 'src/art.js') for (const name of ['champions','champions-extra','champions-v05','champions-v06','champions-v08','champions-v10','champions-v12']) files.add(`src/assets/${name}.png`);
        if (path.endsWith('.json')) JSON.parse(source);
        if (path.endsWith('.js')) {
          // Skip comments and string literals so a commented-out import cannot block startup.
          const imports=/\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\[\s\S]|[^'\\])*'|"(?:\\[\s\S]|[^"\\])*"|`(?:\\[\s\S]|[^`\\])*`|(?:\bfrom\s*|\bimport\s*)['"](\.[^'"]+)['"]/g;
          for (const match of source.matchAll(imports)) {
            if (!match[1]) continue;
            const dependency = resolve(dirname(absolute), match[1]);
            if (!dependency.startsWith(root + sep)) throw new Error('저장소 밖의 모듈 경로');
            files.add(relative(root, dependency).split(sep).join('/'));
          }
        }
        if (path === 'index.html') {
          for (const match of source.matchAll(/(?:src|href)=["'](\.\/src\/[^"']+)["']/g)) files.add(match[1].slice(2));
        }
      }
    } catch { problem(path, '파일이 없거나 읽을 수 없습니다. 업데이트 상태를 확인하세요'); }
  }
  return { ready: problems.length === 0, version, files: [...files].sort(), problems };
}

export function forwardedUrl(env, port) {
  const name = env.CODESPACE_NAME;
  if (!name) return null;
  const domain = env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev';
  if (!/^[a-z0-9-]+$/i.test(name) || !/^[a-z0-9.-]+$/i.test(domain)) return null;
  return `https://${name}-${port}.${domain}/`;
}

// A 200 login/error page is not proof that the forwarded port reached this game.
export async function inspectForwarded(base, localHealth, fetcher=fetch) {
  const request=async path=>{
    try {
      const response=await fetcher(new URL(path,base),{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(6000)});
      const body=await response.text();let health;
      try { health=JSON.parse(body); } catch {}
      return {status:response.status,gameHtml:response.ok&&/<title>도시 경계/.test(body)&&body.includes('./src/main.js'),health};
    } catch { return {status:null,gameHtml:false}; }
  };
  const [page,diagnostic]=await Promise.all([request('/'),request('/__dev/health')]);
  const sameServer=Boolean(localHealth?.project&&diagnostic.health?.service===SERVICE&&diagnostic.health.protocol===PROTOCOL&&diagnostic.health.project===localHealth.project);
  return {pageStatus:page.status,healthStatus:diagnostic.status,gameHtml:page.gameHtml,sameServer,ready:sameServer&&diagnostic.health.ready===true,verified:page.gameHtml&&diagnostic.status===200&&sameServer&&diagnostic.health.ready===true};
}
