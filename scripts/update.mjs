import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const branch = spawnSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' });
const name = branch.stdout?.trim();
if (branch.status !== 0 || !name) {
  console.error('현재 Git 브랜치를 확인하지 못했습니다. 변경 내용을 보존한 채 브랜치를 확인하세요.');
  process.exitCode = 1;
} else {
  const pull = spawnSync('git', ['pull', '--ff-only', 'origin', name], { cwd: root, stdio: 'inherit' });
  if (pull.status !== 0) {
    console.error('업데이트가 완료되지 않았습니다. 변경 내용을 덮어쓰거나 자동 병합하지 않았습니다. 기존 파일로 실행을 확인합니다.');
    process.exitCode = 1;
  }
  // Use the updated startup code, even when Pull changed this script.
  const start = spawnSync(process.execPath, ['scripts/codespaces-start.mjs'], { cwd: root, stdio: 'inherit' });
  if (start.status !== 0) process.exitCode = 1;
}
