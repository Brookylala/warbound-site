(function () {
    "use strict";

    document.documentElement.classList.add("js");

    const config = typeof SITE_CONFIG !== "undefined" ? SITE_CONFIG : {};
    const toast = document.querySelector(".toast");
    let toastTimer;

    function showToast(message) {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add("show");
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () {
            toast.classList.remove("show");
        }, 2600);
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function applyConfigText() {
        document.querySelectorAll("[data-config-text]").forEach(function (element) {
            const key = element.dataset.configText;
            if (Object.prototype.hasOwnProperty.call(config, key)) {
                element.textContent = config[key];
            }
        });
    }

    function applyConfigLinks() {
        document.querySelectorAll("[data-config-url]").forEach(function (link) {
            const key = link.dataset.configUrl;
            link.setAttribute("href", config[key] || "#");
        });
    }

    function setStatusState(state, message) {
        document.querySelectorAll("[data-status-dot]").forEach(function (dot) {
            dot.classList.toggle("is-loading", state === "loading");
            dot.classList.toggle("is-offline", state === "offline");
        });

        document.querySelectorAll("[data-status-text]").forEach(function (label) {
            label.textContent = message;
        });
    }

    function setStatusValue(selector, value) {
        document.querySelectorAll(selector).forEach(function (element) {
            element.textContent = value;
        });
    }

    function updatePlayerMeter(current, max) {
        const safeCurrent = Number(current);
        const safeMax = Number(max);
        const percentage = safeMax > 0 && Number.isFinite(safeCurrent)
            ? Math.min(100, Math.max(0, (safeCurrent / safeMax) * 100))
            : 0;

        document.querySelectorAll("[data-player-meter]").forEach(function (meter) {
            meter.style.width = percentage + "%";
        });
    }

    function useConfiguredStatus(message) {
        const current = Number.isFinite(Number(config.currentPlayers)) ? Number(config.currentPlayers) : 0;
        const max = Number.isFinite(Number(config.maxPlayers)) ? Number(config.maxPlayers) : 0;
        setStatusState("online", message || "Online");
        setStatusValue("[data-status-current]", current.toLocaleString());
        setStatusValue("[data-status-max]", max.toLocaleString());
        setStatusValue("[data-status-version]", config.serverVersion || "Java Edition");
        updatePlayerMeter(current, max);
    }

    function fetchServerStatus() {
        if (!window.fetch || !config.serverIp || !config.statusApiBaseUrl) {
            useConfiguredStatus("Online");
            return;
        }

        const endpoint = config.statusApiBaseUrl + encodeURIComponent(config.serverIp);
        const controller = "AbortController" in window ? new AbortController() : null;
        const timeout = controller ? window.setTimeout(function () { controller.abort(); }, 5000) : null;

        setStatusState("loading", "Checking server...");

        fetch(endpoint, {
            cache: "no-store",
            signal: controller ? controller.signal : undefined
        })
            .then(function (response) {
                if (!response.ok) throw new Error("Status request failed");
                return response.json();
            })
            .then(function (status) {
                if (!status.online) {
                    setStatusState("offline", "Offline");
                    setStatusValue("[data-status-current]", "0");
                    setStatusValue("[data-status-max]", formatNumber(config.maxPlayers));
                    setStatusValue("[data-status-version]", config.serverVersion || "Java Edition");
                    updatePlayerMeter(0, config.maxPlayers);
                    return;
                }

                const current = status.players && typeof status.players.online === "number"
                    ? status.players.online
                    : config.currentPlayers;
                const max = status.players && typeof status.players.max === "number"
                    ? status.players.max
                    : config.maxPlayers;
                const version = status.version && status.version.name_clean
                    ? status.version.name_clean
                    : config.serverVersion;

                setStatusState("online", "Online");
                setStatusValue("[data-status-current]", formatNumber(current));
                setStatusValue("[data-status-max]", formatNumber(max));
                setStatusValue("[data-status-version]", version || "Java Edition");
                updatePlayerMeter(current, max);
            })
            .catch(function () {
                useConfiguredStatus("Online");
            })
            .finally(function () {
                if (timeout) window.clearTimeout(timeout);
            });
    }

    function formatNumber(value) {
        return typeof value === "number" || !Number.isNaN(Number(value))
            ? Number(value).toLocaleString()
            : "—";
    }

    function copyServerIp() {
        const ip = config.serverIp;
        if (!ip) {
            showToast("Server IP has not been configured.");
            return;
        }

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(ip)
                .then(function () { showToast("Copied server IP: " + ip); })
                .catch(function () { fallbackCopy(ip); });
            return;
        }
        fallbackCopy(ip);
    }

    function fallbackCopy(value) {
        const input = document.createElement("textarea");
        input.value = value;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.left = "-9999px";
        document.body.appendChild(input);
        input.select();

        try {
            document.execCommand("copy");
            showToast("Copied server IP: " + value);
        } catch (error) {
            showToast("Server IP: " + value);
        } finally {
            input.remove();
        }
    }

    function setupCopyButtons() {
        document.querySelectorAll(".copy-ip").forEach(function (button) {
            button.addEventListener("click", copyServerIp);
        });
    }

    function setupMobileNav() {
        const toggle = document.querySelector(".nav-toggle");
        const menu = document.querySelector(".nav-menu");
        if (!toggle || !menu) return;

        function setOpen(isOpen) {
            toggle.setAttribute("aria-expanded", String(isOpen));
            menu.classList.toggle("open", isOpen);
            document.body.classList.toggle("nav-open", isOpen);
        }

        toggle.addEventListener("click", function () {
            setOpen(toggle.getAttribute("aria-expanded") !== "true");
        });

        menu.addEventListener("click", function (event) {
            if (event.target.closest("a, button")) setOpen(false);
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") setOpen(false);
        });

        window.addEventListener("resize", function () {
            if (window.innerWidth > 1180) setOpen(false);
        });
    }

    function setupSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(function (link) {
            link.addEventListener("click", function (event) {
                const href = link.getAttribute("href");
                if (!href || href === "#") return;
                const target = document.querySelector(href);
                if (!target) return;
                event.preventDefault();
                target.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });
    }

    function setupUnconfiguredLinks() {
        document.querySelectorAll(".config-link").forEach(function (link) {
            link.addEventListener("click", function (event) {
                const href = link.getAttribute("href");
                if (!href || href === "#") {
                    event.preventDefault();
                    showToast("This link has not been configured yet.");
                }
            });
        });
    }

    function setupHeaderState() {
        const header = document.querySelector(".site-header");
        if (!header) return;
        function update() {
            header.classList.toggle("scrolled", window.scrollY > 18);
        }
        update();
        window.addEventListener("scroll", update, { passive: true });
    }

    function setupActiveNavigation() {
        const links = Array.from(document.querySelectorAll('.nav-link[href^="#"]'))
            .filter(function (link) { return link.getAttribute("href") !== "#"; });
        const sections = links.map(function (link) {
            return document.querySelector(link.getAttribute("href"));
        }).filter(Boolean);

        if (!sections.length || !("IntersectionObserver" in window)) return;

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                const id = "#" + entry.target.id;
                links.forEach(function (link) {
                    link.classList.toggle("active", link.getAttribute("href") === id);
                });
            });
        }, { rootMargin: "-35% 0px -55% 0px", threshold: 0 });

        sections.forEach(function (section) { observer.observe(section); });
    }

    function setupImageFallbacks() {
        document.querySelectorAll(".site-logo img").forEach(function (image) {
            const logo = image.closest(".site-logo");
            function success() { if (logo) logo.classList.add("has-image"); }
            function failure() {
                if (logo) logo.classList.remove("has-image");
                image.hidden = true;
            }

            if (image.complete) {
                image.naturalWidth > 0 ? success() : failure();
            } else {
                image.addEventListener("load", success, { once: true });
                image.addEventListener("error", failure, { once: true });
            }
        });

        document.querySelectorAll("[data-hero-image]").forEach(function (hero) {
            const source = hero.dataset.heroImage;
            if (!source) return;
            const image = new Image();
            image.onload = function () {
                hero.classList.add("has-image");
                hero.style.backgroundImage = "url('" + source.replace(/'/g, "%27") + "')";
            };
            image.onerror = function () {
                hero.classList.remove("has-image");
                hero.style.backgroundImage = "";
            };
            image.src = source;
        });
    }

    function renderNews() {
        const list = document.getElementById("news-list");
        if (!list || !Array.isArray(config.news)) return;

        list.innerHTML = config.news.map(function (item, index) {
            const url = item.url || "#";
            const extraClass = url === "#" ? " config-link" : "";
            return '<a class="news-card reveal' + extraClass + '" href="' + escapeHtml(url) + '">' +
                '<span class="news-thumb" aria-hidden="true"></span>' +
                '<span><span class="news-meta"><span class="news-tag">' + escapeHtml(item.tag || "News") + '</span><span>' + escapeHtml(item.date || "") + '</span></span>' +
                '<h3>' + escapeHtml(item.title || "Warbound update") + '</h3>' +
                '<p>' + escapeHtml(item.excerpt || "") + '</p></span>' +
                '<span class="news-arrow" aria-hidden="true">→</span>' +
                '</a>';
        }).join("");
    }

    function renderVoteLinks() {
        const list = document.getElementById("vote-links");
        if (!list || !Array.isArray(config.voteLinks)) return;

        list.innerHTML = config.voteLinks.map(function (site, index) {
            const url = site.url || "#";
            const extraClass = url === "#" ? " config-link" : "";
            const number = String(index + 1).padStart(2, "0");
            return '<a class="vote-card' + extraClass + '" href="' + escapeHtml(url) + '">' +
                '<span class="vote-card-number">' + number + '</span>' +
                '<span class="vote-card-icon">✦</span>' +
                '<strong>' + escapeHtml(site.name || "Vote Site " + (index + 1)) + '</strong>' +
                '<small>Open voting page</small><span class="vote-arrow">→</span></a>';
        }).join("");
    }

    function setupRevealAnimations() {
        const items = document.querySelectorAll(".reveal");
        if (!items.length) return;

        if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            items.forEach(function (item) { item.classList.add("is-visible"); });
            return;
        }

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        items.forEach(function (item, index) {
            item.style.transitionDelay = Math.min(index % 4, 3) * 70 + "ms";
            observer.observe(item);
        });
    }

    function setCurrentYear() {
        document.querySelectorAll("#copyright-year").forEach(function (year) {
            year.textContent = new Date().getFullYear();
        });
    }

    function init() {
        applyConfigText();
        applyConfigLinks();
        renderNews();
        renderVoteLinks();
        setupImageFallbacks();
        setupCopyButtons();
        setupMobileNav();
        setupSmoothScrolling();
        setupUnconfiguredLinks();
        setupHeaderState();
        setupActiveNavigation();
        setupRevealAnimations();
        fetchServerStatus();
        setCurrentYear();
    }

    document.addEventListener("DOMContentLoaded", init);
}());
