document.addEventListener("DOMContentLoaded", () => {
  const isStaticMode = window.location.pathname.includes("/templates/") || window.location.port === "5500";
  const authOverlay = document.getElementById("authOverlay");
  const authForm = document.getElementById("authForm");
  const authClose = document.getElementById("authClose");
  const authSwitchLink = document.getElementById("authSwitchLink");
  const authSwitchText = document.getElementById("authSwitchText");
  const authTitle = document.getElementById("authTitle");
  const authContinueBtn = document.getElementById("authContinueBtn");
  const googleAuthBtn = document.getElementById("googleAuthBtn");
  const authName = document.getElementById("authName");
  const authEmail = document.getElementById("authEmail");
  const signinBtn = document.getElementById("signinBtn");
  const uploadForm = document.getElementById("uploadForm");
  const fileInput = document.getElementById("fileInput");
  const profileLink = document.getElementById("profileLink");
  const learnMoreBtn = document.getElementById("learnMoreBtn");

  const contactForm = document.getElementById("contactForm");
  const contactEmail = document.getElementById("contactEmail");
  const contactSubject = document.getElementById("contactSubject");
  const contactMessage = document.getElementById("contactMessage");

  if (profileLink) profileLink.href = isStaticMode ? "/templates/profile.html" : "/profile";

  let registerMode = false;
  const isLoggedIn = () => localStorage.getItem("loggedIn") === "true";
  const openAuth = () => authOverlay.classList.remove("hidden");

  signinBtn?.addEventListener("click", openAuth);
  authClose?.addEventListener("click", () => authOverlay.classList.add("hidden"));
  learnMoreBtn?.addEventListener("click", () => document.getElementById("features").scrollIntoView({ behavior: "smooth" }));

  authSwitchLink?.addEventListener("click", (e) => {
    e.preventDefault();
    registerMode = !registerMode;
    authTitle.textContent = registerMode ? "Register" : "Sign In";
    authName.classList.toggle("hidden", !registerMode);
    authContinueBtn.textContent = registerMode ? "Register" : "Continue";
    googleAuthBtn.innerHTML = `<i class="fa-brands fa-google"></i> ${registerMode ? "Register with Google" : "Sign In with Google"}`;
    authSwitchText.textContent = registerMode ? "Already have an account?" : "Don’t have an account?";
    authSwitchLink.textContent = registerMode ? "Sign In" : "Register";
  });


  googleAuthBtn?.addEventListener("click", () => {
    SS.toast(registerMode ? "Google register is coming soon." : "Google sign in is coming soon.", "success");
  });

  authForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const enteredName = authName.value.trim();
    const email = authEmail.value.trim().toLowerCase();
    const profile = {
      name: enteredName || "User",
      email,
      occupation: "",
      theme: localStorage.getItem("ssTheme") || "dark",
    };

    if (!profile.email) {
      SS.toast("Please enter your email.", "error");
      return;
    }

    if (!isStaticMode) {
      SS.setLoading(true);
      const existing = await fetch(`/api/profile?email=${encodeURIComponent(email)}`).then((r) => r.json()).catch(() => null);
      if (existing?.profile) {
        profile.name = enteredName || existing.profile.name || "User";
        profile.occupation = existing.profile.occupation || "";
        profile.avatar = existing.profile.avatar || profile.avatar;
      }

      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      }).catch(() => null);
      SS.setLoading(false);
    }

    localStorage.setItem("profile", JSON.stringify(profile));
    localStorage.setItem("loggedIn", "true");
    authOverlay.classList.add("hidden");
    SS.toast("Welcome to SmartSpend AI.");
    setTimeout(() => window.location.reload(), 300);
  });

  document.querySelectorAll(".requires-auth").forEach((node) => {
    node.addEventListener("click", (e) => {
      if (!isLoggedIn()) {
        e.preventDefault();
        openAuth();
      }
    });
  });

  fileInput?.addEventListener("click", (e) => {
    if (!isLoggedIn()) {
      e.preventDefault();
      openAuth();
    }
  });

  function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((v) => v.trim().toLowerCase());
    const dateIdx = headers.findIndex((h) => h.includes("date") || h.includes("time"));
    const amountIdx = headers.findIndex((h) => h.includes("amount") || h.includes("price") || h.includes("cost") || h.includes("value"));
    const catIdx = headers.findIndex((h) => h.includes("category") || h.includes("type") || h.includes("group"));

    if (dateIdx < 0 || amountIdx < 0) return [];

    return lines.slice(1).map((line) => {
      const cols = line.split(",");
      return {
        date: (cols[dateIdx] || "").trim(),
        amount: Number(cols[amountIdx]),
        category: (catIdx >= 0 ? cols[catIdx] : "General")?.trim() || "General",
      };
    }).filter((r) => r.date && Number.isFinite(r.amount));
  }

  function computeClientAnalytics(rows) {
    const sorted = rows.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (!sorted.length) return null;

    const total = sorted.reduce((sum, r) => sum + Math.max(0, r.amount), 0);
    const average = total / sorted.length;

    const categoryMap = {};
    for (const row of sorted) {
      const k = row.category || "General";
      categoryMap[k] = (categoryMap[k] || 0) + row.amount;
    }

    const dates = sorted.map((r) => r.date);
    let running = 0;
    const cumulative = sorted.map((r) => Number((running += r.amount).toFixed(2)));
    const rolling = sorted.map((_, i) => {
      const slice = sorted.slice(Math.max(0, i - 3), i + 1);
      return Number((slice.reduce((s, it) => s + it.amount, 0) / slice.length).toFixed(2));
    });
    const velocity = sorted.map((r, i) => (i === 0 ? 0 : Number((r.amount - sorted[i - 1].amount).toFixed(2))));

    const monthMap = {};
    for (const row of sorted) {
      const key = new Date(`${row.date}T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      monthMap[key] = (monthMap[key] || 0) + row.amount;
    }

    const months = Object.keys(monthMap);
    const monthly = months.map((m) => Number(monthMap[m].toFixed(2)));
    const categories = Object.keys(categoryMap);
    const category_totals = categories.map((c) => Number(categoryMap[c].toFixed(2)));

    return {
      total: Number(total.toFixed(2)),
      average: Number(average.toFixed(2)),
      prediction: monthly.at(-1) || 0,
      anomalies: 0,
      strongest_category: categories.sort((a, b) => categoryMap[b] - categoryMap[a])[0] || "General",
      insights: [
        "Client-side preview mode enabled.",
        `Total spend R ${total.toFixed(2)} from ${sorted.length} rows.`,
      ],
      months,
      monthly,
      categories,
      category_totals,
      amounts: sorted.map((r) => r.amount),
      dates,
      cumulative,
      rolling,
      velocity,
      volatility_labels: categories,
      volatility_values: categories.map(() => 0),
      expense_labels: ["Variable"],
      expense_values: [Number(total.toFixed(2))],
    };
  }



  contactForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = contactEmail?.value?.trim();
    const subject = contactSubject?.value?.trim();
    const message = contactMessage?.value?.trim();

    if (!email || !subject || !message) {
      SS.toast("Please complete all contact fields.", "error");
      return;
    }

    const mailto = `mailto:?subject=${encodeURIComponent(subject + " | From: " + email)}&body=${encodeURIComponent(message)}`;
    window.location.href = mailto;
    SS.toast("Opening your email app now.");
    contactForm.reset();
  });

  uploadForm?.addEventListener("submit", async (e) => {
    if (!isLoggedIn()) {
      e.preventDefault();
      openAuth();
      return;
    }

    if (!isStaticMode) {
      SS.setLoading(true);
      return;
    }

    e.preventDefault();
    const file = fileInput.files?.[0];
    if (!file) {
      SS.toast("Please choose a CSV file.", "error");
      return;
    }

    SS.setLoading(true);
    const text = await file.text();
    const rows = parseCsv(text);
    const payload = computeClientAnalytics(rows);
    SS.setLoading(false);

    if (!payload) {
      SS.toast("CSV missing required columns: date/time + amount.", "error");
      return;
    }

    localStorage.setItem("ssDashboardData", JSON.stringify(payload));
    SS.toast("CSV analyzed locally. Opening dashboard preview.");
    setTimeout(() => {
      window.location.href = "/templates/dashboard.html";
    }, 250);
  });
});
