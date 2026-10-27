// Script de validation ponctuel (non inclus dans le build widget) : recalcule tout le classeur
// avec le moteur et compare CHAQUE cellule-formule à la valeur mise en cache par Excel dans
// classeur.json, pour le scénario « Exemple » (Quantité 50). Sert à prouver que le moteur
// reproduit fidèlement le fichier xlsm d'origine.
import { Moteur, type Classeur, type CellValue } from "./lib/moteur";
import { entreesExemple } from "./lib/modele";
import { OUT, DECOUPE_HM } from "./lib/modele";
import classeurJson from "./data/classeur.json";

const CLASSEUR = classeurJson as unknown as Classeur;
const moteur = new Moteur(CLASSEUR);
const entrees = entreesExemple(CLASSEUR);
moteur.setInputs(entrees);
moteur.calculer();

console.log("Erreurs de parsing de formules :", moteur.parseErrors.length);
for (const e of moteur.parseErrors) console.log("  parse:", e);

let total = 0,
  ok = 0;
const mismatches: { cell: string; excel: CellValue | undefined; moteur: CellValue }[] = [];
for (const sh of ["S", "C", "FT"] as const) {
  for (const ref of Object.keys(CLASSEUR[sh].formulas)) {
    const key = sh + "!" + ref;
    total++;
    const excelVal = CLASSEUR[sh].values[ref];
    const moteurVal = moteur.val(key);
    let same: boolean;
    if (typeof excelVal === "number" && typeof moteurVal === "number") {
      same = Math.abs(excelVal - moteurVal) < 0.005;
    } else if (excelVal === undefined) {
      same = moteurVal === "" || moteurVal === 0 || moteurVal === false;
    } else {
      same = String(excelVal).trim() === String(moteurVal).trim();
    }
    if (same) ok++;
    else mismatches.push({ cell: key, excel: excelVal, moteur: moteurVal });
  }
}
console.log("\n=== VALIDATION COMPLÈTE DU CLASSEUR (scénario Exemple, Quantité 50) ===");
console.log("Total formules :", total, "| OK :", ok, "| Écarts :", mismatches.length);
for (const m of mismatches) console.log("  ÉCART", m.cell, "| excel(cache)=", JSON.stringify(m.excel), "| moteur=", JSON.stringify(m.moteur));

function cache(cellKey: string): CellValue | undefined {
  const [sh, ref] = cellKey.split("!") as ["S" | "C" | "FT", string];
  return CLASSEUR[sh].values[ref];
}
function ligne(label: string, cellKey: string) {
  console.log(label.padEnd(28), "moteur=", String(moteur.val(cellKey)).padEnd(12), "| excel(cache)=", String(cache(cellKey)));
}

console.log("\n=== RÉSUMÉ (bloc prix) ===");
ligne("Montant (coût de revient)", OUT.montant);
ligne("Total (prix vendant)", OUT.total);
ligne("Prix unitaire", OUT.prixUnitaire);
ligne("Prix unitaire US", OUT.prixUnitaireUs);
ligne("Temps total (hrs)", OUT.tempsTotalHrs);
ligne("Temps total (min)", OUT.tempsTotalMin);

console.log("\n=== 7 CATÉGORIES (rangée 61) ===");
ligne("MAT.1ère ($)", OUT.cat1Mat);
ligne("Soies/encres/dév. ($)", OUT.cat2Soies);
ligne("  hrs", OUT.cat2Hrs);
ligne("  min", OUT.cat2Min);
ligne("Set-up découpe ($)", OUT.cat3Setup);
ligne("  hrs", OUT.cat3Hrs);
ligne("  min", OUT.cat3Min);
ligne("Sérigraphie ($)", OUT.cat4Seri);
ligne("  hrs", OUT.cat4Hrs);
ligne("  min", OUT.cat4Min);
ligne("Découpe/Numérique ($)", OUT.cat5Dec);
ligne("  hrs", OUT.cat5Hrs);
ligne("  min", OUT.cat5Min);
ligne("Divers ($)", OUT.cat6Divers);
ligne("  hrs", OUT.cat6Hrs);
ligne("  min", OUT.cat6Min);
ligne("S-Contrat ($)", OUT.cat7SousContrat);

console.log("\n=== MATÉRIAUX (coût pi² / montant / min) ===");
for (const [nom, cout, mont, min] of [
  ["Lexan", OUT.coutLexan, OUT.montLexan, OUT.minLexan],
  ["Vinyle", OUT.coutVinyle, OUT.montVinyle, OUT.minVinyle],
  ["Polyester", OUT.coutPolyester, OUT.montPolyester, OUT.minPolyester],
  ["Alu.Foil", OUT.coutAluFoil, OUT.montAluFoil, OUT.minAluFoil],
  ["Divers", OUT.coutDivers, OUT.montDivers, OUT.minDivers],
  ["Adhésif", OUT.coutAdhesif, OUT.montAdhesif, OUT.minAdhesif],
  ["Overlam", OUT.coutOverlam, OUT.montOverlam, OUT.minOverlam ?? ""],
] as [string, string, string, string][]) {
  ligne(nom + " coût", cout);
  ligne(nom + " montant", mont);
  if (min) ligne(nom + " min", min);
}

console.log("\n=== DÉCOUPE hrs/min (toutes opérations) ===");
for (const [op, [h, m]] of Object.entries(DECOUPE_HM)) {
  ligne(op + " hrs", h);
  ligne(op + " min", m);
}

console.log("\n=== ENTRÉES CHARGÉES (exemple) ===");
console.log(JSON.stringify(entrees, null, 0));
