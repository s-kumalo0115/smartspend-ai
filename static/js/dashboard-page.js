document.addEventListener("DOMContentLoaded", () => {
  const isStaticMode = window.location.pathname.includes("/templates/") || window.location.port === "5500";
  if (localStorage.getItem("loggedIn") !== "true") {
    window.location.href = isStaticMode ? "/templates/index.html" : "/";
    return;
  }

  const homeLink = document.getElementById("homeLink");
  const profileLink = document.getElementById("profileLink");
  if (homeLink) homeLink.href = isStaticMode ? "/templates/index.html" : "/";
  if (profileLink) profileLink.href = isStaticMode ? "/templates/profile.html" : "/profile";

  const parseInjectedJSON = (value, fallback) => {
    if (!value || value.includes("\u007b\u007b")) return fallback;
    try { return JSON.parse(value); } catch { return fallback; }
  };

  const localData = JSON.parse(localStorage.getItem("ssDashboardData") || "{}");
  const getData = (serverValue, key, fallback = []) => (serverValue && serverValue.length ? serverValue : localData[key] ?? fallback);

  const data = {
    months: getData(parseInjectedJSON(window.__JINJA_MONTHS__, []), "months"),
    monthly: getData(parseInjectedJSON(window.__JINJA_MONTHLY__, []), "monthly"),
    categories: getData(parseInjectedJSON(window.__JINJA_CATEGORIES__, []), "categories"),
    categoryTotals: getData(parseInjectedJSON(window.__JINJA_CATEGORY_TOTALS__, []), "category_totals"),
    amounts: getData(parseInjectedJSON(window.__JINJA_AMOUNTS__, []), "amounts"),
    dates: getData(parseInjectedJSON(window.__JINJA_DATES__, []), "dates"),
    cumulative: getData(parseInjectedJSON(window.__JINJA_CUMULATIVE__, []), "cumulative"),
    rolling: getData(parseInjectedJSON(window.__JINJA_ROLLING__, []), "rolling"),
    velocity: getData(parseInjectedJSON(window.__JINJA_VELOCITY__, []), "velocity"),
    volLabels: getData(parseInjectedJSON(window.__JINJA_VOL_LABELS__, []), "volatility_labels"),
    volValues: getData(parseInjectedJSON(window.__JINJA_VOL_VALUES__, []), "volatility_values"),
    expenseLabels: getData(parseInjectedJSON(window.__JINJA_EXPENSE_LABELS__, []), "expense_labels"),
    expenseValues: getData(parseInjectedJSON(window.__JINJA_EXPENSE_VALUES__, []), "expense_values"),
    insights: parseInjectedJSON(window.__JINJA_INSIGHTS__, localData.insights || []),
  };
  const avgAmount = data.amounts?.length ? data.amounts.reduce((a,b)=>a+b,0)/data.amounts.length : 0;
  const stdAmount = data.amounts?.length ? Math.sqrt(data.amounts.map(v => Math.pow(v-avgAmount,2)).reduce((a,b)=>a+b,0)/Math.max(1,data.amounts.length-1)) : 0;
  const anomalyThreshold = avgAmount + (2 * stdAmount);

  if (isStaticMode && localData.total !== undefined) {
    document.getElementById("kpiTotal").textContent = `R ${localData.total}`;
    document.getElementById("kpiAvg").textContent = `R ${localData.average}`;
    document.getElementById("kpiPrediction").textContent = `R ${localData.prediction}`;
    document.getElementById("kpiAnomalies").textContent = `${localData.anomalies}`;
  }

  const insightsList = document.getElementById("insightsList");
  if (insightsList && data.insights.length) {
    insightsList.innerHTML = "";
    data.insights.forEach((ins) => {
      const li = document.createElement("li");
      li.textContent = ins;
      insightsList.appendChild(li);
    });
  }

  const axis = {
    ticks: { color: "#9fb3ff" },
    grid: { color: "rgba(159,179,255,0.14)" },
  };

  const moneyLabel = (value) => `R ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", axis: "xy", intersect: false },
    plugins: {
      legend: { labels: { color: "#dbeafe" } },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label || "Value"}: ${moneyLabel(ctx.parsed?.y ?? ctx.parsed)}`,
        },
      },
    },
    scales: { x: axis, y: axis },
    animation: { duration: 1300 },
  };

  if (window.Chart) {
    new Chart(document.getElementById("trendChart"), {
      type: "line",
      data: { labels: data.months, datasets: [{ label: "Trend", data: data.monthly, borderColor: "#6ea8ff", backgroundColor: "rgba(110,168,255,.2)", fill: true, tension: 0.35, pointRadius: 5, pointHoverRadius: 8, hitRadius: 20, pointBackgroundColor: data.monthly.map(v => v > anomalyThreshold ? "#ff6287" : "#8a6dff") }] },
      options,
    });
    new Chart(document.getElementById("categoryChart"), {
      type: "doughnut",
      data: { labels: data.categories, datasets: [{ data: data.categoryTotals, backgroundColor: ["#3158da", "#17c084", "#f59e0b", "#f43f5e", "#00a5ff", "#7c3aed"] }] },
      options: { responsive: true, maintainAspectRatio: false, animation: { duration: 900 } },
    });
    new Chart(document.getElementById("monthlyBarChart"), { type: "bar", data: { labels: data.months, datasets: [{ label: "Monthly", data: data.monthly, backgroundColor: "#3259dc" }] }, options });
    new Chart(document.getElementById("scatterChart"), { type: "scatter", data: { datasets: [{ label: "Transactions", data: data.amounts.map((v, i) => ({ x: i + 1, y: v })), pointRadius: 5, pointHoverRadius: 8, hitRadius: 20, backgroundColor: data.amounts.map(v => v > anomalyThreshold ? "#ff6287" : "#4ea2ff") }] }, options });
    new Chart(document.getElementById("cumulativeChart"), { type: "line", data: { labels: data.dates, datasets: [{ label: "Cumulative", data: data.cumulative, borderColor: "#22c55e" }] }, options });
    new Chart(document.getElementById("rollingChart"), { type: "line", data: { labels: data.dates, datasets: [{ label: "Rolling", data: data.rolling, borderColor: "#00b7ff", borderDash: [6, 3] }] }, options });
    new Chart(document.getElementById("velocityChart"), { type: "line", data: { labels: data.dates, datasets: [{ label: "Velocity", data: data.velocity, borderColor: "#f59e0b" }] }, options });
    new Chart(document.getElementById("volatilityChart"), { type: "radar", data: { labels: data.volLabels, datasets: [{ label: "Volatility", data: data.volValues, borderColor: "#7c3aed", backgroundColor: "rgba(124,58,237,.2)" }] }, options: { responsive: true, maintainAspectRatio: false } });
    new Chart(document.getElementById("expenseTypeChart"), { type: "doughnut", data: { labels: data.expenseLabels, datasets: [{ data: data.expenseValues, backgroundColor: ["#355adf", "#22c55e"] }] }, options: { responsive: true, maintainAspectRatio: false } });
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("visible"));
  }, { threshold: 0.15 });
  document.querySelectorAll(".kpi,.chart").forEach((el) => observer.observe(el));


  const dashboard = document.querySelector(".dashboard");
  const backdrop = document.createElement("div");
  backdrop.className = "chart-focus-backdrop";
  document.body.appendChild(backdrop);

  function clearFocus() {
    dashboard?.classList.remove("focus-mode");
    document.querySelectorAll(".chart.focused").forEach((c) => c.classList.remove("focused"));
    backdrop.classList.remove("active");
  }

  backdrop.addEventListener("click", clearFocus);

  document.querySelectorAll(".chart").forEach((chartCard) => {
    chartCard.addEventListener("click", (e) => {
      const isFocused = chartCard.classList.contains("focused");
      clearFocus();
      if (!isFocused) {
        dashboard?.classList.add("focus-mode");
        chartCard.classList.add("focused");
        backdrop.classList.add("active");
      }
      e.stopPropagation();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") clearFocus();
  });
  document.getElementById("saveAnalysisBtn")?.addEventListener("click", async () => {
    if (isStaticMode) {
      localStorage.setItem("ssDashboardData", JSON.stringify(localData));
      SS.toast("Analysis kept in browser storage.");
      return;
    }

    const profile = JSON.parse(localStorage.getItem("profile") || "{}");
    const payload = {
      email: profile.email || "",
      total: Number(document.getElementById("kpiTotal").textContent.replace(/[^\d.-]/g, "") || 0),
      average: Number(document.getElementById("kpiAvg").textContent.replace(/[^\d.-]/g, "") || 0),
      prediction: Number(document.getElementById("kpiPrediction").textContent.replace(/[^\d.-]/g, "") || 0),
      anomalies: Number(document.getElementById("kpiAnomalies").textContent || 0),
      strongest_category: localData.strongest_category || "General",
      payload: JSON.stringify(data),
    };

    SS.setLoading(true);
    const res = await fetch("/api/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);
    SS.setLoading(false);

    SS.toast(res && res.ok ? "Analysis saved." : "Could not save analysis.", res && res.ok ? "success" : "error");
  });
});
