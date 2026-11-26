// Tableau d'atelier — déclaration des temps, la job au centre.
//
// L'écran précédent demandait à l'opérateur de se reconnaître, puis de remplir un formulaire :
// un bon de travail, une opération, une machine, démarrer. Celui-ci part de l'autre bout. Il
// montre les jobs en production et, sur chacune, les opérations de sa gamme. On appuie sur
// l'opération qu'on commence, on dit qui on est, c'est parti. Déclarer son temps devient un
// effet de bord : on fait avancer la job.
//
// Trois conséquences voulues :
//   · tout le monde voit où en est l'atelier sans demander à personne ;
//   · le temps prévu s'affiche sur chaque opération, donc l'écart se voit pendant le travail
//     et non dans un rapport trois semaines plus tard ;
//   · le même écran tient sur une tablette de poste comme sur un écran au mur.
//
// La gamme de chaque job n'est pas devinée : `gammeDuBon` la déduit des temps estimés que le
// bon porte déjà et de la règle de déclenchement d'`Operations_Liste`.
//
// Le widget n'horodate RIEN : il envoie un changement de statut, le workflow Creator pose les
// heures et calcule les durées. Les chronos affichés sont des reflets, jamais des sources.

import { useCallback, useEffect, useMemo, useState } from "react";
import { initZohoEnv, isZohoEnv } from "@/services/zohoService";
import {
  chargerReferentiels,
  chargerPointages,
  demarrerPointage,
  changerStatut,
  creerRessource,
  gammeDuBon,
  operationsAjoutables,
  referentielsExemple,
  pointagesExemple,
  minutesEcoulees,
  dureeLisible,
  dureeCourte,
  heureLisible,
  dateCreator,
  type Referentiels,
  type Pointage,
  type Operation,
  type BonRef,
} from "@/services/pointageService";
import "./pointage.css";

declare const __BUILD__: string;

const CLE_OPERATEUR = "bsp.pointage.operateur";
const CLE_STATUT = "bsp.pointage.statut";

type Avis = { ton: "ok" | "erreur"; texte: string } | null;

/** Une ligne de la fiche. La valeur vide fait disparaître la ligne : une job dont le bon
 *  n'a pas de n° de cadre ne doit pas afficher « Cadre — ». */
type LigneFiche = [string, string];

const nombre = (v: number, dec = 0) =>
  v.toLocaleString("fr-CA", { minimumFractionDigits: dec, maximumFractionDigits: dec });

/** Une dimension : deux décimales au plus, sans zéros inutiles. */
const mesure = (v: number) => v.toLocaleString("fr-CA", { maximumFractionDigits: 2 });

const paire = (x: number, y: number) => (x > 0 || y > 0 ? mesure(x) + " × " + mesure(y) : "");

/** `08-Dec-2026` → `8 décembre 2026`. Rend la chaîne telle quelle si elle est illisible :
 *  mieux vaut une date au format Creator qu'un champ vide. */
function jourLisible(v: string): string {
  const d = dateCreator(v);
  if (!d) return v;
  return d.toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
}

/** Dans combien de jours, en mots — et si c'est déjà passé. En atelier, « 2 décembre »
 *  ne dit pas la même chose que « demain ». */
function echeance(v: string): { texte: string; urgent: boolean } | null {
  const d = dateCreator(v);
  if (!d) return null;
  const jour = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const j = Math.round((jour(d) - jour(new Date())) / 86400000);
  if (j < 0) return { texte: j === -1 ? "hier" : "il y a " + -j + " jours", urgent: true };
  if (j === 0) return { texte: "aujourd'hui", urgent: true };
  if (j === 1) return { texte: "demain", urgent: true };
  return { texte: "dans " + j + " jours", urgent: j <= 3 };
}

/** Ce que la feuille du bas demande, quand elle est ouverte. */
type Feuille =
  | { quoi: "demarrer"; bon: BonRef; op: Operation }
  | { quoi: "agir"; bon: BonRef; op: Operation; pointages: Pointage[] }
  | { quoi: "ajouter"; bon: BonRef }
  | null;

/** Lecture tolérante du stockage local : une tablette en navigation privée ne doit pas
 *  faire échouer l'écran. */
function memoire(cle: string): string {
  try {
    return localStorage.getItem(cle) ?? "";
  } catch {
    return "";
  }
}
function retenir(cle: string, v: string) {
  try {
    if (v) localStorage.setItem(cle, v);
    else localStorage.removeItem(cle);
  } catch {
    /* tablette verrouillée : tant pis, on ne mémorise pas */
  }
}

export default function AppPointage() {
  const [pret, setPret] = useState(false);
  const [dansZoho, setDansZoho] = useState(false);
  const [ref, setRef] = useState<Referentiels | null>(null);
  const [pointages, setPointages] = useState<Pointage[]>([]);
  const [avis, setAvis] = useState<Avis>(null);
  const [occupe, setOccupe] = useState(false);
  const [maintenant, setMaintenant] = useState(() => new Date());

  const [feuille, setFeuille] = useState<Feuille>(null);
  /** La job dont on regarde la fiche, par son identifiant. `null` = le tableau. */
  const [jobOuverte, setJobOuverte] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [statutFiltre, setStatutFiltre] = useState(() => memoire(CLE_STATUT));
  const [dernierOperateur, setDernierOperateur] = useState(() => memoire(CLE_OPERATEUR));
  /** Quand on a vu un pointage passer en pause, faute de `Pause_debut` côté Creator. */
  const [pauseVue, setPauseVue] = useState<Record<string, number>>({});

  // ajout d'un opérateur absent de la liste
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [depNouveau, setDepNouveau] = useState("");

  const rafraichir = useCallback(async () => {
    // Hors Creator, les rapports ne répondent pas : l'écran resterait vide et indémontrable.
    // On charge une demi-journée d'atelier d'exemple, annoncée comme telle, et les actions
    // s'appliquent en mémoire — de quoi montrer l'écran sans toucher aux données réelles.
    if (!isZohoEnv()) {
      const r = referentielsExemple();
      setRef(r);
      setPointages(pointagesExemple(r));
      return;
    }
    const [r, p] = await Promise.all([chargerReferentiels(), chargerPointages()]);
    if (r) setRef(r);
    setPointages(p);
  }, []);

  useEffect(() => {
    (async () => {
      await initZohoEnv();
      setDansZoho(isZohoEnv());
      await rafraichir();
      setPret(true);
    })();
  }, [rafraichir]);

  // Le workflow Creator est censé poser `Pause_debut` quand le statut passe en pause. Tant
  // qu'il ne le fait pas, le compteur continuerait de courir alors que le travail est arrêté.
  // On retient donc nous-mêmes l'instant où on voit la pause : le chrono se fige à l'écran,
  // même si la durée exacte reste celle que Creator calculera.
  useEffect(() => {
    const sansDebut = pointages.filter(
      (p) => p.statut === "En pause" && !p.pauseDebut && !pauseVue[p.id],
    );
    if (!sansDebut.length) return;
    setPauseVue((v) => {
      const n = { ...v };
      for (const p of sansDebut) n[p.id] = Date.now();
      return n;
    });
  }, [pointages, pauseVue]);

  /** L'instant auquel lire un pointage : maintenant, ou le début de sa pause. */
  const instantDe = useCallback(
    (p: Pointage) => {
      if (p.statut !== "En pause") return maintenant;
      const t = p.pauseDebut?.getTime() ?? pauseVue[p.id];
      return t ? new Date(t) : maintenant;
    },
    [maintenant, pauseVue],
  );

  /** Le temps déclaré sur une opération, chaque pointage lu à son propre instant. */
  const reelDe = useCallback(
    (bonId: string, opId: string) =>
      pointages
        .filter((p) => p.btId === bonId && p.operationId === opId)
        .reduce((somme, p) => somme + minutesEcoulees(p, instantDe(p)), 0),
    [pointages, instantDe],
  );

  // Un seul battement pour tous les chronos de la page.
  useEffect(() => {
    const t = setInterval(() => setMaintenant(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const agir = useCallback(
    async (action: () => Promise<{ ok: boolean; message: string }>) => {
      setOccupe(true);
      const r = await action();
      setAvis({ ton: r.ok ? "ok" : "erreur", texte: r.message });
      if (r.ok) await rafraichir();
      setOccupe(false);
      return r.ok;
    },
    [rafraichir],
  );

  // ── ce qui s'affiche ──────────────────────────────────────────────────────
  const statuts = useMemo(() => {
    const vus = new Set((ref?.bons ?? []).map((b) => b.statut).filter(Boolean));
    return [...vus].sort((a, b) => a.localeCompare(b, "fr"));
  }, [ref]);

  const bons = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return (ref?.bons ?? [])
      .filter((b) => !statutFiltre || b.statut === statutFiltre)
      .filter(
        (b) =>
          !q ||
          [b.noBT, b.client, b.modele, b.noPiece].some((x) => x.toLowerCase().includes(q)),
      );
  }, [ref, statutFiltre, recherche]);

  /** Les pointages ouverts, toutes jobs confondues : ce qui tourne en ce moment dans l'atelier. */
  const enCours = useMemo(
    () => pointages.filter((p) => p.statut === "En cours" || p.statut === "En pause"),
    [pointages],
  );

  const pointagesDe = useCallback(
    (bonId: string, opId: string) =>
      pointages.filter((p) => p.btId === bonId && p.operationId === opId),
    [pointages],
  );

  /** Hors Creator : le jeu d'exemple, et des actions qui ne quittent pas la page. */
  const demo = !dansZoho;

  /** Change le statut d'un pointage — dans Creator, ou en mémoire pour la démonstration. */
  async function basculer(id: string, statut: Pointage["statut"]) {
    if (demo) {
      setPointages((ps) =>
        ps.map((p) =>
          p.id === id
            ? {
                ...p,
                statut: statut as Pointage["statut"],
                dureeReelleMin:
                  statut === "Termine" ? minutesEcoulees(p, new Date()) : p.dureeReelleMin,
                punchOut: statut === "Termine" ? new Date() : p.punchOut,
              }
            : p,
        ),
      );
      return true;
    }
    return agir(() => changerStatut(id, statut as "En cours" | "En pause" | "Termine"));
  }

  if (!pret) return <div className="pt-page pt-attente">Chargement…</div>;

  // ── la gamme d'une job ────────────────────────────────────────────────────
  // Les mêmes boutons servent sur le tableau et sur la fiche : un opérateur qui a appris à
  // pointer depuis l'un n'a rien à réapprendre sur l'autre. `grand` ne change que la taille.
  function rendreOps(bon: BonRef, grand = false) {
    const gamme = gammeDuBon(bon, ref?.operations ?? [], pointages);
    return (
      <div className={"pt-ops" + (grand ? " pt-ops-grand" : "")}>
        {gamme.map(({ operation: op, prevuMin }) => {
          const ps = pointagesDe(bon.id, op.id);
          const ouverts = ps.filter((p) => p.statut === "En cours" || p.statut === "En pause");
          const fait = ps.length > 0 && !ouverts.length;
          const enPause = ouverts.length > 0 && ouverts.every((p) => p.statut === "En pause");
          const reel = reelDe(bon.id, op.id);
          const etat = ouverts.length ? (enPause ? "pause" : "cours") : fait ? "fait" : "afaire";
          const retard = reel > 0 && prevuMin > 0 && reel > prevuMin;

          let detail: string;
          if (ouverts.length) {
            const qui = ouverts.map((p) => p.ressourceNom || "?").join(", ");
            detail = (enPause ? "⏸ " : "▶ ") + qui + " · " + dureeLisible(reel);
          } else if (fait) {
            detail =
              prevuMin > 0
                ? dureeCourte(reel) + " / " + dureeCourte(prevuMin)
                : dureeCourte(reel) + " · sans estimation";
          } else {
            detail = prevuMin > 0 ? "prévu " + dureeCourte(prevuMin) : "sans estimation";
          }

          return (
            <button
              key={op.id}
              className={`pt-op pt-op-${etat}${retard ? " pt-op-retard" : ""}`}
              disabled={occupe}
              onClick={() =>
                setFeuille(
                  ouverts.length
                    ? { quoi: "agir", bon, op, pointages: ps }
                    : { quoi: "demarrer", bon, op },
                )
              }
            >
              <span className="pt-op-nom">{op.nom}</span>
              <span className="pt-op-detail">{detail}</span>
            </button>
          );
        })}
        <button className="pt-op pt-op-plus" onClick={() => setFeuille({ quoi: "ajouter", bon })}>
          + autre opération
        </button>
      </div>
    );
  }

  // ── feuille du bas ────────────────────────────────────────────────────────
  function fermer() {
    setFeuille(null);
    setAjoutOuvert(false);
  }

  async function demarrer(bon: BonRef, op: Operation, ressourceId: string) {
    if (demo) {
      const r = ref?.ressources.find((x) => x.id === ressourceId);
      setPointages((ps) => [
        ...ps,
        {
          id: "demo-" + Date.now(), btId: bon.id, btNo: bon.noBT,
          operationId: op.id, operationNom: op.nom,
          ressourceId, ressourceNom: r?.nom ?? "", machineNom: "",
          statut: "En cours", punchIn: new Date(), punchOut: null, pauseDebut: null,
          pauseCumuleeMin: 0, dureeReelleMin: null, commentaire: "",
        },
      ]);
      setDernierOperateur(ressourceId);
      retenir(CLE_OPERATEUR, ressourceId);
      fermer();
      return;
    }
    const ok = await agir(() =>
      demarrerPointage({ btId: bon.id, operationId: op.id, ressourceId }),
    );
    if (ok) {
      setDernierOperateur(ressourceId);
      retenir(CLE_OPERATEUR, ressourceId);
      fermer();
    }
  }

  async function ajouterOperateur(bon: BonRef, op: Operation) {
    if (!prenom.trim() || !nom.trim() || !depNouveau) {
      setAvis({ ton: "erreur", texte: "Prénom, nom et département sont nécessaires." });
      return;
    }
    setOccupe(true);
    const r = await creerRessource({
      prenom: prenom.trim(),
      nom: nom.trim(),
      departementId: depNouveau,
      roleId: ref?.roles[0]?.id ?? "",
      organisationId: ref?.organisationId ?? "",
    });
    setOccupe(false);
    setAvis({ ton: r.ok ? "ok" : "erreur", texte: r.message });
    if (!r.ok) return;
    setPrenom("");
    setNom("");
    setAjoutOuvert(false);
    await rafraichir();
    if (r.id) await demarrer(bon, op, r.id);
  }

  function rendreFeuille() {
    if (!feuille) return null;

    if (feuille.quoi === "demarrer") {
      const { bon, op } = feuille;
      const equipe = ref?.ressources ?? [];
      const memorise = equipe.find((r) => r.id === dernierOperateur);
      const autres = equipe.filter((r) => r.id !== dernierOperateur);
      return (
        <div className="pt-feuille" role="dialog" aria-label={"Démarrer " + op.nom}>
          <div className="pt-feuille-tete">
            <div>
              <h2>{op.nom}</h2>
              <p className="pt-sous">
                {bon.noBT} · {bon.client}
                {op.departement ? " · " + op.departement : ""}
              </p>
            </div>
            <button className="pt-btn pt-fermer" onClick={fermer} aria-label="Fermer">
              ×
            </button>
          </div>
          <p className="pt-question">Qui commence ?</p>
          <div className="pt-equipe">
            {memorise && (
              <button
                className="pt-qui pt-qui-moi"
                disabled={occupe}
                onClick={() => demarrer(bon, op, memorise.id)}
              >
                <span className="pt-qui-nom">{memorise.nom}</span>
                <span className="pt-qui-dep">dernier sur cette tablette</span>
              </button>
            )}
            {autres.map((r) => (
              <button
                key={r.id}
                className="pt-qui"
                disabled={occupe}
                onClick={() => demarrer(bon, op, r.id)}
              >
                <span className="pt-qui-nom">{r.nom}</span>
                {r.departement && <span className="pt-qui-dep">{r.departement}</span>}
              </button>
            ))}
          </div>

          {ajoutOuvert ? (
            <div className="pt-ajout">
              <div className="pt-ligne">
                <input
                  className="pt-champ"
                  placeholder="Prénom"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                />
                <input
                  className="pt-champ"
                  placeholder="Nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                />
                <select
                  className="pt-champ"
                  aria-label="Département"
                  value={depNouveau}
                  onChange={(e) => setDepNouveau(e.target.value)}
                >
                  <option value="">Département…</option>
                  {ref?.departements.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nom}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="pt-btn pt-btn-primaire"
                disabled={occupe}
                onClick={() => ajouterOperateur(bon, op)}
              >
                M'ajouter et démarrer
              </button>
            </div>
          ) : (
            <button className="pt-btn pt-lien" onClick={() => setAjoutOuvert(true)}>
              Je ne suis pas dans la liste
            </button>
          )}
        </div>
      );
    }

    if (feuille.quoi === "agir") {
      const { bon, op } = feuille;
      const ouverts = feuille.pointages.filter(
        (p) => p.statut === "En cours" || p.statut === "En pause",
      );
      return (
        <div className="pt-feuille" role="dialog" aria-label={op.nom}>
          <div className="pt-feuille-tete">
            <div>
              <h2>{op.nom}</h2>
              <p className="pt-sous">
                {bon.noBT} · {bon.client}
              </p>
            </div>
            <button className="pt-btn pt-fermer" onClick={fermer} aria-label="Fermer">
              ×
            </button>
          </div>
          {ouverts.map((p) => {
            const pause = p.statut === "En pause";
            return (
              <div key={p.id} className={"pt-encours" + (pause ? " pt-pause" : "")}>
                <div className="pt-encours-qui">{p.ressourceNom || "sans nom"}</div>
                <div className="pt-encours-temps">{dureeLisible(minutesEcoulees(p, instantDe(p)))}</div>
                <div className="pt-sous">
                  Début {heureLisible(p.punchIn)}
                  {p.pauseCumuleeMin > 0 && <> · pause {dureeLisible(p.pauseCumuleeMin)}</>}
                  {pause && (
                    <>
                      {" · "}
                      <strong>en pause</strong>
                    </>
                  )}
                </div>
                <div className="pt-ligne">
                  <button
                    className="pt-btn pt-btn-grand"
                    disabled={occupe}
                    onClick={() => basculer(p.id, pause ? "En cours" : "En pause")}
                  >
                    {pause ? "Reprendre" : "Pause"}
                  </button>
                  <button
                    className="pt-btn pt-btn-fin pt-btn-grand"
                    disabled={occupe}
                    onClick={async () => {
                      const ok = await basculer(p.id, "Termine");
                      if (ok && ouverts.length === 1) fermer();
                    }}
                  >
                    Terminer
                  </button>
                </div>
              </div>
            );
          })}
          <button
            className="pt-btn pt-lien"
            onClick={() => setFeuille({ quoi: "demarrer", bon, op })}
          >
            Quelqu'un d'autre commence aussi
          </button>
        </div>
      );
    }

    // ajouter une opération hors gamme
    const { bon } = feuille;
    const possibles = operationsAjoutables(bon, ref?.operations ?? [], pointages);
    return (
      <div className="pt-feuille" role="dialog" aria-label="Ajouter une opération">
        <div className="pt-feuille-tete">
          <div>
            <h2>Autre opération</h2>
            <p className="pt-sous">
              {bon.noBT} · {bon.client} — celles que la gamme n'a pas prévues
            </p>
          </div>
          <button className="pt-btn pt-fermer" onClick={fermer} aria-label="Fermer">
            ×
          </button>
        </div>
        <div className="pt-puces">
          {possibles.map((o) => (
            <button
              key={o.id}
              className="pt-puce"
              onClick={() => setFeuille({ quoi: "demarrer", bon, op: o })}
            >
              {o.nom}
            </button>
          ))}
          {!possibles.length && <p className="pt-note">Toutes les opérations sont déjà à l'écran.</p>}
        </div>
      </div>
    );
  }

  // ── la fiche d'une job ────────────────────────────────────────────────────
  // Ce que l'opérateur lisait sur la feuille imprimée, à l'écran, dans l'ordre où il en a
  // besoin : d'abord combien et pour quand, puis ce qu'il a à faire, puis les réglages, puis
  // les consignes. Il déclare depuis la même vue — il n'a jamais à revenir en arrière.
  function rendreFiche(bon: BonRef) {
    const f = bon.fiche;
    const quand = echeance(f.dateRequise);

    const blocs: { titre: string; lignes: LigneFiche[] }[] = [
      {
        titre: "La pièce",
        lignes: [
          ["N° de pièce", bon.noPiece],
          ["Format", paire(f.formatX, f.formatY)],
          ["Matrice", paire(f.mrxX, f.mrxY)],
          ["Poses (up)", f.nbUp > 0 ? nombre(f.nbUp) : ""],
        ],
      },
      {
        titre: "La feuille",
        lignes: [
          ["Morceaux par feuille", f.mrcxFeuille > 0 ? nombre(f.mrcxFeuille) : ""],
          ["Feuilles", f.nbreFeuilles > 0 ? nombre(f.nbreFeuilles, f.nbreFeuilles % 1 ? 1 : 0) : ""],
          ["Feuilles de correction", f.feuillesCorr > 0 ? nombre(f.feuillesCorr) : ""],
          ["Morceaux à imprimer", f.mxAImpr > 0 ? nombre(f.mxAImpr) : ""],
        ],
      },
      {
        titre: "Les réglages",
        lignes: [
          ["Presse", f.noPresse],
          ["Cadre", f.noCadre],
          ["Codes", [f.code, f.codeM, f.codeR, f.codeE].filter(Boolean).join(" · ")],
          ["Surplus", f.surplus],
          ["Protection", f.protectionPct > 0 ? mesure(f.protectionPct) + " %" : ""],
        ],
      },
      {
        titre: "Le dossier",
        lignes: [
          ["Soumission", f.noSoum],
          ["Bon de commande", f.po],
          ["N° de client", f.noClient],
          ["Commandé le", f.commandeLe ? jourLisible(f.commandeLe) : ""],
          ["Représentant", f.initiales],
          ["Autre", f.autre],
        ],
      },
    ]
      .map((b) => ({ ...b, lignes: b.lignes.filter(([, v]) => v !== "") }))
      .filter((b) => b.lignes.length > 0);

    const chiffres: LigneFiche[] = [
      ["commandées", f.qteCommandee > 0 ? nombre(f.qteCommandee) : ""],
      ["maximum", f.qteMaximum > 0 ? nombre(f.qteMaximum) : ""],
      ["produites", f.qteProduite > 0 ? nombre(f.qteProduite) : ""],
    ].filter(([, v]) => v !== "") as LigneFiche[];

    const consignes: LigneFiche[] = [
      ["Instructions", f.instructions],
      ["Procédure", f.procedure],
    ].filter(([, v]) => v.trim() !== "") as LigneFiche[];

    return (
      <div className={"pt-page" + (feuille ? " pt-page-figee" : "")}>
        <header className="pt-fiche-entete">
          <button className="pt-btn pt-retour" onClick={() => setJobOuverte(null)}>
            ← Toutes les jobs
          </button>
          <div className="pt-fiche-titre">
            <span className="pt-job-no">{bon.noBT}</span>
            {bon.statut && <span className="pt-etiquette">{bon.statut}</span>}
          </div>
          <span className="pt-horloge">{heureLisible(maintenant)}</span>
        </header>

        <p className="pt-fiche-sous">
          <strong>{bon.client || "client non renseigné"}</strong>
          {bon.modele && <> · {bon.modele}</>}
        </p>

        {avis && <p className={`pt-avis pt-avis-${avis.ton}`}>{avis.texte}</p>}

        {(chiffres.length > 0 || f.dateRequise) && (
          <div className="pt-bandeau">
            {chiffres.map(([libelle, valeur]) => (
              <div className="pt-chiffre" key={libelle}>
                <span className="pt-chiffre-val">{valeur}</span>
                <span className="pt-chiffre-lab">{libelle}</span>
              </div>
            ))}
            {f.dateRequise && (
              <div className={"pt-chiffre pt-chiffre-date" + (quand?.urgent ? " pt-urgent" : "")}>
                <span className="pt-chiffre-val">{jourLisible(f.dateRequise)}</span>
                <span className="pt-chiffre-lab">requis {quand ? "· " + quand.texte : ""}</span>
              </div>
            )}
          </div>
        )}

        <section className="pt-fiche-bloc pt-fiche-gamme">
          <h2>Ce qu'il y a à faire</h2>
          {rendreOps(bon, true)}
        </section>

        {blocs.length > 0 && (
          <div className="pt-fiche-grille">
            {blocs.map((b) => (
              <section className="pt-fiche-bloc" key={b.titre}>
                <h2>{b.titre}</h2>
                <dl className="pt-defs">
                  {b.lignes.map(([libelle, valeur]) => (
                    <div key={libelle}>
                      <dt>{libelle}</dt>
                      <dd>{valeur}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        )}

        {consignes.map(([titre, texte]) => (
          <section className="pt-fiche-bloc pt-consigne" key={titre}>
            <h2>{titre}</h2>
            <p>{texte}</p>
          </section>
        ))}

        {!blocs.length && !consignes.length && !chiffres.length && (
          <p className="pt-note">
            Ce bon n'a pas encore de fiche de production. Elle se remplit quand le bon est
            enregistré depuis l'écran de bon de travail — la gamme ci-dessus, elle, reste
            pointable.
          </p>
        )}

        {feuille && <div className="pt-voile" onClick={fermer} role="presentation" />}
        {rendreFeuille()}
      </div>
    );
  }

  const bonOuvert = jobOuverte ? (ref?.bons ?? []).find((b) => b.id === jobOuverte) : undefined;
  if (bonOuvert) return rendreFiche(bonOuvert);

  // ── écran ─────────────────────────────────────────────────────────────────
  return (
    <div className={"pt-page" + (feuille ? " pt-page-figee" : "")}>
      <header className="pt-entete">
        <div>
          <h1>Atelier</h1>
          <span className="pt-sous">
            {enCours.length
              ? enCours.length + (enCours.length > 1 ? " opérations en cours" : " opération en cours")
              : "rien en cours"}
          </span>
        </div>
        <div className="pt-entete-droite">
          <span className="pt-horloge">{heureLisible(maintenant)}</span>
          <span className="pt-build">build {__BUILD__}</span>
        </div>
      </header>

      {demo && (
        <p className="pt-avis pt-avis-demo">
          <strong>Jeu d'exemple.</strong> Hors Creator : ces jobs sont inventées et rien n'est
          enregistré. L'écran se manipule normalement — démarrez, mettez en pause, terminez.
        </p>
      )}
      {avis && <p className={`pt-avis pt-avis-${avis.ton}`}>{avis.texte}</p>}

      <div className="pt-filtres">
        <input
          className="pt-champ pt-recherche"
          placeholder="Chercher une job (n°, client, modèle, n° pièce)"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        {statuts.length > 1 && (
          <div className="pt-puces">
            <button
              className={"pt-puce" + (statutFiltre ? "" : " pt-puce-active")}
              onClick={() => {
                setStatutFiltre("");
                retenir(CLE_STATUT, "");
              }}
            >
              Toutes
            </button>
            {statuts.map((s) => (
              <button
                key={s}
                className={"pt-puce" + (statutFiltre === s ? " pt-puce-active" : "")}
                onClick={() => {
                  setStatutFiltre(s);
                  retenir(CLE_STATUT, s);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {!bons.length && (
        <p className="pt-note">
          Aucune job à afficher. {recherche ? "Essayez une autre recherche." : "Les bons de travail apparaîtront ici dès qu'ils existent."}
        </p>
      )}

      <div className="pt-jobs">
        {bons.map((bon) => {
          const gamme = gammeDuBon(bon, ref?.operations ?? [], pointages);
          const faites = gamme.filter((g) => {
            const ps = pointagesDe(bon.id, g.operation.id);
            return ps.length > 0 && ps.every((p) => p.statut === "Termine");
          }).length;
          const ecart = gamme.reduce((s, g) => {
            const r = reelDe(bon.id, g.operation.id);
            return s + (r > 0 && g.prevuMin > 0 ? r - g.prevuMin : 0);
          }, 0);

          return (
            <section className="pt-job" key={bon.id} aria-label={bon.noBT}>
              <button
                className="pt-job-tete"
                onClick={() => setJobOuverte(bon.id)}
                aria-label={"Fiche de " + bon.noBT}
              >
                <span className="pt-job-no">{bon.noBT}</span>
                <span className="pt-job-client">{bon.client}</span>
                <span className="pt-sous">
                  {[bon.modele, bon.noPiece && "n° " + bon.noPiece].filter(Boolean).join(" · ")}
                </span>
                <span className="pt-job-etat">
                  {faites} / {gamme.length}
                  {Math.abs(ecart) >= 1 && (
                    <em className={ecart > 0 ? "pt-retard" : "pt-avance"}>
                      {ecart > 0 ? "+" : "−"}
                      {dureeCourte(Math.abs(ecart))}
                    </em>
                  )}
                  <span className="pt-fleche" aria-hidden="true">›</span>
                </span>
              </button>

              <div className="pt-jauge" role="presentation">
                <i style={{ width: gamme.length ? (faites / gamme.length) * 100 + "%" : "0%" }} />
              </div>

              {rendreOps(bon)}
            </section>
          );
        })}
      </div>

      {feuille && <div className="pt-voile" onClick={fermer} role="presentation" />}
      {rendreFeuille()}
    </div>
  );
}
