#!/usr/bin/env node
import fs from 'node:fs';
import { resolveSites } from './config/sites.js';
import { runAll, toMarkdown, hasFailure } from './lib/runner.js';
import { discover } from './lib/discover.js';
import { notify, writeStepSummary } from './lib/notify.js';

/** .env 파일이 있으면 읽어 process.env 에 반영 (로컬 실행용, 의존성 없음) */
function loadDotenv(file = '.env') {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

function parseArgs(argv) {
  const args = { _: [], headed: false, site: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--headed') args.headed = true;
    else if (a === '--site') args.site = argv[++i];
    else if (a.startsWith('--site=')) args.site = a.slice(7);
    else args._.push(a);
  }
  return args;
}

const HELP = `
출석체크 자동화

사용법:
  node src/index.js run [--site <key>] [--headed]    출석체크 실행
  node src/index.js discover [--site <key>]          사이트 구조 분석 (셀렉터 확정용)
  node src/index.js list                             사이트 목록 / 설정 상태

사이트 키: showdang, oname, bananamall, dingdong, domaedoll

계정은 환경변수 또는 .env 파일로 설정합니다 (.env.example 참고):
  SHOWDANG_ID / SHOWDANG_PW  등
`;

async function main() {
  loadDotenv();
  const [cmd, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  let sites = resolveSites();
  if (args.site) {
    sites = sites.filter((s) => s.key === args.site);
    if (!sites.length) {
      console.error(`알 수 없는 사이트: ${args.site}`);
      process.exit(2);
    }
  }

  switch (cmd) {
    case 'run': {
      const results = await runAll(sites, { headed: args.headed });
      const md = toMarkdown(results);
      console.log('\n' + md);
      await writeStepSummary(md);
      await notify(md);
      // 사람이 손봐야 하는 결과가 있으면 실패 종료 → Actions 알림
      process.exit(hasFailure(results) ? 1 : 0);
      break;
    }
    case 'discover':
      await discover(sites, { headed: args.headed });
      break;
    case 'list':
      for (const s of sites) {
        const ok = s.id && s.pw ? '설정됨' : '미설정';
        console.log(`${s.key.padEnd(12)} ${s.name.padEnd(24)} 계정: ${ok}`);
        console.log(`  출석: ${s.attendUrl}`);
      }
      break;
    default:
      console.log(HELP);
      process.exit(cmd ? 2 : 0);
  }
}

main().catch((err) => {
  console.error('치명적 오류:', err);
  process.exit(1);
});
