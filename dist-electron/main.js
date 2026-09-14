import { BrowserWindow as e, app as t, ipcMain as n } from "electron";
import { fileURLToPath as r } from "node:url";
import i from "node:path";
//#region electron/main.ts
var a = i.dirname(r(import.meta.url));
process.env.APP_ROOT = i.join(a, "..");
var o = process.env.VITE_DEV_SERVER_URL, s = i.join(process.env.APP_ROOT, "dist-electron"), c = i.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = o ? i.join(process.env.APP_ROOT, "public") : c;
var l = [
	"Jugador 1",
	"Jugador 2",
	"Administrador"
], u = "PasaPalabra", d = {
	width: 920,
	height: 840
}, f = {
	width: 800,
	height: 620
}, p = ["Jugador 1", "Jugador 2"], m = 27;
function h() {
	return {
		letterStates: Array(m).fill(null),
		passed: Array(m).fill(!1),
		currentIndex: 0,
		timeLeftMs: 0
	};
}
function g() {
	let e = _.startMinutes * 6e4;
	return {
		"Jugador 1": {
			...h(),
			timeLeftMs: e
		},
		"Jugador 2": {
			...h(),
			timeLeftMs: e
		}
	};
}
var _ = {
	connected: {
		"Jugador 1": !1,
		"Jugador 2": !1
	},
	startMinutes: 5,
	gameStarted: !1,
	currentTurn: null,
	lastTickAt: null,
	gameOver: !1,
	winner: null,
	players: {
		"Jugador 1": h(),
		"Jugador 2": h()
	}
}, v = null;
function y() {
	v &&= (clearInterval(v), null);
}
function b(e) {
	return p.includes(e);
}
function x(e) {
	let t = _.players[e], n = t.currentIndex + 1, r = t.letterStates.findIndex((e, t) => e === null && t >= n);
	return r === -1 && (r = t.letterStates.findIndex((e) => e === null)), t.currentIndex = r, r === -1;
}
function S() {
	_.currentTurn = _.currentTurn === "Jugador 1" ? "Jugador 2" : "Jugador 1";
}
function C() {
	let e = _.startMinutes * 6e4;
	if (_.gameStarted && !_.gameOver && _.currentTurn !== null) {
		let t = _.players[_.currentTurn], n = _.lastTickAt === null ? Date.now() : _.lastTickAt;
		e = Math.max(0, t.timeLeftMs - (Date.now() - n));
	} else _.currentTurn !== null && (e = _.players[_.currentTurn].timeLeftMs);
	return {
		..._,
		remainingMs: e
	};
}
function w() {
	let t = C();
	e.getAllWindows().forEach((e) => {
		e.webContents.send("rosca:state-updated", t);
	});
}
function T() {
	_.gameStarted || (_.gameStarted = !0, _.gameOver = !1, _.winner = null, _.currentTurn = "Jugador 1", _.lastTickAt = Date.now(), _.players = g(), y(), v = setInterval(() => {
		let e = Date.now();
		if (!_.gameOver && _.currentTurn !== null) {
			let t = e - (_.lastTickAt === null ? e : _.lastTickAt);
			_.lastTickAt = e;
			let n = _.players[_.currentTurn];
			n.timeLeftMs = Math.max(0, n.timeLeftMs - t), n.timeLeftMs <= 0 && (_.gameOver = !0, _.winner = _.currentTurn === "Jugador 1" ? "Jugador 2" : "Jugador 1", _.currentTurn = null, _.lastTickAt = null, y());
		}
		w();
	}, 1e3), w());
}
function E() {
	y(), _.connected = {
		"Jugador 1": !1,
		"Jugador 2": !1
	}, _.gameStarted = !1, _.currentTurn = null, _.lastTickAt = null, _.gameOver = !1, _.winner = null, _.players = {
		"Jugador 1": h(),
		"Jugador 2": h()
	};
}
function D() {
	n.handle("rosca:get-state", () => C()), n.on("rosca:connect", (e, t) => {
		typeof t == "string" && b(t) && (_.connected[t] = !0, w());
	}), n.on("rosca:disconnect", (e, t) => {
		typeof t == "string" && b(t) && (_.connected[t] = !1, w());
	}), n.on("rosca:set-start-minutes", (e, t) => {
		let n = typeof t == "number" ? t : Number(t);
		Number.isFinite(n) && (_.startMinutes = Math.min(120, Math.max(1, Math.round(n))), w());
	}), n.on("rosca:start", () => {
		T();
	}), n.on("rosca:set-current-letter", (e, t, n) => {
		!_.gameStarted || _.gameOver || _.currentTurn === null || typeof t != "string" || !b(t) || _.currentTurn === t && (typeof n != "number" || n < 0 || n >= m || _.players[t].letterStates[n] === null && (_.players[t].currentIndex = n, w()));
	}), n.on("rosca:mark-result", (e, t) => {
		if (!_.gameStarted || _.gameOver || _.currentTurn === null || t !== "correcta" && t !== "incorrecta" && t !== "pasa") return;
		let n = _.currentTurn, r = _.players[n], i = !1;
		if (r.currentIndex >= 0 && (t === "pasa" ? r.passed[r.currentIndex] = !0 : (r.letterStates[r.currentIndex] = t, r.passed[r.currentIndex] = !1), i = x(n)), i) {
			_.gameOver = !0, _.winner = n, _.currentTurn = null, _.lastTickAt = null, y(), w();
			return;
		}
		S(), _.lastTickAt = Date.now(), w();
	}), n.on("rosca:reset", () => {
		E(), w();
	});
}
var O = /* @__PURE__ */ new Map();
function k(t, n, r) {
	let s = new e({
		title: u,
		width: n,
		height: r,
		show: !1,
		backgroundColor: "#ffffff",
		icon: i.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
		webPreferences: {
			preload: i.join(a, "preload.mjs"),
			additionalArguments: [`--window-role=${t}`]
		}
	});
	s.setMenu(null), O.set(t, s), s.once("ready-to-show", () => {
		s.show();
	}), s.on("closed", () => {
		O.delete(t), t !== "Administrador" && (_.connected[t] = !1, w());
	}), o ? s.loadURL(o) : s.loadFile(i.join(c, "index.html"));
}
function A() {
	l.forEach((e) => {
		let t = e.startsWith("Jugador") ? d : f;
		k(e, t.width, t.height);
	});
}
D(), t.on("window-all-closed", () => {
	process.platform !== "darwin" && t.quit();
}), t.on("activate", () => {
	t.whenReady().then(() => {
		O.size === 0 && A();
	});
}), t.whenReady().then(() => A());
//#endregion
export { s as MAIN_DIST, c as RENDERER_DIST, o as VITE_DEV_SERVER_URL };
