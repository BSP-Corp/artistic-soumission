// 2e widget de soumission (docs/refonte-soumission.md).
//
// Même moteur, mêmes cellules, mêmes services que l'écran actuel : seule la présentation
// change. La pièce 1 en sérigraphie garde EXACTEMENT le prix de l'écran actuel. Les pièces 2 à 5
// passent par le même moteur (pieces.ts). Le numérique et la découpe seule ont un prix PROVISOIRE
// (chiffrageNumerique.ts), qui ne s'imprime pas et ne crée pas de bon de travail.
//
// Rien ne sort d'ici : statut toujours « Brouillon », aucun envoi à la plateforme du client,
// aucun bon de commande créé, bons de travail créés en « Brouillon ».
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSoumission, simulerQuantite, simulerScenario, CLASSEUR } from "@/hooks/useSoumission";
import {
  IN,
  OUT,
  CATALOGUES,
  CELL_PROP,
  CELL_VENDU,
  CELLS_MATERIAU_IMPR,
  XTRA_PLACEHOLDER,
  cellContrat,
  cellVendu,
  entreesVierges,
  listeCatalogue,
} from "@/lib/modele";
import { CATEGORIE_VERS_CHAMP } from "@/lib/parametres";
import { controlesSoumission, SEUIL_DOUBLE_CHECK_DEFAUT, type Controle } from "@/lib/controles";
import { REGLES_DEFAUT, fusionnerRegles, type RegleMateriau } from "@/lib/reglesMateriaux";
import { deduireAdhesif } from "@/lib/adhesif";
import { argent, dateOuTexte, nombre2, nombre3, toNum } from "@/lib/format";
import { CELL_PRESSE, cleMachine, machinesFamille } from "@/lib/machines";
import {
  choisirMontage,
  libelleFormat,
  reglesMontage,
  CELL_AVANT_DIM_X,
  CELL_AVANT_DIM_Y,
  CELL_AVANT_UP,
  CELL_ESPACE_UP,
  CELL_MONTAGE_FORMAT,
  CELL_MONTAGE_TOURNEE,
  CELL_MONTAGE_UP,
  CELL_PERTE,
  CELL_POURTOUR,
} from "@/lib/montage";
import { FORMATS_FEUILLE_SNAPSHOT } from "@/data/montageSnapshot";
import type { CellValue } from "@/lib/moteur";
import {
  chargerAdmin,
  chargerParametres,
  chargerReglesMateriaux,
  chargerSoumissions,
  initZohoEnv,
  isZohoEnv,
  majDatesCreator,
  majSoumission,
  sauvegarderSoumission,
  type Machine,
  type ResultatSoumissions,
} from "@/services/zohoService";
import { creerBonTravail } from "@/services/bonTravailService";
import { CELLULES_SAISIE, champsPlatsBT } from "@/bt/modeleFT";
import { construireSoumissionJSON } from "@/api/contratSoumission";
import { PopupSoumissions } from "@/components/PopupSoumissions";
import { PopupVerification } from "@/components/PopupVerification";
import { PopupProposition, type LigneProposition, type ProduitSupplementaire } from "@/components/PopupProposition";
import { Champ, Coche, Materiau, Nombre, Texte } from "./champs";
import {
  CELL_METHODE,
  CELL_NOTES_CLIENT,
  CELL_TYPE_CLIENT,
  PREFIXE_NUM,
  Certifications,
  Coordonnees,
  Disposition,
  Fichier,
  Laminage,
  Liste,
  Livraison,
  Notes,
  Numerique,
  Outillage,
  coordonneesManquantes,
  controlesNumeriques,
  lireMethode,
  valeursNumeriques,
  type Methode,
} from "./sections";
import { GrillePieces, HypothesesNum, Installation, PopupPO, SousTraitance, TableauPieces } from "./sections09";
import { cellVenduPiece, infosPiece, modifsPiece, piecesPresentes, quantitePiece } from "./pieces";
import { MAJORATION_DEFAUT, achats, installationRequise, manquesSection09, montantInstallation, totauxAchats } from "./soustraitance";
import { CELL_MATIERE_NUM, chiffrerNumerique } from "./chiffrageNumerique";
import { CONFIG_EMBARQUEE, chargerConfigNumerique } from "./configNumerique";
import { comptesDoffice, valeursCachees } from "./caches";
import {
  CELL_ORIGINE_S2,
  avecGache,
  cellulesPaliers,
  dureeTexte,
  ecrituresPaliers,
  margeReelle,
  palierActif,
  paliersDefaut,
  prochainPalier,
} from "./logique";

/** Numéro S-AAAA-NNNN (format de la spec, à confirmer par le client). */
const CELL_NUMERO = "X!S2_NO";
/** N° du bon de travail déjà créé pour chaque pièce : évite d'en créer deux. */
const cellBT = (k: number) => "X!S2_BT" + k;

/** Prix d'une pièce 2 à 5 pour un palier. */
interface PrixPiece {
  qte: number;
  unitaire: number;
  cout: number;
  heures: number;
}

/** Même jeton que l'écran actuel : le workflow Deluge le remplace par le vrai ID. */
const ID_SUBSTITUTION = "__ID_SOUMISSION__";

const MATERIAUX: [string, keyof typeof CATALOGUES, string][] = [
  ["Lexan", "matLexan", IN.matLexan],
  ["Vinyle", "matVinyle", IN.matVinyle],
  ["Polyester", "matPolyester", IN.matPolyester],
  ["Alu. / foil", "matAluFoil", IN.matAluFoil],
  ["Divers", "matDivers", IN.matDivers],
  ["Adhésif F/R", "matAdhesif", IN.matAdhesif],
  ["Overlaminating", "matOverlam", IN.matOverlam],
];

/** Toutes les sections se replient ; 01 à 08 s'ouvrent d'office, 09 et 10 restent fermées.
 *
 *  Les deux consignes du client tiennent ensemble : « on aime mieux tout voir pour être sûr qu'on
 *  n'a rien oublié » (9 nov.) reste vrai à l'ouverture, et « réduire chaque sous-formulaire pour
 *  n'avoir que les écrans sur lesquels je travaille » (24 nov.) devient possible.
 *
 *  Replier ne démonte rien : les enfants restent dans le DOM, les valeurs saisies restent dans
 *  l'état, le moteur continue de calculer et les contrôles de `controles.ts` sont évalués sur les
 *  entrées, jamais sur l'affichage. Une section repliée ne peut donc pas faire disparaître une
 *  erreur — d'où la pastille, qui la signale sur la ligne de titre. */
function Section({ no, titre, phase, resume, alerte, ouvert: ouvertInitial = true, children }: {
  no: string;
  titre: string;
  phase?: string;
  /** Ce qu'on veut pouvoir vérifier sans rouvrir la section. */
  resume?: string;
  alerte?: boolean;
  ouvert?: boolean;
  children?: ReactNode;
}) {
  const [ouvert, setOuvert] = useState(ouvertInitial);
  return (
    <details
      className="s2-section"
      open={ouvert}
      onToggle={(e) => setOuvert((e.currentTarget as HTMLDetailsElement).open)}
      aria-label={no + " " + titre}
    >
      <summary>
        <span>{no}</span>
        {titre}
        {alerte ? <b className="s2-pastille" title="Cette section demande votre attention">!</b> : null}
        {!ouvert && resume ? <i className="s2-apercu">{resume}</i> : null}
        {phase ? <em>{phase}</em> : null}
      </summary>
      {children ? <div className="s2-corps">{children}</div> : null}
    </details>
  );
}

/** 09 et 10 sont optionnelles : même composant, fermé au départ. */
function SectionOptionnelle(p: Parameters<typeof Section>[0]) {
  return <Section {...p} ouvert={false} />;
}

export default function AppS2() {
  const s = useSoumission();
  const { set, unset, setParametres, setMachinesCreator } = s;
  const [message, setMessage] = useState("");
  const [sources, setSources] = useState({ prix: "", machines: "" });
  /** Rien n'est chiffré tant que les prix ET les machines ne sont pas arrivés : l'écran actuel
   *  montre environ une seconde de presses embarquées, périmées, avant celles de Creator. */
  const [pret, setPret] = useState(false);
  const [regles, setRegles] = useState<RegleMateriau[]>(REGLES_DEFAUT);
  const [idSoumission, setIdSoumission] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [liste, setListe] = useState<ResultatSoumissions | null>(null);
  const [popup, setPopup] = useState<null | "ouvrir" | "verifier" | "client" | "po">(null);
  const [poSeul, setPoSeul] = useState("");
  const [machines, setMachines] = useState<Machine[]>([]);
  const [configNum, setConfigNum] = useState(CONFIG_EMBARQUEE);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      await initZohoEnv();
      const [p, a, r, cfg] = await Promise.all([chargerParametres(), chargerAdmin(), chargerReglesMateriaux(), chargerConfigNumerique()]);
      if (!vivant) return;
      const prixCreator = !!p && (p.materiaux.length > 0 || p.taux.length > 0);
      if (p && prixCreator) setParametres(p);
      if (a) {
        setMachinesCreator(a.machines);
        setMachines(a.machines);
      }
      setConfigNum(cfg);
      setRegles(fusionnerRegles(r).regles);
      setSources({
        prix: p && prixCreator ? `Creator (${p.materiaux.length} matériaux, ${p.taux.length} taux)` : "copie embarquée",
        machines: a ? `Creator (${a.machines.length})` : "copie embarquée",
      });
      setPret(true);
    })();
    return () => {
      vivant = false;
    };
  }, [setParametres, setMachinesCreator]);
  const repli = pret && isZohoEnv() && [sources.prix, sources.machines].includes("copie embarquée");

  // ── nouvelle soumission ───────────────────────────────────────────────────
  // `useSoumission` démarre sur l'Exemple du classeur : on repart d'une fiche vierge dès que
  // les défauts de Creator sont connus.
  const autoAdhesif = useRef<string | null>(null);
  function nouvelle() {
    s.reset("vierge");
    for (const c of Object.keys(s.entrees)) if (c.startsWith("X!")) unset(c);
    for (const [c, v] of ecrituresPaliers(paliersDefaut(s.params?.app))) set(c, v);
    set(CELL_ORIGINE_S2, 1);
    autoAdhesif.current = null;
    setIdSoumission("");
    setMessage("");
  }
  // Un état et non une ref : les effets ci-dessous s'exécutent dans le même passage, encore sur
  // la quantité de l'Exemple (50), et une ref les aurait laissés écraser un palier de départ.
  const [demarre, setDemarre] = useState(false);
  useEffect(() => {
    if (!pret || demarre) return;
    nouvelle();
    setDemarre(true);
  }, [pret, demarre]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── adhésif laminé / registre posés d'office ──────────────────────────────
  // Même règle que l'écran actuel : sans elle, la même fiche n'aurait pas le même prix d'un
  // widget à l'autre.
  const adhesif = useMemo(() => deduireAdhesif(s.entrees), [s.entrees]);
  useEffect(() => {
    if (!demarre) return;
    const cible = adhesif?.cellule ?? null;
    if (autoAdhesif.current === cible) return;
    if (autoAdhesif.current && toNum(s.saisie(autoAdhesif.current)) === 1) set(autoAdhesif.current, "");
    if (cible && !toNum(s.saisie(cible))) set(cible, 1);
    autoAdhesif.current = cible;
  }, [adhesif, demarre]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── catalogues : Creator remplace le classeur, catégorie par catégorie ────
  const catalogues = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const [champ, col] of Object.entries(CATALOGUES)) map[champ] = listeCatalogue(CLASSEUR, col);
    for (const [cat, noms] of Object.entries(s.params?.categories ?? {})) {
      const champ = CATEGORIE_VERS_CHAMP[cat];
      if (champ && map[champ] && noms.length) map[champ] = [...new Set(noms)].sort((a, b) => a.localeCompare(b, "fr"));
    }
    return map;
  }, [s.params]);

  // ── paliers ───────────────────────────────────────────────────────────────
  const paliers = useMemo(() => cellulesPaliers(s.entrees), [s.entrees]);
  const actif = useMemo(() => palierActif(s.entrees), [s.entrees]);
  const qte = toNum(s.saisie(IN.quantite));
  const gache = toNum(s.saisie(IN.perte));
  // Une soumission ouverte peut porter une quantité retenue absente de ses paliers.
  useEffect(() => {
    if (!demarre || !(qte > 0) || actif) return;
    const libre = [IN.qte1, IN.qte2].find((c) => !toNum(s.saisie(c))) ?? prochainPalier(s.entrees);
    set(libre, qte);
    set(cellVendu(libre), s.saisie(CELL_VENDU));
  }, [demarre, qte, actif]); // eslint-disable-line react-hooks/exhaustive-deps

  const retenir = (cell: string) => {
    const q = toNum(s.saisie(cell));
    if (!(q > 0)) return;
    set(IN.quantite, q);
    set(CELL_VENDU, s.saisie(cellVendu(cell)));
  };
  const setPalier = (cell: string, v: CellValue) => {
    set(cell, v);
    if (cell === actif && toNum(v) > 0) set(IN.quantite, toNum(v));
  };
  const retirerPalier = (cell: string) => {
    const autre = paliers.find((c) => c !== cell && toNum(s.saisie(c)) > 0);
    if (cell === actif) {
      if (!autre) return;
      retenir(autre);
    }
    for (const c of [cell, cellVendu(cell), cellContrat(cell)]) {
      if (c === IN.qte1 || c === IN.qte2) set(c, "");
      else unset(c);
    }
  };
  const setVendu = (cell: string, v: CellValue) => {
    set(cellVendu(cell), v);
    if (cell === actif) set(CELL_VENDU, v);
  };

  // ── méthode ───────────────────────────────────────────────────────────────
  const methode = lireMethode(s.saisie(CELL_METHODE));
  const seri = methode === "serigraphie";
  const app = s.params?.app;

  /** Chiffrage provisoire (numérique, découpe seule) d'une pièce. */
  const numerique = (e: Record<string, CellValue>, q: number, dims?: { l: number; h: number }, principal = true) =>
    chiffrerNumerique({
      methode: methode === "decoupe" ? "decoupe" : "numerique",
      valeurs: valeursNumeriques(e),
      qte: q,
      gache: toNum(e[IN.perte] ?? ""),
      facteur: toNum(e[IN.facteur] ?? ""),
      transport: principal ? toNum(e[IN.transport] ?? "") : 0,
      entrees: e,
      app,
      fiches: machines,
      prixMatiere: s.params?.prixParNom[String(e[CELL_MATIERE_NUM] ?? "").toLowerCase()] ?? null,
      dims,
    });
  const resNum = useMemo(() => numerique(s.entrees, qte), [s.entrees, s.params, machines, qte, methode]); // eslint-disable-line react-hooks/exhaustive-deps

  const simulations = useMemo(() => {
    const surch = { ...s.overridesTaux, ...s.surchargesMach };
    return paliers.map((c) => {
      const q = toNum(s.saisie(c));
      if (!(q > 0)) return { qte: 0, cout: 0, prix: 0, vendu: 0, us: 0 };
      if (seri) return { qte: q, ...simulerQuantite(s.entrees, q, s.params, surch) };
      const n = numerique(s.entrees, q);
      return { qte: q, cout: n.cout / q, prix: n.unitaire, vendu: n.unitaire, us: 0 };
    });
  }, [paliers, s.entrees, s.params, s.overridesTaux, s.surchargesMach, machines, methode]); // eslint-disable-line react-hooks/exhaustive-deps

  const changerMethode = (m: Methode) => {
    set(CELL_METHODE, m);
    if (m !== "numerique") for (const c of Object.keys(s.entrees)) if (c.startsWith(PREFIXE_NUM)) unset(c);
  };
  const acces = { saisie: s.saisie, set, unset };

  // ── contrôles : le prix reste masqué tant que la fiche est incomplète ─────
  const seuil = s.params?.app?.SEUIL_DOUBLE_CHECK ?? SEUIL_DOUBLE_CHECK_DEFAUT;
  const controles = useMemo(
    () =>
      controlesSoumission(
        s.moteur,
        s.entrees,
        { presse: s.presseChoisie, zund: s.zundChoisi, platine: s.platineChoisie },
        regles,
        seuil,
      ),
    [s.entrees, s.overridesTaux, s.surchargesMach, s.presseChoisie, s.zundChoisi, s.platineChoisie, s.params, regles, seuil], // eslint-disable-line react-hooks/exhaustive-deps
  );
  // ── pièces 2 à 5 ──────────────────────────────────────────────────────────
  // Différées : jusqu'à 4 pièces × 10 paliers, la frappe passe avant.
  const differees = useDeferredValue(s.entrees);
  /** Feuille suggérée pour une pièce : celle que la presse choisie peut rouler, sinon la meilleure. */
  const feuillePour = (e: Record<string, CellValue>, k: number, q: number) => {
    const p = infosPiece(e, k);
    const r = choisirMontage(
      s.params?.formats ?? FORMATS_FEUILLE_SNAPSHOT,
      machinesFamille(s.machinesCalc, "presse").map((m) => ({ nom: m.nom, largeurMaxPo: m.largeurPo, hauteurMaxPo: m.hauteurPo })),
      p.l,
      p.h,
      q,
      reglesMontage({ espace: s.moteur.val(CELL_ESPACE_UP), pourtour: s.moteur.val(CELL_POURTOUR), perte: s.moteur.val(CELL_PERTE) }, app),
      null,
    );
    const c = r.candidats.find((x) => !s.presseChoisie || x.presses.includes(s.presseChoisie.nom));
    return c ? { up: c.upParFeuille, l: c.format.largeurPo, h: c.format.hauteurPo } : null;
  };
  const autresPieces = useMemo(
    () =>
      piecesPresentes(differees)
        .filter((k) => k > 1)
        .map((k) => {
          const p = infosPiece(differees, k);
          const manque: Controle[] = [];
          const bloque = (message: string) => manque.push({ type: "bloquant", cle: `piece${k}-${manque.length}`, message: `Pièce ${k} : ${message}` });
          if (!(p.l > 0 && p.h > 0)) bloque("dimensions manquantes.");
          const cache = new Map<number, PrixPiece>();
          const prix: Record<string, PrixPiece> = {};
          const refs = cellulesPaliers(differees);
          const actifRef = palierActif(differees);
          if (p.l > 0 && p.h > 0)
            for (const c of refs) {
              const q = quantitePiece(differees, k, c);
              if (!(q > 0)) continue;
              let v = cache.get(q);
              if (!v && seri) {
                const f = feuillePour(differees, k, q);
                if (!f) {
                  if (c === actifRef) bloque("aucune feuille ne convient à la presse choisie.");
                  continue;
                }
                const modifs = modifsPiece(differees, k, q, f);
                const m = simulerScenario(differees, s.params, { ...s.overridesTaux, ...s.surchargesMach }, modifs);
                v = { qte: q, unitaire: m.num(OUT.prixUnitaire), cout: m.num(OUT.montant), heures: m.num(OUT.tempsTotalHrs) + m.num(OUT.tempsTotalMin) / 60 };
                if (c === actifRef)
                  for (const x of controlesSoumission(m, { ...differees, ...modifs }, { presse: s.presseChoisie, zund: s.zundChoisi, platine: s.platineChoisie }, regles, seuil))
                    if (x.type === "bloquant") manque.push({ ...x, cle: `piece${k}-${x.cle}`, message: `Pièce ${k} : ${x.message}` });
              } else if (!v) {
                const n = numerique(differees, q, { l: p.l, h: p.h }, false);
                v = { qte: q, unitaire: n.unitaire, cout: n.cout, heures: n.heures };
              }
              cache.set(q, v);
              prix[c] = v;
            }
          return { k, infos: p, prix, manque };
        }),
    [differees, s.params, s.machinesCalc, s.overridesTaux, s.surchargesMach, s.presseChoisie, s.zundChoisi, s.platineChoisie, regles, seuil, machines, methode], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const venduPiece = (k: number, c: string, calcule: number) => {
    const v = toNum(s.saisie(cellVenduPiece(k, c)));
    return v > 0 ? v : calcule;
  };

  // ── valeurs sans case à l'écran ───────────────────────────────────────────
  // Les cases sont lues dans la page elle-même : aucune liste à tenir à jour. Une section repliée
  // garde ses champs dans le DOM, elle ne fausse donc rien.
  const [visibles, setVisibles] = useState("");
  useEffect(() => {
    const l = [...document.querySelectorAll<HTMLElement>(".s2-grille [data-cell]")].map((x) => x.dataset.cell).sort().join(" ");
    if (l !== visibles) setVisibles(l);
  });
  const { caches, doffice } = useMemo(() => {
    if (!demarre || !seri || !visibles) return { caches: [], doffice: [] };
    const vus = new Set([...visibles.split(" "), IN.quantite]); // la quantité retenue se choisit par les paliers
    const total = (modifs: Record<string, CellValue>) =>
      simulerScenario(differees, s.params, { ...s.overridesTaux, ...s.surchargesMach }, modifs).num(OUT.total);
    return {
      caches: valeursCachees(differees, vus, entreesVierges(s.params?.defauts), total),
      doffice: comptesDoffice(differees, vus, total),
    };
  }, [demarre, seri, visibles, differees, s.params, s.overridesTaux, s.surchargesMach]);
  const cachesPrix = caches.filter((x) => x.montant !== 0);
  const cachesSansEffet = caches.filter((x) => x.montant === 0);

  // ── section 09 ────────────────────────────────────────────────────────────
  const listeAchats = useMemo(() => achats(s.entrees), [s.entrees]);
  const manques09 = useMemo(() => manquesSection09(s.entrees, listeAchats), [s.entrees, listeAchats]);
  const totAchats = totauxAchats(listeAchats);
  const montantInst = montantInstallation(s.entrees);

  const tous: Controle[] = [
    ...controles,
    ...autresPieces.flatMap((x) => x.manque),
    ...manques09.map((message, i): Controle => ({ type: "bloquant", cle: "s09-" + i, message })),
  ];
  const enAttente = differees !== s.entrees && piecesPresentes(s.entrees).length > 1;
  const bloquants = seri ? tous.filter((c) => c.type !== "info") : [];
  const manquesNum = seri
    ? []
    : [
        ...(methode === "numerique" ? controlesNumeriques(s.entrees, configNum.champs).filter((c) => c.type !== "info").map((c) => c.message) : []),
        ...(resNum.manque ? [resNum.manque] : []),
        ...autresPieces.flatMap((x) => x.manque.map((c) => c.message)),
        ...manques09,
      ];
  /** Prix validé : imprimable, transformable en bon de travail. */
  const prixVisible = demarre && seri && bloquants.length === 0;
  const aCompleter = manquesNum.length;
  const masque = (v: ReactNode) =>
    !pret ? (
      "…"
    ) : !seri ? (
      aCompleter ? (
        <span className="s2-nonchiffre" title={manquesNum.join(" · ")}>à compléter ({aCompleter})</span>
      ) : (
        <span className="s2-prov" title="Prix provisoire : hypothèses de BSP, à confirmer par Artistic">{v}</span>
      )
    ) : prixVisible ? (
      v
    ) : (
      <button type="button" className="s2-averifier" title={bloquants.map((c) => c.message).join(" · ")} onClick={() => setPopup("verifier")}>
        à vérifier ({bloquants.length})
      </button>
    );

  // ── poses / montage ───────────────────────────────────────────────────────
  const montage = useMemo(() => {
    const r = reglesMontage(
      { espace: s.moteur.val(CELL_ESPACE_UP), pourtour: s.moteur.val(CELL_POURTOUR), perte: s.moteur.val(CELL_PERTE) },
      s.params?.app,
    );
    const presses = machinesFamille(s.machinesCalc, "presse").map((m) => ({
      nom: m.nom,
      largeurMaxPo: m.largeurPo,
      hauteurMaxPo: m.hauteurPo,
    }));
    const base = s.num(OUT.nbMrxExact);
    return choisirMontage(
      s.params?.formats ?? FORMATS_FEUILLE_SNAPSHOT,
      presses,
      toNum(s.saisie(IN.dimPceX)),
      toNum(s.saisie(IN.dimPceY)),
      qte,
      r,
      base > 0 ? base : null,
    );
  }, [s.entrees, s.params, s.machinesCalc, s.overridesTaux, qte]); // eslint-disable-line react-hooks/exhaustive-deps
  const retenu = String(s.saisie(CELL_MONTAGE_FORMAT) ?? "").trim();
  const upRetenu = toNum(s.saisie(CELL_MONTAGE_UP));
  const candidatRetenu = montage.candidats.find((c) => libelleFormat(c.format) === retenu);
  const perime = !retenu
    ? ""
    : !candidatRetenu
      ? "la pièce ne tient plus sur ce format"
      : candidatRetenu.upParFeuille !== upRetenu
        ? `ce format donne maintenant ${candidatRetenu.upParFeuille} poses, plus ${upRetenu}`
        : "";
  const cible = retenu ? candidatRetenu : montage.meilleur;
  const presseIncompatible = s.presseChoisie && cible && !cible.presses.includes(s.presseChoisie.nom) ? s.presseChoisie.nom : "";
  const utilisation = cible
    ? (cible.upParFeuille * toNum(s.saisie(IN.dimPceX)) * toNum(s.saisie(IN.dimPceY))) / (cible.format.largeurPo * cible.format.hauteurPo)
    : 0;
  // Les trois cellules ENSEMBLE : S!E5 seul effondrerait le coût matière (montage-etape6.md §3).
  const accepter = () => {
    const m = montage.meilleur;
    if (!m) return;
    if (!retenu) {
      set(CELL_AVANT_UP, s.saisie(IN.nbUp));
      set(CELL_AVANT_DIM_X, s.saisie(IN.dimMrxX));
      set(CELL_AVANT_DIM_Y, s.saisie(IN.dimMrxY));
    }
    set(CELL_MONTAGE_FORMAT, libelleFormat(m.format));
    set(CELL_MONTAGE_UP, m.upParFeuille);
    set(CELL_MONTAGE_TOURNEE, m.pieceTournee ? 1 : 0);
    set(IN.nbUp, m.upParFeuille);
    set(IN.dimMrxX, m.format.largeurPo);
    set(IN.dimMrxY, m.format.hauteurPo);
  };
  const annuler = () => {
    set(IN.nbUp, s.saisie(CELL_AVANT_UP));
    set(IN.dimMrxX, s.saisie(CELL_AVANT_DIM_X));
    set(IN.dimMrxY, s.saisie(CELL_AVANT_DIM_Y));
    for (const c of [CELL_AVANT_UP, CELL_AVANT_DIM_X, CELL_AVANT_DIM_Y, CELL_MONTAGE_FORMAT, CELL_MONTAGE_UP, CELL_MONTAGE_TOURNEE]) set(c, "");
  };

  // ── totaux : pièce 1 + pièces 2 à 5 + section 09 ──────────────────────────
  const autresActif = autresPieces.map((x) => {
    const v = actif ? x.prix[actif] : undefined;
    return v ? { ...v, k: x.k, vente: venduPiece(x.k, actif!, v.unitaire) * v.qte } : null;
  }).filter((x) => x !== null);
  const cout1 = seri ? s.num(OUT.montant) : resNum.cout;
  const total1 = seri ? s.num(OUT.total) : resNum.prix;
  const unitaire = seri ? s.num(OUT.prixUnitaire) : resNum.unitaire;
  const cout = cout1 + autresActif.reduce((n, x) => n + x.cout, 0) + totAchats.cout + montantInst;
  const total = total1 + autresActif.reduce((n, x) => n + x.vente, 0) + totAchats.prix + montantInst;
  const heures1 = seri ? Math.trunc(s.num(OUT.tempsTotalHrs)) + s.num(OUT.tempsTotalMin) / 60 : resNum.heures;
  const heures = heures1 + autresActif.reduce((n, x) => n + x.heures, 0);
  /** Une pièce, en sérigraphie, sans section 09 : le contrat v1.3 sait la décrire. */
  const simple = seri && piecesPresentes(s.entrees).length === 1 && listeAchats.length === 0 && !installationRequise(s.entrees);

  // Seuils d'approbation : réglables dans Taux_Calcul, aucun tant que le client n'a pas répondu.
  const marge = margeReelle(total, cout);
  const approbations = [
    (app?.PRIX_MIN ?? 0) > 0 && total > 0 && total < app!.PRIX_MIN ? `Sous le prix minimum de commande (${argent(app!.PRIX_MIN)}).` : "",
    (app?.MARGE_MIN ?? 0) > 0 && marge !== null && marge < app!.MARGE_MIN ? `Marge sous le seuil de ${nombre2(app!.MARGE_MIN * 100)} % : approbation requise.` : "",
    (app?.MONTANT_APPROB ?? 0) > 0 && total > app!.MONTANT_APPROB ? `Montant au-dessus de ${argent(app!.MONTANT_APPROB)} : approbation requise.` : "",
  ].filter(Boolean);

  // ── enregistrement : toujours « Brouillon », jamais d'envoi ───────────────
  function dossierPour(entrees: Record<string, CellValue>, id: string) {
    const json = construireSoumissionJSON({
      m: s.moteur,
      e: entrees,
      meta: {
        id: id || ID_SUBSTITUTION,
        statut: "Brouillon",
        source: "widget",
        date_soumission: new Date().toISOString().slice(0, 10),
        reference_externe: null,
        notes: "",
        moment: "validation",
      },
      simuler: (q) => simulerQuantite(entrees, q, s.params, { ...s.overridesTaux, ...s.surchargesMach }),
      epaisseurPo: (nom) => s.params?.epaisseurParNom[nom.toLowerCase()] ?? null,
    });
    return {
      // Le contrat ne décrit qu'une pièce chiffrée par le classeur. Vide, « Renvoyer à la
      // plateforme » s'annule de lui-même : mieux que d'y pousser un prix incomplet.
      soumission_json: simple ? JSON.stringify(json) : "",
      statut: "Brouillon" as const,
      webhook_statut: "",
      client: String(entrees[IN.client] ?? ""),
      no_client: String(entrees[IN.noClient] ?? ""),
      // L'écran actuel ouvre aussi ces soumissions, mais n'y voit que la pièce 1 : on le signale.
      modele: "[Essai] " + String(entrees[IN.modele] ?? ""),
      no_pce: String(entrees[IN.noPce] ?? ""),
      quantite: qte,
      facteur: toNum(entrees[IN.facteur] ?? ""),
      montant: cout,
      total,
      prix_unitaire: unitaire,
      donnees_json: JSON.stringify(entrees),
    };
  }

  /** S-AAAA-NNNN suivant, d'après les soumissions existantes. "" si la liste est illisible. */
  async function prochainNumero(): Promise<string> {
    const r = await chargerSoumissions();
    if (!r.ok) return "";
    const annee = new Date().getFullYear();
    let max = 0;
    for (const x of r.liste) {
      const m = new RegExp(`"${CELL_NUMERO}":"S-${annee}-(\\d+)"`).exec(x.donnees);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return `S-${annee}-${String(max + 1).padStart(4, "0")}`;
  }

  async function enregistrerSans(): Promise<{ ok: boolean; id: string; entrees: Record<string, CellValue>; message: string }> {
    const entrees: Record<string, CellValue> = { ...s.entrees, [CELL_ORIGINE_S2]: 1 };
    if (!entrees[CELL_NUMERO]) entrees[CELL_NUMERO] = await prochainNumero();
    const dossier = dossierPour(entrees, idSoumission);
    const res = idSoumission ? await majSoumission(idSoumission, dossier) : await sauvegarderSoumission(dossier);
    if (!res.ok) return { ok: false, id: "", entrees, message: res.message };
    const id = res.id ?? idSoumission;
    if (id) {
      setIdSoumission(id);
      set(CELL_ORIGINE_S2, 1);
      set(CELL_NUMERO, entrees[CELL_NUMERO]);
      const d = await majDatesCreator(id, { requise: s.saisie(IN.date), commande: "", expedition: s.saisie("X!DATE_EXP") });
      if (!d.ok) console.warn("majDatesCreator:", d.message);
    }
    return { ok: true, id, entrees, message: res.message };
  }

  async function enregistrer() {
    const manque = coordonneesManquantes(s.entrees);
    if (manque.length || manques09.length) {
      setMessage("À compléter avant d'enregistrer : " + [...(manque.length ? ["nouveau client (" + manque.join(", ") + ")"] : []), ...manques09].join(" "));
      return;
    }
    if (enAttente) return;
    setOccupe(true);
    setMessage("Enregistrement…");
    try {
      const r = await enregistrerSans();
      setMessage(r.message + (r.ok && !simple ? " Cette soumission ne s'ouvre au complet que dans cet écran." : ""));
    } finally {
      setOccupe(false);
    }
  }

  // ── bon de travail : un par pièce, en « Brouillon », jamais deux fois ─────
  async function versBonTravail() {
    const manque = coordonneesManquantes(s.entrees);
    if (manque.length) {
      setMessage("Nouveau client, à compléter : " + manque.join(", ") + ".");
      return;
    }
    if (!prixVisible) {
      setPopup("verifier");
      return;
    }
    if (enAttente || !actif) return;
    setOccupe(true);
    setMessage("Bon de travail…");
    try {
      const r = await enregistrerSans();
      if (!r.ok || !r.id) {
        setMessage(r.ok ? "Mode démo : aucun bon de travail créé." : r.message);
        return;
      }
      const atelier = new Set(CELLULES_SAISIE);
      const entrees = { ...r.entrees };
      const faits: string[] = [];
      let erreur = "";
      for (const k of piecesPresentes(entrees)) {
        if (entrees[cellBT(k)]) continue;
        const q = quantitePiece(entrees, k, actif);
        if (!(q > 0)) continue;
        const modifs = modifsPiece(entrees, k, q, k === 1 ? null : feuillePour(entrees, k, q));
        const m = k === 1 ? s.moteur : simulerScenario(entrees, s.params, { ...s.overridesTaux, ...s.surchargesMach }, modifs);
        const soum: Record<string, CellValue> = {};
        const bt: Record<string, CellValue> = {};
        for (const [c, v] of Object.entries(k === 1 ? entrees : { ...entrees, ...modifs })) (atelier.has(c) ? bt : soum)[c] = v;
        const res = await creerBonTravail({
          plats: champsPlatsBT(m, bt, r.id, "Brouillon"),
          donnees_soum: JSON.stringify(soum),
          donnees_bt: JSON.stringify(bt),
        });
        if (!res.ok) {
          erreur = res.message;
          break;
        }
        entrees[cellBT(k)] = res.no_bt || "créé";
        faits.push(res.no_bt || "créé");
      }
      if (faits.length) {
        for (const k of piecesPresentes(entrees)) if (entrees[cellBT(k)]) set(cellBT(k), entrees[cellBT(k)]);
        const maj = await majSoumission(r.id, dossierPour(entrees, r.id));
        if (!maj.ok) erreur = "le numéro du bon n'a pas pu être noté sur la soumission : " + maj.message;
      }
      setMessage([faits.length ? "Bon de travail créé en brouillon : " + faits.join(", ") + "." : "", erreur].filter(Boolean).join(" "));
    } finally {
      setOccupe(false);
    }
  }
  const btFaits = piecesPresentes(s.entrees).map((k) => String(s.saisie(cellBT(k)) ?? "")).filter(Boolean);
  const btComplet = btFaits.length > 0 && piecesPresentes(s.entrees).every((k) => s.saisie(cellBT(k)) || !(actif && quantitePiece(s.entrees, k, actif) > 0));

  function ouvrir() {
    setPopup("ouvrir");
    setListe(null);
    void chargerSoumissions().then(setListe);
  }

  const lignesProposition: LigneProposition[] = paliers.map((c, i) => {
    const v = toNum(s.saisie(cellVendu(c)));
    return { qte: toNum(s.saisie(c)), unitaire: v > 0 ? v : simulations[i].prix, suggere: v <= 0, active: c === actif };
  });

  // ── raccourcis de rendu ───────────────────────────────────────────────────
  const N = (label: string, cell: string, o: { pct?: boolean; unite?: string; nu?: boolean; placeholder?: string } = {}) => (
    <Nombre label={label} cell={cell} value={s.saisie(cell)} onChange={set} {...o} />
  );
  const T = (label: string, cell: string, o: { type?: "text" | "date"; nu?: boolean } = {}) => (
    <Texte label={label} cell={cell} value={s.saisie(cell)} onChange={set} {...o} />
  );
  const C = (label: string, cell: string) => <Coche label={label} cell={cell} value={s.saisie(cell)} onChange={set} />;

  const temps = dureeTexte(0, heures * 60);
  const unitaireUs = seri ? s.num(OUT.prixUnitaireUs) : 0;
  const plusieurs = autresPieces.length > 0;
  const matieres = useMemo(
    () => [...new Set(Object.values(catalogues).flat())].filter((n) => (s.params?.prixParNom[n.toLowerCase()] ?? 0) > 0).sort((x, y) => x.localeCompare(y, "fr")),
    [catalogues, s.params],
  );
  const autresProduits: ProduitSupplementaire[] = autresPieces.map((x) => ({
    nom: x.infos.desc || x.infos.modele || `Pièce ${x.k}`,
    spec: [x.infos.no && "N° " + x.infos.no, x.infos.l > 0 && x.infos.h > 0 ? `${nombre3(x.infos.l)} × ${nombre3(x.infos.h)} po` : ""].filter(Boolean).join(" · "),
    prix: Object.fromEntries(
      Object.entries(x.prix).map(([c, v]) => [toNum(s.saisie(c)), { qte: v.qte, unitaire: venduPiece(x.k, c, v.unitaire) }]),
    ),
  }));
  const forfaits = [
    ...(totAchats.prix > 0 ? [{ libelle: "Sous-traitance et achats", montant: totAchats.prix }] : []),
    ...(montantInst > 0 ? [{ libelle: "Installation", montant: montantInst }] : []),
  ];
  const presses = machinesFamille(s.machinesCalc, "presse");
  const valeurPresse = String(s.saisie(CELL_PRESSE) ?? "");

  // ── résumés de la ligne de titre ───────────────────────────────────────────
  // Ce qu'une section repliée doit encore laisser vérifier d'un coup d'œil. Le critère retenu :
  // ce pour quoi on rouvrirait la section juste pour aller lire une valeur.
  const sv = (c: string) => String(s.saisie(c) ?? "").trim();
  const nv = (c: string) => toNum(s.saisie(c));
  const joindre = (...x: (string | false | null | undefined)[]) => x.filter(Boolean).join(" · ");
  const matieresChoisies = MATERIAUX.map(([, , cell]) => sv(cell)).filter(Boolean);
  const nbPieces = piecesPresentes(s.entrees).length;

  const resumes: Record<string, string> = {
    "01": joindre(sv(IN.client), sv(CELL_PROP.contact)) || "à remplir",
    "02": nbPieces > 1
      ? nbPieces + " pièces"
      : sv(IN.dimPceX)
        ? sv(IN.dimPceX) + " × " + sv(IN.dimPceY) + " po"
        : "à remplir",
    "03": joindre(nv("X!CERT_UL") ? "UL" : "", nv("X!CERT_CSA") ? "CSA" : "", nv("X!CERT_FAIR") ? "FAIR" : "") || "aucune",
    "04": joindre(
      actif && nv(actif) ? nv(actif).toLocaleString("fr-CA") + " ex." : "",
      "gâche " + Math.round(gache * 100) + " %",
    ),
    "05": seri
      ? joindre(
          nv(IN.couleursVisibles) ? nv(IN.couleursVisibles) + " coul." : "",
          valeurPresse || "presse générique",
          nv(IN.nbUp) ? nv(IN.nbUp) + " poses" : "",
          nv(IN.dimMrxX) ? sv(IN.dimMrxX) + " × " + sv(IN.dimMrxY) + " po" : "",
        )
      : methode === "numerique"
        ? "numérique"
        : "découpe seule",
    "06": matieresChoisies.length
      ? matieresChoisies[0] + (matieresChoisies.length > 1 ? " + " + (matieresChoisies.length - 1) : "")
      : "aucune matière",
    "07": joindre(
      nv(IN.zundCoupeC) ? "Zünd coupe" : "",
      nv(IN.zundKisscutC) ? "Zünd mi-chair" : "",
      nv(IN.platCoupeDie) ? "platine " + nv(IN.platCoupeDie) + "/" + nv(IN.platCoupeUp) : "",
      nv(IN.guillotineQte) ? "guillotine" : "",
    ) || "aucune découpe",
    "08": joindre(sv("X!LIV_MODE"), sv("X!LIV_FORMAT")) || "à remplir",
  };

  return (
    <div className="s2">
      <header className="s2-tete">
        <div className="s2-marque" aria-hidden="true" />
        <div>
          <h1>
            Soumission {String(s.saisie(CELL_NUMERO) ?? "")} <small>{idSoumission ? "enregistrée, ID " + idSoumission : "non enregistrée"}{btFaits.length ? " · " + btFaits.join(", ") : ""}</small>
          </h1>
          <p>
            Valide 30 jours · paiement selon le dossier client · prix : {sources.prix || "chargement…"} · machines :{" "}
            {sources.machines || "chargement…"} · questions numériques : {configNum.source} · build {__BUILD__}
          </p>
        </div>
        <b className="s2-essai">Version d'essai</b>
      </header>

      <nav className="s2-actions" aria-label="Actions">
        <button type="button" className="btn" disabled={!pret} onClick={nouvelle}>Nouvelle soumission</button>
        <button
          type="button"
          className="btn"
          disabled={!pret}
          title="Garde tout le contenu ; le prochain enregistrement crée une nouvelle soumission"
          onClick={() => {
            setIdSoumission("");
            for (const c of Object.keys(s.entrees)) if (c === CELL_NUMERO || /^X!S2_BT\d$/.test(c)) unset(c);
            setMessage("Copie prête : l'originale reste intacte, « Enregistrer » crée une nouvelle soumission.");
          }}
        >
          Dupliquer
        </button>
        <button type="button" className="btn" disabled={!pret} onClick={ouvrir}>Ouvrir</button>
        <button type="button" className="btn" disabled={!prixVisible} title={prixVisible ? "Soumission client, deux pages" : seri ? "Le prix n'est pas encore validé" : "Un prix provisoire ne s'imprime pas"} onClick={() => setPopup("client")}>Imprimer</button>
        <button type="button" className="btn" disabled={!prixVisible} title={prixVisible ? "Ouvre le document, d'où part le courriel" : "Le prix n'est pas encore validé"} onClick={() => setPopup("client")}>Envoyer</button>
        <span className="s2-message" role="status">{message}</span>
        <button type="button" className="btn" disabled={!pret || occupe} onClick={() => void enregistrer()}>Enregistrer</button>
        <button
          type="button"
          className="btn solid"
          disabled={!pret || occupe || !seri || btComplet}
          title={!seri ? "Un prix provisoire ne crée pas de bon de travail" : btComplet ? "Déjà créé : " + btFaits.join(", ") : "Enregistre, puis crée un bon de travail en brouillon par pièce"}
          onClick={() => void versBonTravail()}
        >
          Envoyer vers le bon de travail
        </button>
      </nav>

      {repli && (
        <p className="s2-repli" role="alert">
          Creator n'a pas tout fourni : {sources.prix === "copie embarquée" ? "les prix " : ""}
          {sources.machines === "copie embarquée" ? "les machines " : ""}viennent de la copie embarquée, qui peut être périmée. Rechargez la page avant de chiffrer.
        </p>
      )}

      {configNum.alerte && <p className="s2-repli" role="alert">{configNum.alerte}</p>}

      {cachesPrix.length > 0 && (
        <div className="s2-repli s2-caches" role="alert">
          <p>
            Cette soumission contient {cachesPrix.length > 1 ? cachesPrix.length + " réglages qui n'ont pas de case" : "un réglage qui n'a pas de case"} dans cet écran.
            Le prix en tient compte ; pour les modifier, passez par l'écran actuel.
          </p>
          <ul>
            {cachesPrix.map((x) => (
              <li key={x.cellules[0]} title={x.detail}>
                {x.libelle}{x.machine ? " : " + x.detail : ""} <b>{x.montant === null ? "montant non isolé" : (x.montant > 0 ? "+ " : "− ") + argent(Math.abs(x.montant))}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
      {cachesSansEffet.length > 0 && (
        <p className="s2-note s2-sanseffet">Aussi conservé, sans effet sur le total : {cachesSansEffet.map((x) => `${x.libelle} (${x.detail})`).join(" · ")}</p>
      )}

      <main className="s2-grille">
        <div className="s2-gauche">
          <Section no="01" titre="Client" resume={resumes["01"]}>
            <div className="s2-champs">
              <Liste a={acces} label="Type de client" cell={CELL_TYPE_CLIENT} vide="Client existant" options={["Nouveau client"]} />
              {T("Date", IN.date, { type: "date" })}
              {T("N° client", IN.noClient)}
              {T("Client", IN.client)}
              {T("Contact", CELL_PROP.contact)}
              {T("Représentant·e", CELL_PROP.representant)}
            </div>
            <Coordonnees a={acces} />
          </Section>

          <Section no="02" titre="Pièces et fichier" resume={resumes["02"]}>
            <TableauPieces a={acces} entrees={s.entrees} />
            <Fichier a={acces} taux={s.params?.app?.TAUX_INFOGRAPHIE ?? 85} />
          </Section>

          <Section no="03" titre="Certifications" resume={resumes["03"]}><Certifications a={acces} /></Section>

          <Section no="04" titre="Quantités" resume={resumes["04"]}>
            <table className="s2-table">
              <thead>
                <tr><th>Retenue</th><th>Palier</th><th>Avec la gâche</th><th /></tr>
              </thead>
              <tbody>
                {paliers.map((c, i) => (
                  <tr key={c} className={c === actif ? "actif" : ""}>
                    <td><input type="radio" name="retenue" aria-label={"Retenir le palier " + (i + 1)} checked={c === actif} disabled={!(toNum(s.saisie(c)) > 0)} onChange={() => retenir(c)} /></td>
                    <td><Nombre nu label={"Palier " + (i + 1)} cell={c} value={s.saisie(c)} onChange={setPalier} /></td>
                    <td className="num">{toNum(s.saisie(c)) > 0 ? avecGache(toNum(s.saisie(c)), gache).toLocaleString("fr-CA") : ""}</td>
                    <td>
                      <button type="button" className="s2-retirer" aria-label={"Retirer le palier " + (i + 1)} disabled={c === actif && paliers.filter((x) => toNum(s.saisie(x)) > 0).length < 2} onClick={() => retirerPalier(c)}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="s2-champs">
              <button type="button" className="btn" disabled={paliers.length >= 10} onClick={() => set(prochainPalier(s.entrees), "")}>+ Ajouter un palier</button>
              {N("Gâche", IN.perte, { pct: true })}
            </div>
            <GrillePieces a={acces} entrees={s.entrees} paliers={paliers} />
          </Section>

          <Section no="05" titre="Production" resume={resumes["05"]}>
            <div className="s2-methodes" role="radiogroup" aria-label="Méthode">
              {([["serigraphie", "Sérigraphie"], ["numerique", "Numérique"], ["decoupe", "Découpe numérique seulement"]] as [Methode, string][]).map(([m, l]) => (
                <label key={m}><input type="radio" name="methode" checked={methode === m} onChange={() => changerMethode(m)} /> {l}</label>
              ))}
            </div>
            {methode === "numerique" ? <Numerique a={acces} entrees={s.entrees} config={configNum.champs} /> : null}
            {methode === "decoupe" ? <p className="s2-note">Aucune impression : seules la matière et la découpe Zünd sont chiffrées.</p> : null}
            {!seri ? <HypothesesNum a={acces} entrees={s.entrees} r={resNum} app={app} fiches={machines} matieres={matieres} imprime={methode === "numerique"} /> : null}
            {seri ? (<>
            <h3>Base</h3>
            <div className="s2-champs">
              {N("Couleurs visibles", IN.couleursVisibles)}
              <Champ
                label="Presse"
                aide={s.presseChoisie ? `feuille max ${s.presseChoisie.largeurPo ?? "?"} × ${s.presseChoisie.hauteurPo ?? "?"} po` : undefined}
              >
                <select className="in" aria-label="Presse" data-cell={CELL_PRESSE} value={valeurPresse} onChange={(e) => set(CELL_PRESSE, e.target.value)}>
                  <option value="">Presse générique (classeur)</option>
                  {presses.map((m) => (
                    <option key={m.nom} value={m.nom}>{m.nom} · {m.vitesse} fle/h</option>
                  ))}
                  {valeurPresse && !presses.some((m) => cleMachine(m.nom) === cleMachine(valeurPresse)) ? (
                    <option value={valeurPresse}>{valeurPresse} (fiche introuvable)</option>
                  ) : null}
                </select>
              </Champ>
              {N("Nombre de poses (up)", IN.nbUp)}
              {N("Feuille, largeur", IN.dimMrxX, { unite: "po" })}
              {N("Feuille, hauteur", IN.dimMrxY, { unite: "po" })}
            </div>
            <h3>Réglages d'impression</h3>
            <div className="s2-champs">
              {N("Séparateur avant", IN.separateur1)}
              {N("Séparateur après", IN.separateur2)}
              {N("Passe add. avant", IN.passeAdd1)}
              {N("Passe add. après", IN.passeAdd2)}
              {N("Recto / verso avant", IN.rectoVerso1)}
              {N("Recto / verso après", IN.rectoVerso2)}
              {N("Couverture d'encre", IN.encres, { pct: true })}
            </div>
            <h3>Ajouts de production</h3>
            <div className="s2-champs">
              {N("Ajustement additionnel", IN.ajustAdd)}
              {N("Nettoyage add. avant", IN.nettoyage1)}
              {N("Nettoyage add. après", IN.nettoyage2)}
            </div>
            </>) : null}
          </Section>

          <Section no="06" titre="Matériel et laminage" resume={resumes["06"]} alerte={seri && !!adhesif && !toNum(s.saisie(adhesif.cellule))}>
            {seri ? (<>
            <div className="s2-champs large">
              {MATERIAUX.map(([label, champ, cell]) => (
                <Materiau key={cell} label={label} cell={cell} value={s.saisie(cell)} onChange={set} options={catalogues[champ]} />
              ))}
            </div>
            <h3>Pose de l'adhésif</h3>
            <div className="s2-champs">
              {C("Adhésif laminé", IN.adhesifLamine)}
              {C("Adhésif registre", IN.adhesifRegistre)}
            </div>
            {adhesif && !toNum(s.saisie(adhesif.cellule)) ? (
              <p className="s2-alerte">L'adhésif choisi demande « {adhesif.libelle} » ({adhesif.indice}), qui n'est pas coché : ce temps n'est pas compris dans le prix.</p>
            ) : null}
            </>) : <p className="s2-note">La matière chiffrée se choisit à la section 05.</p>}
            <Laminage a={acces} />
          </Section>

          <Section no="07" titre="Finition et découpe" resume={resumes["07"]}>
            {seri ? <div className="s2-champs">
              {C("Zünd, coupe", IN.zundCoupeC)}
              {C("Zünd, mi-chair", IN.zundKisscutC)}
              {N("Platine, matrices", IN.platCoupeDie)}
              {N("Platine, poses", IN.platCoupeUp)}
              {N("Guillotine", IN.guillotineQte)}
            </div> : null}
            <Outillage a={acces} />
          </Section>

          <Section no="08" titre="Livraison" resume={resumes["08"]}><Livraison a={acces} /></Section>
          <SectionOptionnelle no="09" titre="Sous-traitance et installation" alerte={manques09.length > 0} phase={totAchats.prix + montantInst > 0 ? argent(totAchats.prix + montantInst) : undefined}>
            <SousTraitance a={acces} entrees={s.entrees} liste={listeAchats} majoration={app?.MAJORATION_ST ?? MAJORATION_DEFAUT} onPO={(f) => { setPoSeul(f); setPopup("po"); }} />
            <Installation a={acces} entrees={s.entrees} />
            {manques09.length ? <ul className="s2-liste">{manques09.map((x) => <li key={x} className="s2-alerte">{x}</li>)}</ul> : null}
          </SectionOptionnelle>
          <SectionOptionnelle no="10" titre="Notes"><Notes a={acces} /></SectionOptionnelle>
        </div>

        <aside className="s2-droite">
          <section className="s2-section" aria-label="Prix par quantité">
            <h2>Prix par quantité</h2>
            <div className="s2-corps">
              <table className="s2-table">
                <thead><tr><th>Qté</th><th>Prix</th><th>Vendu</th><th>US</th><th>Contrat</th></tr></thead>
                <tbody>
                  {paliers.map((c, i) =>
                    simulations[i].qte > 0 ? (
                      <tr key={c} className={c === actif ? "actif" : ""}>
                        <td className="num"><button type="button" className="s2-lien" onClick={() => retenir(c)}>{simulations[i].qte.toLocaleString("fr-CA")}</button></td>
                        <td className="num">{masque(nombre2(simulations[i].prix))}</td>
                        <td><Nombre nu label={"Vendu pour " + simulations[i].qte} cell={cellVendu(c)} value={s.saisie(cellVendu(c))} onChange={(_, v) => setVendu(c, v)} placeholder={prixVisible ? nombre2(simulations[i].prix) : ""} /></td>
                        <td className="num">{simulations[i].us > 0 ? masque(nombre2(simulations[i].us)) : ""}</td>
                        <td><Texte nu label={"Contrat pour " + simulations[i].qte} cell={cellContrat(c)} value={s.saisie(cellContrat(c))} onChange={set} /></td>
                      </tr>
                    ) : null,
                  )}
                </tbody>
              </table>
              {plusieurs ? (
                <table className="s2-table" aria-label="Prix unitaire par pièce et par palier">
                  <thead><tr><th>Pièce</th>{paliers.map((c, i) => (simulations[i].qte > 0 ? <th key={c}>{simulations[i].qte.toLocaleString("fr-CA")}</th> : null))}</tr></thead>
                  <tbody>
                    {autresPieces.map((x) => [
                      <tr key={x.k}>
                        <td>{x.k}. {x.infos.desc || x.infos.modele || "sans nom"}</td>
                        {paliers.map((c, i) => (simulations[i].qte > 0 ? <td key={c} className="num" title={x.prix[c] ? x.prix[c].qte.toLocaleString("fr-CA") + " pièces" : "non proposé"}>{x.prix[c] ? masque(nombre2(x.prix[c].unitaire)) : "—"}</td> : null))}
                      </tr>,
                      <tr key={x.k + "v"}>
                        <td className="s2-aide">vendu</td>
                        {paliers.map((c, i) => (simulations[i].qte > 0 ? <td key={c}>{x.prix[c] ? <Nombre nu label={`Vendu, pièce ${x.k}, palier ${simulations[i].qte}`} cell={cellVenduPiece(x.k, c)} value={s.saisie(cellVenduPiece(x.k, c))} onChange={set} /> : null}</td> : null))}
                      </tr>,
                    ])}
                  </tbody>
                </table>
              ) : null}
            </div>
          </section>

          {seri ? <section className="s2-section" aria-label="Calcul des poses">
            <h2>Calcul des poses</h2>
            <div className="s2-corps">
              {!(toNum(s.saisie(IN.dimPceX)) > 0 && toNum(s.saisie(IN.dimPceY)) > 0) ? (
                <p className="s2-note">Entrez la largeur et la hauteur de la pièce (section 02).</p>
              ) : !montage.meilleur ? (
                <p className="s2-alerte">Aucun format de feuille ne peut recevoir cette pièce.</p>
              ) : (
                <>
                  <Disposition
                    c={cible ?? montage.meilleur}
                    pieceL={toNum(s.saisie(IN.dimPceX))}
                    pieceH={toNum(s.saisie(IN.dimPceY))}
                    espace={toNum(s.moteur.val(CELL_ESPACE_UP))}
                    pourtour={toNum(s.moteur.val(CELL_POURTOUR))}
                  />
                  <dl className="s2-resume">
                    <dt>Feuille suggérée</dt><dd>{libelleFormat(montage.meilleur.format)} po</dd>
                    <dt>Poses par feuille</dt><dd>{montage.meilleur.upHorizontal} × {montage.meilleur.upVertical} = {montage.meilleur.upParFeuille}{montage.meilleur.pieceTournee ? ", pièce tournée de 90°" : ""}</dd>
                    <dt>Feuilles, gâche comprise</dt><dd>{montage.meilleur.nbFeuilles.toLocaleString("fr-CA")}</dd>
                    {montage.gainFeuilles !== null && montage.gainFeuilles > 0 && !retenu ? (<><dt>Feuilles économisées</dt><dd>{montage.gainFeuilles.toLocaleString("fr-CA")}</dd></>) : null}
                    <dt>Utilisation de la feuille</dt><dd>{Math.round(utilisation * 100)} %</dd>
                    <dt>Roulable sur</dt><dd>{montage.meilleur.presses.join(", ")}</dd>
                    {retenu ? (<><dt>Retenu</dt><dd>{retenu} po, {upRetenu} poses</dd></>) : null}
                  </dl>
                  {perime ? <p className="s2-alerte">Le montage retenu ne correspond plus : {perime}. Le prix est encore calculé dessus.</p> : null}
                  {presseIncompatible ? <p className="s2-alerte">{presseIncompatible} ne peut pas rouler cette feuille.</p> : null}
                  <div className="s2-champs">
                    {!retenu || perime ? <button type="button" className="btn" onClick={accepter}>{perime ? "Reprendre la suggestion" : "Accepter"}</button> : null}
                    {retenu ? <button type="button" className="btn" onClick={annuler}>{perime ? "Revenir au montage d'origine" : "Annuler"}</button> : null}
                  </div>
                </>
              )}
            </div>
          </section> : null}

          <details className="s2-section">
            <summary>Sommaire <b>{masque(argent(total))}</b></summary>
            <div className="s2-corps">
              <dl className="s2-resume">
                <dt>Coût de revient</dt><dd>{masque(argent(cout))}</dd>
                <dt>Marge réelle</dt><dd>{masque(marge === null ? "" : nombre2(marge * 100) + " %")}</dd>
                <dt>Temps de production</dt><dd>{pret ? temps : "…"}</dd>
                {plusieurs || forfaits.length ? (<><dt>Pièce 1</dt><dd>{masque(argent(total1))}</dd></>) : null}
                {autresActif.map((x) => [<dt key={x.k}>Pièce {x.k} × {x.qte.toLocaleString("fr-CA")}</dt>, <dd key={x.k + "m"}>{masque(argent(x.vente))}</dd>])}
                {forfaits.map((f) => [<dt key={f.libelle}>{f.libelle}</dt>, <dd key={f.libelle + "m"}>{masque(argent(f.montant))}</dd>])}
                <dt>Prix unitaire{plusieurs ? ", pièce 1" : ""}</dt><dd>{masque(nombre3(unitaire) + " $")}</dd>
                <dt>Prix unitaire US</dt><dd>{unitaireUs > 0 ? masque(nombre3(unitaireUs) + " $") : "aucun taux saisi"}</dd>
              </dl>
              {doffice.length ? <p className="s2-note">Compté d'office dans le total, sans case ici : {doffice.map((x) => `${x.libelle.toLowerCase()} ${argent(x.montant)}`).join(", ")}.</p> : null}
              <div className="s2-champs">{N("Facteur", IN.facteur, { pct: true })}{N("Transport", IN.transport, { unite: "$" })}</div>
              {approbations.length && (prixVisible || !seri) ? <ul className="s2-liste">{approbations.map((x) => <li key={x} className="s2-alerte">{x}</li>)}</ul> : null}
            </div>
          </details>
        </aside>
      </main>

      <footer className="s2-barre" aria-label="Sommaire">
        <span>Quantité <b>{qte > 0 ? qte.toLocaleString("fr-CA") : "aucune"}</b></span>
        <span>Coût <b>{masque(argent(cout))}</b></span>
        <span>Unitaire{plusieurs ? " (pièce 1)" : ""} <b>{masque(nombre2(unitaire) + " $")}</b></span>
        <span>Temps <b>{pret ? temps : "…"}</b></span>
        {!seri && !aCompleter ? <span className="s2-provisoire">Prix provisoire</span> : null}
        <span className="total">Total <b aria-live="polite">{masque(argent(total))}</b></span>
      </footer>

      {popup === "ouvrir" && (
        <PopupSoumissions
          resultat={liste}
          chargement={liste === null}
          onOuvrir={(sr) => {
            const ok = s.chargerDonnees(sr.donnees);
            let dIci = false;
            try {
              const lues = JSON.parse(sr.donnees) as Record<string, CellValue>;
              dIci = Number(lues[CELL_ORIGINE_S2]) === 1;
              // Ouvrir ne doit pas changer le prix : l'adhésif déjà choisi est considéré comme
              // traité, la case reste telle qu'elle a été enregistrée. (FC-940 gagnait 425 $.)
              if (ok) autoAdhesif.current = deduireAdhesif(lues)?.cellule ?? null;
            } catch {
              dIci = false;
            }
            setIdSoumission(ok && dIci ? sr.id : "");
            setPopup(null);
            setMessage(
              !ok
                ? "Impossible d'ouvrir cette soumission (données absentes ou format inattendu)."
                : dIci
                  ? "Soumission ouverte : « Enregistrer » la met à jour."
                  : "Soumission de l'écran actuel, ouverte en copie : « Enregistrer » en crée une nouvelle, l'originale reste intacte.",
            );
          }}
          onSupprimee={(id) => setListe((p) => (p?.ok ? { ...p, liste: p.liste.filter((x) => x.id !== id) } : p))}
          onClose={() => setPopup(null)}
        />
      )}
      {popup === "verifier" && (
        <PopupVerification
          controles={tous}
          onAccepter={(drapeau) => set(drapeau, 1)}
          onRefuser={(c) => {
            setPopup(null);
            setMessage(c.type === "confirmation" ? c.conseil : c.message);
          }}
          onClose={() => setPopup(null)}
        />
      )}
      {popup === "po" && <PopupPO liste={listeAchats} seul={poSeul} reference={String(s.saisie(CELL_NUMERO) ?? "")} onClose={() => setPopup(null)} />}
      {popup === "client" && (
        <PopupProposition
          infos={{
            noSoumission: String(s.saisie(IN.codeS) || s.saisie(CELL_NUMERO) || "").trim(),
            date: dateOuTexte(s.saisie(IN.date)) || new Date().toLocaleDateString("fr-CA"),
            client: String(s.saisie(IN.client) ?? "").trim(),
            noClient: String(s.saisie(IN.noClient) ?? "").trim(),
            description: String(s.saisie(IN.modele) ?? "").trim(),
            noPce: String(s.saisie(IN.noPce) ?? "").trim(),
            dimensions: [IN.dimPceX, IN.dimPceY].every((c) => toNum(s.saisie(c)) > 0)
              ? `${nombre3(s.saisie(IN.dimPceX))} × ${nombre3(s.saisie(IN.dimPceY))} po`
              : "",
            materiau: [...new Set(CELLS_MATERIAU_IMPR.map((c) => String(s.saisie(c) ?? "").trim()).filter((v) => v && !XTRA_PLACEHOLDER.includes(v)))].join(" · "),
            couleurs: toNum(s.saisie(IN.couleursVisibles)) > 0 ? `${toNum(s.saisie(IN.couleursVisibles))} couleur(s)` : "",
          }}
          lignes={lignesProposition}
          autresProduits={autresProduits}
          forfaits={forfaits}
          notesClient={String(s.saisie(CELL_NOTES_CLIENT) ?? "").trim()}
          libre={s.saisie}
          setLibre={set}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}
