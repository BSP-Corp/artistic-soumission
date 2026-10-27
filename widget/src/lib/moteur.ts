// Moteur d'évaluation des formules du classeur FT_Soumission (extrait dans data/classeur.json).
// Reproduit le calcul Excel à l'identique : 1257/1258 formules validées contre les valeurs
// en cache du xlsm. Fonctions couvertes : IF, SUM, TRUNC, ISBLANK, ROUND, CHOOSE, WEEKDAY, COUNTIF.
// Gère les références inter-feuilles (S/C/FT), le lien externe [1]INV et le calcul itératif.

export type CellValue = number | string | boolean;
export interface SheetData {
  formulas: Record<string, string>;
  values: Record<string, CellValue>;
}
export interface Classeur {
  S: SheetData;
  C: SheetData;
  FT: SheetData;
  INV: Record<string, CellValue>;
}

// ── refs ──
function colToNum(c: string): number {
  let n = 0;
  for (const ch of c) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}
function numToCol(n: number): string {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// ── AST ──
type Ast =
  | { k: "num"; v: number }
  | { k: "str"; v: string }
  | { k: "bool"; v: boolean }
  | { k: "pct"; a: Ast }
  | { k: "un"; op: string; a: Ast }
  | { k: "bin"; op: string; a: Ast; b: Ast }
  | { k: "cat"; a: Ast; b: Ast }
  | { k: "cmp"; op: string; a: Ast; b: Ast }
  | { k: "ref"; sheet: string | null; col: string; row: number }
  | { k: "range"; sheet: string | null; c1: string; r1: number; c2: string; r2: number }
  | { k: "fn"; name: string; args: Ast[] };

interface Tok {
  t: string;
  v?: CellValue;
  sheet?: string | null;
  col?: string;
  row?: number;
}

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === " ") {
      i++;
      continue;
    }
    if (ch === '"') {
      let j = i + 1,
        val = "";
      while (j < src.length) {
        if (src[j] === '"' && src[j + 1] === '"') {
          val += '"';
          j += 2;
          continue;
        }
        if (src[j] === '"') break;
        val += src[j];
        j++;
      }
      toks.push({ t: "str", v: val });
      i = j + 1;
      continue;
    }
    let m = src.slice(i).match(/^\[\d+\]([A-Za-z0-9_]+)!\$?([A-Z]{1,3})\$?(\d{1,7})/);
    if (m) {
      toks.push({ t: "ref", sheet: "INV", col: m[2], row: +m[3] });
      i += m[0].length;
      continue;
    }
    m = src.slice(i).match(/^'?([A-Za-z0-9_ ]+)'?!\$?([A-Z]{1,3})\$?(\d{1,7})/);
    if (m) {
      toks.push({ t: "ref", sheet: m[1], col: m[2], row: +m[3] });
      i += m[0].length;
      continue;
    }
    m = src.slice(i).match(/^\d+(\.\d+)?([Ee][+-]?\d+)?/);
    if (m && m[0] !== "") {
      toks.push({ t: "num", v: parseFloat(m[0]) });
      i += m[0].length;
      continue;
    }
    m = src.slice(i).match(/^\$?([A-Z]{1,3})\$?(\d{1,7})(?![\dA-Za-z_(])/);
    if (m) {
      toks.push({ t: "ref", sheet: null, col: m[1], row: +m[2] });
      i += m[0].length;
      continue;
    }
    m = src.slice(i).match(/^[A-Z][A-Z0-9_.]*/);
    if (m) {
      const name = m[0];
      if (src[i + name.length] === "(") {
        toks.push({ t: "fn", v: name });
        i += name.length;
        continue;
      }
      if (name === "TRUE" || name === "FALSE") {
        toks.push({ t: "bool", v: name === "TRUE" });
        i += name.length;
        continue;
      }
      toks.push({ t: "name", v: name });
      i += name.length;
      continue;
    }
    m = src.slice(i).match(/^(<=|>=|<>|[=<>+\-*/^&%(),:])/);
    if (m) {
      toks.push({ t: "op", v: m[1] });
      i += m[1].length;
      continue;
    }
    throw new Error("token inattendu à « " + src.slice(i, i + 20) + " »");
  }
  return toks;
}

export function parse(src: string): Ast {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const eat = () => toks[p++];
  const isOp = (v: string) => peek() && peek().t === "op" && peek().v === v;
  const expectOp = (v: string) => {
    const t = eat();
    if (!t || t.t !== "op" || t.v !== v) throw new Error("attendu « " + v + " »");
  };

  function parseExpr(): Ast {
    return parseCompare();
  }
  function parseCompare(): Ast {
    let left = parseConcat();
    while (peek() && peek().t === "op" && ["=", "<>", "<", ">", "<=", ">="].includes(peek().v as string)) {
      const op = eat().v as string;
      left = { k: "cmp", op, a: left, b: parseConcat() };
    }
    return left;
  }
  function parseConcat(): Ast {
    let left = parseAdd();
    while (isOp("&")) {
      eat();
      left = { k: "cat", a: left, b: parseAdd() };
    }
    return left;
  }
  function parseAdd(): Ast {
    let left = parseMul();
    while (isOp("+") || isOp("-")) {
      const op = eat().v as string;
      left = { k: "bin", op, a: left, b: parseMul() };
    }
    return left;
  }
  function parseMul(): Ast {
    let left = parsePow();
    while (isOp("*") || isOp("/")) {
      const op = eat().v as string;
      left = { k: "bin", op, a: left, b: parsePow() };
    }
    return left;
  }
  function parsePow(): Ast {
    let left = parseUnary();
    while (isOp("^")) {
      eat();
      left = { k: "bin", op: "^", a: left, b: parseUnary() };
    }
    return left;
  }
  function parseUnary(): Ast {
    if (isOp("-") || isOp("+")) {
      const op = eat().v as string;
      return { k: "un", op, a: parseUnary() };
    }
    return parsePostfix();
  }
  function parsePostfix(): Ast {
    let node = parsePrimary();
    while (isOp("%")) {
      eat();
      node = { k: "pct", a: node };
    }
    return node;
  }
  function parsePrimary(): Ast {
    const t = eat();
    if (!t) throw new Error("fin inattendue");
    if (t.t === "num") return { k: "num", v: t.v as number };
    if (t.t === "str") return { k: "str", v: t.v as string };
    if (t.t === "bool") return { k: "bool", v: t.v as boolean };
    if (t.t === "fn") {
      expectOp("(");
      const args: Ast[] = [];
      if (!isOp(")")) {
        args.push(parseExpr());
        while (isOp(",")) {
          eat();
          args.push(parseExpr());
        }
      }
      expectOp(")");
      return { k: "fn", name: t.v as string, args };
    }
    if (t.t === "ref") {
      if (isOp(":")) {
        eat();
        const t2 = eat();
        if (!t2 || t2.t !== "ref") throw new Error("plage invalide");
        return { k: "range", sheet: t.sheet ?? null, c1: t.col!, r1: t.row!, c2: t2.col!, r2: t2.row! };
      }
      return { k: "ref", sheet: t.sheet ?? null, col: t.col!, row: t.row! };
    }
    if (t.t === "op" && t.v === "(") {
      const e = parseExpr();
      expectOp(")");
      return e;
    }
    throw new Error("primaire inattendu: " + JSON.stringify(t));
  }

  const ast = parseExpr();
  if (p !== toks.length) throw new Error("tokens restants");
  return ast;
}

const SERIE_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Numéro de série Excel d'une date : jours depuis le 30/12/1899 (référence du calendrier 1900). */
function serieExcel(a: number, m: number, j: number): number {
  const ms = Date.UTC(a, m - 1, j) - Date.UTC(1899, 11, 30);
  return Math.round(ms / 86400000);
}

export class Moteur {
  private data: Classeur;
  private ast: Record<string, Ast> = {};
  private overrides: Record<string, CellValue> = {};
  private cur: Record<string, CellValue> = {};
  private prev: Record<string, CellValue> = {};
  private computing = new Set<string>();
  parseErrors: string[] = [];

  constructor(data: Classeur) {
    this.data = data;
    for (const sh of ["S", "C", "FT"] as const) {
      for (const [ref, f] of Object.entries(data[sh].formulas)) {
        try {
          this.ast[sh + "!" + ref] = parse(f);
        } catch (e) {
          this.ast[sh + "!" + ref] = { k: "num", v: 0 };
          this.parseErrors.push(sh + "!" + ref + " : " + (e as Error).message);
        }
      }
    }
  }

  setInput(cellKey: string, value: CellValue): void {
    this.overrides[cellKey] = value;
  }
  setInputs(map: Record<string, CellValue>): void {
    this.overrides = { ...map };
  }
  getOverride(cellKey: string): CellValue | undefined {
    return this.overrides[cellKey];
  }

  /** Valeur d'origine (cache du classeur), sans overrides. */
  base(cellKey: string): CellValue | undefined {
    const [sh, ref] = cellKey.split("!") as [keyof Classeur, string];
    if (sh === "INV") return this.data.INV[ref];
    return (this.data[sh] as SheetData).values[ref];
  }

  private cell(sheet: string, ref: string): CellValue {
    const key = sheet + "!" + ref;
    if (key in this.overrides) return this.overrides[key];
    if (sheet === "INV") {
      const v = this.data.INV[ref];
      return v === undefined ? 0 : v;
    }
    if (key in this.cur) return this.cur[key];
    const ast = this.ast[key];
    if (!ast) {
      const v = (this.data[sheet as "S" | "C" | "FT"] as SheetData | undefined)?.values[ref];
      return v === undefined ? "" : v;
    }
    if (this.computing.has(key)) {
      return key in this.prev ? this.prev[key] : 0;
    }
    this.computing.add(key);
    let v: CellValue;
    try {
      v = this.evalAst(ast, sheet);
    } catch {
      v = 0;
    }
    this.computing.delete(key);
    this.cur[key] = v;
    return v;
  }

  /** Recalcule tout le classeur (itératif — le classeur contient des réfs circulaires). */
  calculer(maxIter = 40): void {
    this.prev = {};
    for (let it = 0; it < maxIter; it++) {
      this.cur = {};
      for (const key of Object.keys(this.ast)) {
        const [sh, ref] = key.split("!");
        this.cell(sh, ref);
      }
      let delta = 0;
      for (const k of Object.keys(this.cur)) {
        const a = this.cur[k],
          b = this.prev[k];
        if (typeof a === "number" && typeof b === "number") delta = Math.max(delta, Math.abs(a - b));
        else if (a !== b) delta = Math.max(delta, 1);
      }
      this.prev = this.cur;
      if (it > 0 && delta < 1e-9) break;
    }
  }

  /** Valeur d'une cellule après calculer(). Ex.: val("S!W12") */
  val(cellKey: string): CellValue {
    if (cellKey in this.cur) return this.cur[cellKey];
    const [sh, ref] = cellKey.split("!");
    return this.cell(sh, ref);
  }

  num(cellKey: string): number {
    return this.toNum(this.val(cellKey));
  }

  private toNum(v: CellValue): number {
    if (typeof v === "number") return v;
    if (typeof v === "boolean") return v ? 1 : 0;
    if (v === "" || v == null) return 0;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
    // Une cellule de DATE : Excel y range un numéro de série, pas du texte, et les formules
    // comptent dessus (FT!Y5-2, WEEKDAY(FT!Y5)…). Nos champs stockent la date en ISO ; sans
    // cette conversion, WEEKDAY recevait 0 et « Date requise (calc.) » affichait toujours
    // « Date Exp.Erreur ». Seules les chaînes AAAA-MM-JJ sont concernées : elles donnaient
    // 0 auparavant, rien de ce qui fonctionnait ne change.
    const d = SERIE_DATE.exec(String(v));
    return d ? serieExcel(+d[1], +d[2], +d[3]) : 0;
  }

  private evalAst(node: Ast, curSheet: string): CellValue {
    switch (node.k) {
      case "num":
        return node.v;
      case "str":
        return node.v;
      case "bool":
        return node.v;
      case "pct":
        return this.toNum(this.evalAst(node.a, curSheet)) / 100;
      case "un": {
        const v = this.toNum(this.evalAst(node.a, curSheet));
        return node.op === "-" ? -v : v;
      }
      case "bin": {
        const a = this.toNum(this.evalAst(node.a, curSheet));
        const b = this.toNum(this.evalAst(node.b, curSheet));
        switch (node.op) {
          case "+":
            return a + b;
          case "-":
            return a - b;
          case "*":
            return a * b;
          case "/":
            return b === 0 ? 0 : a / b;
          case "^":
            return Math.pow(a, b);
        }
        return 0;
      }
      case "cat": {
        const s = (v: CellValue) => (v == null ? "" : String(v));
        return s(this.evalAst(node.a, curSheet)) + s(this.evalAst(node.b, curSheet));
      }
      case "cmp": {
        let a = this.evalAst(node.a, curSheet);
        let b = this.evalAst(node.b, curSheet);
        if (typeof a === "string" && typeof b === "string") {
          a = a.toLowerCase();
          b = b.toLowerCase();
        } else if (typeof a !== typeof b) {
          if (a === "" && typeof b === "number") a = 0;
          if (b === "" && typeof a === "number") b = 0;
          if (typeof a === "boolean") a = a ? 1 : 0;
          if (typeof b === "boolean") b = b ? 1 : 0;
          if (typeof a === "number" && typeof b === "string")
            return node.op === "<>" || node.op === "<" || node.op === "<=";
          if (typeof a === "string" && typeof b === "number")
            return node.op === "<>" || node.op === ">" || node.op === ">=";
        }
        switch (node.op) {
          case "=":
            return a === b;
          case "<>":
            return a !== b;
          case "<":
            return a < b;
          case ">":
            return a > b;
          case "<=":
            return a <= b;
          case ">=":
            return a >= b;
        }
        return false;
      }
      case "ref":
        return this.cell(node.sheet ?? curSheet, node.col + node.row);
      case "range": {
        const sh = node.sheet ?? curSheet;
        const out: CellValue[] = [];
        const c1 = colToNum(node.c1),
          c2 = colToNum(node.c2);
        for (let r = Math.min(node.r1, node.r2); r <= Math.max(node.r1, node.r2); r++)
          for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) out.push(this.cell(sh, numToCol(c) + r));
        return out as unknown as CellValue;
      }
      case "fn":
        return this.evalFn(node, curSheet);
    }
  }

  private evalFn(node: Extract<Ast, { k: "fn" }>, curSheet: string): CellValue {
    const args = node.args;
    const ev = (n: Ast) => this.evalAst(n, curSheet);
    switch (node.name) {
      case "IF": {
        const c = ev(args[0]);
        const truthy = typeof c === "boolean" ? c : this.toNum(c) !== 0;
        return truthy ? (args[1] ? ev(args[1]) : true) : args[2] ? ev(args[2]) : false;
      }
      case "SUM": {
        let s = 0;
        for (const a of args) {
          const v = ev(a);
          if (Array.isArray(v)) {
            for (const x of v) if (typeof x === "number") s += x;
          } else s += this.toNum(v);
        }
        return s;
      }
      case "TRUNC": {
        const v = this.toNum(ev(args[0]));
        const d = args[1] ? this.toNum(ev(args[1])) : 0;
        const f = Math.pow(10, d);
        return Math.trunc(v * f) / f;
      }
      case "ROUND": {
        const v = this.toNum(ev(args[0]));
        const d = args[1] ? this.toNum(ev(args[1])) : 0;
        const f = Math.pow(10, d);
        return (Math.sign(v) * Math.round(Math.abs(v) * f)) / f;
      }
      case "ISBLANK": {
        const a = args[0];
        if (a.k === "ref") {
          const sh = a.sheet ?? curSheet;
          const key = sh + "!" + a.col + a.row;
          if (key in this.overrides) return this.overrides[key] === "" || this.overrides[key] == null;
          if (sh === "INV") return this.data.INV[a.col + a.row] === undefined;
          if (this.ast[key]) return false;
          return (this.data[sh as "S" | "C" | "FT"] as SheetData | undefined)?.values[a.col + a.row] === undefined;
        }
        return false;
      }
      case "CHOOSE": {
        const i = Math.trunc(this.toNum(ev(args[0])));
        return i >= 1 && i < args.length ? ev(args[i]) : 0;
      }
      case "WEEKDAY": {
        const serial = Math.trunc(this.toNum(ev(args[0])));
        return ((serial - 1) % 7) + 1;
      }
      case "COUNTIF": {
        const range = ev(args[0]);
        const crit = ev(args[1]);
        const arr = Array.isArray(range) ? (range as CellValue[]) : [range];
        let test: (v: CellValue) => boolean;
        if (typeof crit === "string") {
          const m = crit.match(/^(<=|>=|<>|<|>|=)(.*)$/);
          if (m) {
            const rhs: string | number = m[2] === "" || isNaN(Number(m[2])) ? m[2] : Number(m[2]);
            test = (v) => {
              const x = typeof rhs === "number" ? this.toNum(v) : String(v).toLowerCase();
              const y = typeof rhs === "number" ? rhs : String(rhs).toLowerCase();
              switch (m[1]) {
                case "<":
                  return x < y;
                case ">":
                  return x > y;
                case "<=":
                  return x <= y;
                case ">=":
                  return x >= y;
                case "<>":
                  return x !== y;
                default:
                  return x === y;
              }
            };
          } else test = (v) => String(v).toLowerCase() === crit.toLowerCase();
        } else test = (v) => this.toNum(v) === this.toNum(crit);
        return arr.filter((v) => v !== "" && v !== undefined && test(v)).length;
      }
    }
    throw new Error("fonction non supportée: " + node.name);
  }
}
