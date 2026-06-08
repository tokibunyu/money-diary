const STORAGE_KEY = "techo-kakeibo-entries";
const CATEGORY_STORAGE_KEY = "techo-kakeibo-categories";
const LOAN_STORAGE_KEY = "techo-kakeibo-loans";
const SCHEDULE_STORAGE_KEY = "techo-kakeibo-schedules";
const RECEIPT_STORAGE_KEY = "techo-kakeibo-receipts";
const ACCOUNT_STORAGE_KEY = "money-diary-account";
const EARLY_ACCESS_STORAGE_KEY = "money-diary-early-access";
const ALL_FEATURES_UNLOCKED = true;
const DEFAULT_CATEGORIES = [
  { name: "食費", color: "#d9a441", budget: 45000 },
  { name: "日用品", color: "#7f9f75", budget: 12000 },
  { name: "交通", color: "#5d8aa8", budget: 10000 },
  { name: "住まい", color: "#b9836b", budget: 0 },
  { name: "趣味", color: "#9b77ad", budget: 15000 },
  { name: "美容", color: "#cf7f9f", budget: 8000 },
  { name: "医療", color: "#6aa693", budget: 0 },
  { name: "収入", color: "#437c76", budget: 0 },
  { name: "その他", color: "#9d9588", budget: 0 },
];
const today = new Date();

let viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = toDateKey(today);
let entries = loadEntries();
let categories = loadCategories();
let loans = loadLoans();
let schedules = loadSchedules();
let receipts = loadReceipts();
let activePage = "calendar";
let accountEmailValue = loadAccountEmail();
let isPremiumUser = ALL_FEATURES_UNLOCKED;

const calendarGrid = document.querySelector("#calendarGrid");
const monthTitle = document.querySelector("#monthTitle");
const selectedDateTitle = document.querySelector("#selectedDateTitle");
const entryForm = document.querySelector("#entryForm");
const entryTitle = document.querySelector("#entryTitle");
const entryAmount = document.querySelector("#entryAmount");
const entryCategory = document.querySelector("#entryCategory");
const entryList = document.querySelector("#entryList");
const receiptImage = document.querySelector("#receiptImage");
const receiptPreview = document.querySelector("#receiptPreview");
const receiptStatus = document.querySelector("#receiptStatus");
const receiptForm = document.querySelector("#receiptForm");
const receiptDate = document.querySelector("#receiptDate");
const receiptTime = document.querySelector("#receiptTime");
const receiptStore = document.querySelector("#receiptStore");
const receiptAmount = document.querySelector("#receiptAmount");
const receiptCategory = document.querySelector("#receiptCategory");
const receiptRawText = document.querySelector("#receiptRawText");
const duplicateBox = document.querySelector("#duplicateBox");
const receiptSubmit = document.querySelector("#receiptSubmit");
const categoryList = document.querySelector("#categoryList");
const categoryForm = document.querySelector("#categoryForm");
const categoryName = document.querySelector("#categoryName");
const categoryColor = document.querySelector("#categoryColor");
const categoryBudget = document.querySelector("#categoryBudget");
const categoryChipList = document.querySelector("#categoryChipList");
const monthlyList = document.querySelector("#monthlyList");
const planForm = document.querySelector("#planForm");
const planDate = document.querySelector("#planDate");
const planTitle = document.querySelector("#planTitle");
const planAmount = document.querySelector("#planAmount");
const planCategory = document.querySelector("#planCategory");
const cardForm = document.querySelector("#cardForm");
const cardName = document.querySelector("#cardName");
const cardDate = document.querySelector("#cardDate");
const cardAmount = document.querySelector("#cardAmount");
const planList = document.querySelector("#planList");
const loanForm = document.querySelector("#loanForm");
const loanPerson = document.querySelector("#loanPerson");
const loanAmount = document.querySelector("#loanAmount");
const loanMemo = document.querySelector("#loanMemo");
const loanList = document.querySelector("#loanList");
const lentTotal = document.querySelector("#lentTotal");
const borrowedTotal = document.querySelector("#borrowedTotal");
const loanBalanceTotal = document.querySelector("#loanBalanceTotal");
const incomeTotal = document.querySelector("#incomeTotal");
const expenseTotal = document.querySelector("#expenseTotal");
const balanceTotal = document.querySelector("#balanceTotal");
const accountForm = document.querySelector("#accountForm");
const accountEmail = document.querySelector("#accountEmail");
const planBadge = document.querySelector("#planBadge");
let pendingReceiptFile = null;
let pendingDuplicate = null;

if (accountEmail) accountEmail.value = accountEmailValue;
updatePlanState();

if (accountForm) {
  accountForm.addEventListener("submit", (event) => {
    event.preventDefault();
    accountEmailValue = normalizeEmail(accountEmail.value);
    accountEmail.value = accountEmailValue;
    localStorage.setItem(
      ACCOUNT_STORAGE_KEY,
      JSON.stringify({
        email: accountEmailValue,
        verified: Boolean(accountEmailValue),
        updatedAt: Date.now(),
      }),
    );
    isPremiumUser = ALL_FEATURES_UNLOCKED;
    updatePlanState();
  });
}

document.querySelectorAll(".page-tab").forEach((button) => {
  button.addEventListener("click", () => {
    activePage = button.dataset.pageTarget;
    renderPages();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

document.querySelector("#prevMonth").addEventListener("click", () => changeMonth(-1));
document.querySelector("#nextMonth").addEventListener("click", () => changeMonth(1));
document.querySelector("#todayButton").addEventListener("click", () => {
  viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
  selectedDate = toDateKey(today);
  activePage = "calendar";
  render();
});

document.querySelector("#clearDayButton").addEventListener("click", () => {
  entries = entries.filter((entry) => entry.date !== selectedDate);
  saveEntries();
  render();
});

entryForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(entryForm);
  const type = formData.get("type");
  const amount = Number(entryAmount.value);

  if (!entryTitle.value.trim() || amount <= 0) return;

  entries.push({
    id: crypto.randomUUID(),
    date: selectedDate,
    type,
    title: entryTitle.value.trim(),
    amount,
    category: entryCategory.value,
    createdAt: Date.now(),
  });

  entryForm.reset();
  entryForm.querySelector('input[value="expense"]').checked = true;
  saveEntries();
  render();
  entryTitle.focus();
});

receiptImage.addEventListener("change", async () => {
  const file = receiptImage.files?.[0];
  if (!file) return;

  pendingReceiptFile = file;
  pendingDuplicate = null;
  duplicateBox.hidden = true;
  receiptPreview.src = URL.createObjectURL(file);
  receiptPreview.hidden = false;
  receiptStatus.textContent = "読み取り中です。";

  const result = await readReceiptImage(file);
  fillReceiptForm(result);
  updateDuplicateState();
});

receiptRawText.addEventListener("input", () => {
  fillReceiptForm(parseReceiptText(receiptRawText.value), { keepRawText: true });
  updateDuplicateState();
});

[receiptDate, receiptTime, receiptStore, receiptAmount].forEach((input) => {
  input.addEventListener("input", updateDuplicateState);
});

receiptForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number(receiptAmount.value);
  if (!receiptDate.value || !receiptStore.value.trim() || amount <= 0) return;

  updateDuplicateState();
  if (pendingDuplicate) {
    receiptStatus.textContent = "重複候補があります。内容を確認してから手入力を修正してください。";
    return;
  }

  const receiptRecord = {
    id: crypto.randomUUID(),
    date: receiptDate.value,
    time: receiptTime.value,
    store: receiptStore.value.trim(),
    amount,
    category: receiptCategory.value,
    rawText: receiptRawText.value.trim(),
    fileName: pendingReceiptFile?.name || "",
    importedAt: Date.now(),
  };

  receipts.push(receiptRecord);
  entries.push({
    id: crypto.randomUUID(),
    date: receiptRecord.date,
    type: "expense",
    title: receiptRecord.store,
    amount: receiptRecord.amount,
    category: receiptRecord.category,
    receiptId: receiptRecord.id,
    receiptTime: receiptRecord.time,
    createdAt: Date.now(),
  });

  viewDate = new Date(fromDateKey(receiptRecord.date).getFullYear(), fromDateKey(receiptRecord.date).getMonth(), 1);
  selectedDate = receiptRecord.date;
  saveReceipts();
  saveEntries();
  receiptForm.reset();
  receiptPreview.hidden = true;
  receiptPreview.removeAttribute("src");
  pendingReceiptFile = null;
  pendingDuplicate = null;
  duplicateBox.hidden = true;
  receiptStatus.textContent = "レシートを家計簿に追加しました。";
  render();
});

categoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = categoryName.value.trim();
  if (!name) return;

  const existing = categories.find((category) => category.name === name);
  if (existing) {
    existing.color = categoryColor.value;
    existing.budget = Number(categoryBudget.value || 0);
  } else {
    categories.push({ name, color: categoryColor.value, budget: Number(categoryBudget.value || 0) });
  }

  saveCategories();
  categoryForm.reset();
  categoryColor.value = "#d9a441";
  render();
});

planForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number(planAmount.value);
  if (!planDate.value || !planTitle.value.trim() || amount <= 0) return;

  schedules.push({
    id: crypto.randomUUID(),
    date: planDate.value,
    kind: "plan",
    title: planTitle.value.trim(),
    amount,
    category: planCategory.value,
    createdAt: Date.now(),
  });

  saveSchedules();
  planForm.reset();
  planDate.value = selectedDate;
  render();
  planTitle.focus();
});

cardForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number(cardAmount.value);
  if (!cardName.value.trim() || !cardDate.value || amount <= 0) return;

  schedules.push({
    id: crypto.randomUUID(),
    date: cardDate.value,
    kind: "card",
    title: `${cardName.value.trim()} 引き落とし`,
    amount,
    category: "その他",
    createdAt: Date.now(),
  });

  saveSchedules();
  cardForm.reset();
  render();
  cardName.focus();
});

loanForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(loanForm);
  const type = formData.get("loanType");
  const amount = Number(loanAmount.value);

  if (!loanPerson.value.trim() || !loanMemo.value.trim() || amount <= 0) return;

  loans.push({
    id: crypto.randomUUID(),
    date: selectedDate,
    type,
    person: loanPerson.value.trim(),
    memo: loanMemo.value.trim(),
    amount,
    settled: false,
    createdAt: Date.now(),
  });

  saveLoans();
  loanForm.reset();
  loanForm.querySelector('input[value="lent"]').checked = true;
  render();
  loanPerson.focus();
});

function changeMonth(offset) {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
  selectedDate = toDateKey(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1));
  render();
}

function render() {
  renderPages();
  renderCategoryOptions();
  renderCategoryChips();
  renderCalendar();
  renderSelectedDay();
  renderSummary();
  renderMonthlyOverview();
  renderSchedules();
  renderLoans();
  renderCategories();
}

function renderPages() {
  document.querySelectorAll(".page-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.pageTarget === activePage);
  });
  document.querySelectorAll(".app-page").forEach((page) => {
    page.classList.toggle("is-hidden", page.dataset.page !== activePage);
  });
}

function updatePlanState() {
  document.body.classList.toggle("plan-free", !isPremiumUser);
  document.body.classList.toggle("plan-premium", isPremiumUser);
  if (planBadge) {
    planBadge.textContent = ALL_FEATURES_UNLOCKED ? "全機能無料" : isPremiumUser ? "無料プレミアム" : "無料版";
  }
}

function renderCategoryOptions() {
  const selected = entryCategory.value;
  const selectedPlan = planCategory.value;
  const selectedReceipt = receiptCategory.value;
  entryCategory.innerHTML = "";
  planCategory.innerHTML = "";
  receiptCategory.innerHTML = "";

  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category.name;
    option.textContent = category.name;
    entryCategory.append(option);

    if (category.name !== "収入") {
      const planOption = document.createElement("option");
      planOption.value = category.name;
      planOption.textContent = category.name;
      planCategory.append(planOption);

      const receiptOption = document.createElement("option");
      receiptOption.value = category.name;
      receiptOption.textContent = category.name;
      receiptCategory.append(receiptOption);
    }
  }

  if (categories.some((category) => category.name === selected)) {
    entryCategory.value = selected;
  }
  if (categories.some((category) => category.name === selectedPlan)) {
    planCategory.value = selectedPlan;
  }
  if (categories.some((category) => category.name === selectedReceipt)) {
    receiptCategory.value = selectedReceipt;
  }

  if (!planDate.value) planDate.value = selectedDate;
  if (!receiptDate.value) receiptDate.value = selectedDate;
}

function renderCategoryChips() {
  categoryChipList.innerHTML = "";

  for (const category of categories) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "category-chip";
    chip.style.setProperty("--category-color", category.color);
    chip.innerHTML = `
      <span class="color-dot"></span>
      <span>${escapeHtml(category.name)}</span>
    `;
    chip.addEventListener("click", () => {
      categoryName.value = category.name;
      categoryColor.value = category.color;
      categoryBudget.value = category.budget || "";
      categoryName.focus();
    });
    categoryChipList.append(chip);
  }
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  monthTitle.textContent = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
  }).format(viewDate);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const mondayIndex = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - mondayIndex);

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const dateKey = toDateKey(date);
    const dayEntries = entries.filter((entry) => entry.date === dateKey);
    const daySchedules = getVisibleSchedules().filter((schedule) => schedule.date === dateKey);
    const dayIncome = sum(dayEntries.filter((entry) => entry.type === "income"));
    const dayExpense = sum(dayEntries.filter((entry) => entry.type === "expense"));
    const dayPlanned = sum(daySchedules);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-cell";
    button.classList.toggle("is-muted", date.getMonth() !== month);
    button.classList.toggle("is-selected", dateKey === selectedDate);
    button.classList.toggle("is-today", dateKey === toDateKey(today));
    button.setAttribute("aria-label", formatLongDate(date));
    button.addEventListener("click", () => {
      selectedDate = dateKey;
      if (date.getMonth() !== viewDate.getMonth()) {
        viewDate = new Date(date.getFullYear(), date.getMonth(), 1);
      }
      render();
    });

    button.innerHTML = `
      <span class="date-number">${date.getDate()}</span>
      <span class="day-money">
        ${dayIncome ? `<b class="income" style="color: ${getCategoryColor("収入")}">+${formatShortYen(dayIncome)}</b>` : ""}
        ${dayExpense ? `<b class="expense">-${formatShortYen(dayExpense)}</b>` : ""}
        ${dayPlanned ? `<b class="planned">予${formatPlainNumber(dayPlanned)}</b>` : ""}
      </span>
    `;
    calendarGrid.append(button);
  }
}

function renderSelectedDay() {
  const selected = fromDateKey(selectedDate);
  selectedDateTitle.textContent = formatLongDate(selected);
  const dayEntries = entries
    .filter((entry) => entry.date === selectedDate)
    .sort((a, b) => b.createdAt - a.createdAt);
  const daySchedules = getVisibleSchedules()
    .filter((schedule) => schedule.date === selectedDate)
    .sort((a, b) => b.createdAt - a.createdAt);

  entryList.innerHTML = "";

  if (dayEntries.length === 0 && daySchedules.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "まだ書き込みはありません。";
    entryList.append(empty);
    return;
  }

  for (const entry of dayEntries) {
    const categoryColor = getCategoryColor(entry.category);
    const item = document.createElement("li");
    item.className = "entry-item";
    item.style.setProperty("--category-color", categoryColor);
    item.innerHTML = `
      <span class="entry-main">
        <span class="entry-title">${escapeHtml(entry.title)}</span>
        <span class="entry-meta"><span class="color-dot"></span>${escapeHtml(entry.category)}</span>
      </span>
      <span class="entry-amount ${entry.type}">
        ${entry.type === "income" ? "+" : "-"}${formatYen(entry.amount)}
      </span>
      <button class="delete-button" type="button" aria-label="削除">×</button>
    `;
    item.querySelector("button").addEventListener("click", () => {
      entries = entries.filter((candidate) => candidate.id !== entry.id);
      saveEntries();
      render();
    });
    entryList.append(item);
  }

  for (const schedule of daySchedules) {
    const item = document.createElement("li");
    item.className = "entry-item planned-item";
    item.style.setProperty("--category-color", schedule.kind === "card" ? "#8d7b68" : getCategoryColor(schedule.category));
    item.innerHTML = `
      <span class="entry-main">
        <span class="entry-title">${escapeHtml(schedule.title)}</span>
        <span class="entry-meta"><span class="color-dot"></span>${schedule.kind === "card" ? "カード予定" : "予定"} ・ ${escapeHtml(schedule.category)}</span>
      </span>
      <span class="entry-amount planned">予定 ${formatYen(schedule.amount)}</span>
      <button class="delete-button" type="button" aria-label="削除">×</button>
    `;
    item.querySelector("button").addEventListener("click", () => {
      schedules = schedules.filter((candidate) => candidate.id !== schedule.id);
      saveSchedules();
      render();
    });
    entryList.append(item);
  }
}

function renderSummary() {
  const monthEntries = getMonthEntries();
  const income = sum(monthEntries.filter((entry) => entry.type === "income"));
  const expense = sum(monthEntries.filter((entry) => entry.type === "expense"));
  incomeTotal.textContent = formatYen(income);
  expenseTotal.textContent = formatYen(expense);
  balanceTotal.textContent = formatYen(income - expense);
}

function renderMonthlyOverview() {
  const rows = getMonthlySummaries();
  const max = Math.max(...rows.map((row) => Math.max(row.income, row.expense)), 1);

  monthlyList.innerHTML = "";

  if (rows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "収支を追加すると月別の一覧が表示されます。";
    monthlyList.append(empty);
    return;
  }

  for (const row of rows) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "monthly-row";
    item.addEventListener("click", () => {
      viewDate = new Date(row.year, row.month - 1, 1);
      selectedDate = toDateKey(viewDate);
      activePage = "calendar";
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    item.innerHTML = `
      <span class="monthly-name">${row.label}</span>
      <span class="monthly-bars">
        <span class="flow-bar income"><span style="width: ${(row.income / max) * 100}%"></span></span>
        <span class="flow-bar expense"><span style="width: ${(row.expense / max) * 100}%"></span></span>
      </span>
      <span class="monthly-amounts">
        <b class="income">+${formatYen(row.income)}</b>
        <b class="expense">-${formatYen(row.expense)}</b>
        <strong class="${row.balance < 0 ? "expense" : "income"}">${formatYen(row.balance)}</strong>
      </span>
    `;
    monthlyList.append(item);
  }
}

function renderSchedules() {
  const visibleSchedules = getVisibleSchedules().sort((a, b) => a.date.localeCompare(b.date));

  planList.innerHTML = "";

  if (visibleSchedules.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "出費予定を書くと、日付が来るまでカレンダーに表示されます。";
    planList.append(empty);
    return;
  }

  for (const schedule of visibleSchedules) {
    const item = document.createElement("li");
    item.className = "plan-item";
    item.style.setProperty("--category-color", schedule.kind === "card" ? "#8d7b68" : getCategoryColor(schedule.category));
    item.innerHTML = `
      <span class="plan-date">${formatShortDate(fromDateKey(schedule.date))}</span>
      <span class="plan-main">
        <span class="plan-title">${escapeHtml(schedule.title)}</span>
        <span class="plan-meta">${schedule.kind === "card" ? "カード引き落とし" : escapeHtml(schedule.category)}</span>
      </span>
      <strong>${formatYen(schedule.amount)}</strong>
      <button class="delete-button" type="button" aria-label="削除">×</button>
    `;
    item.querySelector("button").addEventListener("click", () => {
      schedules = schedules.filter((candidate) => candidate.id !== schedule.id);
      saveSchedules();
      render();
    });
    planList.append(item);
  }
}

function renderLoans() {
  const openLoans = loans.filter((loan) => !loan.settled);
  const lent = sum(openLoans.filter((loan) => loan.type === "lent"));
  const borrowed = sum(openLoans.filter((loan) => loan.type === "borrowed"));

  lentTotal.textContent = formatYen(lent);
  borrowedTotal.textContent = formatYen(borrowed);
  loanBalanceTotal.textContent = formatYen(lent - borrowed);

  loanList.innerHTML = "";

  if (loans.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "立て替えや借りたお金を追加すると、ここに残額が表示されます。";
    loanList.append(empty);
    return;
  }

  for (const loan of [...loans].sort(sortLoans)) {
    const item = document.createElement("li");
    item.className = "loan-item";
    item.classList.toggle("is-settled", loan.settled);
    item.innerHTML = `
      <span class="loan-main">
        <span class="loan-title">${escapeHtml(loan.memo)}</span>
        <span class="loan-meta">${escapeHtml(loan.person)} ・ ${formatShortDate(fromDateKey(loan.date))}</span>
      </span>
      <span class="loan-amount ${loan.type}">
        ${loan.type === "lent" ? "返してもらう" : "返す"} ${formatYen(loan.amount)}
      </span>
      <button class="settle-button" type="button">${loan.settled ? "未完了に戻す" : "精算済み"}</button>
      <button class="delete-button" type="button" aria-label="削除">×</button>
    `;
    item.querySelector(".settle-button").addEventListener("click", () => {
      loan.settled = !loan.settled;
      saveLoans();
      render();
    });
    item.querySelector(".delete-button").addEventListener("click", () => {
      loans = loans.filter((candidate) => candidate.id !== loan.id);
      saveLoans();
      render();
    });
    loanList.append(item);
  }
}

function renderCategories() {
  const expenses = getMonthEntries().filter((entry) => entry.type === "expense");
  const totals = expenses.reduce((result, entry) => {
    result[entry.category] = (result[entry.category] || 0) + entry.amount;
    return result;
  }, {});
  const rows = categories
    .filter((category) => category.name !== "収入")
    .map((category) => ({
      ...category,
      amount: totals[category.name] || 0,
    }))
    .filter((category) => category.amount > 0 || category.budget > 0)
    .sort((a, b) => b.amount - a.amount);
  const max = Math.max(...rows.map((row) => Math.max(row.amount, row.budget || 0)), 1);

  categoryList.innerHTML = "";

  if (rows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "支出を追加すると内訳が表示されます。";
    categoryList.append(empty);
    return;
  }

  for (const category of rows) {
    const amount = category.amount;
    const budget = Number(category.budget || 0);
    const widthBase = budget > 0 ? budget : max;
    const percent = Math.min((amount / Math.max(widthBase, 1)) * 100, 100);
    const row = document.createElement("div");
    row.className = "category-row";
    row.style.setProperty("--category-color", category.color);
    row.innerHTML = `
      <strong><span class="color-dot"></span>${escapeHtml(category.name)}</strong>
      <span class="category-bar"><span style="width: ${percent}%"></span></span>
      <span class="category-amounts">
        <b>${formatYen(amount)}</b>
        ${budget ? `<small>目安 ${formatYen(budget)}</small>` : "<small>目安なし</small>"}
      </span>
    `;
    categoryList.append(row);
  }
}

function getMonthEntries() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  return entries.filter((entry) => {
    const date = fromDateKey(entry.date);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

function getMonthlySummaries() {
  const monthMap = new Map();
  const currentMonthKey = toMonthKey(viewDate);
  monthMap.set(currentMonthKey, {
    key: currentMonthKey,
    year: viewDate.getFullYear(),
    month: viewDate.getMonth() + 1,
    income: 0,
    expense: 0,
  });

  for (const entry of entries) {
    const date = fromDateKey(entry.date);
    const key = toMonthKey(date);
    if (!monthMap.has(key)) {
      monthMap.set(key, {
        key,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        income: 0,
        expense: 0,
      });
    }

    const row = monthMap.get(key);
    row[entry.type] += Number(entry.amount || 0);
  }

  return [...monthMap.values()]
    .map((row) => ({
      ...row,
      balance: row.income - row.expense,
      label: `${row.year}年${row.month}月`,
    }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || seedEntries();
  } catch {
    return seedEntries();
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadCategories() {
  try {
    const saved = JSON.parse(localStorage.getItem(CATEGORY_STORAGE_KEY)) || [];
    return mergeCategories(DEFAULT_CATEGORIES, saved, entries);
  } catch {
    return mergeCategories(DEFAULT_CATEGORIES, [], entries);
  }
}

function saveCategories() {
  localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
}

function loadLoans() {
  try {
    return JSON.parse(localStorage.getItem(LOAN_STORAGE_KEY)) || seedLoans();
  } catch {
    return seedLoans();
  }
}

function saveLoans() {
  localStorage.setItem(LOAN_STORAGE_KEY, JSON.stringify(loans));
}

function loadSchedules() {
  try {
    return JSON.parse(localStorage.getItem(SCHEDULE_STORAGE_KEY)) || seedSchedules();
  } catch {
    return seedSchedules();
  }
}

function saveSchedules() {
  localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedules));
}

function loadReceipts() {
  try {
    return JSON.parse(localStorage.getItem(RECEIPT_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveReceipts() {
  localStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(receipts));
}

function loadAccountEmail() {
  const storedAccount = readStoredEmail(ACCOUNT_STORAGE_KEY);
  if (storedAccount) return storedAccount;
  return readStoredEmail(EARLY_ACCESS_STORAGE_KEY);
}

function readStoredEmail(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return normalizeEmail(value?.email || "");
  } catch {
    return "";
  }
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function mergeCategories(defaults, saved, currentEntries) {
  const categoryMap = new Map();
  const addCategory = (category) => {
    const name = typeof category === "string" ? category : category?.name;
    const color = typeof category === "string" ? "#9d9588" : category?.color;
    const budget = typeof category === "string" ? 0 : Number(category?.budget || 0);
    if (!name) return;
    categoryMap.set(name, { name, color: color || "#9d9588", budget });
  };

  defaults.forEach(addCategory);
  saved.forEach(addCategory);
  currentEntries.forEach((entry) => {
    if (!categoryMap.has(entry.category)) {
      addCategory({ name: entry.category, color: "#9d9588", budget: 0 });
    }
  });
  return [...categoryMap.values()];
}

function getCategoryColor(name) {
  return categories.find((category) => category.name === name)?.color || "#9d9588";
}

function getVisibleSchedules() {
  return schedules.filter((schedule) => schedule.date >= toDateKey(today));
}

async function readReceiptImage(file) {
  const fallback = parseReceiptText(file.name);

  if (!window.Tesseract?.recognize) {
    receiptStatus.textContent = "OCRエンジン未接続です。読み取りテキストや候補欄を手直しできます。";
    return fallback;
  }

  try {
    const result = await window.Tesseract.recognize(file, "jpn+eng", {
      logger: (progress) => {
        if (progress.status === "recognizing text") {
          receiptStatus.textContent = `読み取り中 ${Math.round((progress.progress || 0) * 100)}%`;
        }
      },
    });
    const text = result?.data?.text || "";
    receiptStatus.textContent = text ? "読み取り候補を作りました。" : "文字を読み取れませんでした。手入力で補正できます。";
    return parseReceiptText(text);
  } catch {
    receiptStatus.textContent = "OCR読み取りに失敗しました。手入力で補正できます。";
    return fallback;
  }
}

function fillReceiptForm(result, options = {}) {
  if (!options.keepRawText) receiptRawText.value = result.rawText || "";
  if (result.date) receiptDate.value = result.date;
  if (result.time) receiptTime.value = result.time;
  if (result.store) receiptStore.value = result.store;
  if (result.amount) receiptAmount.value = result.amount;
  if (result.category && categories.some((category) => category.name === result.category)) {
    receiptCategory.value = result.category;
  }
}

function parseReceiptText(text) {
  const rawText = String(text || "");
  const normalized = rawText.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const joined = lines.join(" ");
  const date = parseReceiptDate(joined);
  const time = parseReceiptTime(joined);
  const amount = parseReceiptAmount(joined);
  const store = parseReceiptStore(lines);

  return {
    rawText,
    date,
    time,
    amount,
    store,
    category: guessReceiptCategory(joined),
  };
}

function parseReceiptDate(text) {
  const match = text.match(/(20\d{2}|令和\s*\d{1,2}|R\s*\d{1,2})[年\/.\- ]\s*(\d{1,2})[月\/.\- ]\s*(\d{1,2})/i);
  if (!match) return "";

  let year = match[1].replace(/\s/g, "");
  if (/令和/i.test(year)) year = String(2018 + Number(year.replace(/\D/g, "")));
  if (/^R/i.test(year)) year = String(2018 + Number(year.replace(/\D/g, "")));
  const month = String(Number(match[2])).padStart(2, "0");
  const day = String(Number(match[3])).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseReceiptTime(text) {
  const match = text.match(/(\d{1,2})[:時](\d{2})/);
  if (!match) return "";
  return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`;
}

function parseReceiptAmount(text) {
  const candidates = [];
  const amountPattern = /(合計|総合計|小計|税込|お買上計|現計|計)\D{0,10}([\\¥￥]?\s*[\d,]{2,})/g;
  let match;
  while ((match = amountPattern.exec(text))) {
    candidates.push(Number(match[2].replace(/[^\d]/g, "")));
  }
  if (candidates.length) return Math.max(...candidates);

  const yenMatches = [...text.matchAll(/([\\¥￥]\s*[\d,]{2,}|[\d,]{2,}\s*円)/g)].map((item) =>
    Number(item[0].replace(/[^\d]/g, "")),
  );
  return yenMatches.length ? Math.max(...yenMatches) : "";
}

function parseReceiptStore(lines) {
  const ignored = /(領収|レシート|請求|登録番号|TEL|電話|合計|小計|税込|釣|現金|クレジット|カード)/i;
  return lines.find((line) => line.length >= 2 && !ignored.test(line)) || "";
}

function guessReceiptCategory(text) {
  if (/薬|病院|クリニック|医療/.test(text)) return "医療";
  if (/電車|交通|駅|バス|タクシー/.test(text)) return "交通";
  if (/ドラッグ|日用品|洗剤|文具/.test(text)) return "日用品";
  if (/美容|コスメ|化粧/.test(text)) return "美容";
  if (/映画|本|ゲーム|趣味/.test(text)) return "趣味";
  return "食費";
}

function updateDuplicateState() {
  const candidate = {
    date: receiptDate.value,
    time: receiptTime.value,
    store: receiptStore.value.trim(),
    amount: Number(receiptAmount.value || 0),
  };
  pendingDuplicate = findReceiptDuplicate(candidate);

  if (!candidate.date || !candidate.amount) {
    duplicateBox.hidden = true;
    receiptSubmit.disabled = false;
    return;
  }

  if (pendingDuplicate) {
    duplicateBox.hidden = false;
    duplicateBox.textContent = `重複候補: ${pendingDuplicate.store || pendingDuplicate.title} / ${formatYen(pendingDuplicate.amount)} / ${
      pendingDuplicate.time || pendingDuplicate.receiptTime || "登録済み側は時刻なし"
    }`;
    receiptSubmit.disabled = true;
  } else {
    duplicateBox.hidden = false;
    duplicateBox.textContent = "重複候補はありません。";
    receiptSubmit.disabled = false;
  }
}

function findReceiptDuplicate(candidate) {
  if (!candidate.date || !candidate.amount) return null;
  const normalizeStore = (value) => String(value || "").replace(/\s/g, "").toLowerCase();
  const store = normalizeStore(candidate.store);

  return (
    receipts.find(
      (receipt) =>
        receipt.date === candidate.date &&
        Number(receipt.amount) === candidate.amount &&
        (!candidate.time || !receipt.time || receipt.time === candidate.time) &&
        (!store || normalizeStore(receipt.store).includes(store) || store.includes(normalizeStore(receipt.store))),
    ) ||
    entries.find(
      (entry) =>
        entry.date === candidate.date &&
        entry.type === "expense" &&
        Number(entry.amount) === candidate.amount &&
        (!candidate.time || !entry.receiptTime || entry.receiptTime === candidate.time) &&
        (!store || normalizeStore(entry.title).includes(store) || store.includes(normalizeStore(entry.title))),
    ) ||
    null
  );
}

function seedLoans() {
  const sample = [
    {
      id: "sample-lent",
      date: toDateKey(today),
      type: "lent",
      person: "友人",
      memo: "ランチ立て替え",
      amount: 1600,
      settled: false,
      createdAt: Date.now() - 1,
    },
  ];
  localStorage.setItem(LOAN_STORAGE_KEY, JSON.stringify(sample));
  return sample;
}

function seedSchedules() {
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const sample = [
    {
      id: "sample-plan",
      date: toDateKey(nextWeek),
      kind: "plan",
      title: "週末の買い物",
      amount: 6000,
      category: "日用品",
      createdAt: Date.now() - 1,
    },
  ];
  localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(sample));
  return sample;
}

function sortLoans(a, b) {
  if (a.settled !== b.settled) return a.settled ? 1 : -1;
  return b.createdAt - a.createdAt;
}

function seedEntries() {
  const base = toDateKey(today);
  const first = toDateKey(new Date(today.getFullYear(), today.getMonth(), 1));
  const sample = [
    {
      id: "sample-income",
      date: first,
      type: "income",
      title: "今月の予算",
      amount: 180000,
      category: "収入",
      createdAt: Date.now() - 3,
    },
    {
      id: "sample-lunch",
      date: base,
      type: "expense",
      title: "カフェランチ",
      amount: 1280,
      category: "食費",
      createdAt: Date.now() - 2,
    },
    {
      id: "sample-train",
      date: base,
      type: "expense",
      title: "電車",
      amount: 420,
      category: "交通",
      createdAt: Date.now() - 1,
    },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sample));
  return sample;
}

function sum(list) {
  return list.reduce((total, entry) => total + Number(entry.amount || 0), 0);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function fromDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function formatYen(value) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortYen(value) {
  return new Intl.NumberFormat("ja-JP").format(value);
}

function formatPlainNumber(value) {
  return new Intl.NumberFormat("ja-JP").format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

render();
