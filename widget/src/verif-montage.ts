// Validation du module de montage (imposition).
//
//   npm run verif:montage
//
// Trois choses à prouver :
//   1. `upParAxe` est l'inverse EXACT de la formule du classeur (FT!AF39) — aller-retour sur
//      des milliers de combinaisons, avec les deux garde-fous : le montage doit tenir dans la
//      feuille, et un up de plus doit la dépasser.
//   2. Les cellules espace/pourtour lues dans le classeur sont bien 0,25 et 0,5.
//   3. Les cas de test du handoff du 2 novembre.
import { Moteur, type Classeur } from "@/lib/moteur";
import { IN, entreesExemple } from "@/lib/modele";
import { fusionnerMachines, machinesFamille } from "@/lib/machines";
import classeurJson from "@/data/classeur.json";
import {
  upParAxe,
  dimensionMontage,
  evaluerFormat,
  choisirMontage,
  reglesMontage,
  REGLES_MONTAGE_DEFAUT,
  CELL_ESPACE_UP,
  CELL_POURTOUR,
  type FormatFeuille,
  type PresseFormat,
} from "@/lib/montage";
import { FORMATS_FEUILLE_SNAPSHOT, FORMAT_MAX_PRESSE_CLIENT_2NOV } from "@/data/montageSnapshot";

const CLASSEUR = classeurJson as unknown as Classeur;
let echecs = 0;
const ok = (b: boolean) => {
  if (!b) echecs++;
  return b ? "OK   " : "ECHEC";
};

// ── 1. aller-retour contre la formule du classeur ────────────────────────────
console.log("=== 1. INVERSION DE FT!AF39 — aller-retour ===");
console.log("formule directe  : dim = piece*N + espace*(N-1) + 2*pourtour");
console.log("formule inversee : N = plancher((dim - 2*pourtour + espace) / (piece + espace))");

let cas = 0;
let mauvais = 0;
const exemplesMauvais: string[] = [];
for (const espace of [0, 0.125, 0.25, 0.5]) {
  for (const pourtour of [0, 0.25, 0.5, 1]) {
    for (const piece of [0.4, 1.4, 2, 3.125, 7, 11.5, 23]) {
      for (const dim of [8, 12, 16, 21, 24, 28, 30, 36, 39, 44, 48, 50, 64, 96]) {
        cas++;
        const n = upParAxe(dim, piece, espace, pourtour);
        if (n === 0) {
          // la piece ne tient pas : 1 up doit effectivement deborder
          if (dimensionMontage(1, piece, espace, pourtour) <= dim + 1e-9) {
            mauvais++;
            if (exemplesMauvais.length < 5) exemplesMauvais.push(`0 up annonce mais 1 tient : dim=${dim} piece=${piece} e=${espace} p=${pourtour}`);
          }
          continue;
        }
        const tient = dimensionMontage(n, piece, espace, pourtour) <= dim + 1e-9;
        const unDePlusDeborde = dimensionMontage(n + 1, piece, espace, pourtour) > dim + 1e-9;
        if (!tient || !unDePlusDeborde) {
          mauvais++;
          if (exemplesMauvais.length < 5)
            exemplesMauvais.push(
              `dim=${dim} piece=${piece} e=${espace} p=${pourtour} -> N=${n}, occupe=${dimensionMontage(n, piece, espace, pourtour)}, N+1=${dimensionMontage(n + 1, piece, espace, pourtour)}`,
            );
        }
      }
    }
  }
}
console.log(`cas testes : ${cas} | incoherents : ${mauvais}`);
for (const e of exemplesMauvais) console.log("   ", e);
console.log(ok(mauvais === 0), "N est bien le maximum qui tient dans la feuille");

// reproduction exacte des valeurs mises en cache par Excel dans la grille FT
const moteur = new Moteur(CLASSEUR);
moteur.calculer();
const espaceClasseur = Number(moteur.val(CELL_ESPACE_UP));
const pourtourClasseur = Number(moteur.val(CELL_POURTOUR));
console.log("\n=== 2. CELLULES DU CLASSEUR ===");
console.log(`${CELL_ESPACE_UP} (espace entre up)      :`, espaceClasseur);
console.log(`${CELL_POURTOUR} (pourtour de la feuille):`, pourtourClasseur);
console.log(ok(espaceClasseur === 0.25), "espace = 0,25 po");
console.log(ok(pourtourClasseur === 0.5), "pourtour = 0,5 po/cote");

// la grille FT, sens direct : piece 7 x 1,4 avec 1 up horizontal et 4 verticaux -> 8 x 7,35
const dimH = dimensionMontage(1, 7, espaceClasseur, pourtourClasseur);
const dimV = dimensionMontage(4, 1.4, espaceClasseur, pourtourClasseur);
console.log(`FT!AF39 attendu 8     -> ${dimH}`);
console.log(`FT!AI39 attendu 7,35  -> ${dimV}`);
console.log(ok(Math.abs(dimH - 8) < 1e-9 && Math.abs(dimV - 7.35) < 1e-9), "la formule directe reproduit le cache Excel");

// ── 3. cas de test du handoff ────────────────────────────────────────────────
console.log("\n=== 3. CAS DE TEST DU HANDOFF (2 nov.) ===");
const regles = reglesMontage({ espace: espaceClasseur, pourtour: pourtourClasseur });
const toutesPresses: PresseFormat[] = [{ nom: "(test)", largeurMaxPo: 999, hauteurMaxPo: 999 }];
const f = (largeurPo: number, hauteurPo: number): FormatFeuille => ({ nom: `${largeurPo} × ${hauteurPo}`, largeurPo, hauteurPo, actif: true });

const c1 = evaluerFormat(f(24, 48), 7, 1.4, 2000, regles, toutesPresses)!;
console.log(`piece 7 x 1,4 sur 24 x 48 : ${c1.upHorizontal} x ${c1.upVertical} = ${c1.upParFeuille} up/feuille`);
console.log(ok(c1.upParFeuille === 84), "attendu 84 up/feuille (3 x 28)");
console.log(`2000 pieces -> ${c1.nbFeuilles} feuilles`);
console.log(ok(c1.nbFeuilles === 24), "attendu 24 feuilles");

const c2 = evaluerFormat(f(12, 24), 7, 1.4, 2000, regles, toutesPresses)!;
console.log(`\npiece 7 x 1,4 sur 12 x 24 : ${c2.upHorizontal} x ${c2.upVertical} = ${c2.upParFeuille} up/feuille`);
console.log(`   le handoff annonce 1 x 13 = 13`);
console.log(`   detail : hauteur (24 - 1 + 0,25) / (1,4 + 0,25) = ${((24 - 1 + 0.25) / 1.65).toFixed(4)} -> ${c2.upVertical}`);
console.log(`   verification : 14 up occupent ${dimensionMontage(14, 1.4, 0.25, 0.5)} po <= 24 po, donc 14 tiennent`);
console.log(`                  13 up occupent ${dimensionMontage(13, 1.4, 0.25, 0.5)} po — il reste de la place`);
console.log(ok(c2.upParFeuille === 14), "le calcul donne 14 : le 13 du handoff est une erreur d'arithmetique");

// ── 4. selection complete ────────────────────────────────────────────────────
console.log("\n=== 4. SELECTION SUR LES 9 FORMATS PERMIS (piece 7 x 1,4 ; 2000 pieces) ===");
console.log("--- avec les formats maxi du CLIENT (2 nov.) ---");
const rc = choisirMontage(FORMATS_FEUILLE_SNAPSHOT, FORMAT_MAX_PRESSE_CLIENT_2NOV, 7, 1.4, 2000, regles);
for (const c of rc.candidats)
  console.log(`   ${c.format.nom.padEnd(9)} ${String(c.upParFeuille).padStart(3)} up/f  ${String(c.nbFeuilles).padStart(4)} feuilles   presses: ${c.presses.join(", ") || "aucune"}`);
for (const e of rc.ecartes) console.log(`   ecarte ${e.format.nom.padEnd(9)} — ${e.raison}`);
console.log(`   => retenu : ${rc.meilleur?.format.nom} (${rc.meilleur?.upParFeuille} up/f, ${rc.meilleur?.nbFeuilles} feuilles)`);
console.log(ok(rc.meilleur?.format.nom === "24 × 48"), "retenu = 24 × 48 (le plus grand format gagne sur une piece allongee)");

console.log("\n--- avec les fiches machines CREATOR (relevees le 3 nov.) ---");
const pressesCreator: PresseFormat[] = [
  { nom: "Cameo 18 no.116", largeurMaxPo: 12, hauteurMaxPo: 8 },
  { nom: "Cameo 30SS no.110", largeurMaxPo: 26, hauteurMaxPo: 18 },
  { nom: "Svecia no.130", largeurMaxPo: 21, hauteurMaxPo: 28 },
  { nom: "Saturn no.140", largeurMaxPo: 25, hauteurMaxPo: 38 },
  { nom: "Viking no.150", largeurMaxPo: 30, hauteurMaxPo: 50 },
  { nom: "Renegade 170", largeurMaxPo: 30, hauteurMaxPo: 40 },
  { nom: "Multiprint IST no.182", largeurMaxPo: 24, hauteurMaxPo: 44 },
  { nom: "One man", largeurMaxPo: 48, hauteurMaxPo: 96 },
];
const rcr = choisirMontage(FORMATS_FEUILLE_SNAPSHOT, pressesCreator, 7, 1.4, 2000, regles);
for (const c of rcr.candidats)
  console.log(`   ${c.format.nom.padEnd(9)} ${String(c.upParFeuille).padStart(3)} up/f  ${String(c.nbFeuilles).padStart(4)} feuilles   presses: ${c.presses.length}`);
for (const e of rcr.ecartes) console.log(`   ecarte ${e.format.nom.padEnd(9)} — ${e.raison}`);
console.log(`   => retenu : ${rcr.meilleur?.format.nom} (${rcr.meilleur?.nbFeuilles} feuilles)`);
// Le conflit ne retire aucun format de la liste (d'autres presses les roulent) : il porte sur
// la presse 116. Avec sa fiche Creator (12 x 8), elle ne peut rouler AUCUN des 9 formats
// permis — pas meme le 16 x 12 qui n'existe dans la liste que pour elle, ni le 12 x 12.
const roulablesPar116 = FORMATS_FEUILLE_SNAPSHOT.filter((x) => x.largeurPo <= 12 && x.hauteurPo <= 8);
console.log(`   formats des 9 que la fiche Creator du 116 (12 x 8) peut rouler : ${roulablesPar116.length}`);
console.log(
  ok(roulablesPar116.length === 0),
  "presse 116 : sa fiche Creator ne lui permet aucun des 9 formats — c'est le conflit a trancher",
);
const c116 = FORMAT_MAX_PRESSE_CLIENT_2NOV.find((x) => x.nom === "116")!;
console.log(
  ok(FORMATS_FEUILLE_SNAPSHOT.some((x) => x.largeurPo <= (c116.largeurMaxPo ?? 0) && x.hauteurPo <= (c116.hauteurMaxPo ?? 0))),
  "avec le format maxi annonce par le client (16 x 12), le 116 roule bien le format 16 x 12",
);

// ── 5. garde-fous ────────────────────────────────────────────────────────────
console.log("\n=== 5. GARDE-FOUS ===");
const sansQte = choisirMontage(FORMATS_FEUILLE_SNAPSHOT, FORMAT_MAX_PRESSE_CLIENT_2NOV, 7, 1.4, 0, regles);
console.log(ok(sansQte.meilleur === null), "quantite 0 -> aucune suggestion, pas de division par zero");
const sansDim = choisirMontage(FORMATS_FEUILLE_SNAPSHOT, FORMAT_MAX_PRESSE_CLIENT_2NOV, 0, 0, 2000, regles);
console.log(ok(sansDim.meilleur === null), "dimensions manquantes -> aucune suggestion");
const tropGrande = choisirMontage(FORMATS_FEUILLE_SNAPSHOT, FORMAT_MAX_PRESSE_CLIENT_2NOV, 60, 60, 10, regles);
console.log(ok(tropGrande.meilleur === null), "piece plus grande que toute feuille -> aucune suggestion");

// dimension minimale : 8 po. Aucun des 9 formats n'a de cote sous 8, donc on le prouve sur un
// format ajoute expres.
const avecPetit = choisirMontage([...FORMATS_FEUILLE_SNAPSHOT, f(6, 20)], FORMAT_MAX_PRESSE_CLIENT_2NOV, 2, 2, 100, regles);
console.log(
  ok(avecPetit.ecartes.some((e) => e.format.nom === "6 × 20" && e.raison.includes("dimension minimale"))),
  "un format a 6 po de cote est ecarte par la dimension minimale (8 po)",
);

// grain libre : la piece peut tourner
const grainLibre = { ...regles, grainFige: false };
const tournee = evaluerFormat(f(24, 12), 11, 3, 100, grainLibre, toutesPresses)!;
const figee = evaluerFormat(f(24, 12), 11, 3, 100, regles, toutesPresses)!;
console.log(
  `\ngrain fige  : ${figee.upHorizontal} x ${figee.upVertical} = ${figee.upParFeuille} up | grain libre : ${tournee.upHorizontal} x ${tournee.upVertical} = ${tournee.upParFeuille} up (tournee=${tournee.pieceTournee})`,
);
console.log(ok(tournee.upParFeuille >= figee.upParFeuille), "grain libre ne fait jamais moins bien que grain fige");

// seuil
console.log("\n=== 6. SEUIL DE DECLENCHEMENT ===");
console.log("seuil retenu :", regles.seuilFeuilles, "feuilles");
// La base n'est pas inventee : c'est le nombre de feuilles qu'un format reel demanderait.
// Atelier tournant sur du 12 x 24 (14 up/feuille) pour une piece 7 x 1,4.
const QTE = 30000;
const baseReelle = evaluerFormat(f(12, 24), 7, 1.4, QTE, regles, toutesPresses)!.nbFeuilles;
const grosJob = choisirMontage(FORMATS_FEUILLE_SNAPSHOT, FORMAT_MAX_PRESSE_CLIENT_2NOV, 7, 1.4, QTE, regles, baseReelle);
const petitJob = choisirMontage(FORMATS_FEUILLE_SNAPSHOT, FORMAT_MAX_PRESSE_CLIENT_2NOV, 7, 1.4, 2000, regles, 143);
console.log(`${QTE} pieces sur 12 x 24 (format courant) : ${baseReelle} feuilles`);
console.log(`   -> recommande ${grosJob.meilleur?.format.nom} : ${grosJob.meilleur?.nbFeuilles} feuilles`);
console.log(`   -> seuilAtteint=${grosJob.seuilAtteint}, gain=${grosJob.gainFeuilles} feuilles`);
console.log(`2000 pieces sur 12 x 24 : base ${petitJob.feuillesBase} feuilles -> seuilAtteint=${petitJob.seuilAtteint}, gain=${petitJob.gainFeuilles}`);
console.log(ok(!petitJob.seuilAtteint), "un job de 143 feuilles ne declenche rien (sous le seuil de 350)");
console.log(ok(grosJob.seuilAtteint), `un job de ${baseReelle} feuilles declenche`);
console.log(ok((grosJob.gainFeuilles ?? 0) > 0), "le gain annonce est positif");
console.log(
  ok(grosJob.gainFeuilles === baseReelle - (grosJob.meilleur?.nbFeuilles ?? 0)),
  "gain = feuilles du format courant - feuilles du format recommande",
);

// -- 7. integration reelle : memes entrees que l'ecran -----------------------
// Reproduit ce que fait le useMemo de App.tsx : regles lues dans le moteur, presses tirees
// des fiches machines, dimensions et quantite du scenario Exemple.
console.log("");
console.log("=== 7. INTEGRATION (scenario Exemple, comme l'ecran) ===");
const mEx = new Moteur(CLASSEUR);
mEx.setInputs(entreesExemple(CLASSEUR));
mEx.calculer();
const reglesEcran = reglesMontage({ espace: mEx.val(CELL_ESPACE_UP), pourtour: mEx.val(CELL_POURTOUR) }, undefined);
const pressesFiches: PresseFormat[] = machinesFamille(fusionnerMachines(null), "presse").map((m) => ({
  nom: m.nom,
  largeurMaxPo: m.largeurPo,
  hauteurMaxPo: m.hauteurPo,
}));
const pieceX = Number(mEx.val(IN.dimPceX));
const pieceY = Number(mEx.val(IN.dimPceY));
const qteEx = Number(mEx.val(IN.quantite));
const feuillesFT = Number(mEx.val("FT!E44"));
console.log(`piece ${pieceX} x ${pieceY} po | quantite ${qteEx} | FT!E44 (feuilles classeur) = ${feuillesFT}`);
const avecFormat = pressesFiches.filter((x) => x.largeurMaxPo && x.hauteurMaxPo).length;
console.log(`presses avec format maxi renseigne : ${avecFormat}/${pressesFiches.length}`);
const rEx = choisirMontage(FORMATS_FEUILLE_SNAPSHOT, pressesFiches, pieceX, pieceY, qteEx, reglesEcran, feuillesFT > 0 ? feuillesFT : null);
console.log(`=> meilleur ${rEx.meilleur?.format.nom} : ${rEx.meilleur?.upParFeuille} up/f, ${rEx.meilleur?.nbFeuilles} feuilles | seuilAtteint=${rEx.seuilAtteint}`);
console.log(ok(rEx.meilleur !== null), "le scenario Exemple produit une suggestion calculable");
console.log(ok(!rEx.seuilAtteint), `a ${qteEx} pieces le bloc reste masque (sous le seuil) -- comportement voulu`);
const qteGrosse = 40000;
const rGros = choisirMontage(FORMATS_FEUILLE_SNAPSHOT, pressesFiches, pieceX, pieceY, qteGrosse, reglesEcran, null);
console.log("");
console.log(`a ${qteGrosse} pieces : ${rGros.meilleur?.format.nom}, ${rGros.meilleur?.nbFeuilles} feuilles | seuilAtteint=${rGros.seuilAtteint}`);
console.log(ok(rGros.seuilAtteint), "le bloc s'affiche au-dela du seuil");
console.log(ok(rGros.meilleur!.presses.length > 0), `le format retenu est roulable : ${rGros.meilleur!.presses.join(", ")}`);
console.log("\n=== DEFAUTS ===", JSON.stringify(REGLES_MONTAGE_DEFAUT));
console.log(echecs === 0 ? "\n>>> TOUT PASSE" : `\n>>> ${echecs} ECHEC(S)`);
process.exit(echecs === 0 ? 0 : 1);
