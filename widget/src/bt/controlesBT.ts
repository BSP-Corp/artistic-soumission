// Contrôles du bon de travail avant envoi en production (handoff du 28 sept. §10).
//
// Règle atelier : une opération platine ne part pas en production sans son numéro de matrice —
// sinon l'atelier reçoit un bon qu'il ne peut pas exécuter. Le contrôle est BLOQUANT sur le
// passage au statut « En production » (et au-delà), pas sur l'enregistrement d'un brouillon :
// on doit pouvoir préparer un bon incomplet.
//
// Quelles lignes sont concernées : les quatre lignes platine de la soumission (S!D33/D34/D35/D36
// = adhésif / coupe / kiss-cut / embossage). Pour chacune qui est active, la fiche FT a sa ligne
// « Matrice No » (FT!V31-34, jaune) — c'est elle qu'on exige.

import type { CellValue, Moteur } from "@/lib/moteur";
import { IN } from "@/lib/modele";
import { FT_PLATINE } from "./modeleFT";
import type { StatutBT } from "@/services/bonTravailService";

export interface ControleBT {
  cle: string;
  message: string;
  conseil?: string;
}

/** lignes platine, dans l'ordre de la fiche : drapeau soumission ↔ ligne FT */
const LIGNES_PLATINE: { libelle: string; drapeau: string; rang: number }[] = [
  { libelle: "Adhésif", drapeau: IN.platAdhesifDie, rang: 0 },
  { libelle: "Coupe", drapeau: IN.platCoupeDie, rang: 1 },
  { libelle: "Kiss-cut", drapeau: IN.platKisscutDie, rang: 2 },
  { libelle: "Embossage", drapeau: IN.platEmbossageDie, rang: 3 },
];

const n = (v: CellValue) => {
  const x = Number(v === "" || v === undefined ? 0 : v);
  return Number.isFinite(x) ? x : 0;
};
const txt = (v: CellValue) => String(v ?? "").trim();

/** statuts qui valent « envoyé à l'atelier » — c'est là que le contrôle mord */
export function estEnvoiProduction(statut: StatutBT): boolean {
  return statut === "En_production" || statut === "Termine";
}

/** Une ligne platine active sans numéro de matrice → bloquant. */
export function controlesMatrice(m: Moteur, saisies: Record<string, CellValue>): ControleBT[] {
  const out: ControleBT[] = [];
  for (const ligne of LIGNES_PLATINE) {
    if (n(m.val(ligne.drapeau)) <= 0) continue;
    const cellule = FT_PLATINE[ligne.rang].matrice1;
    const valeur = txt(saisies[cellule]) || txt(m.val(cellule));
    if (!valeur) {
      out.push({
        cle: "matrice-" + ligne.libelle,
        message: `Platine ${ligne.libelle} : pas de numéro de matrice — impossible d'envoyer en production.`,
        conseil: `Saisissez le numéro dans « Matrice No » (ligne ${ligne.libelle} du bloc platine).`,
      });
    }
  }
  return out;
}

/** Tous les contrôles du bon. `statut` = celui qu'on cherche à enregistrer. */
export function controlesBonTravail(m: Moteur, saisies: Record<string, CellValue>, statut: StatutBT): ControleBT[] {
  if (!estEnvoiProduction(statut)) return [];
  return controlesMatrice(m, saisies);
}
