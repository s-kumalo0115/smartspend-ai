(function () {
  const THEME_KEY = "ssTheme";

  function setTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || "dark";
    setTheme(saved);
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const current = document.body.getAttribute("data-theme") || "dark";
        const next = current === "dark" ? "light" : "dark";
        setTheme(next);
      });
    });
  }

  function toast(message, type = "success") {
    let wrap = document.querySelector(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    const node = document.createElement("div");
    node.className = `toast ${type}`;
    node.textContent = message;
    wrap.appendChild(node);
    requestAnimationFrame(() => node.classList.add("show"));
    setTimeout(() => {
      node.classList.remove("show");
      setTimeout(() => node.remove(), 260);
    }, 2500);
  }

  function setLoading(active) {
    let overlay = document.getElementById("loadingOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "loadingOverlay";
      overlay.className = "loading-overlay";
      overlay.innerHTML = '<div class="loader" aria-label="Loading"></div>';
      document.body.appendChild(overlay);
    }
    overlay.classList.toggle("active", active);
  }

  function initReveals() {
    const revealNodes = Array.from(document.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-up, .reveal-down"));
    revealNodes.forEach((node, i) => {
      node.style.transitionDelay = `${Math.min(i * 90, 900)}ms`;
    });

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("in-view")),
      { threshold: 0.15 }
    );

    revealNodes.forEach((node) => observer.observe(node));
  }

  function initRipple() {
    document.querySelectorAll(".btn, .signin-btn, .sample-download-btn, .home-btn, .auth-submit, #profile-submit").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const rect = btn.getBoundingClientRect();
        btn.style.setProperty("--rx", `${e.clientX - rect.left}px`);
        btn.style.setProperty("--ry", `${e.clientY - rect.top}px`);
        btn.classList.remove("ripple");
        void btn.offsetWidth;
        btn.classList.add("ripple");
      });
    });
  }

  function initAuthShell() {
    const signinBtn = document.getElementById("signinBtn");
    const profileWrapper = document.getElementById("profileWrapper");
    const profileToggle = document.getElementById("profileToggle");
    const profileDropdown = document.getElementById("profileDropdown");
    const logoutBtn = document.getElementById("logoutBtn");
    const navName = document.getElementById("navName");
    const avatarPreview = document.getElementById("avatarPreview");

    const profile = JSON.parse(localStorage.getItem("profile") || "{}");
    const loggedIn = localStorage.getItem("loggedIn") === "true";

    if (signinBtn) signinBtn.classList.toggle("hidden", loggedIn);
    if (profileWrapper) profileWrapper.classList.toggle("hidden", !loggedIn);
    if (navName) navName.textContent = profile.name ? profile.name.split(" ")[0] : "User";
    if (avatarPreview) avatarPreview.src = profile.avatar || "/static/images/anonymous-avatar.svg";

    if (profileToggle && profileDropdown) {
      const toggleDropdown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        profileDropdown.classList.toggle("hidden");
      };
      profileToggle.addEventListener("pointerup", toggleDropdown);
      profileToggle.addEventListener("click", (e) => e.preventDefault());
      document.addEventListener("click", () => profileDropdown.classList.add("hidden"));
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("loggedIn");
        localStorage.removeItem("profile");
        localStorage.removeItem("ssDashboardData");
        toast("Signed out.", "success");
        setTimeout(() => {
          window.location.href = window.location.pathname.includes("/templates/") ? "/templates/index.html" : "/";
        }, 280);
      });
    }
  }

  window.SS = { toast, setLoading };

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initRipple();
    initReveals();
    initAuthShell();
  });
})();
