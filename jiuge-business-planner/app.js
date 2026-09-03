const isDemoMode = new URLSearchParams(window.location.search).get("demo") === "1";
const planningNow = isDemoMode ? new Date(2026, 8, 1) : new Date();
const defaultPlanDate = new Date(planningNow.getFullYear(), planningNow.getMonth() + 1, 1);

const appState = {
  city: "",
  planYear: defaultPlanDate.getFullYear(),
  planMonth: defaultPlanDate.getMonth() + 1,
  planOffset: 1,
  market: null,
  marketInfo: null,
  revenue: null,
  operation: null,
  storeCount: null,
  stage: null,
  channel: null,
  channelShares: {},
  priorityIssue: null,
  otherIssue: "",
  diagnosedCell: null,
  viewedCell: null,
  engines: [],
  selectedEngine: null,
  plan: []
};

const marketLabels = { high: "高线市场", mid: "中线市场", low: "下沉市场" };
const stageLabels = { start: "0-1 起步", grow: "1-10 成长", asset: "10-100 资产化" };
const revenueLabels = {
  under10: "月营收 10 万以内",
  "10to30": "月营收 10-30 万",
  "30to50": "月营收 30-50 万",
  "50to100": "月营收 50-100 万",
  over100: "月营收 100 万以上"
};
const operationLabels = { single: "非连锁", smallChain: "小型连锁", chain: "连锁" };
const channelLabels = { missing: "基础缺失", single: "单渠道较强", complete: "多渠道齐全" };

const issueData = {
  traffic: {
    label: "新客和进店客流不足",
    engine: "拉新获客",
    action: "围绕当月上新组合小红书种草、私域裂变和低价流量品承接新客",
    core: "当月上新拉新与新客承接闭环"
  },
  launch: {
    label: "上新有曝光但销售不理想",
    engine: "产品与利润",
    action: "复查新品卖点、价格带和切块尝新路径，并逐渠道跟进曝光到成交"
  },
  repeat: {
    label: "老客不少，但复购和再次触达较弱",
    engine: "首购转复购",
    action: "建立上月新客一转二批次触达，并按首购产品和来源复盘结果"
  },
  channel: {
    label: "渠道已上线，但成交或核销较差",
    engine: "拉新获客",
    action: "逐渠道检查商品、价格、成交和核销链路，只保留能完成真实交易的动作",
    core: "重点渠道成交与核销链路改善"
  },
  fulfillment: {
    label: "节日订单、产能和交付容易失控",
    engine: "内部经营优化",
    action: "把订单、库存、产能、排班和异常处理纳入节点项目的每日看板"
  },
  profit: {
    label: "营业额尚可，但利润或现金压力较大",
    engine: "产品与利润",
    action: "核查主推产品毛利、折扣、渠道费用和损耗，形成当月止损动作",
    core: "主推产品利润与现金改善"
  },
  execution: {
    label: "人手、排班或门店执行跟不上",
    engine: "内部经营优化",
    action: "按本月项目重排岗位和产能，补齐门店话术、核销和交付检查",
    core: "门店排班与执行能力改善"
  },
  none: {
    label: "当前没有明显紧急问题",
    engine: null,
    action: "按月历项目和九宫格策略维持本月经营节奏"
  },
  other: {
    label: "其他具体问题",
    engine: "内部经营优化",
    action: "将用户描述的问题拆成专项任务、完成时限和验收结果",
    core: "首要经营问题专项改善"
  }
};

const highTierCities = [
  "北京", "上海", "广州", "深圳", "成都", "杭州", "重庆", "武汉", "苏州", "西安",
  "南京", "长沙", "天津", "郑州", "东莞", "青岛", "昆明", "宁波", "合肥", "佛山"
];
const lowTierCities = [
  "鹤岗", "双鸭山", "七台河", "伊春", "黑河", "白山", "辽源", "阜新", "铁岭", "朝阳",
  "朔州", "忻州", "吕梁", "巴彦淖尔", "乌海", "张掖", "武威", "定西", "陇南", "固原",
  "中卫", "海东", "儋州", "三沙", "普洱", "临沧", "保山", "昭通", "铜仁", "毕节",
  "贺州", "河池", "来宾", "百色", "防城港", "云浮", "河源", "汕尾", "阳江", "清远"
];

const strategyData = {
  "high-start": { name: "尖锐定位", description: "缩小客群与庆祝场景，用一个招牌口味验证成交；优先补产品、拉新和交付基础。" },
  "high-grow": { name: "效率增长", description: "围绕主推产品核算渠道投入、首购和次月一转二结果，把预算集中到有效渠道与产品组合。" },
  "high-asset": { name: "品牌壁垒", description: "把招牌、场景、会员关系和组织能力沉淀为竞争资产，减少对单次爆款的依赖。" },
  "mid-start": { name: "建立成交", description: "跑通口味蛋糕、内容获客、交易渠道和稳定交付，形成第一条可重复成交链路。" },
  "mid-grow": { name: "区域首选", description: "用招牌口味和庆祝场景建立本地心智，强化复购并做强优势渠道。" },
  "mid-asset": { name: "区域扩张", description: "守住本地首选，强化供应链、会员价值和多店协同，再验证相邻市场。" },
  "low-start": { name: "需求验证", description: "先验证价格、口味和基础渠道，把稳定成交和现金流放在高成本投放之前。" },
  "low-grow": { name: "本地占领", description: "依靠口碑、熟客、转介绍和高确定性交付占领本地庆祝需求。" },
  "low-asset": { name: "复制外拓", description: "把本地优势标准化为产品、服务、供应链和组织模型，再谨慎扩店或跨城。" }
};

const channelCorrections = {
  missing: "补齐一个可成交渠道",
  single: "放大优势渠道并补承接",
  complete: "按来源与二购结果分配预算"
};
const priorityLabels = { main: "本月主攻", build: "重点建设", maintain: "基础维持", defer: "本月不做" };
const basePriorities = {
  start: { "产品与利润": "main", "拉新获客": "main", "首购转复购": "build", "会员长期运营": "defer", "大活动爆发": "defer", "内部经营优化": "build" },
  grow: { "产品与利润": "main", "拉新获客": "build", "首购转复购": "main", "会员长期运营": "build", "大活动爆发": "defer", "内部经营优化": "build" },
  asset: { "产品与利润": "build", "拉新获客": "maintain", "首购转复购": "build", "会员长期运营": "main", "大活动爆发": "build", "内部经营优化": "main" }
};

const screens = [...document.querySelectorAll(".screen")];
const progressItems = [...document.querySelectorAll(".progress-item")];
const screenOrder = ["diagnosis", "strategy", "engines", "plan"];
const channelShareNames = ["miniProgram", "meituanDelivery", "instantDelivery", "meituanDeal", "douyinDeal", "otherChannel"];

function dateForPlanOffset(offset) {
  return new Date(planningNow.getFullYear(), planningNow.getMonth() + offset, 1);
}

function setPlanOffset(offset) {
  const target = dateForPlanOffset(offset);
  appState.planOffset = offset;
  appState.planYear = target.getFullYear();
  appState.planMonth = target.getMonth() + 1;
}

function updateDefaultPlanButton() {
  const nextMonth = dateForPlanOffset(1);
  document.getElementById("toPlan").textContent = `生成 ${nextMonth.getMonth() + 1} 月计划`;
}

function showScreen(name) {
  screens.forEach((screen) => screen.classList.toggle("is-active", screen.dataset.screen === name));
  progressItems.forEach((item) => item.classList.toggle("is-active", item.dataset.progress === name));
  document.getElementById("stepCount").textContent = `${String(screenOrder.indexOf(name) + 1).padStart(2, "0")} / 04`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function numberFromForm(data, name) {
  const raw = data.get(name);
  return raw === "" || raw === null ? null : Number(raw);
}

function classifyCity(city) {
  const normalized = city.trim().replace(/市$/, "");
  if (highTierCities.some((name) => normalized.includes(name))) return { market: "high", confidence: "城市库匹配" };
  if (lowTierCities.some((name) => normalized.includes(name)) || /县|旗|镇/.test(city)) return { market: "low", confidence: "城市库匹配" };
  return { market: "mid", confidence: "中线市场匹配" };
}

function classifyStage(revenue, operation, storeCount, market) {
  if (operation === "chain" || storeCount >= 4 || revenue === "over100") return "asset";
  if (operation === "smallChain" || storeCount >= 2 || ["30to50", "50to100"].includes(revenue)) return "grow";
  if (revenue === "10to30" && market !== "high") return "grow";
  return "start";
}

function classifyChannel(shares) {
  const total = channelShareNames.reduce((sum, name) => sum + (shares[name] || 0), 0) || 100;
  const digitalValues = channelShareNames.slice(0, 5).map((name) => ((shares[name] || 0) / total) * 100);
  const digitalTotal = digitalValues.reduce((sum, value) => sum + value, 0);
  const activeCount = digitalValues.filter((value) => value >= 5).length;
  const largest = Math.max(...digitalValues, 0);
  if (digitalTotal < 20 || activeCount === 0) return "missing";
  if (activeCount >= 3 && largest <= 60) return "complete";
  return "single";
}

function updateChannelTotal() {
  const total = channelShareNames.reduce((sum, name) => {
    const input = document.querySelector(`[name="${name}"]`);
    const value = Number(input.value || 0);
    input.style.setProperty("--range-progress", `${value}%`);
    const output = input.closest(".range-field")?.querySelector("output");
    if (output) output.value = `${value}%`;
    return sum + value;
  }, 0);
  const output = document.getElementById("channelTotal");
  output.textContent = `合计 ${total}%`;
  output.classList.toggle("is-valid", total >= 95 && total <= 105);
  output.classList.toggle("is-invalid", total > 0 && (total < 95 || total > 105));
}

channelShareNames.forEach((name) => document.querySelector(`[name="${name}"]`).addEventListener("input", updateChannelTotal));

document.querySelectorAll('[name="priorityIssue"]').forEach((input) => input.addEventListener("change", () => {
  const otherField = document.getElementById("otherIssueField");
  const isOther = input.checked && input.value === "other";
  if (isOther) otherField.hidden = false;
  else if (input.checked) otherField.hidden = true;
}));

document.getElementById("diagnosisForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const city = String(data.get("city") || "").trim();
  const revenue = data.get("revenue");
  const operation = data.get("operation");
  const storeCount = numberFromForm(data, "storeCount");
  const priorityIssue = data.get("priorityIssue");
  const otherIssue = String(data.get("otherIssue") || "").trim();
  const shares = Object.fromEntries(channelShareNames.map((name) => [name, numberFromForm(data, name) || 0]));
  const channelTotal = Object.values(shares).reduce((sum, value) => sum + value, 0);
  const error = document.getElementById("formError");
  if (!city || !revenue || !operation || !storeCount || !priorityIssue) {
    error.textContent = "请完成城市、品牌规模、渠道占比和首要经营问题。";
    return;
  }
  if (priorityIssue === "other" && !otherIssue) {
    error.textContent = "请简要说明当前最影响经营结果的具体问题。";
    return;
  }
  if (channelTotal < 95 || channelTotal > 105) {
    error.textContent = "渠道营业额占比合计需在 95%-105% 之间。";
    return;
  }

  Object.assign(appState, {
    city,
    revenue,
    operation,
    storeCount,
    channelShares: shares,
    priorityIssue,
    otherIssue
  });
  appState.marketInfo = classifyCity(city);
  appState.market = appState.marketInfo.market;
  appState.stage = classifyStage(revenue, operation, storeCount, appState.market);
  appState.channel = classifyChannel(shares);
  appState.diagnosedCell = `${appState.market}-${appState.stage}`;
  appState.viewedCell = appState.diagnosedCell;
  error.textContent = "";
  setPlanOffset(1);
  updateDefaultPlanButton();
  renderDiagnosisStrip();
  renderStrategyMatrix();
  showScreen("strategy");
});

function renderDiagnosisStrip() {
  const items = [
    ["城市分类", `${appState.city}｜${marketLabels[appState.market]}`],
    ["综合阶段", `${operationLabels[appState.operation]} · ${appState.storeCount} 店｜${stageLabels[appState.stage]}`],
    ["渠道结构", channelLabels[appState.channel]],
    ["首要问题", priorityIssueLabel()]
  ];
  document.getElementById("diagnosisStrip").innerHTML = items.map(([label, value]) => `<div><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
}

function priorityIssueLabel() {
  if (appState.priorityIssue === "other" && appState.otherIssue) return appState.otherIssue;
  return issueData[appState.priorityIssue]?.label || "未选择";
}

function priorityIssueAction() {
  if (appState.priorityIssue === "other" && appState.otherIssue) {
    return `围绕“${appState.otherIssue}”建立专项任务、DDL 和验收结果`;
  }
  return issueData[appState.priorityIssue]?.action || "";
}

function renderStrategyMatrix() {
  const matrix = document.getElementById("strategyMatrix");
  matrix.innerHTML = "";
  matrix.appendChild(createLabel("", "column"));
  ["start", "grow", "asset"].forEach((stage) => matrix.appendChild(createLabel(stageLabels[stage], "column")));
  ["high", "mid", "low"].forEach((market) => {
    matrix.appendChild(createLabel(marketLabels[market], "row"));
    ["start", "grow", "asset"].forEach((stage) => {
      const key = `${market}-${stage}`;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "matrix-cell";
      button.textContent = strategyData[key].name;
      button.setAttribute("aria-pressed", key === appState.viewedCell ? "true" : "false");
      if (key === appState.diagnosedCell) button.classList.add("is-diagnosed");
      button.addEventListener("click", () => {
        appState.viewedCell = key;
        renderStrategyMatrix();
      });
      matrix.appendChild(button);
    });
  });
  renderStrategyDetail();
}

function createLabel(value, type) {
  const node = document.createElement("span");
  node.className = `matrix-label ${type}`;
  node.textContent = value;
  return node;
}

function renderStrategyDetail() {
  const [market, stage] = appState.viewedCell.split("-");
  const strategy = strategyData[appState.viewedCell];
  document.getElementById("strategyPosition").textContent = `${marketLabels[market]} × ${stageLabels[stage]}`;
  document.getElementById("strategyTitle").textContent = strategy.name;
  document.getElementById("strategyDescription").textContent = strategy.description;
  const tags = [appState.marketInfo.confidence, revenueLabels[appState.revenue], `${operationLabels[appState.operation]} · ${appState.storeCount} 店`, channelCorrections[appState.channel]];
  document.getElementById("strategyTags").innerHTML = [
    ...tags.map((tag) => `<span>${escapeHtml(tag)}</span>`),
    `<span class="is-priority">优先解决：${escapeHtml(priorityIssueLabel())}</span>`,
    `<span class="is-action">关键动作：${escapeHtml(priorityIssueAction())}</span>`
  ].join("");
}

document.getElementById("toEngines").addEventListener("click", () => {
  appState.viewedCell = appState.diagnosedCell;
  appState.engines = calculateEngines();
  const issueEngine = issueData[appState.priorityIssue]?.engine;
  appState.selectedEngine = appState.engines.find((engine) => engine.name === issueEngine && engine.priority !== "defer")?.name
    || appState.engines.find((engine) => engine.priority === "main")?.name
    || appState.engines.find((engine) => engine.priority !== "defer")?.name;
  renderEngines();
  showScreen("engines");
});

function calculateEngines() {
  const priorities = { ...basePriorities[appState.stage] };
  const issueEngine = issueData[appState.priorityIssue]?.engine;
  if (issueEngine) priorities[issueEngine] = "main";
  if (appState.channel === "missing") {
    priorities["拉新获客"] = "main";
    if (appState.stage === "grow") priorities["首购转复购"] = "build";
  }
  if (appState.channel === "complete" && appState.stage === "start") priorities["首购转复购"] = "main";
  if (appState.planMonth === 9) priorities["大活动爆发"] = "maintain";
  if (appState.planMonth === 10) priorities["大活动爆发"] = "defer";
  if (appState.market === "low" && priorities["拉新获客"] === "main" && appState.channel !== "missing") {
    priorities["拉新获客"] = "build";
    priorities["首购转复购"] = "main";
  }
  if (issueEngine) priorities[issueEngine] = "main";
  const currentMain = Object.keys(priorities).filter((name) => priorities[name] === "main");
  if (currentMain.length > 2) {
    const preferred = [];
    if (issueEngine) preferred.push(issueEngine);
    if (appState.channel === "missing") preferred.push("拉新获客");
    if (appState.stage === "start") preferred.push("产品与利润", "拉新获客");
    if (appState.stage === "grow") preferred.push("产品与利润", "首购转复购");
    if (appState.stage === "asset") preferred.push("会员长期运营", "内部经营优化");
    const keep = [...new Set(preferred)].filter((name) => currentMain.includes(name)).slice(0, 2);
    currentMain.filter((name) => !keep.includes(name)).forEach((name) => { priorities[name] = "build"; });
  }
  return Object.entries(priorities).map(([name, priority]) => ({ name, priority }));
}

function engineTags(name) {
  const tags = {
    "产品与利润": ["主推口味蛋糕", "同口味切块", "成本卡与定价", "产品去留复盘"],
    "拉新获客": ["小红书种草", "抖音流量品", "私域裂变", "新客成交承接"],
    "首购转复购": ["首购来源记录", "上月新客一转二", "切块转整蛋糕", "渠道质量复盘"],
    "会员长期运营": appState.stage === "asset"
      ? ["新客/活跃/高潜/沉睡分层", "生日与纪念日", "月度批次触达", "会员收入复盘"]
      : ["当月购买用户识别", "1v1 触达", "生日用户提醒", "次月一转二记录"],
    "大活动爆发": appState.planMonth === 9
      ? ["中秋销售 SOP", "每日数据看板", "过程监督与激励", "产能与异常处理"]
      : ["本月不做品牌大播", "本月不做储值", "本月不做重促", "年末活动另行准备"],
    "内部经营优化": ["毛利与损耗", "交付问题闭环", "SOP 检查", "库存与产能"]
  };
  return tags[name];
}

function renderEngines() {
  const visual = document.getElementById("engineVisual");
  visual.innerHTML = appState.engines.map((engine) => {
    const disabled = engine.priority === "defer";
    return `<button class="engine-button ${engine.priority}" type="button" data-engine="${engine.name}" aria-pressed="${engine.name === appState.selectedEngine}" ${disabled ? "disabled" : ""}><strong>${engine.name}</strong><span>${priorityLabels[engine.priority]}</span></button>`;
  }).join("");
  visual.querySelectorAll(".engine-button:not([disabled])").forEach((button) => {
    button.addEventListener("click", () => {
      appState.selectedEngine = button.dataset.engine;
      renderEngines();
    });
  });
  renderEngineDetail();
}

function renderEngineDetail() {
  const engine = appState.engines.find((item) => item.name === appState.selectedEngine);
  document.getElementById("engineDetailTitle").textContent = engine.name;
  document.getElementById("engineDetailPriority").textContent = priorityLabels[engine.priority];
  document.getElementById("engineTaskTags").innerHTML = engineTags(engine.name).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
}

function generatePlan(offset) {
  setPlanOffset(offset);
  appState.engines = calculateEngines();
  const issueEngine = issueData[appState.priorityIssue]?.engine;
  appState.selectedEngine = appState.engines.find((engine) => engine.name === issueEngine && engine.priority !== "defer")?.name
    || appState.engines.find((engine) => engine.priority === "main")?.name
    || appState.engines.find((engine) => engine.priority !== "defer")?.name;
  appState.plan = buildPlan();
  renderPlan();
  showScreen("plan");
}

document.getElementById("toPlan").addEventListener("click", () => {
  generatePlan(1);
});

const otherPlanToggle = document.getElementById("otherPlanToggle");
const otherPlanMenu = document.getElementById("otherPlanMenu");

function closeOtherPlanMenu() {
  otherPlanMenu.hidden = true;
  otherPlanToggle.setAttribute("aria-expanded", "false");
}

otherPlanToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  const willOpen = otherPlanMenu.hidden;
  otherPlanMenu.hidden = !willOpen;
  otherPlanToggle.setAttribute("aria-expanded", String(willOpen));
});

otherPlanMenu.querySelectorAll("[data-plan-offset]").forEach((button) => {
  button.addEventListener("click", () => {
    closeOtherPlanMenu();
    generatePlan(Number(button.dataset.planOffset));
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".other-plan-wrap")) closeOtherPlanMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeOtherPlanMenu();
});

updateDefaultPlanButton();

function task(board, name, category, start, end, acceptance, project = board, channel = board, note = "") {
  return { board, name, category, start, end, acceptance, note, project, channel, status: statusFromDates(start, end) };
}

function daysInPlanMonth() {
  return new Date(appState.planYear, appState.planMonth, 0).getDate();
}

function iso(month, day) {
  const maxDay = new Date(appState.planYear, month, 0).getDate();
  const safeDay = Math.min(day, maxDay);
  return `${appState.planYear}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

function hasChannel(name) {
  return Number(appState.channelShares[name] || 0) > 0;
}

function channelOpportunityTask(month) {
  if (hasChannel("miniProgram") && (hasChannel("meituanDelivery") || hasChannel("instantDelivery")) && hasChannel("meituanDeal") && hasChannel("douyinDeal")) return [];
  const [start, end] = month === 9 ? [1, 14] : [8, 24];
  if (!hasChannel("meituanDelivery") && !hasChannel("instantDelivery")) return [task("渠道建设", "美团外卖店铺开通与首版菜单上线", "新渠道", iso(month, start), iso(month, end), "门店信息、菜单、配送范围、首单测试均通过，可正常下单履约", "渠道机会补齐", "外卖")];
  if (!hasChannel("meituanDeal")) return [task("渠道建设", "美团团购门店认领与首个套餐上线", "新渠道", iso(month, start), iso(month, end), "门店认领、套餐、核销和前台培训完成，真实订单可核销", "渠道机会补齐", "美团点评")];
  if (!hasChannel("douyinDeal")) return [task("渠道建设", "抖音团购首个流量品上线与核销测试", "新渠道", iso(month, start), iso(month, end), "49.9 元以下商品、门店、核销链路和测试订单均通过", "渠道机会补齐", "抖音")];
  return [task("渠道建设", "自有小程序基础商城上线", "新渠道", iso(month, start), iso(month, end), "口味蛋糕货架、支付、配送和会员留资链路可用", "渠道机会补齐", "小程序")];
}

function buildSeptemberPlan() {
  return [
    task("中秋项目", "礼盒与节日蛋糕货盘确认", "产品", iso(8, 26), iso(8, 29), "礼盒、节日蛋糕、价格带和馈赠场景确认", "中秋长周期销售", "产品"),
    task("中秋项目", "成本卡、定价与销售目标确认", "利润", iso(8, 27), iso(9, 1), "SKU 毛利、销售目标和库存上限通过", "中秋长周期销售", "产品"),
    task("中秋项目", "礼盒物料制作与库存建档", "供应", iso(8, 29), iso(9, 3), "物料、库存和交付口径统一", "中秋长周期销售", "内部经营"),
    task("中秋项目", "礼盒全渠道上线", "上架", iso(9, 1), iso(9, 3), "所有在营成交渠道可查询、预订和核销", "中秋长周期销售", "全渠道"),
    task("中秋项目", "重点客户分层与名单建立", "客户分层", iso(9, 1), iso(9, 4), "按企业、熟客和高潜礼赠需求形成跟进名单", "中秋长周期销售", "私域"),
    task("中秋项目", "中秋销售 SOP 与目标拆解", "销售 SOP", iso(9, 1), iso(9, 4), "目标拆到日、渠道和客户层，含咨询、预订、交付、售后", "中秋长周期销售", "内部经营"),
    task("中秋项目", "销售话术、库存产能看板与培训", "执行准备", iso(9, 3), iso(9, 5), "一线通过话术演练，看板可更新订单、库存和产能", "中秋长周期销售", "内部经营"),
    task("私域", "中秋首轮 1v1 分层触达", "存量激活", iso(9, 4), iso(9, 8), "触达、回复、咨询、预订数据可回收", "中秋长周期销售", "私域"),
    task("私域", "中秋二轮重点客户跟进", "销售跟进", iso(9, 12), iso(9, 16), "未决客户逐一记录顾虑、下一步和成交结果", "中秋长周期销售", "私域"),
    task("中秋项目", "订单、库存、产能每日跟进", "过程管理", iso(9, 4), iso(9, 25), "每日更新目标差额、库存、产能和异常", "中秋长周期销售", "内部经营"),
    task("中秋项目", "过程监督、纠偏与阶段激励", "过程管理", iso(9, 12), iso(9, 25), "每个阶段形成差额、纠偏动作和激励记录", "中秋长周期销售", "内部经营"),
    task("中秋项目", "交付异常闭环与项目复盘", "复盘", iso(9, 26), iso(9, 28), "销售、利润、履约、客诉和团队执行完成复盘", "中秋长周期销售", "内部经营"),
    task("教师节项目", "限定产品与赠礼机制确认", "产品", iso(9, 1), iso(9, 3), "轻量限定不挤占中秋和口味新品产能", "教师节上新及触达", "产品"),
    task("教师节项目", "物料、上架与门店话术准备", "上架", iso(9, 3), iso(9, 5), "物料、商品页和一线推荐口径一致", "教师节上新及触达", "全渠道"),
    task("私域", "教师节 1v1 触达", "存量激活", iso(9, 6), iso(9, 9), "按送礼和感谢场景触达并记录成交", "教师节上新及触达", "私域"),
    task("教师节项目", "当日销售履约与复盘", "复盘", iso(9, 10), iso(9, 10), "销售、缺货、客诉和履约数据完整", "教师节上新及触达", "内部经营"),
    task("9 月口味上新", "主推口味与同口味切块定盘", "产品策略", iso(9, 11), iso(9, 12), "只确定一个主推口味系统", "9 月口味蛋糕及切块上线", "产品"),
    task("9 月口味上新", "打样、成本卡、定价与 SOP", "产品研发", iso(9, 11), iso(9, 15), "口味、克重、毛利和稳定复刻通过", "9 月口味蛋糕及切块上线", "产品"),
    task("9 月口味上新", "全渠道物料与商品页制作", "物料", iso(9, 13), iso(9, 17), "整蛋糕和切块使用同一口味卖点", "9 月口味蛋糕及切块上线", "内容"),
    task("9 月口味上新", "门店话术、包装与配送测试", "交付测试", iso(9, 16), iso(9, 17), "门店推荐、包装和配送测试通过；9 月 18 日不发布", "9 月口味蛋糕及切块上线", "门店"),
    task("9 月口味上新", "口味蛋糕与切块同步上线", "正式上新", iso(9, 19), iso(9, 19), "所有在营渠道可售，首轮用户触达完成", "9 月口味蛋糕及切块上线", "全渠道"),
    task("小红书", "自有账号体验官招募", "体验官", iso(9, 19), iso(9, 21), "招募 5-10 人，笔记内嵌私信加企微流程", "9 月口味蛋糕及切块上线", "小红书"),
    task("小红书", "体验官筛选、体验与内容回收", "体验官", iso(9, 22), iso(9, 28), "报名、加企微、到店和发布人数分别统计", "9 月口味蛋糕及切块上线", "小红书"),
    task("小红书", "外部付费博主探店", "付费博主", iso(9, 20), iso(9, 29), "3-10 人，记录单人成本、互动、私信和成交来源", "9 月口味蛋糕及切块上线", "小红书"),
    task("小红书", "外部置换博主探店", "置换博主", iso(9, 20), iso(9, 29), "送蛋糕换笔记，单独统计送样成本与有效发布", "9 月口味蛋糕及切块上线", "小红书"),
    task("小红书", "口味上新笔记聚光投放", "聚光广告", iso(9, 19), iso(9, 30), "按私信成本和加企微成本优化；不承接中秋礼盒种草", "9 月口味蛋糕及切块上线", "小红书"),
    task("私域", "朋友圈口味蛋糕征名", "私域裂变", iso(9, 12), iso(9, 17), "参与、好友投票、新增企微和有效线索可统计", "9 月口味蛋糕及切块上线", "私域"),
    task("私域", "口味上新 1v1 分层触达", "存量激活", iso(9, 19), iso(9, 23), "按切块尝新和整蛋糕庆祝场景分层发送", "9 月口味蛋糕及切块上线", "私域"),
    task("私域", "邀好友拼团流量品活动", "裂变", iso(9, 24), iso(9, 28), "产品低于 49.9 元、折扣低于 7 折，新增与核销可追踪", "9 月口味蛋糕及切块上线", "私域"),
    task("抖音", "每周平播", "日常平播", iso(9, 3), iso(9, 30), "每周 1 场、每场 1-2 小时，记录观看、成交和核销", "月度基础经营", "抖音"),
    task("抖音", "49.9 元以下流量品团购上线", "流量品", iso(9, 19), iso(9, 30), "售价、毛利、售出、核销和加企微数据完整", "9 月口味蛋糕及切块上线", "抖音"),
    task("抖音", "外部付费达人探店带流量品", "付费达人", iso(9, 20), iso(9, 28), "3-5 人，只带低价流量品，不带正价蛋糕或礼盒", "9 月口味蛋糕及切块上线", "抖音"),
    task("抖音", "本地推常规投放", "本地推", iso(9, 19), iso(9, 29), "按流量品成交与核销优化，不因中秋翻倍", "9 月口味蛋糕及切块上线", "抖音"),
    task("美团点评", "口味切块收藏打卡有礼", "门店口碑", iso(9, 19), iso(9, 30), "礼品、库存、核销统一，统计收藏与到店", "9 月口味蛋糕及切块上线", "美团点评"),
    task("美团点评", "真实评价邀评与低分闭环", "评价维护", iso(9, 1), iso(9, 30), "真实消费邀评，低分 24 小时内回访并整改", "月度基础经营", "美团点评"),
    task("外卖", "门店健康度诊断", "门店诊断", iso(9, 1), iso(9, 4), "营业、履约、活动、评分和违规指标形成整改清单", "月度基础经营", "外卖"),
    task("外卖", "菜单增加口味切块钩子产品", "菜单结构", iso(9, 19), iso(9, 23), "钩子产品可搜索、低门槛并能带动主品", "9 月口味蛋糕及切块上线", "外卖"),
    task("外卖", "点金常规投放与关键词优化", "点金广告", iso(9, 19), iso(9, 30), "按曝光、进店、下单成本调词调预算，不做中秋加码", "9 月口味蛋糕及切块上线", "外卖"),
    task("首购转复购", "8 月新客一转二名单整理", "新客分层", iso(9, 11), iso(9, 13), "按来源和首购产品形成一次批次触达名单", "上月新客一转二", "私域"),
    task("首购转复购", "8 月新客一转二批次触达", "月度触达", iso(9, 14), iso(9, 17), "单月一次触达，回复、成交和二购产品可追踪", "上月新客一转二", "私域"),
    task("首购转复购", "一转二结果与渠道质量复盘", "复购复盘", iso(9, 26), iso(9, 30), "按渠道比较新增、首购、一转二和收入", "上月新客一转二", "数据"),
    task("会员运营", "当月生日用户 1v1 触达", "生日运营", iso(9, 1), iso(9, 5), "生日提醒、回复和成交数据完整", "会员长期运营", "私域"),
    task("内部经营", "库存、产能与损耗每周更新", "过程管理", iso(9, 1), iso(9, 30), "每周更新关键原料、最大产能、报损和缺货风险", "月度基础经营", "内部经营"),
    task("内部经营", financialTaskName(), "经营复盘", iso(9, 25), iso(9, 30), financialNote(), "月度基础经营", "内部经营"),
    task("下月准备", "10 月口味、国庆交付与万圣节资源排期", "下月准备", iso(9, 25), iso(9, 30), "产品、内容、库存、布景和人员前置项确认", "10 月跨月准备", "内部经营")
  ];
}

function buildOctoberPlan() {
  return [
    task("国庆项目", "预订单、库存与关键原料盘点", "交付准备", iso(10, 1), iso(10, 2), "逐日订单、关键物料和缺口清单完成", "国庆销售承接与履约", "内部经营"),
    task("国庆项目", "产能、人员排班与交付时段确认", "产能排班", iso(10, 1), iso(10, 2), "每日最大产能、岗位、班次和交付时段明确", "国庆销售承接与履约", "内部经营"),
    task("国庆项目", "销售、库存与交付每日看板", "过程管理", iso(10, 1), iso(10, 7), "每日闭店前更新销售、缺货、延误和客诉并纠偏", "国庆销售承接与履约", "内部经营"),
    task("国庆项目", "异常日清与销售履约复盘", "复盘", iso(10, 1), iso(10, 7), "异常当日闭环，7 日完成销售、利润和履约复盘", "国庆销售承接与履约", "内部经营"),
    task("10 月口味上新", "秋季主推口味与同口味切块定盘", "产品策略", iso(10, 8), iso(10, 9), "只确定一个主推口味系统，定制蛋糕维持日常承接", "秋季口味蛋糕及切块上线", "产品"),
    task("10 月口味上新", "打样、成本卡、定价与 SOP", "产品研发", iso(10, 8), iso(10, 13), "口味、克重、毛利和稳定复刻验证通过", "秋季口味蛋糕及切块上线", "产品"),
    task("10 月口味上新", "整蛋糕、切块与全渠道物料制作", "物料", iso(10, 11), iso(10, 15), "同一口味卖点覆盖所有在营渠道", "秋季口味蛋糕及切块上线", "内容"),
    task("10 月口味上新", "门店话术、包装与配送测试", "交付测试", iso(10, 14), iso(10, 16), "一线推荐、包装稳定性和配送测试通过", "秋季口味蛋糕及切块上线", "门店"),
    task("10 月口味上新", "秋季口味蛋糕与切块同步上线", "正式上新", iso(10, 18), iso(10, 18), "所有在营渠道可售并完成首轮触达", "秋季口味蛋糕及切块上线", "全渠道"),
    task("小红书", "自有账号体验官招募", "体验官", iso(10, 14), iso(10, 17), "招募 5-10 人，私信加企微路径可用", "秋季口味蛋糕及切块上线", "小红书"),
    task("小红书", "体验官筛选、体验与内容回收", "体验官", iso(10, 18), iso(10, 27), "报名、加企微、到店和发布人数分别统计", "秋季口味蛋糕及切块上线", "小红书"),
    task("小红书", "外部付费博主探店", "付费博主", iso(10, 16), iso(10, 28), "3-10 人，记录单人成本、互动、私信和成交来源", "秋季口味蛋糕及切块上线", "小红书"),
    task("小红书", "外部置换博主探店", "置换博主", iso(10, 16), iso(10, 28), "送蛋糕换笔记，送样成本和有效发布单独统计", "秋季口味蛋糕及切块上线", "小红书"),
    task("小红书", "秋季上新笔记聚光投放", "聚光广告", iso(10, 18), iso(10, 30), "按私信成本和加企微成本优化", "秋季口味蛋糕及切块上线", "小红书"),
    task("私域", "朋友圈秋季口味征名", "裂变", iso(10, 10), iso(10, 15), "参与、好友投票、新增企微和有效线索可统计", "秋季口味蛋糕及切块上线", "私域"),
    task("私域", "秋季上新 1v1 分层触达", "存量激活", iso(10, 18), iso(10, 22), "按切块尝新和整蛋糕庆祝场景分层发送", "秋季口味蛋糕及切块上线", "私域"),
    task("私域", "邀好友拼团流量品活动", "裂变", iso(10, 23), iso(10, 27), "产品不高于 49.9 元、折扣低于 7 折，新增和核销可追踪", "秋季口味蛋糕及切块上线", "私域"),
    task("私域", "裂变新增用户首购承接与结果复盘", "新客承接", iso(10, 23), iso(10, 30), "24 小时内 1v1 承接，新增、首购和收入可回收", "秋季口味蛋糕及切块上线", "私域"),
    task("抖音", "每周平播", "日常平播", iso(10, 8), iso(10, 31), "每周 1 场、每场 1-2 小时，记录观看、成交和核销", "月度基础经营", "抖音"),
    task("抖音", "49.9 元以下秋季流量品团购上线", "流量品", iso(10, 18), iso(10, 31), "售价、毛利、售出、核销和加企微数据完整", "秋季口味蛋糕及切块上线", "抖音"),
    task("抖音", "外部付费达人探店带流量品", "付费达人", iso(10, 20), iso(10, 28), "3-5 人，只带低价流量品，不带正价整蛋糕", "秋季口味蛋糕及切块上线", "抖音"),
    task("抖音", "本地推常规投放", "本地推", iso(10, 18), iso(10, 30), "按流量品成交和核销优化，不做节点加码", "秋季口味蛋糕及切块上线", "抖音"),
    task("美团点评", "秋季切块收藏打卡有礼", "门店口碑", iso(10, 18), iso(10, 31), "礼品、库存、核销统一，统计收藏和到店", "秋季口味蛋糕及切块上线", "美团点评"),
    task("美团点评", "真实评价邀评与低分闭环", "评价维护", iso(10, 1), iso(10, 31), "真实消费邀评，低分 24 小时内回访并整改", "月度基础经营", "美团点评"),
    task("美团点评", "小红书付费博主内容同步", "内容复用", iso(10, 18), iso(10, 30), "取得授权后同步，记录浏览、收藏和团购成交", "秋季口味蛋糕及切块上线", "美团点评"),
    task("美团点评", "49.9 元以下流量品团购上线", "流量品", iso(10, 18), iso(10, 31), "商品可售可核销，并单独记录引流与连带销售", "秋季口味蛋糕及切块上线", "美团点评"),
    task("外卖", "门店健康度诊断", "门店诊断", iso(10, 8), iso(10, 11), "营业、履约、活动、评分和违规指标形成整改清单", "月度基础经营", "外卖"),
    task("外卖", "菜单增加秋季切块钩子产品", "菜单结构", iso(10, 16), iso(10, 20), "钩子产品可搜索、低门槛并能带动主品", "秋季口味蛋糕及切块上线", "外卖"),
    task("外卖", "真实订单邀评与低分回访", "评分运营", iso(10, 1), iso(10, 31), "只按真实订单邀评，低分原因形成履约整改", "月度基础经营", "外卖"),
    task("外卖", "点金常规投放与关键词优化", "点金广告", iso(10, 18), iso(10, 30), "按曝光、进店、下单和单均获客成本调词调预算", "秋季口味蛋糕及切块上线", "外卖"),
    task("首购转复购", "9 月新客一转二名单整理", "新客分层", iso(10, 8), iso(10, 11), "按中秋、教师节、口味新品、流量品和来源形成名单", "上月新客一转二", "私域"),
    task("首购转复购", "9 月新客一转二批次触达", "月度触达", iso(10, 12), iso(10, 16), "单月一次触达，回复、成交和二购产品可追踪", "上月新客一转二", "私域"),
    task("首购转复购", "一转二结果与渠道质量复盘", "复购复盘", iso(10, 28), iso(10, 31), "按渠道比较新增、首购、一转二和收入，形成 11 月预算结论", "上月新客一转二", "数据"),
    task("会员运营", "当月生日用户 1v1 触达", "生日运营", iso(10, 1), iso(10, 5), "生日提醒、回复、预约和成交数据完整", "会员长期运营", "私域"),
    task("万圣节项目", "主题甜品、饮品与套餐定盘", "产品", iso(10, 18), iso(10, 21), "至少一款适合拍照和打卡的甜品或套餐通过", "万圣节主题产品与线下打卡", "产品"),
    task("万圣节项目", "打卡规则、礼品与核销口径确认", "机制", iso(10, 20), iso(10, 22), "参与条件、礼品库存、核销和数据口径明确", "万圣节主题产品与线下打卡", "门店"),
    task("万圣节项目", "打卡装置设计与制作", "装置", iso(10, 20), iso(10, 26), "装置尺寸、画面、物料和安全检查通过", "万圣节主题产品与线下打卡", "门店"),
    task("万圣节项目", "装置进场与门店布景", "布景", iso(10, 27), iso(10, 30), "连续 4 天完成进场、安装、灯光和动线测试", "万圣节主题产品与线下打卡", "门店"),
    task("万圣节项目", "打卡话术、核销与拍摄动线培训", "培训", iso(10, 29), iso(10, 30), "一线可独立讲解规则、核销并引导拍摄", "万圣节主题产品与线下打卡", "门店"),
    task("小红书", "万圣节自有账号预告与打卡内容", "节点内容", iso(10, 28), iso(10, 31), "预告、门店实景和用户内容均发布并记录互动", "万圣节主题产品与线下打卡", "小红书"),
    task("美团点评", "万圣节门店打卡有礼上线", "节点打卡", iso(10, 30), iso(10, 31), "活动页、礼品、核销和真实到店数据完整", "万圣节主题产品与线下打卡", "美团点评"),
    task("万圣节项目", "现场执行与数据记录", "执行", iso(10, 31), iso(10, 31), "到店、打卡、内容发布、核销和套餐销售数据完整", "万圣节主题产品与线下打卡", "门店"),
    task("内部经营", financialTaskName(), "经营复盘", iso(10, 24), iso(10, 30), financialNote(), "月度基础经营", "内部经营"),
    task("内部经营", "库存、产能与损耗每周更新", "过程管理", iso(10, 1), iso(10, 31), "每周更新关键原料、最大产能、报损和缺货风险", "月度基础经营", "内部经营"),
    task("内部经营", "客诉分类与整改闭环", "交付改进", iso(10, 1), iso(10, 31), "问题类型、责任环节、整改和复查结果完整", "月度基础经营", "内部经营"),
    task("下月准备", "11 月货盘、会员动作与资源排期", "下月准备", iso(10, 24), iso(10, 31), "产品、库存、内容、投放和人员前置项确认", "11 月跨月准备", "内部经营")
  ];
}

function buildGenericMonthPlan() {
  const month = appState.planMonth;
  const lastDay = daysInPlanMonth();
  const festival = [2, 3, 5, 8, 12].includes(month);
  const previousMonth = new Date(appState.planYear, month - 2, 1).getMonth() + 1;
  const nextMonth = new Date(appState.planYear, month, 1).getMonth() + 1;
  const tasks = [
    task(`${month} 月口味上新`, "确认主推口味蛋糕与同口味切块", "产品策略", iso(month, 1), iso(month, 3), "只确定一个主推口味系统"),
    task(`${month} 月口味上新`, "主推口味打样、成本卡、定价与 SOP", "产品研发", iso(month, 2), iso(month, 8), "口味、克重、毛利和稳定复刻通过"),
    task(`${month} 月口味上新`, "口味蛋糕、切块与全渠道物料制作", "物料", iso(month, 6), iso(month, 12), "统一口味卖点覆盖在营渠道"),
    task(`${month} 月口味上新`, "主推口味蛋糕与切块同步上架及触达", "正式上新", iso(month, 15), iso(month, 15), "切块承接尝新，整蛋糕承接庆祝场景"),
    ...(festival ? [
      task("重点节日项目", "节日产品与销售机制确认", "节日准备", iso(month, 1), iso(month, 5), "确认产品、价格、目标、客户分层与交付边界"),
      task("重点节日项目", "节日物料、全渠道上架与分层触达", "节日上新", iso(month, 6), iso(month, 12), "统一卖点、库存、触达与核销口径"),
      task("重点节日项目", "节日销售数据跟进与交付监督", "过程管理", iso(month, 13), iso(month, 20), "每日跟进目标差额、库存、产能和异常并及时纠偏"),
      task("重点节日项目", "节日销售、利润与履约复盘", "节日复盘", iso(month, 20), iso(month, 22), "复盘渠道销售、毛利、履约、客诉与团队执行")
    ] : []),
    task("小红书", "自有账号体验官招募与内容回收", "体验官", iso(month, 10), iso(month, 25), festival ? "重点庆祝节点招募 20-30 人；日常上新招募 5-10 人" : "日常上新招募 5-10 人，分别统计加企微、到店和发布"),
    task("小红书", "外部付费与置换博主分批探店", "博主", iso(month, 12), iso(month, 28), "付费与置换分开统计成本和有效发布"),
    task("小红书", "上新笔记聚光投放", "聚光广告", iso(month, 15), iso(month, 28), "按私信和加企微成本优化"),
    task("私域", "朋友圈裂变与新客 1v1 承接", "裂变", iso(month, 15), iso(month, 24), "活动新增、首购和核销可追踪"),
    task("抖音", "每周平播与低价流量品团购", "日常运营", iso(month, 5), iso(month, lastDay), "每周平播；达人仅带 49.9 元以下流量品"),
    task("美团点评", "收藏打卡、真实评价与内容同步", "门店口碑", iso(month, 15), iso(month, lastDay), "到店、收藏、评价和团购成交可追踪"),
    task("外卖", "健康度诊断、钩子产品与点金常规投放", "外卖运营", iso(month, 5), iso(month, lastDay), "形成整改清单，按真实下单成本优化"),
    task("首购转复购", `${previousMonth} 月新客一转二名单整理`, "新客分层", iso(month, 8), iso(month, 11), "按产品、活动和渠道形成一次批次名单"),
    task("首购转复购", `${previousMonth} 月新客一转二批次触达与复盘`, "月度触达", iso(month, 12), iso(month, 20), "每月一次触达，记录回复、成交和二购"),
    task("会员运营", "生日用户 1v1 触达", "生日运营", iso(month, 1), iso(month, 5), "生日提醒、回复和成交可追踪"),
    task("内部经营", financialTaskName(), "经营复盘", iso(month, Math.max(1, lastDay - 7)), iso(month, Math.max(1, lastDay - 2)), financialNote()),
    task("下月准备", `${nextMonth} 月口味方向与资源排期`, "下月准备", iso(month, Math.max(1, lastDay - 9)), iso(month, lastDay), "概念、初步打样、内容、投放和人员前置项确认")
  ];
  return tasks;
}

function monthlyFoundationTasks() {
  const month = appState.planMonth;
  const lastDay = daysInPlanMonth();
  return [
    task("月度经营", "月度销售目标拆解与每周进度更新", "目标管理", iso(month, 1), iso(month, lastDay), "按产品、渠道和周拆解，周末更新差额与下周纠偏动作"),
    task("月度经营", "月度产品与营销日历确认", "项目排期", iso(month, 1), iso(month, 3), "确认上新、内容、触达、投放和复盘节点，避免同一时段任务冲突"),
    task("产品与利润", "新品试吃反馈回收与配方调整", "产品验证", iso(month, 4), iso(month, 9), "记录口味、甜度、价格接受度与购买场景，形成明确调整结论"),
    task("内容运营", "自有账号月度内容排期", "内容准备", iso(month, 1), iso(month, 5), "明确上新、产品解释、顾客场景和门店内容的发布时间"),
    task("内容运营", "自有账号每周内容发布与数据记录", "内容执行", iso(month, 5), iso(month, lastDay), "逐篇记录曝光、互动、私信和加企微，不以发布数量替代结果"),
    task("新客承接", "企微新客欢迎与首购承接 SOP 检查", "新客承接", iso(month, 1), iso(month, 6), "检查欢迎语、领取路径、门店信息和主推产品介绍是否可执行"),
    task("新客承接", "新客来源与首购产品登记", "数据记录", iso(month, 1), iso(month, lastDay), "区分体验官、博主、广告、私域裂变和自然到店来源"),
    task("渠道运营", "在营渠道商品库存与上下架状态检查", "渠道检查", iso(month, 1), iso(month, 4), "逐渠道核对商品是否可售、库存是否准确、核销链路是否正常"),
    task("门店执行", "主推产品卖点与推荐话术培训", "内部培训", iso(month, 10), iso(month, 12), "验收为一线人员能按顾客场景推荐切块、整蛋糕与流量品"),
    task("门店执行", "主推产品包装与配送测试", "交付测试", iso(month, 10), iso(month, 13), "记录破损、融化、延误和包装成本并完成整改"),
    task("内部经营", "每周库存、产能与损耗更新", "过程管理", iso(month, 1), iso(month, lastDay), "每周更新关键原料、最大产能、报损和缺货风险"),
    task("内部经营", "客诉分类与整改结果闭环", "交付改进", iso(month, 1), iso(month, lastDay), "记录问题类型、责任环节、处理结果和防止复发动作"),
    task("数据复盘", "月度渠道新增、成交与一转二数据复盘", "数据复盘", iso(month, Math.max(1, lastDay - 3)), iso(month, lastDay), "按渠道比较新增、首购、上月新客一转二和收入，形成预算去留结论"),
    task("下月准备", "下月重点项目立项与前置任务确认", "下月准备", iso(month, Math.max(1, lastDay - 7)), iso(month, lastDay), "明确下月核心、关键 DDL 与需要跨月启动的研发和物料任务")
  ];
}

function balancePlanTaskCount(tasks) {
  const names = new Set(tasks.map((item) => item.name));
  for (const item of monthlyFoundationTasks()) {
    if (tasks.length >= 30) break;
    if (!names.has(item.name)) {
      tasks.push(item);
      names.add(item.name);
    }
  }
  return tasks;
}

function adaptPlanToChannels(tasks) {
  const unavailableBoards = new Set();
  if (!hasChannel("douyinDeal")) unavailableBoards.add("抖音");
  if (!hasChannel("meituanDeal")) unavailableBoards.add("美团点评");
  if (!hasChannel("meituanDelivery") && !hasChannel("instantDelivery")) unavailableBoards.add("外卖");
  const filtered = tasks.filter((item) => !unavailableBoards.has(item.board));
  return [...filtered, ...channelOpportunityTask(appState.planMonth)];
}

function priorityIssueTask() {
  const month = appState.planMonth;
  const lastDay = daysInPlanMonth();
  const start = month === 9 ? 11 : 8;
  const end = Math.min(lastDay, month === 9 ? 19 : 18);
  const project = `首要问题：${priorityIssueLabel()}`;
  const tasks = {
    traffic: task("首要经营问题", "新客增长目标与上新拉新链路确认", "拉新专项", iso(month, start), iso(month, end), "明确新增目标、小红书/抖音/私域分工、预算、新客承接路径和归因字段", project, "全渠道"),
    launch: task("首要经营问题", "新品曝光到成交漏斗诊断与调整", "上新转化", iso(month, start), iso(month, end), "按曝光、咨询、试吃、下单检查卖点、价格和货盘，形成至少 2 项调整", project, "产品与渠道"),
    repeat: task("首要经营问题", "上月新客一转二名单与批次触达", "复购专项", iso(month, start), iso(month, end), "形成一次分层名单和批次触达，记录回复、成交、二购产品与收入", project, "私域"),
    channel: task("首要经营问题", "重点渠道商品、成交与核销链路整改", "渠道转化", iso(month, start), iso(month, end), "选择一个重点渠道完成商品页、价格、下单、核销和门店话术闭环", project, "重点渠道"),
    fulfillment: task("首要经营问题", "节点订单、库存、产能与交付看板上线", "履约专项", iso(month, 1), iso(month, Math.min(lastDay, 7)), "订单、库存、产能、排班和异常可按日更新并形成纠偏记录", project, "内部经营"),
    profit: task("首要经营问题", "主推产品利润与现金占用专项核查", "利润专项", iso(month, start), iso(month, end), "核清毛利、折扣、渠道费用、损耗和库存现金占用，形成止损动作", project, "产品与利润"),
    execution: task("首要经营问题", "门店排班、话术与执行检查整改", "执行专项", iso(month, start), iso(month, end), "按本月项目重排岗位和产能，一线通过话术、核销与交付检查", project, "门店"),
    other: task("首要经营问题", "首要经营问题专项拆解与闭环", "专项改善", iso(month, start), iso(month, end), `围绕“${appState.otherIssue}”形成问题、动作、DDL 和验收结果`, project, "内部经营")
  };
  return tasks[appState.priorityIssue] || null;
}

function buildPlan() {
  let tasks;
  if (appState.planMonth === 9) tasks = buildSeptemberPlan();
  else if (appState.planMonth === 10) tasks = buildOctoberPlan();
  else tasks = buildGenericMonthPlan();
  const adapted = adaptPlanToChannels(tasks);
  const issueTask = priorityIssueTask();
  if (issueTask) adapted.unshift(issueTask);
  return balancePlanTaskCount(adapted);
}

function financialNote() {
  return "只优化影响本月主线的问题；记录毛利、损耗、退款和客诉";
}

function financialTaskName() {
  return "主推产品毛利、损耗与交付问题复盘";
}

function statusFromDates(start, end) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (endDate < today) return "计划已结束";
  if (startDate <= today && today <= endDate) return "进行中";
  return "待开始";
}

function buildCoreActions() {
  let actions;
  if (appState.planMonth === 9) {
    actions = [
      { name: "中秋销售作战机制落地", ddl: iso(9, 25) },
      { name: "中秋礼盒上线及触达", ddl: iso(9, 25) },
      { name: "教师节上新及触达", ddl: iso(9, 10) },
      { name: "9 月口味蛋糕及切块上线及触达", ddl: iso(9, 19) }
    ];
  } else if (appState.planMonth === 10) {
    actions = [
      { name: "国庆假期销售承接与交付保障", ddl: iso(10, 7) },
      { name: "秋季口味蛋糕及切块上线与全渠道触达", ddl: iso(10, 30) },
      { name: "9 月新客一转二触达与渠道质量复盘", ddl: iso(10, 31) },
      { name: "万圣节主题产品及线下打卡落地", ddl: iso(10, 31) }
    ];
  } else {
    const previousMonth = new Date(appState.planYear, appState.planMonth - 2, 1).getMonth() + 1;
    actions = [
      { name: `${appState.planMonth} 月口味蛋糕及切块上线与触达`, ddl: iso(appState.planMonth, 15) },
      { name: `${appState.planMonth} 月本地口碑拉新项目`, ddl: iso(appState.planMonth, 28) },
      { name: `${previousMonth} 月新客一转二批次触达`, ddl: iso(appState.planMonth, 20) },
      { name: "会员触达与经营复盘", ddl: iso(appState.planMonth, daysInPlanMonth()) }
    ];
  }
  const issueCore = issueData[appState.priorityIssue]?.core;
  if (issueCore) {
    actions.push({ name: issueCore, ddl: iso(appState.planMonth, Math.max(1, daysInPlanMonth() - 1)) });
  }
  if (appState.channel === "missing") {
    actions.push({ name: "关键成交渠道上线与跑通", ddl: iso(appState.planMonth, appState.planMonth === 9 ? 14 : 24) });
  }
  return actions;
}

function renderPlan() {
  const strategy = strategyData[appState.diagnosedCell];
  const mainEngines = appState.engines.filter((engine) => engine.priority === "main").map((engine) => engine.name);
  const downloadStatus = document.getElementById("downloadStatus");
  downloadStatus.className = "download-status";
  downloadStatus.textContent = "";
  const summary = [
    ["经营定位", `${marketLabels[appState.market]} × ${stageLabels[appState.stage]}`],
    ["主策略", strategy.name],
    ["主攻引擎", mainEngines.join("、")],
    ["渠道阶段", channelLabels[appState.channel]]
  ];
  document.getElementById("planTitle").textContent = `${appState.planYear} 年 ${appState.planMonth} 月经营工作计划`;
  document.getElementById("planSummary").innerHTML = summary.map(([label, value]) => `<div><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  document.getElementById("topActions").innerHTML = buildCoreActions().slice(0, 5).map((item) => `<li><strong>${escapeHtml(item.name)}</strong><time datetime="${item.ddl}">DDL ${formatDate(item.ddl)}</time></li>`).join("");
  const groups = [...new Set(appState.plan.map((item) => item.board))];
  document.getElementById("planChecklist").innerHTML = groups.map((board) => `
    <section class="checklist-group" data-demo-board="${escapeHtml(board)}">
      <h3>${escapeHtml(board)}</h3>
      ${appState.plan.filter((item) => item.board === board).map((item) => `
        <label class="checklist-item" data-demo-task>
          <input type="checkbox">
          <span class="checklist-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category)}｜${escapeHtml(item.acceptance)}</small></span>
          <span class="task-date">${formatDate(item.start)}-${formatDate(item.end)}</span>
        </label>
      `).join("")}
    </section>
  `).join("");
  if (isDemoMode) {
    let payload = document.getElementById("demoExportPayload");
    if (!payload) {
      payload = document.createElement("script");
      payload.id = "demoExportPayload";
      payload.type = "application/json";
      document.body.appendChild(payload);
    }
    payload.textContent = JSON.stringify(buildExportPayload());
  }
}

function formatDate(value) {
  const [, month, day] = value.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function buildExportPayload() {
  const strategy = strategyData[appState.diagnosedCell];
  return {
    year: appState.planYear,
    month: appState.planMonth,
    diagnosis: {
      city: appState.city,
      market: marketLabels[appState.market],
      marketConfidence: appState.marketInfo.confidence,
      revenue: revenueLabels[appState.revenue],
      operation: operationLabels[appState.operation],
      storeCount: appState.storeCount,
      stage: stageLabels[appState.stage],
      strategy: strategy.name,
      channelCalculated: channelLabels[appState.channel],
      channelShares: appState.channelShares,
      priorityIssue: priorityIssueLabel(),
      priorityAction: priorityIssueAction(),
      mainEngines: appState.engines.filter((engine) => engine.priority === "main").map((engine) => engine.name)
    },
    coreActions: buildCoreActions(),
    plan: appState.plan
  };
}

document.getElementById("downloadPlan").addEventListener("click", async () => {
  const status = document.getElementById("downloadStatus");
  status.className = "download-status";
  status.textContent = "正在生成 Excel...";
  try {
    const response = await fetch("/api/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildExportPayload()) });
    if (!response.ok) throw new Error(await response.text() || "生成失败");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `蛋糕品牌_${appState.planYear}年${appState.planMonth}月经营工作计划_甘特图.xlsx`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = "Excel 已生成";
  } catch (error) {
    status.className = "download-status is-error";
    status.textContent = location.protocol === "file:" ? "请通过本地服务地址打开后下载 Excel" : `生成失败：${error.message}`;
  }
});

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

document.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", () => showScreen(button.dataset.back)));

function loadDemoCase() {
  if (!isDemoMode) return;
  document.getElementById("demoBadge").hidden = false;
  const values = {
    city: "徐州",
    storeCount: 1,
    miniProgram: 45,
    meituanDelivery: 20,
    instantDelivery: 0,
    meituanDeal: 15,
    douyinDeal: 10,
    otherChannel: 10
  };
  Object.entries(values).forEach(([name, value]) => {
    const input = document.querySelector(`[name="${name}"]`);
    if (input) input.value = value;
  });
  [
    ["revenue", "10to30"],
    ["operation", "single"],
    ["priorityIssue", "traffic"]
  ].forEach(([name, value]) => {
    const input = document.querySelector(`[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
  });
  updateChannelTotal();
}

loadDemoCase();
