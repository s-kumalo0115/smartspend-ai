document.addEventListener("DOMContentLoaded", () => {
    const signinBtn = document.getElementById("signinBtn");
    const profileWrapper = document.getElementById("profileWrapper");
    const profileToggle = document.getElementById("profileToggle");
    const profileDropdown = document.getElementById("profileDropdown");
    const logoutBtn = document.getElementById("logoutBtn");

function refreshAuthUI() {
    const loggedIn = localStorage.getItem("loggedIn") === "true";

    if (signinBtn) signinBtn.classList.toggle("hidden", loggedIn);
    if (profileWrapper) profileWrapper.classList.toggle("hidden", !loggedIn);

    if (loggedIn) {
        const profile = JSON.parse(localStorage.getItem("profile")) || {};

        /* ---- Name (first name only) ---- */
        const navName = document.getElementById("navName");
        if (navName) {
            navName.textContent = profile.name
                ? profile.name.split(" ")[0]
                : "User";
        }

        /* ---- Avatar ---- */
        if (profile.avatar && profileToggle) {
            const img = profileToggle.querySelector("img");
            if (img) img.src = profile.avatar;
        }
    }

    /* Always close dropdown when state changes */
    if (profileDropdown) profileDropdown.classList.add("hidden");
}


    if (profileToggle && profileDropdown) {
        profileToggle.addEventListener("click", e => {
            e.stopPropagation();
            profileDropdown.classList.toggle("hidden");
        });

        document.addEventListener("click", () => {
            profileDropdown.classList.add("hidden");
        });
    }

    if (logoutBtn) {
   logoutBtn.addEventListener("click", e => {
    e.preventDefault();

    // Clear auth state
    localStorage.removeItem("loggedIn");

    // Optional but recommended
    localStorage.removeItem("profile");

    // Redirect to index (home / landing)
    window.location.href = "/";
});

    }

    refreshAuthUI();
});
