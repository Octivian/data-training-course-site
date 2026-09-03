import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputName = process.argv[2] || "./.playwright-cli/蛋糕品牌-2026年10月经营工作计划-甘特图.xlsx";
const month = Number(process.argv[3] || 10);
const workbookPath = new URL(inputName, import.meta.url);
const outputDir = new URL("./output/playwright/", import.meta.url);
const input = await FileBlob.load(fileURLToPath(workbookPath));
const workbook = await SpreadsheetFile.importXlsx(input);

const diagnosis = await workbook.inspect({
  kind: "table",
  range: "经营诊断!A1:F18",
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 8
});
console.log("DIAGNOSIS\n" + diagnosis.ndjson);

const plan = await workbook.inspect({
  kind: "table",
  range: `${month}月工作计划!A1:AN18`,
  include: "values,formulas",
  tableMaxRows: 18,
  tableMaxCols: 14
});
console.log("PLAN\n" + plan.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan"
});
console.log("ERRORS\n" + errors.ndjson);

const diagnosisPreview = await workbook.render({
  sheetName: "经营诊断",
  range: "A1:F18",
  scale: 1.4,
  format: "png"
});
const planPreview = await workbook.render({
  sheetName: `${month}月工作计划`,
  range: "A1:AN60",
  scale: 1,
  format: "png"
});
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(new URL(`v4-${month}月-excel-diagnosis.png`, outputDir), new Uint8Array(await diagnosisPreview.arrayBuffer()));
await fs.writeFile(new URL(`v4-${month}月-excel-gantt.png`, outputDir), new Uint8Array(await planPreview.arrayBuffer()));
