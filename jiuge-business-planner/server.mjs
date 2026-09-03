import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.CAKE_PLANNER_PORT || 8000);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png"
};

function columnName(number) {
  let value = number;
  let output = "";
  while (value > 0) {
    value -= 1;
    output = String.fromCharCode(65 + (value % 26)) + output;
    value = Math.floor(value / 26);
  }
  return output;
}

function dateFromIso(value) {
  return new Date(`${value}T00:00:00`);
}

function percentOrBlank(value) {
  return value === null || value === undefined ? null : Number(value) / 100;
}

async function buildWorkbook(payload) {
  const year = Number(payload.year);
  const month = Number(payload.month);
  const daysInMonth = new Date(year, month, 0).getDate();
  const workbook = Workbook.create();
  const diagnosis = workbook.worksheets.add("经营诊断");
  const planSheet = workbook.worksheets.add(`${month}月工作计划`);
  const d = payload.diagnosis;

  diagnosis.showGridLines = false;
  diagnosis.mergeCells("A1:F1");
  diagnosis.getRange("A1").values = [[`蛋糕品牌经营诊断｜${year} 年 ${month} 月`]];
  diagnosis.getRange("A1:F1").format = {
    fill: "#171815",
    font: { bold: true, color: "#FFFFFF", size: 16 },
    verticalAlignment: "center"
  };
  diagnosis.getRange("A1:F1").format.rowHeight = 32;

  const diagnosisRows = [
    ["诊断维度", "结论", "事实 / 口径", "数值", "校验", "备注"],
    ["城市市场", d.market, d.city, null, d.marketConfidence, "经营规划分类，不等同于行政级别"],
    ["综合阶段", d.stage, `${d.operation}｜${d.storeCount} 店｜${d.revenue}`, null, "由城市、营业额、形态和门店数综合判断", "基于客观经营信息自动判断"],
    ["主策略", d.strategy, `${d.market} × ${d.stage}`, null, "九宫格", null],
    ["渠道阶段", d.channelCalculated, "由各渠道营业额占比判断", null, "营收结构", null],
    ["首要经营问题", d.priorityIssue, null, null, "用户单选", "必须进入策略关键动作"],
    ["关键动作", d.priorityAction, null, null, "问题驱动", null],
    ["主攻引擎", d.mainEngines.join("、"), null, null, "最多两项", null],
    ["", "", "", "", "", ""],
    ["渠道", "营业额占比", "", "", "", ""],
    ["自有小程序", percentOrBlank(d.channelShares.miniProgram), "", "", null, ""],
    ["美团外卖", percentOrBlank(d.channelShares.meituanDelivery), "", "", null, ""],
    ["闪购外卖", percentOrBlank(d.channelShares.instantDelivery), "", "", null, ""],
    ["美团团购", percentOrBlank(d.channelShares.meituanDeal), "", "", null, ""],
    ["抖音团购", percentOrBlank(d.channelShares.douyinDeal), "", "", null, ""],
    ["其他渠道", percentOrBlank(d.channelShares.otherChannel), "", "", null, ""]
  ];
  diagnosis.getRange(`A3:F${diagnosisRows.length + 2}`).values = diagnosisRows;
  diagnosis.getRange("A3:F3").format = {
    fill: "#276FE8",
    font: { bold: true, color: "#FFFFFF" },
    verticalAlignment: "center"
  };
  diagnosis.getRange("A12:F12").format = {
    fill: "#F2C94C",
    font: { bold: true, color: "#171815" }
  };
  diagnosis.getRange("A4:F10").format.borders = { preset: "inside", style: "thin", color: "#D8DAD5" };
  diagnosis.getRange("A13:F18").format.borders = { preset: "inside", style: "thin", color: "#D8DAD5" };
  diagnosis.getRange("B13:B18").format.numberFormat = "0.0%";
  diagnosis.getRange("A3:F18").format.wrapText = true;
  diagnosis.getRange("A:A").format.columnWidth = 17;
  diagnosis.getRange("B:B").format.columnWidth = 23;
  diagnosis.getRange("C:C").format.columnWidth = 30;
  diagnosis.getRange("D:D").format.columnWidth = 17;
  diagnosis.getRange("E:E").format.columnWidth = 22;
  diagnosis.getRange("F:F").format.columnWidth = 34;
  diagnosis.freezePanes.freezeRows(3);

  const plan = payload.plan;
  const firstDateColumn = 10;
  const lastDateColumn = firstDateColumn + daysInMonth - 1;
  const lastColumnLetter = columnName(lastDateColumn);
  const coreActions = Array.isArray(payload.coreActions) ? payload.coreActions.slice(0, 5) : [];
  const coreStartRow = 4;
  const headerRow = coreStartRow + coreActions.length + 1;
  const firstTaskRow = headerRow + 1;
  const lastTaskRow = firstTaskRow + plan.length - 1;

  planSheet.showGridLines = false;
  planSheet.mergeCells(`A1:${lastColumnLetter}1`);
  planSheet.getRange("A1").values = [[`${year} 年 ${month} 月经营工作计划`]];
  planSheet.getRange(`A1:${lastColumnLetter}1`).format = {
    fill: "#171815",
    font: { bold: true, color: "#FFFFFF", size: 16 },
    verticalAlignment: "center"
  };
  planSheet.getRange(`A1:${lastColumnLetter}1`).format.rowHeight = 32;
  planSheet.mergeCells(`A2:${lastColumnLetter}2`);
  planSheet.getRange("A2").values = [[`${d.city}｜${d.market} × ${d.stage}｜${d.strategy}｜主攻：${d.mainEngines.join("、")}`]];
  planSheet.getRange(`A2:${lastColumnLetter}2`).format = {
    fill: "#EAF1FF",
    font: { bold: true, color: "#174B8A" },
    verticalAlignment: "center"
  };
  planSheet.mergeCells("A3:H3");
  planSheet.getRange("A3").values = [["本月核心"]];
  planSheet.getRange("I3").values = [["DDL"]];
  planSheet.getRange("A3:I3").format = {
    fill: "#F2C94C",
    font: { bold: true, color: "#171815" },
    verticalAlignment: "center"
  };
  coreActions.forEach((item, index) => {
    const row = coreStartRow + index;
    planSheet.getRange(`A${row}`).values = [[String(index + 1).padStart(2, "0")]];
    planSheet.mergeCells(`B${row}:H${row}`);
    planSheet.getRange(`B${row}`).values = [[item.name]];
    planSheet.getRange(`I${row}`).values = [[dateFromIso(item.ddl)]];
    planSheet.getRange(`I${row}`).format.numberFormat = "yyyy-mm-dd";
  });
  if (coreActions.length) {
    planSheet.getRange(`A${coreStartRow}:I${coreStartRow + coreActions.length - 1}`).format = {
      verticalAlignment: "center",
      wrapText: true,
      borders: { insideHorizontal: { style: "thin", color: "#D8DAD5" } }
    };
  }

  const fixedHeaders = ["编号", "项目", "渠道或模块", "任务", "开始日期", "结束日期", "历时", "验收口径", "备注"];
  const dateHeaders = Array.from({ length: daysInMonth }, (_, index) => new Date(year, month - 1, index + 1));
  planSheet.getRange(`A${headerRow}:${lastColumnLetter}${headerRow}`).values = [[...fixedHeaders, ...dateHeaders]];
  planSheet.getRange(`A${headerRow}:${lastColumnLetter}${headerRow}`).format = {
    fill: "#276FE8",
    font: { bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "inside", style: "thin", color: "#B9CEF6" }
  };
  planSheet.getRange(`J${headerRow}:${lastColumnLetter}${headerRow}`).format.numberFormat = "d";

  const rows = plan.map((item, index) => [
    index + 1,
    item.project || item.board,
    item.channel || item.board,
    item.name,
    dateFromIso(item.start),
    dateFromIso(item.end),
    null,
    item.acceptance || item.note || "",
    item.note
  ]);
  planSheet.getRange(`A${firstTaskRow}:I${lastTaskRow}`).values = rows;
  planSheet.getRange(`G${firstTaskRow}`).formulas = [[`=F${firstTaskRow}-E${firstTaskRow}+1`]];
  planSheet.getRange(`G${firstTaskRow}:G${lastTaskRow}`).fillDown();
  planSheet.getRange(`E${firstTaskRow}:F${lastTaskRow}`).format.numberFormat = "yyyy-mm-dd";
  planSheet.getRange(`G${firstTaskRow}:G${lastTaskRow}`).format.numberFormat = "0";

  const ganttFormulas = plan.map((_, rowIndex) => Array.from({ length: daysInMonth }, (_, dayIndex) => {
    const column = columnName(firstDateColumn + dayIndex);
    const row = firstTaskRow + rowIndex;
    return `=IF(AND(${column}$${headerRow}>=$E${row},${column}$${headerRow}<=$F${row}),"■","")`;
  }));
  planSheet.getRange(`J${firstTaskRow}:${lastColumnLetter}${lastTaskRow}`).formulas = ganttFormulas;
  planSheet.getRange(`J${firstTaskRow}:${lastColumnLetter}${lastTaskRow}`).format = {
    horizontalAlignment: "center",
    verticalAlignment: "center",
    font: { color: "#276FE8" }
  };
  planSheet.getRange(`J${firstTaskRow}:${lastColumnLetter}${lastTaskRow}`).conditionalFormats.add("containsText", {
    text: "■",
    format: { fill: "#276FE8", font: { color: "#276FE8" } }
  });
  planSheet.getRange(`A${firstTaskRow}:I${lastTaskRow}`).format = {
    verticalAlignment: "top",
    wrapText: true,
    borders: { insideHorizontal: { style: "thin", color: "#D8DAD5" } }
  };
  const widths = [8, 24, 16, 36, 13, 13, 9, 42, 18];
  widths.forEach((width, index) => {
    planSheet.getRange(`${columnName(index + 1)}:${columnName(index + 1)}`).format.columnWidth = width;
  });
  planSheet.getRange(`J:${lastColumnLetter}`).format.columnWidth = 3.5;
  planSheet.getRange(`${firstTaskRow}:${lastTaskRow}`).format.rowHeight = 38;
  planSheet.freezePanes.freezeRows(headerRow);
  planSheet.freezePanes.freezeColumns(9);

  return workbook;
}

async function exportWorkbook(payload) {
  const workbook = await buildWorkbook(payload);
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cake-planner-"));
  const outputPath = path.join(tmpDir, "plan.xlsx");
  try {
    const output = await SpreadsheetFile.exportXlsx(workbook);
    await output.save(outputPath);
    return await fs.readFile(outputPath);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2_000_000) throw new Error("请求数据过大");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function serveStatic(req, res) {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  const relativePath = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const filePath = path.resolve(rootDir, relativePath);
  if (!filePath.startsWith(`${rootDir}${path.sep}`) && filePath !== path.join(rootDir, "index.html")) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const content = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not Found");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/export") {
      const payload = await readJson(req);
      const year = Number(payload?.year);
      const month = Number(payload?.month);
      if (!payload?.diagnosis || !Array.isArray(payload?.plan) || payload.plan.length === 0
        || year < 2026 || year > 2030 || month < 1 || month > 12) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("计划数据无效");
        return;
      }
      const file = await exportWorkbook(payload);
      res.writeHead(200, {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="cake-brand-${year}-${String(month).padStart(2, "0")}-plan.xlsx"`,
        "Content-Length": file.length
      });
      res.end(file);
      return;
    }
    if (req.method === "GET" || req.method === "HEAD") {
      await serveStatic(req, res);
      return;
    }
    res.writeHead(405);
    res.end("Method Not Allowed");
  } catch (error) {
    console.error(error);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`生成失败：${error.message}`);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Cake planner running at http://127.0.0.1:${port}`);
});
