const STORAGE_KEY = "survey_data_json";
const SCHEMA_VERSION = 1;

const form = document.getElementById("nameForm");
const input = document.getElementById("name");
const message = document.getElementById("message");
const list = document.getElementById("nameList");
const count = document.getElementById("count");
const clearBtn = document.getElementById("clearBtn");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: SCHEMA_VERSION, responses: [] };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.responses)) {
      return { version: SCHEMA_VERSION, responses: [] };
    }
    return parsed;
  } catch {
    return { version: SCHEMA_VERSION, responses: [] };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function nextId(responses) {
  if (responses.length === 0) return 1;
  return Math.max(...responses.map((r) => r.id || 0)) + 1;
}

function addResponse(name) {
  const data = loadData();
  data.responses.push({
    id: nextId(data.responses),
    name,
    created_at: new Date().toISOString(),
  });
  saveData(data);
}

function deleteAll() {
  saveData({ version: SCHEMA_VERSION, responses: [] });
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function render() {
  const { responses } = loadData();
  count.textContent = `(${responses.length})`;
  list.innerHTML = "";

  if (responses.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "ยังไม่มีข้อมูลในไฟล์ JSON";
    list.appendChild(empty);
    return;
  }

  [...responses].reverse().forEach((row) => {
    const li = document.createElement("li");
    const left = document.createElement("div");
    left.className = "row-left";
    const idSpan = document.createElement("span");
    idSpan.className = "id-badge";
    idSpan.textContent = `#${row.id}`;
    const nameSpan = document.createElement("span");
    nameSpan.textContent = row.name;
    left.appendChild(idSpan);
    left.appendChild(nameSpan);

    const timeSpan = document.createElement("span");
    timeSpan.className = "time";
    timeSpan.textContent = formatTime(row.created_at);

    li.appendChild(left);
    li.appendChild(timeSpan);
    list.appendChild(li);
  });
}

function showMessage(text, isError = false) {
  message.textContent = text;
  message.hidden = false;
  message.classList.toggle("error", isError);
  setTimeout(() => {
    message.hidden = true;
  }, 2800);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportJson() {
  const data = loadData();
  const exportObj = {
    version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    responses: data.responses,
  };
  const blob = new Blob([JSON.stringify(exportObj, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `survey-${stamp}.json`);
}

function exportCsv() {
  const { responses } = loadData();
  const header = "id,name,created_at\n";
  const body = responses
    .map(
      (r) =>
        `${r.id},"${String(r.name).replace(/"/g, '""')}","${r.created_at}"`
    )
    .join("\n");
  const blob = new Blob(["﻿" + header + body], { type: "text/csv;charset=utf-8" });
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `survey-${stamp}.csv`);
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed.responses)) {
        throw new Error("ไม่พบ field 'responses' ที่เป็น array");
      }

      const current = loadData();
      const existingIds = new Set(current.responses.map((r) => r.id));
      let added = 0;

      parsed.responses.forEach((row) => {
        if (typeof row.name !== "string") return;
        const id = nextId(current.responses);
        current.responses.push({
          id,
          name: row.name,
          created_at: row.created_at || new Date().toISOString(),
        });
        existingIds.add(id);
        added++;
      });

      saveData(current);
      render();
      showMessage(`นำเข้าข้อมูล ${added} รายการสำเร็จ ✓`);
    } catch (err) {
      showMessage("ไฟล์ไม่ถูกต้อง: " + err.message, true);
    }
  };
  reader.readAsText(file);
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = input.value.trim();
  if (!value) return;

  addResponse(value);
  input.value = "";
  showMessage(`บันทึก "${value}" ลงไฟล์ JSON เรียบร้อย ✓`);
  render();
});

clearBtn.addEventListener("click", () => {
  if (loadData().responses.length === 0) return;
  if (confirm("ต้องการลบข้อมูลทั้งหมดใช่หรือไม่?")) {
    deleteAll();
    render();
  }
});

exportJsonBtn.addEventListener("click", exportJson);
exportCsvBtn.addEventListener("click", exportCsv);

importBtn.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) importJson(file);
  importFile.value = "";
});

render();
