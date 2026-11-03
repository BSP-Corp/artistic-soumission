// Formats de feuille permis — données fournies par le client le 2 novembre 2026.
//
// Même rôle que `machinesCalc.ts` : c'est un REPLI. En production le widget lit la table
// Creator `Formats_Feuille` ; ce snapshot sert à faire tourner le widget hors Zoho et à
// fournir les formats si la table est vide.
import type { FormatFeuille, PresseFormat } from "@/lib/montage";

/** Les 9 formats permis (client, 2 nov. 2026). */
export const FORMATS_FEUILLE_SNAPSHOT: FormatFeuille[] = [
  { nom: "24 × 48", largeurPo: 24, hauteurPo: 48, actif: true },
  { nom: "24 × 36", largeurPo: 24, hauteurPo: 36, actif: true },
  { nom: "21 × 28", largeurPo: 21, hauteurPo: 28, actif: true },
  { nom: "24 × 24", largeurPo: 24, hauteurPo: 24, actif: true },
  { nom: "30 × 28", largeurPo: 30, hauteurPo: 28, actif: true },
  { nom: "21 × 30", largeurPo: 21, hauteurPo: 30, actif: true },
  { nom: "12 × 24", largeurPo: 12, hauteurPo: 24, actif: true },
  { nom: "12 × 12", largeurPo: 12, hauteurPo: 12, actif: true },
  { nom: "16 × 12", largeurPo: 16, hauteurPo: 12, actif: true },
];

// ── ⚠ CONFLIT DE DONNÉES À TRANCHER (relevé le 3 nov. 2026) ──────────────────
// Le client a fourni le 2 novembre un « format maxi » par presse. Ces chiffres ne
// correspondent PAS aux fiches machines déjà en place dans Creator (Fiche_Machine,
// champs Largeur_max_po / Hauteur_max_po), relevées en direct le 3 novembre :
//
//   presse │ client 2 nov. │ Creator (en place)        │
//   ───────┼───────────────┼──────────────────────────┤
//   110    │ 21 × 30       │ 26 × 18                   │ ≠
//   116    │ 16 × 12       │ 12 × 8                    │ ≠
//   120    │ 30 × 28       │ vides, fiche INACTIVE     │ ≠
//   130    │ 21 × 28       │ 21 × 28                   │ = seule concordance
//   140    │ 24 × 24       │ 25 × 38                   │ ≠
//   150    │ 44 × 64       │ 30 × 50                   │ ≠
//   170    │ 30 × 39       │ 30 × 40                   │ ≈ (39 vs 40)
//   182    │ absente       │ 24 × 44, active           │ absente de la liste client
//   ───────┴───────────────┴──────────────────────────┘
//   (« One man » 48 × 96 et « DTS » 48"–96", actives, sont aussi absentes de la liste.)
//
// La liste client est cohérente avec elle-même : le format 16 × 12 n'est permis QUE parce que
// la presse 116 ferait 16 × 12. Avec les fiches Creator (116 = 12 × 8), ce format n'est
// roulable par aucune presse et le calcul l'écarte.
//
// CE QUI EST FAIT EN ATTENDANT : les fiches Creator font foi (source unique, déjà branchée
// et déjà affichée dans l'écran « feuille max L×H po »). Rien n'est écrasé. Les valeurs
// client sont conservées ci-dessous pour la rencontre — elles ne servent à aucun calcul.
// C'est exactement le point 1 de la section « À reconfirmer » du handoff.
export const FORMAT_MAX_PRESSE_CLIENT_2NOV: PresseFormat[] = [
  { nom: "110", largeurMaxPo: 21, hauteurMaxPo: 30 },
  { nom: "116", largeurMaxPo: 16, hauteurMaxPo: 12 },
  { nom: "120", largeurMaxPo: 30, hauteurMaxPo: 28 },
  { nom: "130", largeurMaxPo: 21, hauteurMaxPo: 28 },
  { nom: "140", largeurMaxPo: 24, hauteurMaxPo: 24 },
  { nom: "150", largeurMaxPo: 44, hauteurMaxPo: 64 },
  { nom: "170", largeurMaxPo: 30, hauteurMaxPo: 39 },
];

/** Compatibilité format → presses telle que le client l'a écrite le 2 nov. Conservée pour
 *  comparaison avec ce que le calcul déduit des formats maxi ; aucun calcul ne la lit. */
export const COMPATIBILITE_CLIENT_2NOV: Record<string, string[]> = {
  "24 × 48": ["150"],
  "24 × 36": ["150", "170"],
  "21 × 28": ["130", "120", "150", "170"],
  "24 × 24": ["140", "120", "150", "170"],
  "30 × 28": ["120", "150", "170"],
  "21 × 30": ["110", "150", "170"],
  "12 × 24": ["110", "120", "130", "140", "150", "170"],
  "12 × 12": ["toutes"],
  "16 × 12": ["116", "+ toutes les plus grandes"],
};
