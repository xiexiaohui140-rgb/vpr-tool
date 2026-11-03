/* =====================================================================
 * V-P-R 床旁快速评估 —— 规则文件（科室可直接编辑本文件）
 * 来源：护理质量持续改进专案/PDCA/QCC 正式版「床旁操作规范」「三区判定与处置」
 *       「KRP 三级容量管理」「立即报告医生的情形」「关键数值一览」。
 * 标注 PENDING 的条目 = 科室建议标准，待审定（文档未写明，由项目组补充）。
 * ===================================================================== */
(function (root) {
  const RULES = {
    version: 'v1.1',
    date: '2026-11-03',

    // ---- 阈值（文档原值）----
    MAP_MIN: 65,            // mmHg，MAP<65 → 红区
    CRT_MAX: 3,             // s，CRT>3 且持续延长 → 红区
    FO_LOW: 5,              // %，FO<5 绿区条件；FO 5 为早期预警阈值
    FO_HIGH: 10,            // %，FO≥10 黄区 / 高液体负荷
    // 黄区净超滤（mL/kg/h）
    UF_START_MIN: 0.5, UF_START_MAX: 1.0, UF_NURSE_MAX: 1.75,
    UF_STEP: '20～30 mL/h',
    // 处方落实率
    FULFIL_TARGET: 90, FULFIL_PASS: 80,
    // 乳酸报告线
    LAC_REPORT: 4.0, LAC_HIGH: 2.0, LAC_DECLINE_MIN: 10,   // %
    // 停机
    DOWNTIME_WARN: 3, DOWNTIME_REPORT: 5,                    // h/24h
    RECHECK: { red: '30 分钟内复测 MAP、CRT；血乳酸每 2 h 复查至下降', yellow: '上调后 1 h 复评 MAP、CRT、NE 剂量及本班累计液体平衡', green: '按时评估；病情变化时重新分区' },

    // ---- PENDING：科室建议标准，待审定 ----
    PENDING: {
      foFormula: 'FO% =（累计入量 − 累计出量）mL ÷（体重 kg × 1000）× 100%（Goldstein 公式，自入 ICU 起累计）',
      middleBand: 'FO 5%～<10% 不论平衡趋势均归黄区，从低端 0.5 mL/kg/h 起步',
      krp: 'FO<5% → KEEP（若 24 h 正平衡且上升 → REMOVE）；FO 5～<10% → REMOVE；FO≥10% → REMOVE-H',
      intolerance: '疑似/明确不耐受判定细则（见帮助清单），于启动或上调 UF 约 1 h 内评估'
    },
    // UF 不耐受辅助清单（PENDING）
    INTOL_SUSPECT: [
      ['s_map', 'MAP 较调整前下降 ≥10 mmHg，但仍 ≥65'],
      ['s_hr', '心率升高 ≥20 次/min 或 ≥20%'],
      ['s_crt', 'CRT 较前延长，但 ≤3 s'],
      ['s_sym', '新发不适（烦躁、出汗、抽筋、恶心）']
    ],
    INTOL_CLEAR: [
      ['c_map', 'MAP<65 或 SBP<90 mmHg，或 MAP 较前下降 ≥20%'],
      ['c_ne', '需新加或上调 NE 才能维持血压'],
      ['c_arr', '新发心律失常'],
      ['c_lac', '乳酸较前升高'],
      ['c_stop', '需暂停 UF 才能维持循环']
    ]
  };

  const r = Math.round;
  function ufMlh(w, k) { return r(w * k); }

  // FO% 自动计算
  function computeFO(intake, output, weight) {
    if (!(weight > 0) || intake == null || output == null || isNaN(intake) || isNaN(output)) return null;
    return Math.round(((intake - output) / (weight * 1000)) * 1000) / 10;
  }

  // 根据清单推荐耐受等级
  function suggestTolerance(checks) {
    checks = checks || {};
    if (RULES.INTOL_CLEAR.some(([k]) => checks[k])) return '明确不耐受';
    if (RULES.INTOL_SUSPECT.some(([k]) => checks[k])) return '疑似不耐受';
    return '耐受';
  }

  /* 主评估：灌注优先 → 容量 → 净超滤；区优先级 红>黄>绿 */
  function evaluate(d) {
    const out = { redReasons: [], reports: [], warnings: [] };
    const w = Number(d.weight);
    let fo = d.fo != null && d.fo !== '' && !isNaN(d.fo) ? Number(d.fo) : computeFO(d.intake, d.output, w);
    out.fo = fo;
    const fbPosRising = Number(d.fb) > 0 && d.fbTrend === 'up';
    out.fbPosRising = fbPosRising;

    // 1) 灌注
    if (d.map != null && d.map !== '' && Number(d.map) < RULES.MAP_MIN) out.redReasons.push('MAP<65 mmHg');
    if (Number(d.crt) > RULES.CRT_MAX && d.crtWorse) out.redReasons.push('CRT>3 s 且持续延长');
    if (d.lacTrend === 'up') out.redReasons.push('血乳酸进行性升高');
    if (d.ne === 'up') out.redReasons.push('NE 剂量进行性增加');
    const perfusionMet = out.redReasons.length === 0;

    // 2) 分区
    if (!perfusionMet) out.zone = 'red';
    else if (fo == null) out.zone = null;
    else if (fo >= RULES.FO_HIGH || fbPosRising) out.zone = 'yellow';
    else if (fo >= RULES.FO_LOW) { out.zone = 'yellow'; out.middleBand = true; }
    else out.zone = 'green';

    // 3) KRP（按 FO 分层）
    if (fo != null) {
      if (fo >= RULES.FO_HIGH) out.krp = 'REMOVE-H';
      else if (fo >= RULES.FO_LOW) out.krp = 'REMOVE';
      else out.krp = fbPosRising ? 'REMOVE' : 'KEEP';
    }
    const tol = d.tolerance || '耐受';
    out.tolerance = tol;
    out.protect = !perfusionMet || tol !== '耐受';

    // 4) 净超滤
    if (out.zone === 'red') {
      out.uf = { text: '净超滤调到 0 mL/h —— 先暂停脱水', kg: '0', mlh: '0' };
    } else if (out.zone === 'yellow') {
      const lo = RULES.UF_START_MIN, hi = out.middleBand ? RULES.UF_START_MIN : RULES.UF_START_MAX;
      out.uf = {
        kg: out.middleBand ? '0.5' : '0.5～1.0', capKg: RULES.UF_NURSE_MAX,
        mlh: w > 0 ? (out.middleBand ? `${ufMlh(w, lo)}` : `${ufMlh(w, lo)}～${ufMlh(w, hi)}`) : null,
        capMlh: w > 0 ? ufMlh(w, RULES.UF_NURSE_MAX) : null,
        text: out.middleBand ? '净超滤从低端 0.5 mL/kg/h 起步' : '净超滤 0.5～1.0 mL/kg/h 起步'
      };
    } else if (out.zone === 'green') {
      out.uf = { text: '净超滤维持不变 —— 不加不减', kg: '维持', mlh: '维持' };
    }
    if (out.zone) out.recheck = RULES.RECHECK[out.zone];

    // 不耐受覆盖（不论分区）
    if (tol !== '耐受') out.intolAction = '立即下调或暂停净超滤 → 复评灌注并记录 → 报告医生';
    // v1.1：不耐受覆盖黄/绿区的净超滤建议（红区本已 0 mL/h，不覆盖）
    if (tol !== '耐受' && out.zone && out.zone !== 'red') {
      const act = tol === '明确不耐受' ? '暂停或显著下调' : '下调';
      out.ufOverride = true;
      out.uf = { override: true, text: '立即下调或暂停净超滤', detail: `${tol}：${act}净超滤；不执行本区上调/维持方案`, kg: act, mlh: act };
      out.recheck = '下调/暂停后立即复评灌注';
    }

    // 5) 落实率
    if (Number(d.ufRx) > 0 && d.ufActual !== '' && d.ufActual != null) {
      const f = Math.round(Number(d.ufActual) / Number(d.ufRx) * 1000) / 10;
      out.fulfil = f;
      out.fulfilMsg = f >= RULES.FULFIL_TARGET ? '达科室目标（≥90%）' : f >= RULES.FULFIL_PASS ? '80%～89%：优先纠正执行问题（管路冲洗、更换滤器、减少停机）' : '<80%：同步整改并报告医生';
    }

    // 6) 立即报告
    if (out.zone === 'red') out.reports.push('红区（灌注不达标）：10 min 内报告医生');
    if (tol === '明确不耐受') out.reports.push('超滤明确不耐受');
    else if (tol === '疑似不耐受') out.warnings.push('疑似不耐受：下调/暂停后报告医生');
    const lac = Number(d.lac), lac2 = Number(d.lac2h);
    if (d.lac !== '' && d.lac != null && lac >= RULES.LAC_REPORT) out.reports.push('血乳酸 ≥4.0 mmol/L');
    else if (lac > RULES.LAC_HIGH) {
      if (d.lac2h !== '' && d.lac2h != null && lac2 > 0) {
        const dec = Math.round((lac2 - lac) / lac2 * 1000) / 10;
        out.lacDecline = dec;
        if (dec < RULES.LAC_DECLINE_MIN) out.reports.push(`血乳酸 >2.0 且 2 h 降幅 ${dec}% <10%`);
      } else if (d.lacTrend === 'up') out.reports.push('血乳酸 >2.0 且仍呈上升趋势');
    }
    const dt = Number(d.downtime);
    if (dt >= RULES.DOWNTIME_REPORT) out.reports.push(`24 h 累计停机 ${dt} h ≥5 h，处方难以落实`);
    else if (dt > RULES.DOWNTIME_WARN) out.warnings.push(`停机 ${dt} h >3 h：先行整改、记录原因并预警`);
    if (d.nurseConcern) out.reports.push('护士判断病情恶化');
    return out;
  }

  const ZONE_CN = { red: '红区', yellow: '黄区', green: '绿区' };
  function sbar(d, o) {
    const v = (x, u = '') => (x === '' || x == null || (typeof x === 'number' && isNaN(x))) ? '×' + u : x + u;
    const ne = { stable: '稳定', up: '进行性增加' }[d.ne] || '×';
    const fb = d.fb === '' || d.fb == null ? '×' : (Number(d.fb) > 0 ? '+' : '') + d.fb;
    const act = o.tolerance === '明确不耐受' ? '暂停或显著下调' : '下调';
    const ufNow = o.zone === 'red' ? '已将净超滤暂停（0 mL/h）'
      : o.ufOverride ? `当前实际净超滤 ${v(d.ufActual)} mL/h，` + ((d.ufAdjusted !== '' && d.ufAdjusted != null) ? `已调整为 ${d.ufAdjusted} mL/h` : `已提示${act}`)
      : `当前实际净超滤 ${v(d.ufActual)} mL/h`;
    const rec = o.ufOverride ? '建议重新评估净超滤目标及血管活性药物方案'
      : o.zone === 'red' ? '建议评估是否调整血管活性药物方案，待灌注恢复后评估是否低速恢复净超滤'
      : o.zone === 'yellow' ? `建议在医嘱范围内按 ${o.uf.kg} mL/kg/h（约 ${o.uf.mlh} mL/h）起步上调，评估是否上调 24 h 净脱水目标`
      : '建议维持当前处方';
    return [
      `S 现状：${v(d.bed)}床，SA-AKI 行 CRRT 治疗，本次评估为${ZONE_CN[o.zone] || '未分区'}，KRP：${o.krp || '×'}${o.protect ? '（PROTECT 触发）' : ''}；UF 耐受：${o.tolerance}。`,
      `B 数据：FO ${v(o.fo, '%')}，24 h 液体平衡 ${fb} mL，MAP ${v(d.map)} mmHg，CRT ${v(d.crt)} s，血乳酸 ${v(d.lac)} mmol/L，NE ${ne}。`,
      `A 已做：${ufNow}${o.fulfil != null ? `，处方落实率 ${o.fulfil}%` : ''}；${o.redReasons.length ? '红区依据：' + o.redReasons.join('、') + '。' : ''}`,
      `R 建议：${rec}。${o.reports.length ? '需立即报告：' + o.reports.join('；') + '。' : ''}`
    ].join('\n');
  }

  const api = { RULES, evaluate, computeFO, suggestTolerance, sbar, ufMlh, ZONE_CN };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VPR = api;
})(this);
