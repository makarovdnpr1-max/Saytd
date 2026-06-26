const topbar = document.getElementById("topbar");
const menuToggle = document.getElementById("menu-toggle");
const topnav = document.getElementById("topnav");
const workflowItems = document.querySelectorAll(".workflow-item");
const heroSection = document.getElementById("hero");
const reportForm = document.getElementById("report-form");
const reportPoint = document.getElementById("report-point");
const reportWave = document.getElementById("report-wave");
const statusToast = document.getElementById("status-toast");
const statusId = document.getElementById("status-id");
const submitButton = document.getElementById("submit-button");
const hudScreen = document.querySelector(".hud-screen");

const updateTopbar = () => {
  if (!topbar) {
    return;
  }

  topbar.classList.toggle("is-compact", window.scrollY > 18);
};

if (menuToggle && topnav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = topnav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  topnav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      topnav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const workflowObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      workflowObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.2 }
);

workflowItems.forEach((item) => workflowObserver.observe(item));

if (heroSection) {
  const resetHeroSpotlight = () => {
    heroSection.style.setProperty("--spot-x", "74");
    heroSection.style.setProperty("--spot-y", "38");
  };

  heroSection.addEventListener("pointermove", (event) => {
    const rect = heroSection.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    heroSection.style.setProperty("--spot-x", x.toFixed(2));
    heroSection.style.setProperty("--spot-y", y.toFixed(2));
  });

  heroSection.addEventListener("pointerleave", resetHeroSpotlight);
  resetHeroSpotlight();
}

const buildTicketId = () => {
  const serial = String(10000 + Math.floor(Math.random() * 89999));
  return `ID: DM-2027-${serial}`;
};

if (reportForm && reportPoint && reportWave && statusToast && statusId && submitButton) {
  const storageKey = "dm-map-problems";
  const safeMapPositions = [
    { left: 39, top: 47, alignRight: false },
    { left: 51, top: 51, alignRight: false },
    { left: 58, top: 34, alignRight: true },
    { left: 45, top: 67, alignRight: false },
    { left: 62, top: 58, alignRight: true },
  ];
  const readStoredProblems = () => {
    try {
      return JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    } catch {
      return [];
    }
  };
  const storedProblems = readStoredProblems();
  let nextMapPosition = storedProblems.length;

  const addProblemToMap = (issue, ticketId, positionIndex = nextMapPosition) => {
    if (!hudScreen) {
      return;
    }

    const position = safeMapPositions[positionIndex % safeMapPositions.length];

    const problem = document.createElement("div");
    problem.className = "hud-problem hud-problem-user";
    if (position.alignRight) {
      problem.classList.add("is-right-aligned");
    }
    problem.style.left = `${position.left}%`;
    problem.style.top = `${position.top}%`;

    const point = document.createElement("span");
    point.className = "hud-point";

    const label = document.createElement("div");
    label.className = "hud-problem-label";

    const title = document.createElement("strong");
    title.textContent = issue.length > 42 ? `${issue.slice(0, 39)}...` : issue;

    const status = document.createElement("span");
    const statusDot = document.createElement("i");
    statusDot.className = "legend-dot legend-dot-new";
    status.append(statusDot, "Новая проблема");

    const id = document.createElement("small");
    id.className = "problem-id";
    id.textContent = ticketId;

    label.append(title, status, id);
    problem.append(point, label);
    hudScreen.append(problem);
  };

  storedProblems.forEach((problem, index) => {
    addProblemToMap(problem.issue, problem.ticketId, problem.positionIndex ?? index);
  });

  reportForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = new FormData(reportForm);
    const issue = String(data.get("issue") || "").trim();
    const location = String(data.get("location") || "").trim();

    if (!issue) {
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Отправляем...";

    window.setTimeout(() => {
      const ticketId = buildTicketId();
      const positionIndex = nextMapPosition;
      nextMapPosition += 1;
      statusId.textContent = ticketId;
      reportWave.classList.remove("is-visible");
      void reportWave.offsetWidth;
      reportWave.classList.add("is-visible");
      addProblemToMap(issue, ticketId, positionIndex);
      storedProblems.push({ issue, ticketId, positionIndex });
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(storedProblems.slice(-5)));
      } catch {
        // The live map still works when browser storage is unavailable.
      }
      statusToast.classList.add("is-visible");

      reportForm.reset();
      submitButton.disabled = false;
      submitButton.textContent = "Отправить";
    }, 850);
  });
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!prefersReducedMotion) {
  let targetScroll = window.scrollY;
  let smoothScrollFrame = 0;

  const clampScroll = (value) => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    return Math.max(0, Math.min(maxScroll, value));
  };

  const animateScroll = () => {
    const distance = targetScroll - window.scrollY;

    if (Math.abs(distance) < 0.8) {
      window.scrollTo(0, targetScroll);
      smoothScrollFrame = 0;
      return;
    }

    window.scrollTo(0, window.scrollY + distance * 0.22);
    smoothScrollFrame = window.requestAnimationFrame(animateScroll);
  };

  document.addEventListener(
    "wheel",
    (event) => {
      const interactive = event.target.closest("video, textarea, input, select, button");
      if (interactive || event.ctrlKey) {
        return;
      }

      event.preventDefault();

      const delta = event.deltaMode === 1 ? event.deltaY * 18 : event.deltaY;
      targetScroll = clampScroll(targetScroll + delta * 0.82);

      if (!smoothScrollFrame) {
        smoothScrollFrame = window.requestAnimationFrame(animateScroll);
      }
    },
    { passive: false }
  );

  window.addEventListener(
    "scroll",
    () => {
      if (!smoothScrollFrame) {
        targetScroll = window.scrollY;
      }
    },
    { passive: true }
  );

  window.addEventListener("hashchange", () => {
    window.requestAnimationFrame(() => {
      targetScroll = window.scrollY;
    });
  });
}

updateTopbar();
window.addEventListener("scroll", updateTopbar, { passive: true });
