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

// ── ✅ CONFLIT TRANCHÉ (Roberto Montanaro, 16 nov. 2026, 15 h 06) ─────────────
// Les « format maxi » fournis par le client le 2 novembre ne correspondaient pas aux fiches
// machines de Creator (Fiche_Machine, Largeur_max_po / Hauteur_max_po). Relancé le 16 novembre,
// Roberto a répondu : « utilise ma liste ».
//
// C'est donc SA liste qui fait foi, et les fiches Creator qui sont à corriger — l'inverse de ce
// qui était fait en attendant. Ce qui reste à saisir dans Creator :
//
//   presse │ fiche Creator      │ à corriger pour │
//   ───────┼────────────────────┼─────────────────┤
//   110    │ 26 × 18            │ 21 × 30         │
//   116    │ 12 × 8             │ 16 × 12         │
//   120    │ vides, INACTIVE    │ 30 × 28 + réactiver │
//   130    │ 21 × 28            │ inchangée       │
//   140    │ 25 × 38            │ 24 × 24         │
//   150    │ 30 × 50            │ 44 × 64         │
//   170    │ 30 × 40            │ 30 × 39         │
//   ───────┴────────────────────┴─────────────────┘
//
// Les trois fiches absentes de sa liste, reprises une par une dans sa réponse :
//   • « One man » — 48 × 96 confirmé, mais presse « réactivée prochainement » : hors service
//     aujourd'hui, donc à ne pas proposer tant qu'elle n'est pas remise en route.
//   • « DTS » — ce n'est PAS une presse. Direct To Screen : la machine qui brûle les soies.
//     Cadre maxi 1200 × 1500 mm (≈ 47 × 59 po), et non le 48 × 96 de sa fiche. À retirer des
//     presses sélectionnables : à 48 × 96 elle fait croire qu'un format géant est roulable.
//   • « 182 » — « tu dois sûrement vouloir dire la 180 » : multi-tête 6 couleurs rotative, en
//     fonction, impression 28 × 38. La fiche porte 24 × 44, qui ne correspond à rien de connu.
//     Seule inconnue qui reste : confirmer qu'il s'agit bien de la même machine.
//
// Le conflit se referme proprement : avec la liste de Roberto, chacun des neuf formats est
// roulable par au moins une presse. Le 16 × 12 redevient disponible — il n'existait dans les
// neuf qu'à cause de la 116, et la fiche à 12 × 8 l'écartait de tout.
//
// Le code ne change pas : il lit les fiches Creator, qui restent la source unique. Ce sont les
// fiches qui doivent rattraper la liste ci-dessous. Détail et suivi : docs/montage-a-completer.md §3.
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
