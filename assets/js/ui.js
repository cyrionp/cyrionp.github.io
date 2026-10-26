const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const GLYPHS = "!#$%*+-=?/\\[]{}01";

// Split into user-perceived characters so ZWJ emoji are typed as one unit
const segmenter = "Segmenter" in Intl ? new Intl.Segmenter() : null;
const graphemes = (s) => (segmenter ? [...segmenter.segment(s)].map((g) => g.segment) : [...s]);

// Name: letters decode from random glyphs into place
function scramble(el) {
	const text = el.dataset.text;
	el.setAttribute("aria-label", text);
	if (reduceMotion) return;

	const start = performance.now();
	const frame = (now) => {
		const t = now - start;
		let html = "";
		let done = true;
		for (let i = 0; i < text.length; i++) {
			const ch = text[i];
			const settleAt = 250 + i * 55;
			if (ch === " " || t >= settleAt) {
				html += ch;
			} else {
				done = false;
				html += `<span class="glyph" aria-hidden="true">${GLYPHS[(Math.random() * GLYPHS.length) | 0]}</span>`;
			}
		}
		el.innerHTML = html;
		if (!done) requestAnimationFrame(frame);
	};
	requestAnimationFrame(frame);
}

// Roles: typewriter cycling through the list items
function typewriter(target, roles) {
	if (reduceMotion) {
		target.textContent = roles.join("  •  ");
		return;
	}

	let role = 0;
	let len = 0;
	let deleting = false;
	const tick = () => {
		const word = graphemes(roles[role]);
		len += deleting ? -1 : 1;
		target.textContent = word.slice(0, len).join("");

		let delay = deleting ? 28 : 65;
		if (!deleting && len === word.length) {
			deleting = true;
			delay = 1800;
		} else if (deleting && len === 0) {
			deleting = false;
			role = (role + 1) % roles.length;
			delay = 350;
		}
		setTimeout(tick, delay);
	};
	setTimeout(tick, 900);
}

// Links: magnetic pull toward the cursor (fine pointers only)
function magnetic(links) {
	if (reduceMotion || !matchMedia("(pointer: fine)").matches) return;

	for (const a of links) {
		a.addEventListener("pointermove", (e) => {
			const r = a.getBoundingClientRect();
			a.style.setProperty("--x", `${(e.clientX - r.left - r.width / 2) * 0.35}px`);
			a.style.setProperty("--y", `${(e.clientY - r.top - r.height / 2) * 0.35}px`);
		});
		a.addEventListener("pointerleave", () => {
			a.style.setProperty("--x", "0px");
			a.style.setProperty("--y", "0px");
		});
	}
}

// Project cards: tilt toward the cursor (fine pointers only)
function tilt(cards) {
	if (reduceMotion || !matchMedia("(pointer: fine)").matches) return;

	for (const card of cards) {
		card.addEventListener("pointermove", (e) => {
			const r = card.getBoundingClientRect();
			card.style.setProperty("--rx", `${((e.clientY - r.top) / r.height - 0.5) * -10}deg`);
			card.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 10}deg`);
		});
		card.addEventListener("pointerleave", () => {
			card.style.setProperty("--rx", "0deg");
			card.style.setProperty("--ry", "0deg");
		});
	}
}

scramble(document.querySelector(".name"));
typewriter(
	document.querySelector(".typed"),
	[...document.querySelectorAll(".roles li")].map((li) => li.textContent.trim())
);
magnetic(document.querySelectorAll(".links a"));
tilt(document.querySelectorAll(".project"));
