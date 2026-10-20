import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { readFile, readdir, readlink, writeFile, rename } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { inspectRuntime, serverFingerprint, projectId, forwardedUrl, SERVICE, PROTOCOL } from './runtime-health.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 5173);
const diagnose = process.argv.includes('--diagnose'), restart = process.argv.includes('--restart');
const logPath = '/tmp/city-border-dev.log';
const local = `http://127.0.0.1:${port}`;
const pause = ms => new Promise(r => setTimeout(r, ms));
const stateFile = resolve(tmpdir(),`city-border-${projectId(root)}-${port}.json`);
const tokenHash = token => createHash('sha256').update(token).digest('hex');

async function recordedOwner(health) {
  try {
    const record = JSON.parse(await readFile(stateFile,'utf8'));
    if (health?.service===SERVICE && health.project===projectId(root) && record.pid===health.pid && typeof record.token==='string' && tokenHash(record.token)===health.control) return record.pid;
  } catch {}
  return null;
}

async function probe() {
  try {
    const response = await fetch(`${local}/__dev/health`, { signal: AbortSignal.timeout(1500), cache: 'no-store' });
    return { reachable: true, status: response.status, health: await response.json() };
  } catch {
    try { const response = await fetch(local, { signal: AbortSignal.timeout(1000) });await response.body?.cancel();return { reachable: true, status: response.status }; }
    catch { return { reachable: false }; }
  }
}

// Only stop this checkout's Node server after checking that it owns this listening socket.
// Also migrates the legacy server, which had no health endpoint or PID file.
async function ownedListener() {
  if (process.platform !== 'linux') return null;
  const inodes = new Set();
  for (const table of ['/proc/net/tcp', '/proc/net/tcp6']) {
    try {
      for (const line of (await readFile(table, 'utf8')).trim().split('\n').slice(1)) {
        const cells = line.trim().split(/\s+/);
        if (cells[3] === '0A' && parseInt(cells[1].split(':')[1], 16) === port) inodes.add(`socket:[${cells[9]}]`);
      }
    } catch {}
  }
  for (const pid of await readdir('/proc')) {
    if (!/^\d+$/.test(pid) || Number(pid) === process.pid) continue;
    try {
      const args = (await readFile(`/proc/${pid}/cmdline`, 'utf8')).split('\0').filter(Boolean);
      if (!/(?:^|\/)node(?:js)?$/.test(args[0] || '')) continue;
      const cwd = await readlink(`/proc/${pid}/cwd`);
      if (!args.slice(1).some(arg => !arg.startsWith('-') && resolve(cwd, arg) === resolve(root, 'scripts/serve.mjs'))) continue;
      for (const fd of await readdir(`/proc/${pid}/fd`)) {
        try { if (inodes.has(await readlink(`/proc/${pid}/fd/${fd}`))) return Number(pid); } catch {}
      }
    } catch {}
  }
  return null;
}

async function verifyFiles(health) {
  for (const path of ['/', ...health.files.map(path => '/' + path)]) {
    const response = await fetch(local + path, { method: /\.(png|svg)$/.test(path) ? 'HEAD' : 'GET', signal: AbortSignal.timeout(2000), cache: 'no-store' });
    if (!response.ok) throw new Error(`게임 파일 HTTP ${response.status}: ${path}`);
    await response.arrayBuffer();
  }
}

function printAddress() {
  const url = forwardedUrl(process.env, port);
  if (url) console.log(`현재 Codespace 게임 주소: ${url}`);
  else console.log(`개발 포트: ${port}. Codespaces에서는 Ports 탭의 해당 포트에서 Open in Browser를 사용하세요.`);
  console.log(`로그: ${logPath}`);
  return url;
}

async function main() {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT는 1~65535 사이의 숫자여야 합니다.');
  const expected = await inspectRuntime(root), fingerprint = await serverFingerprint(root), project = projectId(root);
  let state = await probe();
  const ours = () => state.health?.service === SERVICE && state.health.project === project;
  const current = () => ours() && state.health.protocol === PROTOCOL && state.health.server === fingerprint;
  if (diagnose) {
    console.log(`로컬 서버: ${state.reachable ? `HTTP ${state.status}` : '응답 없음'}`);
    console.log(`게임 버전: ${expected.version} / 서버 확인: ${current() ? '현재 실행 파일과 일치' : '꺼져 있거나 구버전·다른 서버'}`);
    const url = printAddress();
    if (current() && state.health.ready) { await verifyFiles(state.health); console.log('게임 HTML·모듈·데이터: 정상'); }
    if (!expected.ready) console.error(expected.problems.join('\n'));
    if (url) {
      try {
        const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(6000) });
        console.log(`외부 포트 연결(인증 정보 없이 확인): HTTP ${response.status}`);
        await response.body?.cancel();
      } catch { console.log('외부 포트 연결: 이 터미널에서 확인할 수 없음'); }
      console.log('로컬이 정상인데 위 주소가 브라우저에서 404면 Codespaces 포트 연결·계정·브라우저 접근 문제입니다. Public 변경이나 코드 재설치로 해결됐다고 판단하지 마세요.');
    }
    if (!current() || !state.health.ready || !expected.ready) process.exitCode = 1;
    return;
  }
  if (!expected.ready) throw new Error(`게임 파일이 완전하지 않습니다.\n${expected.problems.join('\n')}`);
  if (state.reachable && (restart || !current())) {
    const pid = await recordedOwner(state.health) || await ownedListener();
    if (!pid) throw new Error(`포트 ${port}가 다른 서버에서 사용 중이거나 소유권을 확인할 수 없습니다. 임의 종료하지 않았습니다.\nPORT=5174 npm start로 다른 포트를 사용하거나 해당 프로세스를 직접 확인하세요.`);
    process.kill(pid, 'SIGTERM');
    for (let i = 0; i < 30 && (await probe()).reachable; i++) await pause(100);
    state = await probe();
    if (state.reachable) throw new Error(`포트 ${port}의 이전 서버가 아직 종료되지 않았습니다.`);
  }
  if (!state.reachable) {
    const log = openSync(logPath, 'a');
    const token = randomBytes(32).toString('hex');let child;
    try { child = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: root, env: { ...process.env, PORT: String(port), CITY_BORDER_CONTROL_TOKEN: token }, detached: true, stdio: ['ignore', log, log] }); }
    finally { closeSync(log); }
    let spawnError;
    child.on('error', error => { spawnError = error; });child.unref();
    for (let i = 0; i < 40; i++) {
      if (spawnError) throw spawnError;
      state = await probe();
      if (current()) break;
      await pause(150);
    }
    if (current() && state.health.control===tokenHash(token)) {
      const temporary=stateFile+'.'+randomBytes(6).toString('hex');
      await writeFile(temporary,JSON.stringify({pid:state.health.pid,token}),{mode:0o600});await rename(temporary,stateFile);
    }
  }
  if (!current() || !state.health.ready) throw new Error(`정상 게임 서버 시작을 확인하지 못했습니다. ${logPath}를 확인하세요.`);
  await verifyFiles(state.health);
  console.log(`게임 서버 v${state.health.version}: 내부 HTTP 정상, 게임 파일 확인 완료 (포트 ${port}).`);
  printAddress();
  console.log('브라우저 접속 확인은 별도입니다. 접속이 안 되면 npm run doctor 결과를 확인하세요.');
}
main().catch(error => { console.error(error.message);process.exitCode = 1; });
