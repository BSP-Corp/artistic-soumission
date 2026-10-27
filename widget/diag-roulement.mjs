// Diagnostic « temps de roulement sensible à la presse » (bug 2026-07-22).
import { Moteur } from "./src/lib/moteur.ts";
import classeur from "./src/data/classeur.json" with { type: "json" };
import { entreesExemple } from "./src/lib/modele.ts";
import { surchargesMachines } from "./src/lib/machines.ts";
import { MACHINES_CALC_SNAPSHOT as SNAP } from "./src/data/machinesCalc.ts";

const m = new Moteur(classeur);
const base = entreesExemple(classeur);
const cameo = SNAP.find((x) => x.nom.startsWith("Cameo 18"));
const multi = SNAP.find((x) => x.nom.startsWith("Multiprint"));
const hm = (h) => Math.trunc(h) + "h" + String(Math.round((h - Math.trunc(h)) * 60)).padStart(2, "0");

function run(label, presse, qte, o5 = 0) {
  const inputs = { ...base, ...(presse ? surchargesMachines({ presse }, 73, 2) : {}) };
  if (qte) inputs["S!E2"] = qte;
  if (o5) inputs["S!O5"] = 1;
  m.setInputs(inputs);
  m.calculer();
  const k61 = m.num("S!K61");
  console.log(
    label.padEnd(30),
    "K61=" + k61.toFixed(2).padStart(9),
    "temps=" + hm(k61 / 73).padStart(7),
    "| G15=" + m.num("C!G15").toFixed(1).padStart(7),
    "G16=" + m.num("C!G16").toFixed(1).padStart(7),
    "Y20=" + m.num("C!Y20").toFixed(1).padStart(7),
    "R39=" + m.num("C!R39").toFixed(1).padStart(7),
    "| total=" + m.num("S!W12").toFixed(2),
  );
  return k61 / 73;
}

console.log("=== mode normal (S!O5≠1) — qté 5000, 2 couleurs ===");
const tGen = run("aucune presse (classeur 250)", null, 5000);
const tCam = run("Cameo 18 (220 fle/h)", cameo, 5000);
const tMul = run("Multiprint IST (175 fle/h)", multi, 5000);
console.log("  classeur 250 → Multiprint 175 : " + (((tMul - tGen) / tGen) * 100).toFixed(1) + " %  (attendu +42,9 %)");
console.log("  Cameo 220 → Multiprint 175    : " + (((tMul - tCam) / tCam) * 100).toFixed(1) + " %  (attendu +25,7 %)");

console.log("\n=== mode « 1 à 6 couleurs » (S!O5=1) — qté 5000 ===");
const oGen = run("aucune presse (classeur 225)", null, 5000, 1);
const oMul = run("Multiprint IST (175 fle/h)", multi, 5000, 1);
console.log("  225 → 175 : " + (((oMul - oGen) / oGen) * 100).toFixed(1) + " %  (attendu +28,6 % sur la part roulement)");

console.log("\n=== non-régression : exemple classeur sans presse ===");
m.setInputs({ ...base });
m.calculer();
console.log("  coût S!W12 =", m.num("S!W12").toFixed(2), "(attendu 512,12)");
