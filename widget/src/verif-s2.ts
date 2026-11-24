// Validation de la logique propre à la refonte (2e widget) :  npm run verif:s2
import { CONFIG_CHAMPS_NUMERIQUE } from "@/data/produitsNumeriques";
import { IN } from "@/lib/modele";
import { chiffrerNumerique, lireTaux, type DemandeNum } from "@/s2/chiffrageNumerique";
import { configDepuisLignes } from "@/s2/configNumerique";
import { cellulesPiece, modifsPiece, piecesPresentes, prochainePiece, quantitePiece } from "@/s2/pieces";
import { achats, manquesSection09, montantInstallation, nouvelAchat, parFournisseur, totauxAchats } from "@/s2/soustraitance";

let ko = 0;
const ok = (c: boolean, t: string) => {
  if (!c) ko++;
  console.log(c ? "OK   " : "ECHEC", t);
};
const pres = (a: number, b: number) => Math.abs(a - b) < 1e-6;
type Entrees = Record<string, string | number>;

// ── pièces ──
const e: Entrees = { "S!J9": 100, "S!J10": 250, "X!P3": 1, "X!P3_ENS": 2, "X!P3_OFF": "S!J10", "X!P3_V_S-J9": 5, [IN.transport]: 30 };
ok(piecesPresentes(e).join() === "1,3" && prochainePiece(e) === 2, "pièces 1 et 3 présentes, 2 libre");
ok(quantitePiece(e, 1, "S!J9") === 100 && quantitePiece(e, 3, "S!J9") === 200, "quantité par ensemble");
ok(quantitePiece(e, 3, "S!J10") === 0, "palier décoché");
ok(quantitePiece({ ...e, "X!P3_QU": 3 }, 3, "S!J10") === 3, "quantité unique : l'emporte");
ok(quantitePiece({ "X!P2": 1, "X!P2_QU": 3 }, 2, "S!J9") === 0, "palier vide : rien, même en quantité unique");
ok(cellulesPiece(e, 3).includes("X!P3_V_S-J9") && cellulesPiece(e, 3).includes("X!P3_OFF"), "retirer une pièce retire aussi ses prix");
ok(Object.keys(modifsPiece(e, 1, 100, null)).join() === IN.quantite, "la pièce 1 ne change que la quantité");
ok(modifsPiece(e, 3, 10, { up: 4, l: 12, h: 24 })[IN.transport] === 0, "transport compté une seule fois");

// ── sous-traitance ──
const st: Entrees = Object.fromEntries([...nouvelAchat(1, 0.35), ...nouvelAchat(2, 0.35), ...nouvelAchat(3, 0)]) as Entrees;
Object.assign(st, {
  "X!ST1_TYPE": "Transport", "X!ST1_FOUR": "Acme", "X!ST1_COUT": 100, "X!ST1_DELAI": 5,
  "X!ST2_TYPE": "Matériel", "X!ST2_FOUR": "acme", "X!ST2_COUT": 50, "X!ST2_INC": "", "X!ST2_DELAI": 9,
});
const l = achats(st);
ok(pres(totauxAchats(l).prix, 135) && totauxAchats(l).cout === 100 && totauxAchats(l).delai === 9, "seules les lignes incluses comptent, majorées de 35 %");
ok(parFournisseur(l).length === 1 && parFournisseur(l)[0].total === 150, "un PO par fournisseur, casse ignorée");
ok(manquesSection09(st, l).length === 1 && /Achat 3 : type, fournisseur, coût/.test(manquesSection09(st, l)[0]), "ligne incomplète signalée");
const ins: Entrees = { "X!INS_REQ": "Requise", "X!INS_NB": 2, "X!INS_HEURES": 4, "X!INS_TAUX": 80, "X!INS_DEPL": 60, "X!INS_ACCES_COUT": 100 };
ok(montantInstallation(ins) === 800 && montantInstallation({ ...ins, "X!INS_REQ": "" }) === 0, "installation 2 × 4 h × 80 $ + 60 + 100");
ok(/adresse, surface, date/.test(manquesSection09(ins, [])[0] ?? ""), "installation incomplète signalée");

// ── numérique ──
const base: DemandeNum = {
  methode: "numerique",
  valeurs: {
    Num_Type_produit: "Autocollants / décalques", Num_Unite: "Pouces", Num_Largeur: "12", Num_Hauteur: "12",
    Auto_Media: "Permanent", Auto_Impr_face: "Recto", Auto_Impr_couleur: "4 couleurs process",
  },
  qte: 100, gache: 0, facteur: 0.4, transport: 30, entrees: {}, fiches: [], prixMatiere: null,
};
const r = chiffrerNumerique(base);
// 100 pi² : matière 125 ; impression (20/60 + 100/225) h × 59,79 ; encre 35 ; transport 30
ok(pres(r.cout, 125 + (20 / 60 + 100 / 225) * 59.79 + 35 + 30), "coût refait à la main : " + r.cout.toFixed(2));
ok(pres(r.prix, r.cout * 1.4) && pres(r.unitaire, r.prix / 100), "prix = coût × 1,4");
ok(chiffrerNumerique({ ...base, gache: 0.1 }).cout > r.cout, "la gâche augmente le coût");
ok(chiffrerNumerique({ ...base, prixMatiere: 2 }).postes[0].cout === 200, "la matière choisie remplace le coût par défaut");
ok(chiffrerNumerique({ ...base, valeurs: { ...base.valeurs, Auto_Laminage: "Mat" } }).postes.some((p) => p.libelle === "Laminage Mat"), "laminage chiffré");
ok(chiffrerNumerique({ ...base, valeurs: { ...base.valeurs, Auto_Impr_face: "Recto verso" } }).postes.find((p) => p.libelle === "Encre")?.cout === 70, "recto verso : deux fois plus de encre");
ok(chiffrerNumerique({ ...base, valeurs: {} }).manque !== "" && chiffrerNumerique({ ...base, qte: 0 }).manque !== "", "incomplet : aucun prix");
const fiche = [{ nomMachine: "HP Latex 570", statut: "Actif", tauxMachine: 61, vitesseBase: 300, setupMinutes: null }];
ok(lireTaux("V_HP570", {}, {}, fiche).source === "fiche" && lireTaux("T_HP570", {}, {}, fiche).valeur === 61, "la fiche machine prime sur le défaut");
ok(lireTaux("V_HP570", {}, { NUM_V_HP570: 99 }, fiche).valeur === 99 && lireTaux("V_HP570", { "X!NT_V_HP570": 50 }, { NUM_V_HP570: 99 }, fiche).valeur === 50, "saisie > réglage > fiche");
ok(lireTaux("V_HP570", { "X!NT_V_HP570": 0 }, {}, []).valeur === 225, "une vitesse à zéro est refusée");
ok(lireTaux("F_VELCRO", { "X!NT_F_VELCRO": 0 }, {}, []).valeur === 0, "un coût à zéro est accepté");
ok(lireTaux("V_HP570", {}, {}, [{ ...fiche[0], statut: "Inactif" }]).source === "hypothèse", "fiche inactive ignorée");
const ban = { Num_Type_produit: "Bannières", Num_Unite: "Pouces", Num_Largeur: "96", Num_Hauteur: "36", Ban_Finition: "Couture + œillets aux 24 po;Ourlet en haut" };
const rb = chiffrerNumerique({ ...base, qte: 1, valeurs: ban });
ok(pres(rb.postes.find((p) => p.libelle === "Œillets")?.cout ?? 0, 11 * 0.75) && pres(rb.postes.find((p) => p.libelle === "Ourlets")?.cout ?? 0, 96 * 0.05), "bannière : 11 œillets, un ourlet de 96 po");
const ru = { Num_Type_produit: "Bannière rétractable (roll-up)", Retr_Modele: "Artistic Luxe (mécanisme supérieur)", Retr_Format: "48 × 80 po", Retr_Lampe_DEL: 1 };
const rr = chiffrerNumerique({ ...base, qte: 2, valeurs: ru, dims: { l: 1, h: 1 } });
ok(rr.postes.find((p) => p.libelle === "Mécanisme")?.cout === 380 && rr.postes.find((p) => p.libelle === "Lampe DEL")?.cout === 90, "roll-up luxe 48 po avec DEL, dimensions du format");
const dec = chiffrerNumerique({ ...base, methode: "decoupe" });
ok(dec.postes.some((p) => p.libelle === "Découpe Zünd") && !dec.postes.some((p) => /Impression|Encre/.test(p.libelle)), "découpe seule : ni impression ni encre");
for (const p of [r, rb, rr, dec]) ok(Number.isFinite(p.cout) && p.cout > 0 && p.hypotheses.every((h) => p.taux.includes(h)), "résultat fini, hypothèses listées");

// ── table de configuration ──
const lignes = CONFIG_CHAMPS_NUMERIQUE.map((c) => ({
  Type_produit: c.typeProduit, Sauf: (c.sauf ?? []).join(";"), Bloc: c.bloc, Champ_technique: c.champ, Libelle: c.libelle,
  Type_champ: c.typeChamp, Options: c.options.join(";"), Ordre: String(c.ordre), Actif: c.actif ? "Oui" : "Non",
  Requis: c.requis ? "Oui" : "Non", Depend_de: c.dependDe ?? "", Depend_valeurs: (c.dependValeurs ?? []).join(";"),
}));
const cfg = configDepuisLignes(lignes);
const trie = (x: object) => JSON.stringify(Object.entries(x).sort(([p], [q]) => p.localeCompare(q)));
ok(cfg.alerte === "" && cfg.champs.length === CONFIG_CHAMPS_NUMERIQUE.length && cfg.champs.every((c, i) => trie(c) === trie(CONFIG_CHAMPS_NUMERIQUE[i])), `aller-retour de la table sans perte (${cfg.champs.length} lignes) ${cfg.alerte}`);
ok(configDepuisLignes([...lignes, { Type_produit: "bannieres", Champ_technique: "X", Type_champ: "nimporte" }]).alerte !== "", "ligne illisible : repli annoncé");
ok(configDepuisLignes(lignes.filter((x) => x.Champ_technique !== "Num_Type_produit")).alerte !== "", "sans le choix du produit : repli annoncé");

console.log(ko ? ">>> " + ko + " ECHEC(S)" : ">>> TOUT PASSE");
if (ko) process.exit(1);
