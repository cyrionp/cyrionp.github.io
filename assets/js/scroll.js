const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;
const topbar = document.querySelector(".topbar");
const hero = document.querySelector(".hero");
const navLinks = [...document.querySelectorAll(".topnav a")];
const sections = navLinks.map((a) => document.querySelector(a.getAttribute("href")));
const timeline = document.querySelector(".timeline");
const marquees = [...document.querySelectorAll(".marquee")];

// About text: split into words that light up as the section scrolls by
const lede = document.querySelector("[data-words]");
const words = lede.textContent.trim().split(/\s+/);
lede.setAttribute("aria-label", lede.textContent.trim());
const wordEls = words.map((w) => {
	const span = document.createElement("span");
	span.className = "w";
	span.setAttribute("aria-hidden", "true");
	span.textContent = w;
	return span;
});
lede.replaceChildren(...wordEls.flatMap((w) => [w, " "]));

// Skills: repeat each row so it never runs out while drifting
for (const m of marquees) {
	const list = m.querySelector(".chips");
	const items = [...list.children];
	for (let i = 0; i < 3; i++) {
		for (const li of items) {
			const copy = li.cloneNode(true);
			copy.setAttribute("aria-hidden", "true");
			list.append(copy);
		}
	}
}

// Fade/slide items in once they enter the viewport
const revealer = new IntersectionObserver(
	(entries) => {
		for (const e of entries) {
			if (e.isIntersecting) {
				e.target.classList.add("is-in");
				revealer.unobserve(e.target);
			}
		}
	},
	{ rootMargin: "0px 0px -12% 0px" }
);
for (const el of document.querySelectorAll(".reveal")) {
	const siblings = [...el.parentElement.querySelectorAll(":scope > .reveal")];
	el.style.setProperty("--delay", `${siblings.indexOf(el) * 0.12}s`);
	revealer.observe(el);
}

// 0 when the element's top hits the bottom of the viewport, 1 when it reaches `end` (fraction of viewport height)
function progress(el, end = 0.35) {
	const r = el.getBoundingClientRect();
	const vh = innerHeight;
	return Math.min(Math.max((vh - r.top) / (vh * (1 - end) + r.height * 0.5), 0), 1);
}

let ticking = false;
function update() {
	ticking = false;
	const max = root.scrollHeight - innerHeight;
	topbar.style.setProperty("--progress", max > 0 ? (scrollY / max).toFixed(4) : 0);
	topbar.classList.toggle("is-visible", scrollY > hero.offsetHeight * 0.6);

	// Active section: the last one whose top passed the middle of the screen
	let active = -1;
	sections.forEach((s, i) => {
		if (s.getBoundingClientRect().top < innerHeight * 0.5) active = i;
	});
	navLinks.forEach((a, i) => a.classList.toggle("is-active", i === active));

	if (reduceMotion) return;

	const lit = Math.round(progress(lede) * wordEls.length);
	wordEls.forEach((w, i) => w.classList.toggle("is-lit", i < lit));

	timeline.style.setProperty("--p", progress(timeline, 0.5).toFixed(4));

	for (const m of marquees) {
		const p = progress(m, 0);
		const dir = Number(m.dataset.dir);
		m.querySelector(".chips").style.setProperty("--shift", `${(dir > 0 ? -p : p - 1) * 25}%`);
	}
}

// Keep the active nav pill visible inside the (scrollable) mobile nav
let lastActive = null;
const nav = document.querySelector(".topnav");
function followActive() {
	const a = nav.querySelector(".is-active");
	if (a && a !== lastActive) {
		lastActive = a;
		nav.scrollTo({ left: a.offsetLeft - nav.clientWidth / 2 + a.offsetWidth / 2, behavior: reduceMotion ? "auto" : "smooth" });
	}
}

function onScroll() {
	if (!ticking) {
		ticking = true;
		requestAnimationFrame(() => {
			update();
			followActive();
		});
	}
}

if (reduceMotion) wordEls.forEach((w) => w.classList.add("is-lit"));
addEventListener("scroll", onScroll, { passive: true });
addEventListener("resize", onScroll);
update();
