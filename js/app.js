// Scoring utilities
const clamp = (x, a=0, b=100) => Math.max(a, Math.min(b, x));

function mapCategoryOr010(value){
  if (value === null || value === undefined || value === '') return null;
  if (!isNaN(value)){
    const n = Number(value);
    return clamp(n*10,0,100);
  }
  const s = String(value).trim().toLowerCase();
  const mapping = {
    'poor':0, '差':0,
    'neutral':50,'一般':50,
    'good':80,'好':80,
    'very_good':100,'very good':100,'很好':100
  };
  return mapping[s] !== undefined ? mapping[s] : 50;
}

function salaryScore(annual_salary, expected_salary, min_good=50000, max_good=500000){
  if (annual_salary === null || annual_salary === undefined || annual_salary === '') return null;
  let a = Number(annual_salary);
  if (isNaN(a)) return null;
  if (expected_salary !== null && expected_salary !== undefined && expected_salary !== ""){
    let e = Number(expected_salary);
    if (!isNaN(e) && e>0){
      return clamp(Math.min(150, a / e * 100), 0, 150);
    }
  }
  if (max_good <= min_good) max_good = min_good + 1;
  let sc = (a - min_good) / (max_good - min_good) * 100;
  return clamp(sc, 0, 100);
}

function hoursScore(contracted_hours, actual_hours){
  if (contracted_hours === null || contracted_hours === undefined || contracted_hours === "" ||
      actual_hours === null || actual_hours === undefined || actual_hours === "") return null;
  let c = Number(contracted_hours), a = Number(actual_hours);
  if (isNaN(c) || isNaN(a) || c <= 0) return null;
  let ratio = a / c;
  if (ratio <= 1.0) return 100;
  if (ratio >= 1.5) return 0;
  return clamp((1.5 - ratio) / 0.5 * 100, 0, 100);
}

function commuteScore(commute_mins, short_thresh=15, long_thresh=90){
  if (commute_mins === null || commute_mins === undefined || commute_mins === "") return null;
  let m = Number(commute_mins);
  if (isNaN(m)) return null;
  if (m <= short_thresh) return 100;
  if (m >= long_thresh) return 0;
  return clamp((long_thresh - m) / (long_thresh - short_thresh) * 100, 0, 100);
}

function punchScore(punch_required, score_if_required=20, score_if_not_required=100){
  if (punch_required === null || punch_required === undefined) return null;
  return punch_required ? score_if_required : score_if_not_required;
}

function wfhScore(partial_wfh, score_if_true=100, score_if_false=0){
  if (partial_wfh === null || partial_wfh === undefined) return null;
  return partial_wfh ? score_if_true : score_if_false;
}

function computeTotalScore(inputs, weights, salary_thresholds){
  const default_weights = {
    salary:30, hours:20, commute:10, punch:5, wfh:8, outlook:10, promotion:8, reputation:9
  };
  const W = Object.assign({}, default_weights, weights || {});
  const min_good = (salary_thresholds && salary_thresholds.min_good) ? salary_thresholds.min_good : 50000;
  const max_good = (salary_thresholds && salary_thresholds.max_good) ? salary_thresholds.max_good : 500000;

  const scores = {};
  // If employer provident fund percentage provided, treat employer contribution as part of package.
  // employer_pf_pct is percentage (e.g., 12 for 12%). Employer contribution per year ~= annual_salary * employer_pf_pct / 100
  let effective_salary = null;
  if (inputs.annual_salary !== null && inputs.annual_salary !== undefined && inputs.annual_salary !== ""){
    const base = Number(inputs.annual_salary);
    if (!isNaN(base)){
      const pfPct = (inputs.employer_pf_pct !== null && inputs.employer_pf_pct !== undefined && inputs.employer_pf_pct !== "") ? Number(inputs.employer_pf_pct) : 0;
      const employer_pf = (!isNaN(pfPct) && pfPct > 0) ? base * (pfPct / 100) : 0;
      effective_salary = base + employer_pf;
    }
  }
  scores.salary = salaryScore(effective_salary !== null ? effective_salary : inputs.annual_salary, inputs.expected_salary, min_good, max_good);
  scores.hours = hoursScore(inputs.contracted_hours, inputs.actual_hours);
  scores.commute = commuteScore(inputs.commute_mins);
  scores.punch = punchScore(inputs.punch_required);
  scores.wfh = wfhScore(inputs.partial_wfh);
  scores.outlook = mapCategoryOr010(inputs.business_outlook);
  scores.promotion = mapCategoryOr010(inputs.promotion_opportunity);
  scores.reputation = mapCategoryOr010(inputs.company_reputation);

  const presentItems = {};
  for (let k in scores) if (scores[k] !== null && scores[k] !== undefined && !isNaN(scores[k])) presentItems[k]=scores[k];
  const presentWeights = {};
  let sumPresentWeights = 0;
  for (let k in presentItems){
    presentWeights[k] = W[k] || 0;
    sumPresentWeights += presentWeights[k];
  }
  let total = null;
  if (sumPresentWeights > 0){
    let weightedSum = 0;
    for (let k in presentItems){
      weightedSum += presentItems[k] * presentWeights[k];
    }
    total = clamp(weightedSum / sumPresentWeights, 0, 100);
  }
  return {
    subscores: scores,
    weights_used: W,
    present_weights_sum: sumPresentWeights,
    present_items: Object.keys(presentItems),
  total_score: total,
  effective_salary: effective_salary !== null ? effective_salary : null
  };
}

// DOM helpers
const $ = id => document.getElementById(id);

function getInputsFromUI(){
  return {
    annual_salary: $("annual_salary").value.trim() || null,
    expected_salary: $("expected_salary").value.trim() || null,
  employer_pf_pct: $("employer_pf_pct") ? $("employer_pf_pct").value.trim() || null : null,
    contracted_hours: $("contracted_hours").value.trim() || null,
    actual_hours: $("actual_hours").value.trim() || null,
    commute_mins: $("commute_mins").value.trim() || null,
    punch_required: $("punch_toggle").dataset.on === "true",
    partial_wfh: $("wfh_toggle").dataset.on === "true",
    business_outlook: $("business_outlook").value,
    promotion_opportunity: $("promotion_opportunity").value,
    company_reputation: $("company_reputation").value
  };
}

function getWeightsFromUI(){
  return {
    salary: Number($("w_salary").value),
    hours: Number($("w_hours").value),
    commute: Number($("w_commute").value),
    punch: Number($("w_punch").value),
    wfh: Number($("w_wfh").value),
    outlook: Number($("w_outlook").value),
    promotion: Number($("w_promotion").value),
    reputation: Number($("w_reputation").value)
  };
}

function renderResults(){
  const inputs = getInputsFromUI();
  const weights = getWeightsFromUI();
  const result = computeTotalScore(inputs, weights, null);

  const total = result.total_score;
  const radialInner = $("radial_inner");
  if (total === null || isNaN(total)){
    radialInner.textContent = "--";
    $("radial").style.background = "conic-gradient(#222 0deg, #111a25 0deg)";
    $("weights_sum").textContent = "0";
  } else {
    radialInner.textContent = Math.round(total);
    const angle = total / 100 * 360;
    $("radial").style.background = `conic-gradient(var(--accent) ${angle}deg, rgba(255,255,255,0.03) ${angle}deg)`;
    $("weights_sum").textContent = Math.round(result.present_weights_sum);
  }

  const labels = {
    salary:"薪酬",
    hours:"工作负荷",
    commute:"通勤",
    punch:"是否打卡",
    wfh:"在家办公",
    outlook:"业务前景",
    promotion:"晋升机会",
    reputation:"公司知名度"
  };
  const subs = result.subscores;
  const container = $("subscores");
  container.innerHTML = "";
  for (let k of Object.keys(labels)){
    const val = subs[k];
    const row = document.createElement("div");
    row.className = "d-flex justify-content-between align-items-center mb-2 subscore-item";
    const left = document.createElement("div");
    left.innerHTML = `<div class=\"fw-semibold\">${labels[k]}</div><div class=\"small text-muted\" style=\"font-size:12px\">${k}</div>`;
    const right = document.createElement("div");
    right.style.display = "flex"; right.style.alignItems="center";
    const pill = document.createElement("div");
    pill.className = "badge bg-dark me-2";
    pill.style.minWidth="44px"; pill.style.textAlign="center";
    pill.textContent = (val===null || val===undefined || isNaN(val)) ? "—" : Math.round(val);
    const barWrap = document.createElement("div");
  barWrap.style.flex = "1"; barWrap.style.height = "10px"; barWrap.style.background = "rgba(255,255,255,0.04)"; barWrap.style.borderRadius = "8px"; barWrap.style.overflow = "hidden";
    const barInner = document.createElement("div");
    barInner.style.height = "100%"; barInner.style.background = "linear-gradient(90deg,var(--accent),var(--accent-2))"; barInner.style.width = ((val===null||val===undefined||isNaN(val))?0:val) + "%";
    barWrap.appendChild(barInner);
    right.appendChild(pill);
    right.appendChild(barWrap);
    row.appendChild(left);
    row.appendChild(right);
    container.appendChild(row);
  }

  const jsonArea = $("json_area");
  const exportObj = { inputs, weights, result };
  jsonArea.textContent = JSON.stringify(exportObj, null, 2);
}

function init(){
  const toggles = ["punch_toggle","wfh_toggle"];
  toggles.forEach(id=>{
    const el = document.getElementById(id);
    function refresh(){
      const on = el.dataset.on === "true";
      if (on) el.classList.add("on"); else el.classList.remove("on");
      if (id==="punch_toggle") $("punch_label").textContent = on ? "是" : "否";
      if (id==="wfh_toggle") $("wfh_label").textContent = on ? "支持" : "不支持";
      const cb = el.querySelector('input[type="checkbox"]'); if (cb) cb.checked = on;
    }
    refresh();
    el.addEventListener("click", ()=>{ el.dataset.on = (el.dataset.on === "true") ? "false" : "true"; refresh(); renderResults(); });
  });

  const rangePairs = [
    ["promotion_opportunity","promotion_val"],
    ["company_reputation","reputation_val"],
    ["w_salary","w_salary_v"],
    ["w_hours","w_hours_v"],
    ["w_commute","w_commute_v"],
    ["w_punch","w_punch_v"],
    ["w_wfh","w_wfh_v"],
    ["w_outlook","w_outlook_v"],
    ["w_promotion","w_promotion_v"],
    ["w_reputation","w_reputation_v"]
  ];
  rangePairs.forEach(pair=>{
    const a=$(pair[0]), b=$(pair[1]);
    if (!a||!b) return;
    function upd(){ b.textContent = a.value; }
    a.addEventListener("input", ()=>{ upd(); renderResults(); });
    upd();
  });

  const inputs = ["annual_salary","expected_salary","contracted_hours","actual_hours","commute_mins","business_outlook"];
  inputs.forEach(id=>{ const el=$(id); if (!el) return; el.addEventListener("input", ()=>renderResults()); });

  // ensure employer provident fund input triggers recalculation
  const ep = $("employer_pf_pct"); if (ep) ep.addEventListener("input", ()=>renderResults());

  const presets = {
    default: {salary:30,hours:20,commute:10,punch:5,wfh:8,outlook:10,promotion:8,reputation:9},
    balanced:{salary:25,hours:20,commute:10,punch:5,wfh:10,outlook:12,promotion:8,reputation:10},
    money:{salary:50,hours:10,commute:5,punch:3,wfh:5,outlook:10,promotion:7,reputation:10},
    life:{salary:15,hours:10,commute:25,punch:2,wfh:20,outlook:8,promotion:5,reputation:15},
    career:{salary:20,hours:15,commute:5,punch:3,wfh:7,outlook:20,promotion:20,reputation:10}
  };
  $("btn_reset").addEventListener("click", ()=>applyPreset("default"));
  $("btn_balanced").addEventListener("click", ()=>applyPreset("balanced"));
  $("btn_money").addEventListener("click", ()=>applyPreset("money"));
  $("btn_life").addEventListener("click", ()=>applyPreset("life"));
  $("btn_career").addEventListener("click", ()=>applyPreset("career"));

  function applyPreset(name){
    const p = presets[name]; if (!p) return;
    for (let k in p){ const el = $("w_"+k); if (!el) continue; el.value = p[k]; const v = $("w_"+k+"_v"); if (v) v.textContent = p[k]; }
    renderResults();
  }
  applyPreset("default");

  $("btn_calc").addEventListener("click", ()=>renderResults());
  $("btn_export").addEventListener("click", ()=>{
    const area = $("json_area");
    const blob = new Blob([area.textContent], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "job_score_input.json"; a.click(); URL.revokeObjectURL(url);
  });

  renderResults();
}

document.addEventListener("DOMContentLoaded", init);
