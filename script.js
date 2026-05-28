const API_BASE = "/api/responses";

const form = document.getElementById("nameForm");
const input = document.getElementById("name");
const ageSelect = document.getElementById("age");
const submitBtn = form.querySelector("button[type=submit]");
const message = document.getElementById("message");
const list = document.getElementById("nameList");
const count = document.getElementById("count");
const clearBtn = document.getElementById("clearBtn");
const refreshBtn = document.getElementById("refreshBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const dbStatus = document.getElementById("dbStatus");

let responses = [];

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

function showMessage(text, isError = false) {
  message.textContent = text;
  message.hidden = false;
  message.classList.toggle("error", isError);
  setTimeout(() => {
    message.hidden = true;
  }, 2800);
}

function render() {
  count.textContent = `(${responses.length})`;
  list.innerHTML = "";

  if (responses.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "ยังไม่มีข้อมูลในฐานข้อมูล";
    list.appendChild(empty);
    return;
  }

  responses.forEach((row) => {
    const li = document.createElement("li");
    const left = document.createElement("div");
    left.className = "row-left";
    const idSpan = document.createElement("span");
    idSpan.className = "id-badge";
    idSpan.textContent = `#${row.id}`;
    const nameSpan = document.createElement("span");
    nameSpan.className = "name";
    nameSpan.textContent = row.name;
    const ageSpan = document.createElement("span");
    ageSpan.className = "age-badge";
    ageSpan.textContent = row.age || "-";
    left.appendChild(idSpan);
    left.appendChild(nameSpan);
    left.appendChild(ageSpan);

    const timeSpan = document.createElement("span");
    timeSpan.className = "time";
    timeSpan.textContent = formatTime(row.created_at);

    li.appendChild(left);
    li.appendChild(timeSpan);
    list.appendChild(li);
  });
}

async function checkHealth() {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    if (data.status === "ok") {
      dbStatus.textContent = "✓ เชื่อมต่อ PostgreSQL บน Railway สำเร็จ";
      dbStatus.classList.add("ready");
      input.disabled = false;
      ageSelect.disabled = false;
      submitBtn.disabled = false;
      return true;
    }
    throw new Error(data.message || "Unknown error");
  } catch (err) {
    dbStatus.textContent = "✗ ไม่สามารถเชื่อมต่อฐานข้อมูล: " + err.message;
    dbStatus.classList.add("error");
    return false;
  }
}

async function fetchAll() {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  responses = data.responses || [];
  render();
}

async function insertResponse(name, age) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, age }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function deleteAll() {
  const res = await fetch(API_BASE, { method: "DELETE" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

function exportCsv() {
  const header = "id,name,age,created_at\n";
  const body = responses
    .map(
      (r) =>
        `${r.id},"${String(r.name).replace(/"/g, '""')}","${r.age || ""}","${r.created_at}"`
    )
    .join("\n");
  const blob = new Blob(["﻿" + header + body], { type: "text/csv;charset=utf-8" });
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `survey-${stamp}.csv`);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const value = input.value.trim();
  const age = ageSelect.value;
  if (!value || !age) return;

  submitBtn.disabled = true;
  try {
    await insertResponse(value, age);
    input.value = "";
    ageSelect.value = "";
    showMessage(`บันทึก "${value}" (${age}) ลงฐานข้อมูลเรียบร้อย ✓`);
    await fetchAll();
  } catch (err) {
    showMessage("เกิดข้อผิดพลาด: " + err.message, true);
  } finally {
    submitBtn.disabled = false;
  }
});

clearBtn.addEventListener("click", async () => {
  if (responses.length === 0) return;
  if (!confirm("ต้องการลบข้อมูลทั้งหมดในตารางใช่หรือไม่?")) return;

  try {
    await deleteAll();
    await fetchAll();
    showMessage("ลบข้อมูลทั้งหมดเรียบร้อย ✓");
  } catch (err) {
    showMessage("เกิดข้อผิดพลาด: " + err.message, true);
  }
});

refreshBtn.addEventListener("click", async () => {
  try {
    await fetchAll();
    showMessage("รีเฟรชข้อมูลเรียบร้อย ✓");
  } catch (err) {
    showMessage("เกิดข้อผิดพลาด: " + err.message, true);
  }
});

exportCsvBtn.addEventListener("click", exportCsv);

(async () => {
  const ok = await checkHealth();
  if (ok) {
    try {
      await fetchAll();
    } catch (err) {
      showMessage("โหลดข้อมูลไม่สำเร็จ: " + err.message, true);
    }
  }
})();
