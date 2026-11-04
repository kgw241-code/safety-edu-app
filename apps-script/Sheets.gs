/**
 * 시트 전용 코드. 판정·이행관리 핵심 로직과 법령 데이터는 같은 프로젝트의 script.gs(웹 버전 script.js와 동일 파일)에 있습니다.
 */
/**
 * 안전보건교육 판정 도구 (Google Sheets + Apps Script)
 * 버전 0.3.0 (2단계 판정 + 3단계 이행 관리 + 시연 데이터)
 *
 * 사용법
 *  1) 처음 한 번: 메뉴 [안전교육] > [초기 설정] 실행 → 법령 데이터 시트가 만들어집니다.
 *  2) 메뉴 [안전교육] > [교육 판정하기] → 판정 화면이 열립니다.
 *
 * 법령 수치는 이 코드가 아니라 시트('교육시간', '특별교육작업', '유해성주지')에서 읽습니다.
 * 법이 바뀌면 시트의 칸만 고치면 됩니다.
 */

var SHEETS = {
  guide: '안내',
  hours: '교육시간',
  tasks: '특별교육작업',
  notice: '유해성주지',
  rules: '규칙표',
  issues: '확인필요목록',
  log: '판정기록'
};

/* ───────────────────────── 기초 데이터 (초기 설정 시 시트로 옮겨짐) ───────────────────────── */

var LOG_HEADER = ['판정일시', '근로자(식별)', '직무 구분', '고용 형태', '선택 작업', '대상 교육 요약', '판단 필요 건수'];

/* ───────────────────────── 메뉴 ───────────────────────── */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('안전교육')
    .addItem('교육 판정하기 (한 명)', 'openJudgeDialog')
    .addSeparator()
    .addItem('① 근로자 명단 → 교육계획 만들기', 'generatePlans')
    .addItem('② 이수 등록 (증빙 첨부)', 'openRecordDialog')
    .addItem('③ 현황 새로고침', 'refreshStatus')
    .addItem('④ 근로자별 이수확인서 만들기', 'makeCertificate')
    .addSeparator()
    .addItem('시연용 가상 데이터 넣기', 'loadDemo')
    .addItem('시연 정답표 대조하기', 'verifyDemo')
    .addSeparator()
    .addItem('초기 설정 (처음 한 번)', 'setup')
    .addToUi();
}

function openJudgeDialog() {
  var html = HtmlService.createHtmlOutputFromFile('Index')
    .setWidth(1280)
    .setHeight(800);
  SpreadsheetApp.getUi().showModelessDialog(html, '안전보건교육 대상 판정');
}

/* ───────────────────────── 초기 설정 ───────────────────────── */

function setup() {
  var ss = SpreadsheetApp.getActive();
  var ui = SpreadsheetApp.getUi();
  var existing = ss.getSheetByName(SHEETS.hours);
  if (existing) {
    var res = ui.alert('초기 설정', '법령 데이터 시트가 이미 있습니다. 기본값으로 덮어쓸까요? (판정기록은 지워지지 않습니다)', ui.ButtonSet.YES_NO);
    if (res !== ui.Button.YES) return;
  }
  writeGuide_(ss);
  writeTable_(ss, SHEETS.hours, HOURS_HEADER, HOURS_SEED, [200, 220, 380, 110, 260, 280, 300, 90]);
  writeTable_(ss, SHEETS.tasks, TASKS_HEADER, TASKS_SEED, [50, 420, 260, 380, 90, 300, 420, 90]);
  writeTable_(ss, SHEETS.notice, NOTICE_HEADER, NOTICE_SEED, [180, 300, 120, 200, 90]);
  writeTable_(ss, SHEETS.rules, RULES_HEADER, RULES_SEED, [70, 420, 520, 260, 90]);
  writeTable_(ss, SHEETS.issues, ISSUES_HEADER, ISSUES_SEED, [50, 480, 360, 120]);
  if (!ss.getSheetByName(SHEETS.log)) {
    writeTable_(ss, SHEETS.log, LOG_HEADER, [], [150, 140, 120, 160, 300, 500, 110]);
  }
  setupTracking_(ss);
  var blank = ss.getSheetByName('시트1') || ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
  ss.setActiveSheet(ss.getSheetByName(SHEETS.guide));
  ui.alert('초기 설정 완료', '메뉴 [안전교육] > [교육 판정하기]로 판정 화면을 여세요.', ui.ButtonSet.OK);
}

function writeGuide_(ss) {
  var sh = ss.getSheetByName(SHEETS.guide) || ss.insertSheet(SHEETS.guide, 0);
  sh.clear();
  var rows = [
    ['안전보건교육 대상 판정 도구 v' + APP.version],
    [''],
    ['법령 기준: ' + APP.lawBasis],
    ['데이터 작성일: ' + APP.compiledOn],
    [''],
    ['사용 방법'],
    ['1. 메뉴 [안전교육] > [교육 판정하기]를 누릅니다.'],
    ['2. 근로자 정보, 발생 사유, 수행 작업, 취급 물질을 입력하고 [판정하기]를 누릅니다.'],
    ['3. 결과에서 "판단 필요" 항목은 법령 원문이나 관할 고용노동관서에 확인합니다.'],
    [''],
    ['시트 설명'],
    ['교육시간: 교육과정별 법정 최소 시간. 법이 바뀌면 이 시트의 숫자를 고칩니다.'],
    ['특별교육작업: 별표 5 특별교육 대상 39개 작업. 현장 용어는 "키워드" 칸에 쉼표로 추가합니다.'],
    ['유해성주지: 안전보건규칙상 근로자에게 알려야 할 의무.'],
    ['규칙표: 앱이 판정하는 규칙을 한국어로 적은 표. 코드와 같은 내용입니다.'],
    ['확인필요목록: 법령 해석이 필요하거나 원문 대조가 남은 쟁점.'],
    ['판정기록: [기록 저장]을 누른 판정 결과가 쌓입니다.'],
    [''],
    ['확인수준 표시: 원문확인(법령 원본 확인) / 2차자료(해설·질의회시 기준) / 확인필요(원문 대조 전)'],
    [''],
    [APP.disclaimer]
  ];
  sh.getRange(1, 1, rows.length, 1).setValues(rows);
  sh.getRange('A1').setFontSize(14).setFontWeight('bold');
  sh.getRange('A6').setFontWeight('bold');
  sh.getRange('A11').setFontWeight('bold');
  sh.getRange(rows.length, 1).setFontColor('#b00020');
  sh.setColumnWidth(1, 900);
}

function writeTable_(ss, name, header, rows, widths) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, 1, header.length).setValues([header])
    .setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#ffffff');
  if (rows.length) {
    sh.getRange(2, 1, rows.length, header.length).setValues(rows).setWrap(true).setVerticalAlignment('top');
  }
  sh.setFrozenRows(1);
  (widths || []).forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
}

/* ───────────────────────── 시트 → 데이터 ───────────────────────── */

function readSheet_(name) {
  var sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error('"' + name + '" 시트가 없습니다. 메뉴 [안전교육] > [초기 설정]을 먼저 실행하세요.');
  var values = sh.getDataRange().getValues();
  values.shift();
  return values.filter(function (r) { return String(r[0]).trim() !== ''; });
}

function loadData_() {
  return buildData(readSheet_(SHEETS.hours), readSheet_(SHEETS.tasks), readSheet_(SHEETS.notice));
}

/** 시트 행을 판정용 데이터로 변환 (시트가 없을 때 시험용으로 SEED를 그대로 넣어도 동작) */
/* ───────────────────────── 화면에서 부르는 함수 ───────────────────────── */

function getAppData() {
  var d = loadData_();
  return { app: APP, tasks: d.tasks };
}

function judge(input) {
  return judgeCore(loadData_(), input);
}

function saveLog(input, result) {
  var sh = SpreadsheetApp.getActive().getSheetByName(SHEETS.log);
  if (!sh) throw new Error('"판정기록" 시트가 없습니다. 초기 설정을 실행하세요.');
  var targets = result.rows.filter(function (r) { return r.status === '대상' || r.status === '판단 필요'; })
    .map(function (r) { return r.course + (r.hoursText ? '(' + r.hoursText + ')' : '') + (r.status === '판단 필요' ? '[판단 필요]' : ''); });
  sh.appendRow([
    new Date(),
    input.workerName || '(미입력)',
    result.summary.jobLabel,
    result.summary.empLabel,
    (input.tasks || []).map(function (t) { return t.no + '호'; }).join(', '),
    targets.join(' / '),
    result.summary.pendingCount
  ]);
  return true;
}

/* ───────────────────────── 판정 로직 (규칙표와 같은 내용) ───────────────────────── */

/**
 * input = {
 *   workerName, job: office|sales|other|supervisor, emp: daily|fixed_1w|fixed_1m|regular,
 *   constructionDaily: bool, halfTime: bool, newHire: bool, taskChange: bool,
 *   tasks: [{ no, answers: ['yes'|'no'|'unknown', ...], intermittent: 'yes'|'no'|'unknown' }],
 *   sub: { msds, managed, permit, special, newSubstance, msdsRevised },
 *   hz: { noise, vibration, dust, pathogen, msd },
 *   otherLaws: bool
 * }
 */
var T_SHEETS = { workers: '근로자', settings: '설정', plans: '교육계획', records: '이수기록', board: '현황판', cert: '이수확인서', demo: '시연정답표' };

var RECORD_HEADER = ['기록ID', '계획ID', '사번', '이름', '교육 종류', '실시일', '교육시간', '교육방법', '강사', '교육내용', '증빙 종류', '증빙 링크', '등록일시'];

/* ───────── 순수 로직 (시트와 무관, 시험 가능) ───────── */

/** 근로자 시트의 한 행(머리글 이름으로 접근하는 객체) → 판정 입력값 */
/** 한 근로자의 판정 결과 → 교육계획 행 목록 */
/** 이수기록을 반영해 진행률·상태 계산 */
/** 정답표와 앱 결과 대조 */
/* ───────── 시트 입출력 ───────── */

function setupTracking_(ss) {
  var sh;
  if (!ss.getSheetByName(T_SHEETS.settings)) {
    sh = ss.insertSheet(T_SHEETS.settings);
    sh.getRange('A1:C3').setValues([
      ['기준일', '', '비워 두면 오늘 날짜로 계산합니다. 시연 시에는 2026-11-04로 설정됩니다.'],
      ['증빙 폴더 ID', '', '처음 증빙을 올릴 때 자동으로 만들어집니다.'],
      ['기한 임박 기준(일)', 14, '기한까지 남은 일수가 이 값 이하이면 "기한 임박"']
    ]);
    sh.getRange('A1:A3').setFontWeight('bold');
    sh.setColumnWidth(1, 140); sh.setColumnWidth(2, 200); sh.setColumnWidth(3, 480);
  }
  if (!ss.getSheetByName(T_SHEETS.workers)) {
    writeTable_(ss, T_SHEETS.workers, WORKER_HEADER, [], [70, 80, 120, 150, 90, 90, 100, 110, 90, 100, 150, 150, 100, 110, 110, 100, 100, 90, 120, 260]);
    applyWorkerValidation_(ss.getSheetByName(T_SHEETS.workers));
  }
  if (!ss.getSheetByName(T_SHEETS.plans)) writeTable_(ss, T_SHEETS.plans, PLAN_HEADER, [], [150, 60, 70, 45, 170, 260, 80, 90, 110, 100, 70, 70, 140, 240, 320]);
  if (!ss.getSheetByName(T_SHEETS.records)) {
    writeTable_(ss, T_SHEETS.records, RECORD_HEADER, [], [150, 150, 60, 70, 150, 100, 70, 90, 90, 240, 100, 260, 140]);
    var prot = ss.getSheetByName(T_SHEETS.records).protect().setDescription('이수기록은 보존 대상입니다');
    prot.setWarningOnly(true);
  }
  if (!ss.getSheetByName(T_SHEETS.board)) ss.insertSheet(T_SHEETS.board);
}

function applyWorkerValidation_(sh) {
  var n = 500;
  var list = function (arr) { return SpreadsheetApp.newDataValidation().requireValueInList(arr, true).setAllowInvalid(false).build(); };
  sh.getRange(2, 3, n, 1).setDataValidation(list(['그 밖의 근로자', '사무직', '판매업무 직접 종사', '관리감독자']));
  sh.getRange(2, 4, n, 1).setDataValidation(list(['정규·그 밖의 근로자', '1주 초과 1개월 이하', '1주 이하', '일용']));
  [5, 6, 9, 10, 13, 14, 15, 16, 17, 18].forEach(function (c) { sh.getRange(2, c, n, 1).setDataValidation(list(['Y', 'N'])); });
  sh.getRange(2, 7, n, 2).setNumberFormat('yyyy-mm-dd');
  sh.getRange(1, 11).setNote('예: 26  /  14(예,아니오)  /  34, 38\n괄호 안은 해당 작업 확인 질문의 답(예·아니오·모름)을 순서대로 적습니다.');
  sh.getRange(1, 12).setNote('예: 34=예, 14=아니오\n적지 않은 작업은 "모름"으로 처리되어 판단 필요로 표시됩니다.');
  sh.getRange(1, 19).setNote('쉼표로 구분: 소음, 진동, 분진, 병원체, 근골격계');
}

function sheetObjects_(name) {
  var sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  var v = sh.getDataRange().getValues();
  var head = v.shift();
  return v.filter(function (r) { return String(r[0]).trim() !== ''; }).map(function (r) {
    var o = {}; head.forEach(function (h, i) { o[h] = r[i]; }); return o;
  });
}

function getBaseDate_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(T_SHEETS.settings);
  var v = sh ? toDate_(sh.getRange('B1').getValue()) : null;
  return v || toDate_(new Date());
}

function readRecords_() {
  return sheetObjects_(T_SHEETS.records).map(function (r) { return { planId: r['계획ID'], hours: r['교육시간'], date: r['실시일'] }; });
}

function buildPlans_() {
  var data = loadData_();
  var base = getBaseDate_();
  var plans = [];
  sheetObjects_(T_SHEETS.workers).forEach(function (w) { plans = plans.concat(plansForWorker(data, w, base)); });
  return computeStatus(plans, readRecords_(), base);
}

function generatePlans(silent) {
  var ss = SpreadsheetApp.getActive();
  setupTracking_(ss);
  if (!sheetObjects_(T_SHEETS.workers).length) {
    if (silent !== true) SpreadsheetApp.getUi().alert('"근로자" 시트에 근로자를 먼저 입력하세요. (또는 메뉴에서 "시연용 가상 데이터 넣기")');
    return;
  }
  writePlans_(buildPlans_());
  writeBoard_();
  if (silent !== true) SpreadsheetApp.getUi().alert('교육계획을 만들었습니다. "교육계획"과 "현황판" 시트를 확인하세요.');
}

function refreshStatus(silent) {
  generatePlans(true);
  if (silent !== true) SpreadsheetApp.getUi().alert('현황을 새로고침했습니다. 기준일: ' + fmt_(getBaseDate_()));
}

function writePlans_(plans) {
  var ss = SpreadsheetApp.getActive();
  var rows = plans.map(function (p) {
    return [p.id, p.worker, p.name, p.layer, p.course, p.detail, p.judgment, p.hours == null ? '-' : p.hours,
      p.pre ? fmt_(p.pre) : '', p.final ? fmt_(p.final) : '', p.done, p.rate, p.state, p.basis, p.note];
  });
  writeTable_(ss, T_SHEETS.plans, PLAN_HEADER, rows, [150, 60, 70, 45, 170, 260, 80, 90, 110, 100, 70, 70, 140, 240, 320]);
  var sh = ss.getSheetByName(T_SHEETS.plans);
  if (rows.length) {
    sh.getRange(2, 12, rows.length, 1).setNumberFormat('0%');
    sh.getRange(2, 13, rows.length, 1).setBackgrounds(plans.map(function (p) { return [STATE_COLORS[p.state] || '#ffffff']; }));
    sh.getRange(2, 7, rows.length, 1).setFontColors(plans.map(function (p) { return [p.judgment === '판단 필요' ? '#b26a00' : '#1d2430']; }));
  }
}

function writeBoard_() {
  var ss = SpreadsheetApp.getActive();
  var plans = sheetObjects_(T_SHEETS.plans);
  var sh = ss.getSheetByName(T_SHEETS.board) || ss.insertSheet(T_SHEETS.board);
  sh.clear();
  var states = ['완료', '진행 중', '미실시', '기한 임박', '기한 경과', '갈음 대기'];
  var byWorker = {}, order = [];
  plans.forEach(function (p) {
    var w = p['사번'];
    if (!byWorker[w]) { byWorker[w] = { name: p['이름'], items: [] }; order.push(w); }
    byWorker[w].items.push(p);
  });
  function bucket(s) { s = String(s); if (s.indexOf('완료') === 0) return '완료'; if (s.indexOf('기한 경과') === 0) return '기한 경과'; return s; }
  var rows = order.map(function (w) {
    var it = byWorker[w].items;
    var c = {}; states.forEach(function (s) { c[s] = 0; });
    it.forEach(function (p) { var b = bucket(p['상태']); if (c[b] !== undefined) c[b]++; });
    var pending = it.filter(function (p) { return p['판정'] === '판단 필요'; }).length;
    return [w, byWorker[w].name, it.length].concat(states.map(function (s) { return c[s]; })).concat([pending, it.length ? c['완료'] / it.length : 0]);
  });
  var head = ['사번', '이름', '대상 교육'].concat(states).concat(['판단 필요', '이수율']);
  sh.getRange(1, 1).setValue('안전보건교육 이행 현황판').setFontSize(14).setFontWeight('bold');
  sh.getRange(2, 1).setValue('기준일: ' + fmt_(getBaseDate_()) + '   ·   ' + APP.disclaimer).setFontColor('#5b6575');
  var total = ['합계', '', 0, 0, 0, 0, 0, 0, 0, 0, 0];
  rows.forEach(function (r) { for (var i = 2; i <= 9; i++) total[i] += r[i]; });
  total[10] = total[2] ? total[3] / total[2] : 0;
  sh.getRange(4, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#ffffff');
  if (rows.length) {
    sh.getRange(5, 1, rows.length, head.length).setValues(rows);
    sh.getRange(5 + rows.length, 1, 1, head.length).setValues([total]).setFontWeight('bold').setBackground('#eef0f3');
    sh.getRange(5, 11, rows.length + 1, 1).setNumberFormat('0%');
    sh.getRange(5, 8, rows.length, 1).setBackgrounds(rows.map(function (r) { return [r[7] > 0 ? '#fadbd8' : '#ffffff']; }));
    sh.getRange(5, 7, rows.length, 1).setBackgrounds(rows.map(function (r) { return [r[6] > 0 ? '#fff1cc' : '#ffffff']; }));
  }
  var overdue = plans.filter(function (p) { return /기한 경과|기한 임박/.test(p['상태']); });
  var r0 = 7 + rows.length;
  sh.getRange(r0, 1).setValue('조치가 필요한 교육 (기한 경과·임박)').setFontWeight('bold');
  sh.getRange(r0 + 1, 1, 1, 7).setValues([['계획ID', '이름', '교육 종류', '세부', '선행 기한(4시간)', '최종 기한', '상태']]).setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#ffffff');
  if (overdue.length) {
    sh.getRange(r0 + 2, 1, overdue.length, 7).setValues(overdue.map(function (p) { return [p['계획ID'], p['이름'], p['교육 종류'], p['세부'], p['선행 기한(4시간)'], p['최종 기한'], p['상태']]; }));
    sh.getRange(r0 + 2, 7, overdue.length, 1).setBackgrounds(overdue.map(function (p) { return [STATE_COLORS[p['상태']] || '#fff']; }));
  } else sh.getRange(r0 + 2, 1).setValue('없음');
  [80, 90, 80, 70, 70, 70, 70, 70, 70, 80, 70].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.setColumnWidth(1, 150); sh.setColumnWidth(3, 170); sh.setColumnWidth(4, 260);
}

/* ───────── 이수 등록 화면 ───────── */

function openRecordDialog() {
  setupTracking_(SpreadsheetApp.getActive());
  var html = HtmlService.createHtmlOutput(RECORD_FORM_HTML).setWidth(560).setHeight(640);
  SpreadsheetApp.getUi().showModalDialog(html, '이수 등록');
}

function getPlanOptions() {
  return sheetObjects_(T_SHEETS.plans).filter(function (p) { return String(p['상태']).indexOf('완료') !== 0; })
    .map(function (p) { return { id: p['계획ID'], label: p['이름'] + ' · ' + p['교육 종류'] + ' · ' + p['세부'] + ' [' + p['상태'] + ', ' + p['이수 시간'] + '/' + p['법정 최소시간'] + '시간]' }; });
}

function evidenceFolder_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(T_SHEETS.settings);
  var id = sh.getRange('B2').getValue();
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('안전교육_증빙');
  sh.getRange('B2').setValue(f.getId());
  return f;
}

function submitRecord(f) {
  if (!f.planId) throw new Error('교육계획을 선택하세요.');
  if (!f.date) throw new Error('실시일을 입력하세요.');
  var plan = sheetObjects_(T_SHEETS.plans).filter(function (p) { return p['계획ID'] === f.planId; })[0];
  if (!plan) throw new Error('선택한 교육계획을 찾을 수 없습니다. 현황을 새로고침한 뒤 다시 시도하세요.');
  var link = '';
  if (f.file && f.file.b64) {
    var blob = Utilities.newBlob(Utilities.base64Decode(f.file.b64), f.file.mime || 'application/octet-stream', f.planId + '_' + f.date + '_' + f.file.name);
    var file = evidenceFolder_().createFile(blob);
    link = file.getUrl();
  }
  var sh = SpreadsheetApp.getActive().getSheetByName(T_SHEETS.records);
  sh.appendRow(['R' + new Date().getTime(), f.planId, plan['사번'], plan['이름'], plan['교육 종류'], toDate_(f.date), Number(f.hours) || 0,
    f.method, f.instructor, f.content, f.evidenceType, link, new Date()]);
  sh.getRange(sh.getLastRow(), 6).setNumberFormat('yyyy-mm-dd');
  refreshStatus(true);
  return '등록했습니다' + (link ? ' (증빙 파일을 드라이브 "안전교육_증빙" 폴더에 저장)' : '') + '.';
}

var RECORD_FORM_HTML = '<!DOCTYPE html><html><head><base target="_top"><meta charset="utf-8"><style>' +
  'body{font-family:"Malgun Gothic",sans-serif;font-size:13px;margin:12px;color:#1d2430}label{display:block;font-weight:600;margin:10px 0 3px}' +
  'select,input,textarea{width:100%;box-sizing:border-box;padding:6px;border:1px solid #d6dbe3;border-radius:4px;font-size:13px}' +
  'button{margin-top:14px;width:100%;padding:10px;background:#1f3a5f;color:#fff;border:0;border-radius:4px;font-size:14px;cursor:pointer}' +
  '.row{display:flex;gap:8px}.row>div{flex:1}#msg{margin-top:8px}.hint{color:#5b6575;font-size:12px}</style></head><body>' +
  '<label>교육계획 (미완료만 표시)</label><select id="planId"><option value="">불러오는 중…</option></select>' +
  '<div class="row"><div><label>실시일</label><input type="date" id="date"></div><div><label>교육시간(시간)</label><input type="number" id="hours" step="0.5" min="0" value="1"></div></div>' +
  '<div class="row"><div><label>교육방법</label><select id="method"><option>집체교육</option><option>현장교육</option><option>인터넷 원격교육</option></select></div>' +
  '<div><label>강사</label><input id="instructor" placeholder="예: 안전관리자 김OO"></div></div>' +
  '<label>교육내용</label><textarea id="content" rows="3" placeholder="예: 밀폐공간 산소농도 측정, 비상구출 절차"></textarea>' +
  '<div class="row"><div><label>증빙 종류</label><select id="evidenceType"><option>참석자 서명부</option><option>교육 사진</option><option>수료증</option><option>교육자료</option><option>기타</option></select></div>' +
  '<div><label>증빙 파일</label><input type="file" id="file"></div></div><div class="hint">파일은 구글 드라이브 "안전교육_증빙" 폴더에 저장되고, 링크가 이수기록에 남습니다.</div>' +
  '<button id="go">등록</button><div id="msg"></div><script>' +
  'function $(i){return document.getElementById(i)}' +
  'google.script.run.withSuccessHandler(function(o){var s=$("planId");s.innerHTML="<option value=\\"\\">― 선택 ―</option>"+o.map(function(x){return "<option value=\\""+x.id+"\\">"+x.label.replace(/</g,"&lt;")+"</option>"}).join("")}).getPlanOptions();' +
  'function send(file){google.script.run.withSuccessHandler(function(m){$("msg").style.color="#1b7a3d";$("msg").textContent=m;$("go").disabled=false;$("file").value=""})' +
  '.withFailureHandler(function(e){$("msg").style.color="#b00020";$("msg").textContent=e.message||e;$("go").disabled=false})' +
  '.submitRecord({planId:$("planId").value,date:$("date").value,hours:$("hours").value,method:$("method").value,instructor:$("instructor").value,content:$("content").value,evidenceType:$("evidenceType").value,file:file})}' +
  '$("go").onclick=function(){$("go").disabled=true;$("msg").textContent="등록 중…";var f=$("file").files[0];if(!f)return send(null);' +
  'var rd=new FileReader();rd.onload=function(){send({name:f.name,mime:f.type,b64:String(rd.result).split(",")[1]})};rd.readAsDataURL(f)};' +
  '</script></body></html>';

/* ───────── 이수확인서 ───────── */

function makeCertificate() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt('이수확인서', '사번을 입력하세요 (예: W02)', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var id = res.getResponseText().trim();
  var plans = sheetObjects_(T_SHEETS.plans).filter(function (p) { return String(p['사번']) === id; });
  if (!plans.length) { ui.alert('해당 사번의 교육계획이 없습니다.'); return; }
  var recs = sheetObjects_(T_SHEETS.records).filter(function (r) { return String(r['사번']) === id; });
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(T_SHEETS.cert) || ss.insertSheet(T_SHEETS.cert);
  sh.clear();
  sh.getRange('A1').setValue('안전보건교육 이수 확인서').setFontSize(16).setFontWeight('bold');
  sh.getRange('A3:B5').setValues([['사번', id], ['성명', plans[0]['이름']], ['기준일', fmt_(getBaseDate_())]]);
  sh.getRange('A3:A5').setFontWeight('bold');
  sh.getRange('A7').setValue('1. 대상 교육 및 이수 현황').setFontWeight('bold');
  var ph = ['교육 종류', '세부', '판정', '법정 최소시간', '이수 시간', '진행률', '상태', '근거'];
  sh.getRange(8, 1, 1, ph.length).setValues([ph]).setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#fff');
  sh.getRange(9, 1, plans.length, ph.length).setValues(plans.map(function (p) { return [p['교육 종류'], p['세부'], p['판정'], p['법정 최소시간'], p['이수 시간'], p['진행률'], p['상태'], p['근거']]; })).setWrap(true);
  sh.getRange(9, 6, plans.length, 1).setNumberFormat('0%');
  var r0 = 10 + plans.length;
  sh.getRange(r0, 1).setValue('2. 교육 실시 기록 및 증빙').setFontWeight('bold');
  var rh = ['교육 종류', '실시일', '교육시간', '교육방법', '강사', '교육내용', '증빙 종류', '증빙 링크'];
  sh.getRange(r0 + 1, 1, 1, rh.length).setValues([rh]).setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#fff');
  if (recs.length) {
    sh.getRange(r0 + 2, 1, recs.length, rh.length).setValues(recs.map(function (r) { return [r['교육 종류'], fmt_(r['실시일']), r['교육시간'], r['교육방법'], r['강사'], r['교육내용'], r['증빙 종류'], r['증빙 링크']]; })).setWrap(true);
  } else sh.getRange(r0 + 2, 1).setValue('기록 없음');
  var r1 = r0 + 4 + recs.length;
  sh.getRange(r1, 1).setValue('확인자: ____________________ (서명)');
  sh.getRange(r1 + 2, 1).setValue(APP.disclaimer).setFontColor('#b00020');
  [170, 240, 80, 90, 80, 80, 110, 260].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  ss.setActiveSheet(sh);
  ui.alert('"이수확인서" 시트를 만들었습니다. 파일 > 다운로드 > PDF로 저장할 수 있습니다.');
}

/* ═════════════════════════ 시연용 가상 데이터 ═════════════════════════
 * 가상 사업장: (가상) 한빛정밀화학 울산공장 — 실존 회사·인물과 무관
 * 기준일: 2026-11-04
 */

// 순서: 사번, 이름, 직무 구분, 고용 형태, 건설 일용, 감면 사업, 채용일, 배치일, 신규 채용, 작업내용 변경,
//       특별교육 작업 번호, 단기간·간헐 여부, MSDS, 관리대상, 허가대상, 특별관리, 신규 물질, MSDS 변경, 유해인자, 메모
// 순서: 계획ID, 실시일, 교육시간, 교육방법, 강사, 교육내용, 증빙 종류
// 정답표: 법령을 근거로 사람이 먼저 정한 답. 앱 결과와 자동 대조합니다.
// 순서: 계획ID, 이름, 교육 종류, 기대 시간, 기대 판정, 기대 상태(기준일 2026-11-04), 정답 근거
function loadDemo() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActive();
  if (!ss.getSheetByName(SHEETS.hours)) { ui.alert('먼저 [초기 설정]을 실행하세요.'); return; }
  var ok = ui.alert('시연용 가상 데이터', '"근로자"와 "이수기록" 시트를 가상 데이터로 바꾸고 기준일을 2026-11-04로 설정합니다. 계속할까요?', ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;
  setupTracking_(ss);
  ss.getSheetByName(T_SHEETS.settings).getRange('B1').setValue(toDate_(DEMO_BASE)).setNumberFormat('yyyy-mm-dd');

  var wrows = DEMO_WORKERS.map(function (r) { var c = r.slice(); c[6] = toDate_(c[6]); c[7] = toDate_(c[7]); return c; });
  var wsh = ss.getSheetByName(T_SHEETS.workers);
  if (wsh.getLastRow() > 1) wsh.getRange(2, 1, wsh.getLastRow() - 1, WORKER_HEADER.length).clearContent();
  wsh.getRange(2, 1, wrows.length, WORKER_HEADER.length).setValues(wrows);
  wsh.getRange(2, 7, wrows.length, 2).setNumberFormat('yyyy-mm-dd');

  var names = {}; DEMO_WORKERS.forEach(function (w) { names[w[0]] = w[1]; });
  var courses = { '채용': '채용 시 교육', '변경': '작업내용 변경 시 교육', '건설기초': '건설업 기초안전보건교육', 'MSDS': '물질안전보건자료(MSDS) 교육' };
  var rrows = DEMO_RECORDS.map(function (r, i) {
    var wid = r[0].split('-')[0], kind = r[0].split('-')[1];
    var course = courses[kind] || (kind.indexOf('특별') === 0 ? '특별교육' : kind === '정기' ? '정기교육' : kind === '주지' ? '유해성 주지' : kind);
    return ['DEMO-' + (i + 1), r[0], wid, names[wid], course, toDate_(r[1]), r[2], r[3], r[4], r[5], r[6], '(시연용 가상 증빙 — 파일 없음)', new Date()];
  });
  var rsh = ss.getSheetByName(T_SHEETS.records);
  if (rsh.getLastRow() > 1) rsh.getRange(2, 1, rsh.getLastRow() - 1, RECORD_HEADER.length).clearContent();
  rsh.getRange(2, 1, rrows.length, RECORD_HEADER.length).setValues(rrows);
  rsh.getRange(2, 6, rrows.length, 1).setNumberFormat('yyyy-mm-dd');

  generatePlans(true);
  writeDemoSheet_(null);
  ss.setActiveSheet(ss.getSheetByName(T_SHEETS.board));
  ui.alert('시연 데이터를 넣었습니다', '가상 근로자 10명, 이수기록 ' + rrows.length + '건으로 교육계획과 현황판을 만들었습니다.\n\n메뉴 [시연 정답표 대조하기]를 누르면 앱 결과를 정답표와 비교합니다.', ui.ButtonSet.OK);
}

function writeDemoSheet_(rows) {
  var ss = SpreadsheetApp.getActive();
  var data = rows || DEMO_EXPECTED.map(function (e) { return e.concat(['', '', '', '']); });
  writeTable_(ss, T_SHEETS.demo, DEMO_EXPECTED_HEADER, data, [150, 70, 170, 70, 80, 110, 420, 80, 70, 110, 70]);
  var sh = ss.getSheetByName(T_SHEETS.demo);
  if (rows) {
    sh.getRange(2, 11, rows.length, 1).setBackgrounds(rows.map(function (r) { return [r[10] === '일치' ? '#d9f2e1' : '#fadbd8']; }));
  }
  return sh;
}

function verifyDemo() {
  var ui = SpreadsheetApp.getUi();
  var plans = buildPlans_();
  writePlans_(plans);
  writeBoard_();
  var rows = compareExpected(DEMO_EXPECTED, plans);
  var sh = writeDemoSheet_(rows);
  var ok = rows.filter(function (r) { return r[10] === '일치'; }).length;
  sh.insertRowBefore(1);
  sh.getRange(1, 1).setValue('대조 결과: ' + rows.length + '건 중 ' + ok + '건 일치 (기준일 ' + fmt_(getBaseDate_()) + ')').setFontWeight('bold').setFontSize(13);
  SpreadsheetApp.getActive().setActiveSheet(sh);
  ui.alert('정답표 대조 결과', rows.length + '건 중 ' + ok + '건 일치했습니다.' + (ok < rows.length ? '\n붉은색 행을 확인하세요.' : ''), ui.ButtonSet.OK);
}
