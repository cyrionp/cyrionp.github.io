// Hidden terminal: press ` (or long-press the AD monogram on touch screens)
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const text = (el) => el?.textContent.replace(/\s+/g, " ").trim() ?? "";
const isTouch = matchMedia("(pointer: coarse)").matches;

// Everything the terminal prints is read from the page, so content lives in one place
const data = {
	about: () => $("[data-words]").getAttribute("aria-label") || text($("[data-words]")),
	jobs: () =>
		$$(".job").map((j) => ({
			date: text($(".job-date", j)),
			title: text($("h3", j)),
			org: text($(".job-org", j)),
			items: $$("li", j).map(text),
		})),
	projects: () =>
		$$(".project").map((p) => ({
			name: text($("h3", p)),
			lang: text($(".project-lang", p)),
			desc: text($("h3 + p", p)),
			url: p.href,
		})),
	skills: () => $$(".chips li:not([aria-hidden])").map(text),
	education: () =>
		$$(".education .card").map((c) => ({ date: text($(".job-date", c)), school: text($("h3", c)), degree: text($(".job-org", c)) })),
	links: () => $$(".contact .links a").map((a) => ({ label: a.getAttribute("aria-label"), url: a.href })),
	mail: () => $(".contact .mail").href,
};

const FILES = { "about.txt": "about", "experience.log": "experience", "projects/": "projects", "skills.json": "skills", "education.md": "education", "contact.vcf": "contact" };

// DOM
const root = document.createElement("div");
root.className = "term";
root.hidden = true;
root.innerHTML = `
	<div class="term-window" role="dialog" aria-modal="true" aria-label="Terminal">
		<div class="term-bar">
			<span class="term-dots" aria-hidden="true"><i></i><i></i><i></i></span>
			<span class="term-title">kadir@cyrionp: ~</span>
			<button class="term-close" type="button" aria-label="Close terminal">×</button>
		</div>
		<div class="term-out" aria-live="polite"></div>
		<form class="term-form">
			<label class="term-prompt" for="term-input">kadir@cyrionp:~$</label>
			<input id="term-input" class="term-input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="send" />
		</form>
		<div class="term-quick"></div>
	</div>`;
document.body.append(root);

const out = $(".term-out", root);
const form = $(".term-form", root);
const input = $(".term-input", root);

function print(line = "", cls = "") {
	const p = document.createElement("p");
	if (cls) p.className = cls;
	p.textContent = line;
	out.append(p);
	return p;
}

function printLink(label, url, prefix = "  ") {
	const p = print(prefix);
	const a = document.createElement("a");
	a.href = url;
	a.textContent = label;
	if (!url.startsWith("mailto:")) {
		a.target = "_blank";
		a.rel = "noopener";
	}
	p.append(a);
}

// Commands
const commands = {
	help() {
		print("Available commands:");
		for (const [name, info] of Object.entries(HELP)) print(`  ${name.padEnd(16)}${info}`);
		print("Tip: ↑/↓ for history, Tab to autocomplete.", "dim");
	},
	whoami() {
		const job = data.jobs()[0];
		print("Abdulkadir Durmaz", "accent");
		if (job) print(`${job.title} @ ${job.org.split(" · ")[0]}`);
		print($$(".roles li").map(text).join("  ·  "), "dim");
	},
	about() {
		print(data.about());
	},
	experience() {
		for (const j of data.jobs()) {
			print(`${j.date}`, "dim");
			print(`${j.title} — ${j.org}`, "accent");
			for (const item of j.items) print(`  ▹ ${item}`);
			print();
		}
	},
	projects() {
		for (const p of data.projects()) {
			print(`${p.name.padEnd(20)}${p.lang}`, "accent");
			if (p.desc) print(`  ${p.desc}`, "dim");
		}
		print();
		print("Type `open <project>` to view one on GitHub.");
	},
	open(args) {
		const name = args[0];
		const project = data.projects().find((p) => p.name.toLowerCase() === name?.toLowerCase());
		if (!name) return print("usage: open <project>", "err");
		if (!project) return print(`open: no such project: ${name}`, "err");
		print(`Opening ${project.name}…`);
		window.open(project.url, "_blank", "noopener");
	},
	skills() {
		print(JSON.stringify(data.skills(), null, 2));
	},
	education() {
		for (const e of data.education()) {
			print(e.date, "dim");
			print(`${e.school} — ${e.degree}`, "accent");
		}
	},
	contact() {
		printLink(data.mail().replace("mailto:", ""), data.mail(), "  ✉ ");
		for (const l of data.links()) if (!l.url.startsWith("mailto:")) printLink(`${l.label}: ${l.url}`, l.url);
	},
	social() {
		commands.contact();
	},
	ls() {
		print(Object.keys(FILES).join("   "));
	},
	cat(args) {
		const cmd = FILES[args[0]];
		if (!args[0]) return print("usage: cat <file>", "err");
		if (!cmd) return print(`cat: ${args[0]}: No such file or directory`, "err");
		commands[cmd]([]);
	},
	echo(args) {
		print(args.join(" "));
	},
	date() {
		print(new Date().toString());
	},
	sudo(args) {
		if (args.join(" ") !== "hire-me") return print("Nice try. This incident will be reported. 😄", "err");
		print("[sudo] password for recruiter: ********", "dim");
		print("Access granted ✔", "accent");
		print("Opening your mail client — let's talk!");
		const subject = encodeURIComponent("Let's work together");
		setTimeout(() => (location.href = `${data.mail()}?subject=${subject}`), 900);
	},
	clear() {
		out.replaceChildren();
	},
	exit() {
		close();
	},
	がんばります() {
		print("がんばって！ 💪", "accent");
	},
};

const HELP = {
	whoami: "who is this guy?",
	about: "a short intro",
	experience: "where I've worked",
	projects: "things I've built",
	"open <project>": "open a project on GitHub",
	skills: "tools of the trade",
	education: "where I learned",
	contact: "how to reach me",
	ls: "list files",
	"cat <file>": "print a file",
	"sudo hire-me": "you know you want to",
	clear: "clear the screen",
	exit: "close the terminal",
};

const QUICK = ["help", "whoami", "projects", "contact", "sudo hire-me", "exit"];
$(".term-quick", root).append(
	...QUICK.map((cmd) => {
		const b = document.createElement("button");
		b.type = "button";
		b.textContent = cmd;
		b.addEventListener("click", () => run(cmd));
		return b;
	})
);

// History + autocomplete
const history = [];
let cursor = 0;

function run(line) {
	const raw = line.trim();
	const echo = print(`kadir@cyrionp:~$ ${raw}`, "cmd");
	echo.setAttribute("aria-hidden", "true");
	if (raw) {
		history.push(raw);
		cursor = history.length;
		const [name, ...args] = raw.split(/\s+/);
		const fn = Object.hasOwn(commands, name.toLowerCase()) ? commands[name.toLowerCase()] : null;
		if (fn) fn(args);
		else print(`command not found: ${name}. Type \`help\` to see what I can do.`, "err");
	}
	out.scrollTop = out.scrollHeight;
}

function complete(value) {
	const [cmd, arg = ""] = value.split(/\s+/, 2);
	if (!value.includes(" ")) {
		const options = Object.keys(commands).filter((c) => c.startsWith(cmd.toLowerCase()));
		return pick(options, value, (o) => `${o} `);
	}
	const pool = cmd === "open" ? data.projects().map((p) => p.name) : cmd === "cat" ? Object.keys(FILES) : cmd === "sudo" ? ["hire-me"] : [];
	const options = pool.filter((o) => o.toLowerCase().startsWith(arg.toLowerCase()));
	return pick(options, value, (o) => `${cmd} ${o}`);
}

// One match completes; several are listed like a real shell
function pick(options, value, fill) {
	if (options.length === 1) return fill(options[0]);
	if (options.length > 1) {
		print(options.join("   "), "dim");
		out.scrollTop = out.scrollHeight;
	}
	return value;
}

form.addEventListener("submit", (e) => {
	e.preventDefault();
	run(input.value);
	input.value = "";
});

input.addEventListener("keydown", (e) => {
	if (e.key === "Tab") {
		e.preventDefault();
		input.value = complete(input.value);
	} else if (e.key === "ArrowUp" && cursor > 0) {
		e.preventDefault();
		input.value = history[--cursor];
	} else if (e.key === "ArrowDown") {
		e.preventDefault();
		cursor = Math.min(cursor + 1, history.length);
		input.value = history[cursor] ?? "";
	}
});

// Open / close
let opened = false;
let lastFocus = null;

function open() {
	if (!root.hidden) return;
	lastFocus = document.activeElement;
	root.hidden = false;
	document.documentElement.classList.add("term-open");
	requestAnimationFrame(() => root.classList.add("is-open"));
	if (!opened) {
		opened = true;
		print("Welcome to kadir.sh — type `help` to get started.", "accent");
	}
	// Skip auto-focus on touch so the keyboard doesn't cover the quick buttons
	if (!isTouch) input.focus();
	window.dispatchEvent(new Event("terminal:open"));
}

function close() {
	root.classList.remove("is-open");
	document.documentElement.classList.remove("term-open");
	setTimeout(() => (root.hidden = true), 200);
	lastFocus?.focus?.();
}

$(".term-close", root).addEventListener("click", close);
root.addEventListener("click", (e) => e.target === root && close());

addEventListener("keydown", (e) => {
	if (e.key === "Escape" && !root.hidden) return close();
	const typing = e.target.closest?.("input, textarea, [contenteditable]");
	if ((e.key === "`" || e.key === "~" || (e.key === "Dead" && e.code === "Backquote")) && !typing) {
		e.preventDefault();
		root.hidden ? open() : close();
	}
});

// Long-press the monogram on touch screens
const mono = $(".monogram");
let pressTimer = 0;
let longPressed = false;
mono.addEventListener("pointerdown", () => {
	longPressed = false;
	pressTimer = setTimeout(() => {
		longPressed = true;
		navigator.vibrate?.(15);
		open();
	}, 600);
});
for (const type of ["pointerup", "pointerleave", "pointercancel"]) mono.addEventListener(type, () => clearTimeout(pressTimer));
mono.addEventListener("click", (e) => longPressed && e.preventDefault());
mono.addEventListener("contextmenu", (e) => e.preventDefault());

// Footer hint doubles as an accessible way in
const hint = $(".term-hint");
if (hint) {
	hint.hidden = false;
	hint.querySelector("span").textContent = isTouch ? "long-press AD" : "press `";
	hint.addEventListener("click", open);
}
