// Validation du formulaire intelligent « Production numérique ».
//
//   npm run verif:numerique
//
// Ce qu'il faut prouver :
//   1. La configuration est cohérente (aucune condition qui masque un champ pour toujours).
//   2. Les options sont EXACTEMENT celles des feuilles produit du client — comptées une par une.
//   3. Un seul encadré de produit à la fois.
//   4. Les affichages conditionnels (substrat, installation, « autre finition »).
//   5. Changer de produit vide l'ancien SANS effacer les champs communs encore valides.
//   6. Les validations de l'étape 7, dont le laminage obligatoire des autocollants.
//   7. Les dimensions : conversion des millimètres, et format catalogue du roll-up.
//   8. Les œillets : la formule du handoff, et son plancher de 4.
import {
  blocsVisibles,
  champsAVider,
  champsDuProduit,
  champsVisibles,
  constantesProduit,
  controlerNumerique,
  dimensionsProduit,
  enPouces,
  espacementOeillets,
  incoherencesConfig,
  listeValeurs,
  materiauxPermis,
  nbOeillets,
  optionUnique,
  optionsTypeProduit,
  postesACouter,
  produitsActifs,
  trouverProduit,
  viderChamps,
  type ValeursNum,
} from "@/lib/numerique";
import { CONFIG_CHAMPS_NUMERIQUE, PRODUITS_NUMERIQUES } from "@/data/produitsNumeriques";

let echecs = 0;
const ok = (b: boolean) => {
  if (!b) echecs++;
  return b ? "OK   " : "ECHEC";
};
const nb = (produit: string, prefixe: string) => champsDuProduit(produit).filter((c) => c.champ.startsWith(prefixe)).length;

// ── 1. coherence de la configuration ────────────────────────────────────────
console.log("=== 1. COHERENCE DE LA CONFIGURATION ===");
console.log(`lignes de configuration : ${CONFIG_CHAMPS_NUMERIQUE.length}`);
const inc = incoherencesConfig();
for (const i of inc) console.log("   !", i);
console.log(ok(inc.length === 0), "aucune condition ne pointe vers un champ ou une valeur inexistants");

// un meme champ ne doit pas etre declare deux fois pour le meme produit
let doublons = 0;
for (const p of PRODUITS_NUMERIQUES) {
  const vus = new Set<string>();
  for (const c of champsDuProduit(p.code)) {
    if (vus.has(c.champ)) {
      doublons++;
      console.log(`   ! ${p.code} : ${c.champ} declare deux fois`);
    }
    vus.add(c.champ);
  }
}
console.log(ok(doublons === 0), "aucun champ declare deux fois pour un meme produit");

// un ordre en double rendrait l'affichage dependant de l'ordre de lecture de la table
let ordresEnDouble = 0;
for (const p of produitsActifs()) {
  const parBloc = new Map<string, Set<number>>();
  for (const c of champsDuProduit(p.code)) {
    const s = parBloc.get(c.bloc) ?? new Set<number>();
    if (s.has(c.ordre)) {
      ordresEnDouble++;
      console.log(`   ! ${p.code}/${c.bloc} : ordre ${c.ordre} en double`);
    }
    s.add(c.ordre);
    parBloc.set(c.bloc, s);
  }
}
console.log(ok(ordresEnDouble === 0), "aucun ordre en double a l'interieur d'un bloc");

console.log(`\nproduits actifs  : ${optionsTypeProduit().join(" | ")}`);
const aVenir = PRODUITS_NUMERIQUES.filter((p) => !p.actif);
console.log(`produits a venir : ${aVenir.map((p) => p.libelle).join(" | ")}`);
console.log(ok(produitsActifs().length === 4), "4 produits actifs — les 4 feuilles client recues");
console.log(ok(aVenir.length === 2 && aVenir.every((p) => !!p.note)), "2 produits a venir, chacun avec la raison ecrite");

// ── 2. les options sont celles des feuilles client ──────────────────────────
console.log("\n=== 2. OPTIONS DES FEUILLES PRODUIT (comptees une par une) ===");
const attendu: [string, number, string][] = [
  ["Auto_Media", 7, "Permanent, Amovible, Mural, Clair, Perfore 60/40, Perfore 70/30, Vinyle super adhesif"],
  ["Auto_Impr_couleur", 3, "4 coul. process / + blanc / blanc seulement"],
  ["Auto_Laminage", 4, "Glace, Lustre, Mat, Antiderapant — AUCUNE option « Aucun » : le laminage est obligatoire"],
  ["Auto_Finition", 6, "Coupe, Decoupe forme, Decoupe multiple, Kiss-cut, Slit, Lettrage + transfert"],
  ["Auto_Montage", 3, "Aucun / substrat client / substrat Artistic"],
  ["Pan_Materiel", 8, "Coroplast, Foam core, Styrene, Sintra, Dibond, Carton, Polycarbonate, Acrylique"],
  ["Pan_Impr_methode", 2, "impression directe / vinyle contrecolle"],
  ["Pan_Laminage", 4, "Aucun, Glace, Lustre, Mat — ici « Aucun » existe : laminage facultatif"],
  ["Pan_Finition", 6, "Coupe, Decoupe forme, Coins arrondis, Percage/oeillets, Ruban double face, Velcro"],
  ["Ban_Materiel", 4, "Ext. 18 oz, Int. 15 oz, Mesh, Blockout"],
  ["Ban_Finition", 5, "oeillets 24 po, oeillets 12 po, ourlet haut, ourlet bas, autre"],
  ["Retr_Modele", 2, "Economique / Luxe"],
  ["Retr_Format", 2, "33 x 80 / 48 x 80"],
];
for (const [champ, n, detail] of attendu) {
  const c = CONFIG_CHAMPS_NUMERIQUE.find((x) => x.champ === champ);
  const reel = c?.options.length ?? -1;
  console.log(`${ok(reel === n)} ${champ.padEnd(20)} ${String(reel).padStart(2)} options (attendu ${n}) — ${detail}`);
}

// Le laminage des autocollants ne doit SURTOUT pas offrir « Aucun » : ce serait contourner
// l'obligation en la respectant formellement.
const lamAuto = CONFIG_CHAMPS_NUMERIQUE.find((x) => x.champ === "Auto_Laminage")!;
console.log(ok(!lamAuto.options.includes("Aucun") && lamAuto.requis), "laminage autocollants : requis ET sans option « Aucun »");
const lamPan = CONFIG_CHAMPS_NUMERIQUE.find((x) => x.champ === "Pan_Laminage")!;
console.log(ok(lamPan.options.includes("Aucun")), "laminage panneaux : « Aucun » disponible (facultatif, mais il faut choisir)");

// constantes du roll-up : des constantes, pas des questions
const cstRollup = constantesProduit("rollup");
console.log(`\nconstantes roll-up : ${JSON.stringify(cstRollup)}`);
console.log(ok(cstRollup.Retr_Materiel === "Vinyle 9 oz à dos gris" && !!cstRollup.Retr_Impr_face), "le materiel et la face du roll-up sont des constantes");
console.log(
  ok(!champsDuProduit("rollup").some((c) => c.champ === "Retr_Materiel" || c.champ === "Retr_Impr_face")),
  "elles ne sont PAS posees comme questions a l'ecran",
);

// une option unique = une constante deguisee en question dans la feuille client
const uniques = optionUnique();
for (const u of uniques) console.log(`   option unique : ${u.champ} = « ${u.options[0]} »`);
console.log(ok(uniques.length === 1 && uniques[0].champ === "Ban_Impr_couleur"), "un seul champ a option unique : Ban_Impr_couleur (a signaler au client)");

// ── 3. un seul encadre de produit a la fois ─────────────────────────────────
console.log("\n=== 3. UN SEUL ENCADRE DE PRODUIT A LA FOIS ===");
const PREFIXES: Record<string, string> = { autocollants: "Auto_", panneaux: "Pan_", bannieres: "Ban_", rollup: "Retr_" };
for (const [code, prefixe] of Object.entries(PREFIXES)) {
  const champs = champsVisibles(code, {});
  const etrangers = champs.filter((c) => /^(Auto_|Pan_|Ban_|Retr_)/.test(c.champ) && !c.champ.startsWith(prefixe));
  const siens = champs.filter((c) => c.champ.startsWith(prefixe)).length;
  console.log(`${ok(etrangers.length === 0 && siens > 0)} ${code.padEnd(13)} ${siens} champs propres, ${etrangers.length} champ(s) d'un autre produit`);
}
// L'ORDRE des blocs, pas seulement leur contenu. `ordre` est une numerotation GLOBALE :
// un champ commun et un champ de produit qui partagent un numero s'entrelacent au tri, et
// l'ecran affiche alors deux fois le meme bloc, les questions du produit AVANT le champ qui
// choisit le produit. D'ou les bandes d'ordre, et ces controles.
console.log("");
for (const p of produitsActifs()) {
  const blocs = blocsVisibles(p.code, {}).map((b) => b.bloc);
  const sansDoublon = new Set(blocs).size === blocs.length;
  console.log(`${ok(sansDoublon)} ${p.code.padEnd(13)} ${blocs.join(" > ")}`);
}
for (const p of produitsActifs()) {
  const blocs = blocsVisibles(p.code, {}).map((b) => b.bloc);
  console.log(
    ok(blocs[0] === "Numérique" && blocs[blocs.length - 1] === "Notes / précisions"),
    `${p.code} : le bloc pilote est en premier, les notes en dernier`,
  );
}
// l'encadre du produit est groupe, entre le bloc pilote et les sections communes
const blocsAuto = blocsVisibles("autocollants", {}).map((b) => b.bloc);
console.log(
  ok(blocsAuto.indexOf("Média / matière adhésive") === 1 && blocsAuto.indexOf("Dimensions") > blocsAuto.indexOf("Montage sur substrat")),
  "l'encadre du produit est groupe, entre le bloc pilote et les sections communes",
);

// le garde-fou attrape-t-il une renumerotation fautive faite dans Creator ?
const configCassee = CONFIG_CHAMPS_NUMERIQUE.map((c) => (c.champ === "Num_Usage" ? { ...c, ordre: 150 } : c));
const incCassee = incoherencesConfig(configCassee);
for (const i of incCassee) console.log(`   detecte : ${i}`);
console.log(
  ok(incCassee.some((i) => i.includes("coupé en deux"))),
  "un bloc coupe en deux par la numerotation est DETECTE, pas decouvert a l'ecran",
);

// ── 4. affichages conditionnels ─────────────────────────────────────────────
console.log("\n=== 4. AFFICHAGES CONDITIONNELS ===");
const visible = (produit: string, valeurs: ValeursNum, champ: string) => champsVisibles(produit, valeurs).some((c) => c.champ === champ);

console.log(ok(!visible("autocollants", { Auto_Montage: "Aucun" }, "Auto_Substrat_type")), "montage « Aucun » -> les champs de substrat sont masques");
console.log(ok(visible("autocollants", { Auto_Montage: "Substrat fourni par Artistic" }, "Auto_Substrat_type")), "montage substrat -> les champs de substrat apparaissent");
console.log(ok(!visible("panneaux", { Num_Installation: "Non requise" }, "Num_Install_lieu")), "installation « Non requise » -> adresse masquee");
console.log(ok(visible("panneaux", { Num_Installation: "Demandée" }, "Num_Install_lieu")), "installation « Demandee » -> adresse affichee");

// le parent est un MULTI : la condition doit tester l'appartenance, pas l'egalite
console.log(ok(!visible("bannieres", { Ban_Finition: ["Ourlet en haut"] }, "Ban_Finition_autre")), "finition sans « Autre » -> pas de champ de precision");
console.log(ok(visible("bannieres", { Ban_Finition: ["Ourlet en haut", "Autre finition"] }, "Ban_Finition_autre")), "« Autre finition » cochee parmi d'autres -> champ de precision affiche");
console.log(ok(visible("bannieres", { Ban_Finition: "Ourlet en bas;Autre finition" }, "Ban_Finition_autre")), "meme chose depuis la forme stockee « a;b » de Creator");

// roll-up : pas d'installation, et pas de dimensions libres
console.log(ok(!visible("rollup", { Num_Installation: "Demandée" }, "Num_Install_lieu")), "roll-up : aucune installation, meme si le champ porte une valeur");
console.log(ok(!visible("rollup", {}, "Num_Largeur")), "roll-up : pas de largeur libre — le format catalogue la donne");
console.log(ok(visible("bannieres", {}, "Num_Largeur")), "banniere : largeur libre demandee");

// ── 5. changer de produit ───────────────────────────────────────────────────
console.log("\n=== 5. CHANGER DE PRODUIT VIDE L'ANCIEN ===");
const saisieAuto: ValeursNum = {
  Num_Usage: "Extérieur",
  Num_Type_produit: "Autocollants / décalques",
  Num_Unite: "Pouces",
  Num_Largeur: 10,
  Num_Hauteur: 4,
  Num_Quantite: 500,
  Num_Infographie: "Fichier fourni par le client",
  Num_Installation: "Demandée",
  Num_Install_lieu: "1234 rue Principale, Laval",
  Auto_Media: "Permanent",
  Auto_Laminage: "Mat",
  Auto_Montage: "Aucun",
};
const vAuto = champsAVider("autocollants", "panneaux");
console.log(`autocollants -> panneaux : ${vAuto.length} champs vides (${nb("autocollants", "Auto_")} champs Auto_)`);
console.log(ok(vAuto.length === nb("autocollants", "Auto_") && vAuto.every((c) => c.startsWith("Auto_"))), "seuls les champs de l'ancien produit sont vides");
const apresAuto = viderChamps(saisieAuto, vAuto);
console.log(
  ok(apresAuto.Num_Largeur === 10 && apresAuto.Num_Install_lieu === "1234 rue Principale, Laval" && apresAuto.Auto_Media === undefined),
  "les champs communs survivent, les champs du produit disparaissent",
);
console.log(ok(saisieAuto.Auto_Media === "Permanent"), "l'objet d'origine n'est pas mute");

// vers le roll-up : les communs exclus doivent partir aussi, sinon ils restent en base
const vRollup = champsAVider("panneaux", "rollup");
const apresRollup = viderChamps(saisieAuto, vRollup);
console.log(`\npanneaux -> roll-up : ${vRollup.length} champs vides`);
console.log(
  ok(vRollup.includes("Num_Install_lieu") && vRollup.includes("Num_Largeur") && vRollup.includes("Num_Unite")),
  "les champs communs dont le roll-up est exclu sont vides (sinon : donnee orpheline invisible)",
);
console.log(ok(apresRollup.Num_Quantite === 500 && apresRollup.Num_Install_lieu === undefined), "la quantite reste, l'adresse d'installation part");
console.log(ok(champsAVider("", "panneaux").length === 0), "premier choix de produit : rien a vider");

// ── 6. validations de l'etape 7 ─────────────────────────────────────────────
console.log("\n=== 6. VALIDATIONS (ETAPE 7) ===");
const bloquants = (produit: string, valeurs: ValeursNum) => controlerNumerique(produit, valeurs).filter((c) => c.type === "bloquant");

const vide = bloquants("autocollants", {});
console.log(`autocollants vierge : ${vide.length} bloquants`);
for (const b of vide) console.log(`   - ${b.message}`);
console.log(ok(vide.some((b) => b.cle === "num-requis-Auto_Laminage")), "le laminage obligatoire est bloquant quand il manque");
console.log(
  ok(!vide.some((b) => b.cle === "num-requis-Auto_Substrat_type")),
  "un requis MASQUE ne bloque pas (on ne bloque pas sur un champ invisible)",
);

const complet: ValeursNum = {
  Num_Usage: "Intérieur",
  Num_Type_produit: "Autocollants / décalques",
  Num_Unite: "Pouces",
  Num_Largeur: 10,
  Num_Hauteur: 4,
  Num_Quantite: 500,
  Num_Infographie: "Fichier fourni par le client",
  Num_Installation: "Non requise",
  Auto_Media: "Permanent",
  Auto_Impr_face: "Recto",
  Auto_Impr_couleur: "4 couleurs process",
  Auto_Laminage: "Mat",
  Auto_Montage: "Aucun",
};
const rienAuto = bloquants("autocollants", complet);
for (const b of rienAuto) console.log(`   reste : ${b.message}`);
console.log(ok(rienAuto.length === 0), "autocollants complet : plus aucun bloquant");

// substrat : la condition cree de nouveaux requis
const avecSubstrat = bloquants("autocollants", { ...complet, Auto_Montage: "Substrat fourni par Artistic" });
console.log(ok(avecSubstrat.length === 3), `montage substrat -> 3 nouveaux requis (type, dim, qte) : ${avecSubstrat.length}`);

// installation : pareil
const avecInstall = bloquants("panneaux", {
  Num_Usage: "Extérieur",
  Num_Type_produit: "Panneaux (matières rigides)",
  Num_Unite: "Pouces",
  Num_Largeur: 24,
  Num_Hauteur: 36,
  Num_Quantite: 20,
  Num_Infographie: "Fichier fourni par le client",
  Num_Installation: "Demandée",
  Pan_Materiel: "Coroplast",
  Pan_Impr_face: "Recto",
  Pan_Impr_couleur: "4 couleurs process",
  Pan_Impr_methode: "Impression directe sur le matériel",
  Pan_Laminage: "Aucun",
});
console.log(`installation demandee -> ${avecInstall.length} requis restants : ${avecInstall.map((b) => b.cle.replace("num-requis-", "")).join(", ")}`);
console.log(ok(avecInstall.length === 4), "4 requis (lieu, surface, quantite, date)");

// produits a venir et cas limites
console.log(ok(bloquants("faces_graphiques", {}).some((b) => b.cle === "num-produit-a-venir")), "un produit a venir est bloquant, avec la raison");
console.log(ok(bloquants("", {}).some((b) => b.cle === "num-produit")), "aucun produit choisi : bloquant clair");
console.log(ok(bloquants("tapis-de-souris", {}).some((b) => b.cle === "num-produit-inconnu")), "produit inconnu : bloquant, pas un plantage");
console.log(ok(trouverProduit("Autocollants / décalques")?.code === "autocollants"), "un produit se retrouve par son libelle comme par son code");

// une case non cochee n'est pas un vide
const rollupComplet: ValeursNum = {
  Num_Usage: "Intérieur",
  Num_Type_produit: "Bannière rétractable (roll-up)",
  Num_Quantite: 2,
  Num_Infographie: "Fichier fourni par le client",
  Retr_Modele: "Artistic Économique",
  Retr_Format: "33 × 80 po",
};
console.log(ok(bloquants("rollup", rollupComplet).length === 0), "roll-up sans lampe DEL : la case non cochee ne bloque pas");

// Une quantite de 0 passe le controle « champ rempli » -- « 0 » est une saisie -- mais ne
// produit rien a chiffrer. Sans controle dedie, la soumission se validerait a 0 $.
const qteZero = bloquants("autocollants", { ...complet, Num_Quantite: 0 });
console.log(ok(qteZero.some((b) => b.cle === "num-quantite")), "quantite 0 : bloquant (sinon un prix de 0 $ se lirait « gratuit »)");
console.log(ok(bloquants("autocollants", { ...complet, Num_Quantite: -5 }).some((b) => b.cle === "num-quantite")), "quantite negative : bloquant");
console.log(ok(!bloquants("autocollants", complet).some((b) => b.cle === "num-quantite")), "une quantite valide ne declenche rien");

// ── 7. dimensions ───────────────────────────────────────────────────────────
console.log("\n=== 7. DIMENSIONS ===");
console.log(`25,4 mm  -> ${enPouces(25.4, "Millimètres")} po`);
console.log(`2540 mm  -> ${enPouces(2540, "Millimètres")} po`);
console.log(ok(Math.abs(enPouces(25.4, "Millimètres") - 1) < 1e-9), "25,4 mm = 1 po");
console.log(ok(Math.abs(enPouces(2540, "Millimètres") - 100) < 1e-9), "2 540 mm = 100 po");
console.log(ok(enPouces(10, "Pouces") === 10), "des pouces restent des pouces");
console.log(ok(enPouces("10,5", "Pouces") === 10.5), "la virgule decimale est acceptee (saisie francophone)");
console.log(ok(enPouces("", "Pouces") === 0 && enPouces("abc", "Pouces") === 0), "une saisie vide ou invalide donne 0, jamais NaN");

const dBan = dimensionsProduit("bannieres", { Num_Unite: "Millimètres", Num_Largeur: 2540, Num_Hauteur: 1270 });
console.log(`banniere 2540 x 1270 mm -> ${dBan.largeurPo} x ${dBan.hauteurPo} po (source ${dBan.source})`);
console.log(ok(dBan.largeurPo === 100 && dBan.hauteurPo === 50 && dBan.source === "saisie"), "les millimetres sont convertis avant tout calcul");

const dRoll = dimensionsProduit("rollup", { Retr_Format: "48 × 80 po" });
console.log(`roll-up « 48 x 80 po » -> ${dRoll.largeurPo} x ${dRoll.hauteurPo} po (source ${dRoll.source})`);
console.log(ok(dRoll.largeurPo === 48 && dRoll.hauteurPo === 80 && dRoll.source === "format"), "les dimensions du roll-up viennent du format, pas d'une saisie");
console.log(ok(dimensionsProduit("rollup", {}).source === "absente"), "roll-up sans format : dimensions absentes, pas 0 x 0 silencieux");
// Le format est lu dans LE champ de format, identifie par la configuration -- pas cherche
// dans tous les champs : un format tape dans les notes n'est pas un format de piece.
console.log(
  ok(dimensionsProduit("rollup", { Num_Notes: "33 × 80 po" }).source === "absente"),
  "un format tape dans les notes n'est pas lu comme le format de la piece",
);

// ── 8. oeillets ─────────────────────────────────────────────────────────────
console.log("\n=== 8. OEILLETS (formule du handoff : perimetre / espacement) ===");
console.log(ok(espacementOeillets({ Ban_Finition: ["Couture + œillets aux 24 po"] }) === 24), "l'espacement est lu dans la finition choisie (24 po)");
console.log(ok(espacementOeillets({ Ban_Finition: ["Couture + œillets aux 12 po"] }) === 12), "idem pour 12 po");
console.log(ok(espacementOeillets({ Ban_Finition: ["Ourlet en haut"] }) === 0), "sans oeillets : 0");
console.log(
  ok(espacementOeillets({ Ban_Finition: ["Couture + œillets aux 24 po", "Couture + œillets aux 12 po"] }) === 12),
  "les deux coches : le plus serre gagne (le plus couteux — se tromper vers le bas sous-facturerait)",
);

const perim = (l: number, h: number) => 2 * (l + h);
console.log(`\nbanniere 96 x 48 po : perimetre ${perim(96, 48)} po`);
console.log(`   aux 24 po -> ${nbOeillets(96, 48, 24)} oeillets (${perim(96, 48)} / 24 = ${perim(96, 48) / 24})`);
console.log(`   aux 12 po -> ${nbOeillets(96, 48, 12)} oeillets (${perim(96, 48)} / 12 = ${perim(96, 48) / 12})`);
console.log(ok(nbOeillets(96, 48, 24) === 12), "96 x 48 aux 24 po = 12 oeillets");
console.log(ok(nbOeillets(96, 48, 12) === 24), "96 x 48 aux 12 po = 24 oeillets");
console.log(`\npetite banniere 12 x 12 po aux 24 po : perimetre ${perim(12, 12)}, division = ${perim(12, 12) / 24} -> ${nbOeillets(12, 12, 24)}`);
console.log(ok(nbOeillets(12, 12, 24) === 4), "plancher de 4 : une banniere a toujours un oeillet par coin (HYPOTHESE a confirmer)");
console.log(ok(nbOeillets(0, 48, 24) === 0 && nbOeillets(96, 48, 0) === 0), "sans dimension ou sans espacement : 0, pas de division par zero");

// « Percage / oeillets » (panneaux) n'a pas d'espacement : elle n'est comptee nulle part,
// donc elle doit RESTER dans la liste des postes a chiffrer au lieu d'etre filtree avec
// les finitions deja comptees.
console.log(ok(espacementOeillets({ Pan_Finition: ["Perçage / œillets"] }, "Pan_Finition") === 0), "« Perçage / œillets » n'a pas d'espacement : 0");
const postesPan = postesACouter("panneaux", {
  Num_Unite: "Pouces",
  Num_Largeur: 24,
  Num_Hauteur: 36,
  Pan_Materiel: "Coroplast",
  Pan_Finition: ["Perçage / œillets", "Coins arrondis"],
});
for (const x of postesPan) console.log(`   · ${x.message}`);
console.log(
  ok(postesPan.some((x) => x.message.includes("Perçage / œillets"))),
  "elle est signalee comme poste a chiffrer, et non perdue par le filtre",
);

// ── 9. filtrage des materiaux (etape 5) ─────────────────────────────────────
console.log("\n=== 9. FILTRAGE DES MATERIAUX PAR PRODUIT ===");
for (const p of produitsActifs()) {
  const r = materiauxPermis(p.code);
  console.log(`   ${p.code.padEnd(13)} ${String(r.permis.length).padStart(2)} materiaux : ${r.permis.join(", ")}`);
}
console.log(ok(materiauxPermis("panneaux").permis.length === 8, ), "8 matieres rigides");
console.log(ok(materiauxPermis("rollup").permis.length === 1), "roll-up : un seul materiau, fixe");
console.log(ok(materiauxPermis("faces_graphiques").permis.length === 0), "produit a venir : aucun materiau (plutot qu'une liste inventee)");

// tant que la colonne « type numerique » de l'inventaire n'est pas remplie, rien n'est rapproche
const sansInventaire = materiauxPermis("panneaux");
console.log(ok(sansInventaire.rapproches.length === 0 && sansInventaire.nonRapproches.length === 8), "sans inventaire : tout est marque non rapproche (aucun faux prix)");
const avecInventaire = materiauxPermis("panneaux", ["Coroplast", "Dibond", "Lexan Clair ,005x24x48"]);
console.log(`avec 3 noms d'inventaire : ${avecInventaire.rapproches.length} rapproches, ${avecInventaire.nonRapproches.length} non rapproches`);
console.log(ok(avecInventaire.rapproches.length === 2 && avecInventaire.nonRapproches.length === 6), "seuls les noms reellement presents sont rapproches");

// ── 10. postes de cout signales et non chiffres ─────────────────────────────
console.log("\n=== 10. POSTES A COUTER (etape 6 — pas encore chiffrables) ===");
const banniereChoisie: ValeursNum = {
  Num_Unite: "Pouces",
  Num_Largeur: 96,
  Num_Hauteur: 48,
  Num_Infographie: "Infographie à réaliser par Artistic",
  Num_Installation: "Demandée",
  Ban_Materiel: "Mesh (filet)",
  Ban_Finition: ["Couture + œillets aux 24 po", "Ourlet en haut"],
};
const postes = postesACouter("bannieres", banniereChoisie);
for (const p of postes) console.log(`   · ${p.message}`);
console.log(ok(postes.some((p) => p.cle === "oeillets" && p.message.includes("12 œillets"))), "les oeillets sont comptes meme si leur cout n'est pas connu");
console.log(ok(postes.some((p) => p.cle === "installation")), "l'installation est signalee");
console.log(ok(postes.some((p) => p.cle === "infographie")), "l'infographie a realiser est signalee");
console.log(
  ok(postes.length > 0 && controlerNumerique("bannieres", banniereChoisie).some((c) => c.type === "info")),
  "ces postes passent en rappels non bloquants, jamais en prix a zero",
);
console.log(
  ok(!postesACouter("bannieres", {}).length),
  "un formulaire vierge ne signale aucun poste : on n'alerte que sur ce qui a ete choisi",
);

console.log("\n=== RESUME ===");
console.log(`lignes de configuration : ${CONFIG_CHAMPS_NUMERIQUE.length} | produits actifs : ${produitsActifs().length} | a venir : ${aVenir.length}`);
console.log(`champs par produit : ${produitsActifs().map((p) => `${p.code}=${champsDuProduit(p.code).length}`).join(" | ")}`);
console.log(`valeurs multiples relues : ${JSON.stringify(listeValeurs("a;b;c"))}`);
console.log(echecs === 0 ? "\n>>> TOUT PASSE" : `\n>>> ${echecs} ECHEC(S)`);
if (echecs > 0) process.exitCode = 1;
