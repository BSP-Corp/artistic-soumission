// Test moteur : conformité à la feuille de route « Changements_a_appliquer_Impression_Decoupe.md ».
// Lancer avec : TSX_TSCONFIG_PATH=tsconfig.app.json npx tsx test-machines.mjs
import { Moteur } from "./src/lib/moteur.ts";
import classeur from "./src/data/classeur.json" with { type: "json" };
import { entreesExemple } from "./src/lib/modele.ts";
import { surchargesMachines, surchargeMatrice } from "./src/lib/machines.ts";
import { METHODE_COUT } from "./src/lib/methodeCout.ts";
import { MACHINES_CALC_SNAPSHOT } from "./src/data/machinesCalc.ts";

const m = new Moteur(classeur);
const entrees = entreesExemple(classeur);
const cout = (inputs) => {
  m.setInputs(inputs);
  m.calculer();
  return m.num("S!W12");
};

const checks = [];
const check = (nom, ok, detail) => {
  checks.push(ok);
  console.log((ok ? "✓" : "✗") + " " + nom + (detail ? " — " + detail : ""));
};

// 1. base : exemple du classeur → 512,12
const base = cout({ ...entrees });
check("base exemple 512,12", Math.abs(base - 512.12) < 0.02, base.toFixed(2));

// 2. TEMPS DE ROULEMENT = nb_feuilles × nb_couleurs / presse.vitesse (correctif 2026-07-22).
//    Le roulement de base est C!G15 ; le classeur pose temps = coût / CF8. Sur la branche
//    standard (INV!CH9, matériau hors Lexan clair) l'identité doit être EXACTE.
const cameo = MACHINES_CALC_SNAPSHOT.find((x) => x.nom.startsWith("Cameo 18")); // rate 49,81 · 220
const multiprint = MACHINES_CALC_SNAPSHOT.find((x) => x.nom.startsWith("Multiprint")); // rate 125,89 · 175
const jobStd = { ...entrees, "S!M24": "" }; // pas de Lexan clair → branche CH9
m.setInputs({ ...surchargesMachines({ presse: cameo }, 73, 2), ...jobStd });
m.calculer();
const g9 = m.num("S!G9");
const couleurs = m.num("S!E3");
const tRoulement = m.num("C!G15") / 73;
const tAttendu = (g9 * couleurs) / cameo.vitesse;
check(
  "temps roulement = feuilles × couleurs / vitesse (Cameo 220)",
  Math.abs(tRoulement - tAttendu) < 1e-9,
  `${tRoulement.toFixed(6)} h ≈ ${tAttendu.toFixed(6)} h`,
);
check("cadence CH9 = vitesse presse", Math.abs(m.num("INV!CH9") - cameo.vitesse) < 1e-9, String(m.num("INV!CH9")));

m.setInputs({ ...entrees });
m.calculer();
const d6Base = m.num("C!D6");
const coutCameo = cout({ ...surchargesMachines({ presse: cameo }, 73, 2), ...entrees });
check("montage soie C!D6 inchangé (gabarit conservé)", Math.abs(m.num("C!D6") - d6Base) < 0.005, m.num("C!D6").toFixed(2));

// 3. validation demandée : Cameo 220 → Multiprint 175 fait monter le temps de ~25,7 %
//    (220/175 = 1,257). Le repère « 225 → 175 = +28,6 % » vaut pour le mode S!O5=1 (CF70).
const tempsSeri = (extra) => {
  m.setInputs({ ...extra, ...entrees });
  m.calculer();
  return m.num("S!K61") / 73;
};
const tCameo = tempsSeri(surchargesMachines({ presse: cameo }, 73, 2));
const tMulti = tempsSeri(surchargesMachines({ presse: multiprint }, 73, 2));
const ecart = (tMulti - tCameo) / tCameo;
check(
  "Cameo → Multiprint : temps +25,7 % (et non ~0)",
  Math.abs(ecart - (cameo.vitesse / multiprint.vitesse - 1)) < 1e-6,
  `${tCameo.toFixed(3)} h → ${tMulti.toFixed(3)} h = +${(ecart * 100).toFixed(1)} %`,
);
const coutMulti = cout({ ...surchargesMachines({ presse: multiprint }, 73, 2), ...entrees });
check(
  "presse plus lente → coût plus élevé (Cameo < Multiprint)",
  coutCameo < coutMulti,
  `Cameo ${coutCameo.toFixed(2)} · base ${base.toFixed(2)} · Multiprint ${coutMulti.toFixed(2)}`,
);

// 3b. repli : fiche sans vitesse exploitable → cadence classeur 250, jamais NaN
const sansVitesse = { ...cameo, vitesse: null };
const coutSansVitesse = cout({ ...surchargesMachines({ presse: sansVitesse }, 73, 2), ...entrees });
check(
  "vitesse manquante → repli cadence classeur 250",
  Math.abs(m.num("INV!CH9") - 250) < 1e-9 && Math.abs(coutSansVitesse - base) < 0.005,
  `CH9=${m.num("INV!CH9")} · coût ${coutSansVitesse.toFixed(2)}`,
);

// 3c. mode « 1 à 6 couleurs » (S!O5=1) : la part roulement R39 suit CF70 = vitesse presse
const r39 = (extra) => {
  m.setInputs({ ...extra, ...entrees, "S!O5": 1 });
  m.calculer();
  return m.num("C!R39");
};
const r39Base = r39({});
const r39Multi = r39(surchargesMachines({ presse: multiprint }, 73, 2));
check(
  "mode 1-6 coul. : 225 → 175 = +28,6 % sur le roulement",
  Math.abs((r39Multi - r39Base) / r39Base - (225 / multiprint.vitesse - 1)) < 1e-6,
  `${r39Base.toFixed(2)} → ${r39Multi.toFixed(2)} = +${(((r39Multi - r39Base) / r39Base) * 100).toFixed(1)} %`,
);

// 4. FT!L4 (No. Presse) rempli automatiquement
m.setInputs({ ...surchargesMachines({ presse: cameo }), ...entrees });
m.calculer();
check("FT!L4 = nom de la presse", m.val("FT!L4") === cameo.nom, String(m.val("FT!L4")));

// 5. Zund : vitesse machine remplace le palier ≤4 up ; CF42 (cut-out) conservé
const zundJob = { ...entrees, "S!D40": 1, "S!E40": 2 }; // bloc Zund coupe actif (contour + cut-out)
const zBase = cout({ ...zundJob });
const rapide = MACHINES_CALC_SNAPSHOT.find((x) => x.nom === "Zund M-1600");
const zRapide = cout({ ...surchargesMachines({ zund: { ...rapide, vitesse: 560 } }), ...zundJob });
check("Zund 2× plus rapide → coût baisse", zRapide < zBase, `${zBase.toFixed(2)} → ${zRapide.toFixed(2)}`);
m.setInputs({ ...surchargesMachines({ zund: { ...rapide, vitesse: 560 } }), ...zundJob });
m.calculer();
check("CF42 (cut-out) conservé à 30", m.num("INV!CF42") === 30, String(m.num("INV!CF42")));

// 6. Platine : cadence + setup machine (CI54/56/60) pilotent ; matrice job par-dessus CF22-25
const platJob = { ...entrees, "S!D33": 2, "S!E33": 4 };
const pBase = cout({ ...platJob });
const mg = MACHINES_CALC_SNAPSHOT.find((x) => x.nom.startsWith("MG 18"));
const pLente = cout({ ...surchargesMachines({ platine: { ...mg, vitesse: 200 } }), ...platJob });
check("platine cadence 200 → coût monte", pLente > pBase, `${pBase.toFixed(2)} → ${pLente.toFixed(2)}`);
const pSetupLong = cout({ ...surchargesMachines({ platine: { ...mg, setup: 120 } }), ...platJob });
check("platine setup 120 min → coût monte (CI54 remplacé)", pSetupLong > pBase, pSetupLong.toFixed(2));

// 7. matrice job : X!MATRICE = 250 $ → CF22-25 remplacés → coût monte
const pMatrice = cout({ ...surchargeMatrice(250), ...platJob });
check("matrice job 250 $ → coût monte", pMatrice > pBase, `${pBase.toFixed(2)} → ${pMatrice.toFixed(2)}`);

// ── 8. INTERRUPTEUR GLOBAL DE MÉTHODE DE COÛT (lib/methodeCout.ts) ───────────
check("interrupteur global réglé sur le mode temps", METHODE_COUT === "temps", METHODE_COUT);

// 8a. en mode temps, AUCUNE surcharge machine ne contient de taux : les trois volets sont
//     identiques que CF8 vaille 73 ou 100 → cohérence temps/coût structurelle.
const surch73 = surchargesMachines({ presse: cameo, zund: rapide, platine: mg }, 73, 2);
const surch100 = surchargesMachines({ presse: cameo, zund: rapide, platine: mg }, 100, 2);
check(
  "mode temps : surcharges machine indépendantes du taux CF8",
  JSON.stringify(surch73) === JSON.stringify(surch100),
  `${Object.keys(surch73).length} cellules identiques à CF8=73 et CF8=100`,
);

// 8b. le temps AFFICHÉ se divise par le MÊME taux que celui appliqué au calcul :
//     passer CF8 de 73 à 100 doit changer le coût mais PAS le temps affiché.
const jobComplet = { ...entrees, "S!D33": 2, "S!E33": 4, "S!D40": 1, "S!E40": 2 };
const tempsAffiche = (cf8) => {
  m.setInputs({ ...surchargesMachines({ presse: cameo, zund: rapide, platine: mg }, cf8, 2), ...jobComplet, "INV!CF8": cf8 });
  m.calculer();
  return ["S!M61", "S!Q61", "S!I61"].map((c) => m.num(c) + m.num(c.replace(/M61|Q61|I61/, (x) => ({ M61: "N61", Q61: "R61", I61: "J61" })[x])) / 60);
};
const t73 = tempsAffiche(73);
const t100 = tempsAffiche(100);
check(
  "temps affiché inchangé quand CF8 passe de 73 à 100 $/h",
  t73.every((v, i) => Math.abs(v - t100[i]) < 1e-6),
  `sérigraphie/découpe/set-up : ${t73.map((v) => v.toFixed(3)).join(" · ")} h`,
);

// 8c. les trois volets migrés sont dans le MÊME mode : aucune cellule surchargée ne porte
//     de trace du machine rate (sinon elle différerait de la valeur attendue en temps pur).
const attenduTemps = {
  "INV!CH9": cameo.vitesse,
  "INV!CF39": rapide.vitesse,
  "INV!CI53": rapide.setup,
  "INV!CH20": mg.vitesse,
  "INV!CI54": mg.setup,
};
const ecarts = Object.entries(attenduTemps).filter(([c, v]) => Math.abs(Number(surch73[c]) - v) > 1e-9);
check(
  "impression + Zund + platine tous en mode temps (aucun machine rate)",
  ecarts.length === 0,
  ecarts.length ? ecarts.map(([c]) => c).join(", ") : "CH9/CF39/CI53/CH20/CI54 = vitesses et setups bruts",
);

// ── 9. FINITION MATIÈRE (laminoir / slitter / guillotine) ───────────────────
const SNAP = MACHINES_CALC_SNAPSHOT;
const lam = SNAP.find((x) => x.famille === "laminoir" && x.nom.startsWith("Wesco")); // 200 fle/h, setup 20
const sli = SNAP.find((x) => x.famille === "slitter" && x.nom.startsWith("Pierce 30")); // 500 fle/h, setup 15
const gui = SNAP.find((x) => x.famille === "guillotine" && x.nom.startsWith("Guillotine")); // setup 15

// job activant la finition : adhésif laminé (S!E22), slit (S!E28), guillotine (S!E29=1)
const jobFinition = { ...entrees, "S!E22": 1, "S!E28": 1, "S!E29": 1 };
const finBase = cout({ ...jobFinition });

// 9a. CADENCES : celles de CG égalent celles du classeur → les cellules de cadence sont
//     rigoureusement identiques aux constantes d'origine (c'est là qu'est le « faible risque »).
const surchCG = surchargesMachines({ laminoir: lam, slitter: sli, guillotine: gui }, 73, 2);
check(
  "cadences CG identiques aux constantes du classeur",
  Number(surchCG["INV!CH13"]) === 200 && Number(surchCG["INV!CH14"]) === 132 &&
    Number(surchCG["INV!CH15"]) === 200 && Number(surchCG["INV!CH16"]) === 200 &&
    Number(surchCG["INV!CI15"]) === 400 && Number(surchCG["INV!CH17"]) === 500,
  "CH13/14/15/16=200/132/200/200 · CI15=400 · CH17=500",
);

// 9b. SETUPS : CG donne 20 min au laminoir là où le classeur en met 15 → écart RÉEL et voulu
//     (« remplacer les setups CI42-47 par le temps_setup machine »). On le quantifie.
const finCG = cout({ ...surchCG, ...jobFinition });
check(
  "setups CG (20 min) remplacent ceux du classeur (15 min)",
  Number(surchCG["INV!CI42"]) === 20 && Number(surchCG["INV!CI45"]) === 20 * (20 / 15) && finCG > finBase,
  `CI42 15→${surchCG["INV!CI42"]} · CI45 20→${Number(surchCG["INV!CI45"]).toFixed(2)} · coût ${finBase.toFixed(2)} → ${finCG.toFixed(2)} (+${(finCG - finBase).toFixed(2)} $)`,
);

// 9a-bis. à setup identique au classeur, le coût est STRICTEMENT inchangé : la preuve que
//         seul l'écart de mise en train bouge, jamais le roulage.
const finCGsetup15 = cout({
  ...surchargesMachines({ laminoir: { ...lam, setup: 15 }, slitter: sli, guillotine: { ...gui, setup: 15 } }, 73, 2),
  ...jobFinition,
});
check(
  "cadences CG + setup classeur → coût strictement inchangé",
  Math.abs(finCGsetup15 - finBase) < 0.005,
  `${finBase.toFixed(2)} → ${finCGsetup15.toFixed(2)}`,
);

// 9b. un laminoir 2× plus lent fait monter le coût, et les rapports du classeur sont conservés
const surchLent = surchargesMachines({ laminoir: { ...lam, vitesse: 100 } }, 73, 2);
check(
  "laminoir 100 fle/h → cadences divisées par 2, rapports conservés",
  Math.abs(Number(surchLent["INV!CH13"]) - 100) < 1e-9 &&
    Math.abs(Number(surchLent["INV!CH14"]) - 66) < 1e-9 &&
    Math.abs(Number(surchLent["INV!CI15"]) - 200) < 1e-9,
  `CH13=${surchLent["INV!CH13"]} CH14=${surchLent["INV!CH14"]} (132×0,5) CI15=${surchLent["INV!CI15"]} (400×0,5)`,
);
check("laminoir plus lent → coût monte", cout({ ...surchLent, ...jobFinition }) > finBase, cout({ ...surchLent, ...jobFinition }).toFixed(2));

// 9c. slitter : CH17 = vitesse, CI46 = setup
const surchSlit = surchargesMachines({ slitter: { ...sli, vitesse: 250, setup: 30 } }, 73, 2);
check(
  "slitter → CH17 = vitesse, CI46 = setup",
  Number(surchSlit["INV!CH17"]) === 250 && Number(surchSlit["INV!CI46"]) === 30,
  `CH17=${surchSlit["INV!CH17"]} CI46=${surchSlit["INV!CI46"]}`,
);

// 9d. GUILLOTINE : seul le setup CI47 est câblé — aucune cadence, le tarif $/pièce (S!F29) reste
const surchGui = surchargesMachines({ guillotine: { ...gui, vitesse: 142, setup: 45 } }, 73, 2);
const cellulesGui = Object.keys(surchGui);
check(
  "guillotine : CI47 = setup et RIEN d'autre (pas de conversion de cadence)",
  cellulesGui.length === 1 && cellulesGui[0] === "INV!CI47" && Number(surchGui["INV!CI47"]) === 45,
  cellulesGui.join(", ") + " = " + surchGui["INV!CI47"],
);
m.setInputs({ ...surchGui, ...jobFinition });
m.calculer();
check("guillotine : le tarif de roulage reste la saisie S!F29", Math.abs(m.num("C!E26") - m.num("S!F29")) < 1e-9, `E26=${m.num("C!E26")} = F29=${m.num("S!F29")}`);

// 9e. la finition suit le même interrupteur global (mode temps → aucun taux dans les surcharges)
const finA = surchargesMachines({ laminoir: lam, slitter: sli, guillotine: gui }, 73, 2);
const finB = surchargesMachines({ laminoir: lam, slitter: sli, guillotine: gui }, 100, 2);
check("finition : surcharges indépendantes du taux (mode temps)", JSON.stringify(finA) === JSON.stringify(finB), `${Object.keys(finA).length} cellules`);

// ── 10. PRÉPARATION SÉRIGRAPHIE : la décomposition du classeur ne doit JAMAIS être
//     remplacée par la « mise en train » agrégée de la fiche machine (arbitrage client
//     2026-07-23). Règle affinée : la fiche machine prime quand les deux sources mesurent
//     LA MÊME opération ; quand le classeur décompose plus finement, on garde le classeur.
const CELLULES_PREPARATION = [
  "INV!CI71", "INV!CI72", "INV!CI73", // montage soie 60/75/90 min, par écran et par gabarit
  "INV!CI79", "INV!CI80", "INV!CI81", // nettoyage 20/23/25 min
  "INV!CF64", "INV!CF65", "INV!CF66", "INV!CF67", // set-up 3/4/5/6 couleurs 110-150 min
  "INV!CF20", // émulsion / exposition par soie
];
const surchPresse = surchargesMachines({ presse: { ...cameo, setup: 30 } }, 73, 2);
const touchees = CELLULES_PREPARATION.filter((c) => c in surchPresse);
check(
  "préparation sérigraphie jamais surchargée par la fiche presse",
  touchees.length === 0,
  touchees.length ? "SURCHARGÉES : " + touchees.join(", ") : "CI71-73 · CI79-81 · CF64-67 · CF20 intactes",
);
// et le coût de préparation ne bouge pas d'un centime quel que soit le setup de la fiche
const prep = (setup) => {
  m.setInputs({ ...surchargesMachines({ presse: { ...cameo, setup } }, 73, 2), ...entrees });
  m.calculer();
  return m.num("C!G13");
};
const prep30 = prep(30), prep120 = prep(120);
check(
  "coût de préparation (C!G13) insensible à la mise en train de la fiche",
  Math.abs(prep30 - prep120) < 1e-9,
  `setup 30 min → ${prep30.toFixed(2)} $ · setup 120 min → ${prep120.toFixed(2)} $`,
);

const ok = checks.every(Boolean);
console.log(ok ? "✔ TOUT OK — feuille de route respectée" : "✘ ÉCHEC");
process.exit(ok ? 0 : 1);
