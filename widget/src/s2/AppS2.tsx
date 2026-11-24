// 2e widget de soumission (docs/refonte-soumission.md).
//
// Même moteur, mêmes cellules, mêmes services que l'écran actuel : seule la présentation
// change. Seule la sérigraphie se chiffre. Le numérique se saisit et se vérifie, mais il n'a
// aucun calcul de coût (docs/production-numerique.md) : pas de prix, pas d'enregistrement.
//
// Pas encore là : pièces multiples (décision du client), sous-traitance et PO, bon de travail.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSoumission, simulerQuantite, CLASSEUR } from "@/hooks/useSoumission";
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
  listeCatalogue,
} from "@/lib/modele";
import { CATEGORIE_VERS_CHAMP } from "@/lib/parametres";
import { controlesSoumission, SEUIL_DOUBLE_CHECK_DEFAUT } from "@/lib/controles";
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
  type ResultatSoumissions,
} from "@/services/zohoService";
import { construireSoumissionJSON } from "@/api/contratSoumission";
import { PopupSoumissions } from "@/components/PopupSoumissions";
import { PopupVerification } from "@/components/PopupVerification";
import { PopupProposition, type LigneProposition } from "@/components/PopupProposition";
import { Champ, Coche, Materiau, Nombre, Texte } from "./champs";
import {
  CELL_METHODE,
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
  type Methode,
} from "./sections";
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

/** Sections 01 à 08 toujours ouvertes, sans flèche : le client l'a tranché le 9 novembre. */
function Section({ no, titre, phase, children }: { no: string; titre: string; phase?: string; children?: ReactNode }) {
  return (
    <section className="s2-section" aria-label={no + " " + titre}>
      <h2>
        <span>{no}</span>
        {titre}
        {phase ? <em>{phase}</em> : null}
      </h2>
      {children ? <div className="s2-corps">{children}</div> : null}
    </section>
  );
}

/** Seules 09 et 10 se replient : elles sont optionnelles. */
function SectionOptionnelle({ no, titre, phase, children }: { no: string; titre: string; phase?: string; children?: ReactNode }) {
  return (
    <details className="s2-section">
      <summary>
        <span>{no}</span>
        {titre}
        {phase ? <em>{phase}</em> : null}
      </summary>
      {children ? <div className="s2-corps">{children}</div> : null}
    </details>
  );
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
  const [popup, setPopup] = useState<null | "ouvrir" | "verifier" | "client">(null);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      await initZohoEnv();
      const [p, a, r] = await Promise.all([chargerParametres(), chargerAdmin(), chargerReglesMateriaux()]);
      if (!vivant) return;
      const prixCreator = !!p && (p.materiaux.length > 0 || p.taux.length > 0);
      if (p && prixCreator) setParametres(p);
      if (a) setMachinesCreator(a.machines);
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
  function nouvelle() {
    s.reset("vierge");
    for (const c of Object.keys(s.entrees)) if (c.startsWith("X!")) unset(c);
    for (const [c, v] of ecrituresPaliers(paliersDefaut(s.params?.app))) set(c, v);
    set(CELL_ORIGINE_S2, 1);
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
  const autoAdhesif = useRef<string | null>(null);
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

  const simulations = useMemo(() => {
    const surch = { ...s.overridesTaux, ...s.surchargesMach };
    return paliers.map((c) => {
      const q = toNum(s.saisie(c));
      return q > 0 ? { qte: q, ...simulerQuantite(s.entrees, q, s.params, surch) } : { qte: 0, cout: 0, prix: 0, vendu: 0, us: 0 };
    });
  }, [paliers, s.entrees, s.params, s.overridesTaux, s.surchargesMach]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── méthode ───────────────────────────────────────────────────────────────
  const methode = lireMethode(s.saisie(CELL_METHODE));
  const seri = methode === "serigraphie";
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
  const bloquants = controles.filter((c) => c.type !== "info");
  const prixVisible = demarre && seri && bloquants.length === 0;
  const aCompleter = methode === "numerique" ? controlesNumeriques(s.entrees).filter((c) => c.type !== "info").length : 0;
  const masque = (v: ReactNode) =>
    !pret ? "…" : !seri ? (
      <span className="s2-nonchiffre" title="Aucun taux ni vitesse n'est encore disponible pour cette méthode">non chiffré</span>
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

  // ── enregistrement : toujours « Brouillon », jamais d'envoi ───────────────
  async function enregistrer() {
    const manque = coordonneesManquantes(s.entrees);
    if (manque.length) {
      setMessage("Nouveau client, à compléter avant d'enregistrer : " + manque.join(", ") + ".");
      return;
    }
    setOccupe(true);
    setMessage("Enregistrement…");
    try {
      const entrees = { ...s.entrees, [CELL_ORIGINE_S2]: 1 };
      const json = construireSoumissionJSON({
        m: s.moteur,
        e: entrees,
        meta: {
          id: idSoumission || ID_SUBSTITUTION,
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
      const dossier = {
        soumission_json: JSON.stringify(json),
        statut: "Brouillon" as const,
        webhook_statut: "",
        client: String(s.saisie(IN.client) ?? ""),
        no_client: String(s.saisie(IN.noClient) ?? ""),
        modele: String(s.saisie(IN.modele) ?? ""),
        no_pce: String(s.saisie(IN.noPce) ?? ""),
        quantite: qte,
        facteur: toNum(s.saisie(IN.facteur)),
        montant: s.num(OUT.montant),
        total: s.num(OUT.total),
        prix_unitaire: s.num(OUT.prixUnitaire),
        donnees_json: JSON.stringify(entrees),
      };
      const res = idSoumission ? await majSoumission(idSoumission, dossier) : await sauvegarderSoumission(dossier);
      if (res.ok && res.id) {
        setIdSoumission(res.id);
        set(CELL_ORIGINE_S2, 1);
        const d = await majDatesCreator(res.id, { requise: s.saisie(IN.date), commande: "", expedition: s.saisie("X!DATE_EXP") });
        if (!d.ok) console.warn("majDatesCreator:", d.message);
      }
      setMessage(res.message);
    } finally {
      setOccupe(false);
    }
  }

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

  const cout = s.num(OUT.montant);
  const total = s.num(OUT.total);
  const unitaire = s.num(OUT.prixUnitaire);
  const marge = margeReelle(total, cout);
  const temps = !seri ? "non chiffré" : dureeTexte(Math.trunc(s.num(OUT.tempsTotalHrs)), s.num(OUT.tempsTotalMin));
  const unitaireUs = s.num(OUT.prixUnitaireUs);
  const presses = machinesFamille(s.machinesCalc, "presse");
  const valeurPresse = String(s.saisie(CELL_PRESSE) ?? "");

  return (
    <div className="s2">
      <header className="s2-tete">
        <div className="s2-marque" aria-hidden="true" />
        <div>
          <h1>
            Soumission <small>{idSoumission ? "enregistrée, ID " + idSoumission : "non enregistrée"}</small>
          </h1>
          <p>
            Valide 30 jours · paiement selon le dossier client · prix : {sources.prix || "chargement…"} · machines :{" "}
            {sources.machines || "chargement…"} · build {__BUILD__}
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
            setMessage("Copie prête : l'originale reste intacte, « Enregistrer » crée une nouvelle soumission.");
          }}
        >
          Dupliquer
        </button>
        <button type="button" className="btn" disabled={!pret} onClick={ouvrir}>Ouvrir</button>
        <button type="button" className="btn" disabled={!prixVisible} title={prixVisible ? "Soumission client, deux pages" : "Le prix n'est pas encore validé"} onClick={() => setPopup("client")}>Imprimer</button>
        <button type="button" className="btn" disabled={!prixVisible} title={prixVisible ? "Ouvre le document, d'où part le courriel" : "Le prix n'est pas encore validé"} onClick={() => setPopup("client")}>Envoyer</button>
        <span className="s2-message" role="status">{message}</span>
        <button type="button" className="btn" disabled={!pret || occupe || !seri} title={seri ? "" : "Une soumission non chiffrée ne s'enregistre pas encore : elle porterait un prix de sérigraphie"} onClick={() => void enregistrer()}>Enregistrer</button>
        <button type="button" className="btn solid" disabled title="Pas encore branché. En attendant, le bon de travail se crée depuis l'écran actuel.">
          Envoyer vers le bon de travail
        </button>
      </nav>

      {repli && (
        <p className="s2-repli" role="alert">
          Creator n'a pas tout fourni : {sources.prix === "copie embarquée" ? "les prix " : ""}
          {sources.machines === "copie embarquée" ? "les machines " : ""}viennent de la copie embarquée, qui peut être périmée. Rechargez la page avant de chiffrer.
        </p>
      )}

      <main className="s2-grille">
        <div className="s2-gauche">
          <Section no="01" titre="Client">
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

          <Section no="02" titre="Pièces et fichier">
            <div className="s2-champs">
              {T("N° de pièce", IN.noPce)}
              {T("Modèle", IN.modele)}
              {N("Largeur", IN.dimPceX, { unite: "po" })}
              {N("Hauteur", IN.dimPceY, { unite: "po" })}
            </div>
            <p className="s2-note">Une seule pièce pour l'instant. Le tableau de 1 à 5 pièces attend la réponse du client : impression séparée ou montage mixte.</p>
            <Fichier a={acces} taux={s.params?.app?.TAUX_INFOGRAPHIE ?? 85} />
          </Section>

          <Section no="03" titre="Certifications"><Certifications a={acces} /></Section>

          <Section no="04" titre="Quantités">
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
          </Section>

          <Section no="05" titre="Production">
            <div className="s2-methodes" role="radiogroup" aria-label="Méthode">
              {([["serigraphie", "Sérigraphie"], ["numerique", "Numérique"], ["decoupe", "Découpe numérique seulement"]] as [Methode, string][]).map(([m, l]) => (
                <label key={m}><input type="radio" name="methode" checked={methode === m} onChange={() => changerMethode(m)} /> {l}</label>
              ))}
            </div>
            {!seri ? (
              <p className="s2-alerte">Cette méthode ne se chiffre pas encore : les vitesses et les taux ne sont pas fournis. La saisie n'est pas enregistrable.</p>
            ) : null}
            {methode === "numerique" ? <Numerique a={acces} entrees={s.entrees} /> : null}
            {methode === "decoupe" ? <p className="s2-note">Aucune impression : la découpe se décrit à la section 07.</p> : null}
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

          <Section no="06" titre="Matériel et laminage">
            <div className="s2-champs large">
              {MATERIAUX.map(([label, champ, cell]) => (
                <Materiau key={cell} label={label} cell={cell} value={s.saisie(cell)} onChange={set} options={catalogues[champ]} />
              ))}
            </div>
            <Laminage a={acces} />
          </Section>

          <Section no="07" titre="Finition et découpe">
            <div className="s2-champs">
              {C("Zünd, coupe", IN.zundCoupeC)}
              {C("Zünd, mi-chair", IN.zundKisscutC)}
              {N("Platine, matrices", IN.platCoupeDie)}
              {N("Platine, poses", IN.platCoupeUp)}
              {N("Guillotine", IN.guillotineQte)}
            </div>
            <Outillage a={acces} />
          </Section>

          <Section no="08" titre="Livraison"><Livraison a={acces} /></Section>
          <SectionOptionnelle no="09" titre="Sous-traitance et installation" phase="à venir" />
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
                <dt>Prix unitaire</dt><dd>{masque(nombre3(unitaire) + " $")}</dd>
                <dt>Prix unitaire US</dt><dd>{unitaireUs > 0 ? masque(nombre3(unitaireUs) + " $") : "aucun taux saisi"}</dd>
              </dl>
              <div className="s2-champs">{N("Facteur", IN.facteur, { pct: true })}{N("Transport", IN.transport, { unite: "$" })}</div>
            </div>
          </details>
        </aside>
      </main>

      <footer className="s2-barre" aria-label="Sommaire">
        <span>Quantité <b>{qte > 0 ? qte.toLocaleString("fr-CA") : "aucune"}</b></span>
        <span>Coût <b>{masque(argent(cout))}</b></span>
        <span>Unitaire <b>{masque(nombre2(unitaire) + " $")}</b></span>
        <span>Temps <b>{pret ? temps : "…"}</b></span>
        {aCompleter > 0 ? <span>À compléter <b>{aCompleter}</b></span> : null}
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
              dIci = Number((JSON.parse(sr.donnees) as Record<string, CellValue>)[CELL_ORIGINE_S2]) === 1;
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
          controles={controles}
          onAccepter={(drapeau) => set(drapeau, 1)}
          onRefuser={(c) => {
            setPopup(null);
            setMessage(c.type === "confirmation" ? c.conseil : c.message);
          }}
          onClose={() => setPopup(null)}
        />
      )}
      {popup === "client" && (
        <PopupProposition
          infos={{
            noSoumission: String(s.saisie(IN.codeS) ?? "").trim(),
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
          libre={s.saisie}
          setLibre={set}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}
