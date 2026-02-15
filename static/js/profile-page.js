document.addEventListener("DOMContentLoaded", () => {
  const isStaticMode = window.location.pathname.includes("/templates/") || window.location.port === "5500";
  const profile = JSON.parse(localStorage.getItem("profile") || "{}");

  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const occupationInput = document.getElementById("occupation");
  const avatarInput = document.getElementById("avatarInput");
  const avatarPreview = document.getElementById("avatarPreviewForm");
  const avatarPreviewNav = document.getElementById("avatarPreview");
  const summaryContent = document.getElementById("summaryContent");
  const profileForm = document.getElementById("profileForm");
  const closeBtn = document.getElementById("closeProfile");
  const defaultAvatar = "/static/images/anonymous-avatar.svg";

  function hydrate() {
    nameInput.value = profile.name || "";
    emailInput.value = profile.email || "";
    occupationInput.value = profile.occupation || "";
    avatarPreview.src = profile.avatar || defaultAvatar;
    if (avatarPreviewNav) avatarPreviewNav.src = profile.avatar || defaultAvatar;
    summaryContent.innerHTML = profile.email
      ? `<div>Name: ${profile.name || "-"}</div><div>Email: ${profile.email || "-"}</div><div>Occupation: ${profile.occupation || "-"}</div>`
      : "No profile saved yet.";
  }

  hydrate();

  if (profile.email && !isStaticMode) {
    fetch(`/api/profile?email=${encodeURIComponent(profile.email)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.profile) return;
        Object.assign(profile, d.profile);
        localStorage.setItem("profile", JSON.stringify(profile));
        hydrate();
      })
      .catch(() => null);
  }

  avatarInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      profile.avatar = reader.result;
      avatarPreview.src = reader.result;
      if (avatarPreviewNav) avatarPreviewNav.src = reader.result;
      localStorage.setItem("profile", JSON.stringify(profile));
    };
    reader.readAsDataURL(file);
  });

  profileForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    profile.name = nameInput.value.trim();
    profile.email = emailInput.value.trim().toLowerCase();
    profile.occupation = occupationInput.value.trim();
    profile.theme = localStorage.getItem("ssTheme") || "dark";

    localStorage.setItem("profile", JSON.stringify(profile));
    localStorage.setItem("loggedIn", "true");

    if (isStaticMode) {
      hydrate();
      SS.toast("Profile saved locally.");
      return;
    }

    SS.setLoading(true);
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    }).catch(() => null);
    SS.setLoading(false);

    hydrate();
    SS.toast(response && response.ok ? "Profile saved." : "Saved locally. Server sync failed.", response && response.ok ? "success" : "error");
  });

  closeBtn?.addEventListener("click", () => {
    window.location.href = isStaticMode ? "/templates/index.html" : "/";
  });
});
