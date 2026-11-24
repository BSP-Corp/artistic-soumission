// Tableau des pièces (02 et 04), hypothèses du numérique (05), sous-traitance et installation
// (09), brouillons de bons de commande.
import { useEffect } from "react";
import type { CellValue } from "@/lib/moteur";
import { useEchap } from "@/hooks/useEchap";
import { IN } from "@/lib/modele";
import { argent, nombre2, toNum } from "@/lib/format";
import { Coche, Nombre, Texte } from "./champs";
import { Liste, type Acces } from "./sections";
import { MAX_PIECES, cellulesPiece, champPiece, infosPiece, paliersExclus, piecesPresentes, prochainePiece } from "./pieces";
import {
  INSTALL,
  TYPES_ACHAT,
  cellulesAchat,
  champAchat,
  installationRequise,
  montantInstallation,
  nouvelAchat,
  parFournisseur,
  prochainAchat,
  totauxAchats,
  type Achat,
} from "./soustraitance";
import { CELL_MACHINE_NUM, CELL_MATIERE_NUM, MACHINES_NUM, PREFIXE_TAUX_NUM, TAUX_NUM, lireTaux, type FicheMachineNum, type ResultatNum } from "./chiffrageNumerique";

type Entrees = Record<string, CellValue>;

// ── 02 tableau des pièces ────────────────────────────────────────────────────
export function TableauPieces({ a, entrees }: { a: Acces; entrees: Entrees }) {
  const pieces = piecesPresentes(entrees);
  const cell = (k: number, c: string) =>
    k > 1 || c === "DESC" ? champPiece(k, c) : { NO: IN.noPce, MOD: IN.modele, L: IN.dimPceX, H: IN.dimPceY }[c]!;
  const t = (k: number, c: string, label: string) => (
    <Texte nu label={`${label}, pièce ${k}`} cell={cell(k, c)} value={a.saisie(cell(k, c))} onChange={a.set} />
  );
  const n = (k: number, c: string, label: string, placeholder?: string) => (
    <Nombre nu label={`${label}, pièce ${k}`} cell={cell(k, c)} value={a.saisie(cell(k, c))} onChange={a.set} placeholder={placeholder} />
  );
  return (
    <>
      <div className="s2-defile">
        <table className="s2-table s2-pieces">
          <thead>
            <tr><th>#</th><th>N° de pièce</th><th>Modèle</th><th>Description</th><th>Largeur (po)</th><th>Hauteur (po)</th><th>Qté / ens.</th><th /></tr>
          </thead>
          <tbody>
            {pieces.map((k) => (
              <tr key={k}>
                <td className="num">{k}</td>
                <td>{t(k, "NO", "N° de pièce")}</td>
                <td>{t(k, "MOD", "Modèle")}</td>
                <td>{t(k, "DESC", "Description")}</td>
                <td>{n(k, "L", "Largeur")}</td>
                <td>{n(k, "H", "Hauteur")}</td>
                <td>{k === 1 ? <span className="s2-aide">1</span> : n(k, "ENS", "Quantité par ensemble", "1")}</td>
                <td>
                  {k > 1 ? (
                    <button type="button" className="s2-retirer" aria-label={"Retirer la pièce " + k} onClick={() => cellulesPiece(entrees, k).forEach(a.unset)}>×</button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="s2-champs">
        <button
          type="button"
          className="btn"
          disabled={pieces.length >= MAX_PIECES}
          onClick={() => {
            const k = prochainePiece(entrees);
            if (k) a.set(`X!P${k}`, 1);
          }}
        >
          + Ajouter une pièce
        </button>
      </div>
      {pieces.length > 1 ? (
        <p className="s2-note">
          Hypothèse : chaque pièce s'imprime séparément, avec les mêmes réglages et matériaux, sur la feuille suggérée pour ses dimensions. Le palier est la quantité de la pièce 1.
        </p>
      ) : null}
    </>
  );
}

// ── 04 grille pièce × palier ─────────────────────────────────────────────────
export function GrillePieces({ a, entrees, paliers }: { a: Acces; entrees: Entrees; paliers: string[] }) {
  const pieces = piecesPresentes(entrees).filter((k) => k > 1);
  const cols = paliers.filter((c) => toNum(entrees[c] ?? "") > 0);
  if (!pieces.length) return null;
  return (
    <>
      <h3>Paliers par pièce</h3>
      <div className="s2-defile">
        <table className="s2-table">
          <thead>
            <tr><th>Pièce</th>{cols.map((c) => <th key={c}>{toNum(entrees[c] ?? "").toLocaleString("fr-CA")}</th>)}<th>Qté unique</th></tr>
          </thead>
          <tbody>
            {pieces.map((k) => {
              const exclus = paliersExclus(entrees, k);
              const unique = toNum(entrees[champPiece(k, "QU")] ?? "") > 0;
              return (
                <tr key={k}>
                  <td>{k}. {infosPiece(entrees, k).desc || infosPiece(entrees, k).modele || "sans nom"}</td>
                  {cols.map((c) => (
                    <td key={c}>
                      <input
                        type="checkbox"
                        aria-label={`Pièce ${k}, palier ${toNum(entrees[c] ?? "")}`}
                        checked={!unique && !exclus.includes(c)}
                        disabled={unique}
                        onChange={(e) => a.set(champPiece(k, "OFF"), (e.target.checked ? exclus.filter((x) => x !== c) : [...exclus, c]).join(";"))}
                      />
                    </td>
                  ))}
                  <td><Nombre nu label={"Quantité unique, pièce " + k} cell={champPiece(k, "QU")} value={a.saisie(champPiece(k, "QU"))} onChange={a.set} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── 05 hypothèses du chiffrage numérique ─────────────────────────────────────
export function HypothesesNum({ a, entrees, r, app, fiches, matieres, imprime }: {
  a: Acces;
  entrees: Entrees;
  r: ResultatNum;
  app?: Record<string, number>;
  fiches: FicheMachineNum[];
  matieres: string[];
  imprime: boolean;
}) {
  return (
    <>
      <h3>Chiffrage provisoire</h3>
      <div className="s2-champs">
        {imprime ? (
          <label className="s2-champ">
            <span className="s2-lb">Presse numérique</span>
            <select className="in" aria-label="Presse numérique" data-cell={CELL_MACHINE_NUM} value={String(a.saisie(CELL_MACHINE_NUM) ?? "")} onChange={(e) => a.set(CELL_MACHINE_NUM, e.target.value)}>
              <option value="">Automatique{r.machine ? ` (${r.machine})` : ""}</option>
              {MACHINES_NUM.map((m) => <option key={m.cle} value={m.cle}>{m.nom}</option>)}
            </select>
          </label>
        ) : null}
        <Liste a={a} label="Matière d'inventaire" cell={CELL_MATIERE_NUM} options={matieres} vide="Coût par défaut" />
      </div>
      {r.manque ? <p className="s2-note">{r.manque}</p> : (
        <>
          <p className="s2-alerte">
            {r.hypotheses.length
              ? `Prix provisoire : ${r.hypotheses.length} donnée(s) sur ${r.taux.length} sont des hypothèses de BSP, à confirmer par Artistic. Il ne s'imprime pas.`
              : "Prix provisoire : toutes les données sont saisies ou viennent de Creator. La méthode de calcul reste à valider par Artistic. Il ne s'imprime pas."}
          </p>
          <details className="s2-hypo">
            <summary>Données du calcul ({r.taux.length})</summary>
            <table className="s2-table">
              <thead><tr><th>Donnée</th><th>Valeur</th><th>Unité</th><th>Source</th></tr></thead>
              <tbody>
                {r.taux.map((code) => {
                  const def = TAUX_NUM.find((x) => x.code === code)!;
                  const lu = lireTaux(code, entrees, app, fiches);
                  const cell = PREFIXE_TAUX_NUM + code;
                  return (
                    <tr key={code}>
                      <td>{def.libelle}</td>
                      <td><Nombre nu label={def.libelle} cell={cell} value={a.saisie(cell)} onChange={(c, v) => (v === "" ? a.unset(c) : a.set(c, v))} placeholder={String(lu.valeur).replace(".", ",")} /></td>
                      <td>{def.unite}</td>
                      <td className={lu.source === "hypothèse" ? "s2-hyp" : ""}>{lu.source === "hypothèse" ? "hypothèse BSP" : lu.source}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </details>
          <details className="s2-hypo">
            <summary>Détail du coût ({argent(r.cout)})</summary>
            <dl className="s2-resume">{r.postes.map((p) => [<dt key={p.libelle}>{p.libelle}</dt>, <dd key={p.libelle + "m"}>{argent(p.cout)}</dd>])}</dl>
          </details>
        </>
      )}
    </>
  );
}

// ── 09 sous-traitance ────────────────────────────────────────────────────────
export function SousTraitance({ a, entrees, liste, majoration, onPO }: { a: Acces; entrees: Entrees; liste: Achat[]; majoration: number; onPO: (fournisseur: string) => void }) {
  const tot = totauxAchats(liste);
  const t = (n: number, c: string, l: string) => <Texte nu label={`${l}, achat ${n}`} cell={champAchat(n, c)} value={a.saisie(champAchat(n, c))} onChange={a.set} />;
  const num = (n: number, c: string, l: string, pct?: boolean) => <Nombre nu label={`${l}, achat ${n}`} cell={champAchat(n, c)} value={a.saisie(champAchat(n, c))} onChange={a.set} pct={pct} />;
  return (
    <>
      <h3>Achats et sous-contrats</h3>
      {liste.length ? (
        <div className="s2-defile">
          <table className="s2-table s2-achats">
            <thead>
              <tr><th>Type</th><th>Fournisseur</th><th>Description</th><th>N° soum. fourn.</th><th>Coût ($)</th><th>Majoration</th><th>Délai (j)</th><th>Inclus</th><th>PO</th><th /></tr>
            </thead>
            <tbody>
              {liste.map(({ n, fournisseur }) => (
                <tr key={n}>
                  <td>
                    <select className="in" aria-label={"Type, achat " + n} value={String(a.saisie(champAchat(n, "TYPE")) ?? "")} onChange={(e) => a.set(champAchat(n, "TYPE"), e.target.value)}>
                      <option value="">Choisir</option>
                      {TYPES_ACHAT.map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </td>
                  <td>{t(n, "FOUR", "Fournisseur")}</td>
                  <td>{t(n, "DESC", "Description")}</td>
                  <td>{t(n, "NOSOUM", "N° de soumission fournisseur")}</td>
                  <td>{num(n, "COUT", "Coût")}</td>
                  <td>{num(n, "MAJ", "Majoration", true)}</td>
                  <td>{num(n, "DELAI", "Délai")}</td>
                  <td><Coche label="" cell={champAchat(n, "INC")} value={a.saisie(champAchat(n, "INC"))} onChange={a.set} /></td>
                  <td><button type="button" className="btn" aria-label={"Brouillon de PO, achat " + n} disabled={!fournisseur} onClick={() => onPO(fournisseur)}>PO</button></td>
                  <td><button type="button" className="s2-retirer" aria-label={"Retirer l'achat " + n} onClick={() => cellulesAchat(n).forEach(a.unset)}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="s2-champs">
        <button
          type="button"
          className="btn"
          disabled={prochainAchat(entrees) === null}
          onClick={() => {
            const n = prochainAchat(entrees);
            if (n) for (const [c, v] of nouvelAchat(n, majoration)) a.set(c, v);
          }}
        >
          + Ajouter une ligne
        </button>
        <button type="button" className="btn" disabled={!liste.some((x) => x.fournisseur)} onClick={() => onPO("")}>Voir les brouillons de PO</button>
      </div>
      {liste.length ? (
        <dl className="s2-resume">
          <dt>Coût fournisseurs</dt><dd>{argent(tot.cout)}</dd>
          <dt>Avec majoration, ajouté au total</dt><dd>{argent(tot.prix)}</dd>
          <dt>Délai le plus long</dt><dd>{tot.delai ? tot.delai + " jours" : "non précisé"}</dd>
        </dl>
      ) : null}
      <p className="s2-note">La majoration remplace le facteur, comme dans le classeur. Les montants sont forfaitaires, peu importe le palier.</p>
    </>
  );
}

// ── 09 installation ──────────────────────────────────────────────────────────
export function Installation({ a, entrees }: { a: Acces; entrees: Entrees }) {
  const t = (l: string, c: string, type: "text" | "date" = "text") => <Texte key={c} label={l} cell={c} value={a.saisie(c)} onChange={a.set} type={type} />;
  const n = (l: string, c: string, unite?: string) => <Nombre key={c} label={l} cell={c} value={a.saisie(c)} onChange={a.set} unite={unite} />;
  const requise = installationRequise(entrees);
  return (
    <>
      <h3>Installation</h3>
      <div className="s2-champs">
        <Liste
          a={a}
          label="Installation"
          cell={INSTALL.requise}
          vide="Aucune installation"
          options={["Requise"]}
          onChange={(v) => {
            a.set(INSTALL.requise, v);
            if (!v) for (const c of Object.values(INSTALL)) if (c !== INSTALL.requise) a.unset(c);
          }}
        />
        {requise ? (
          <>
            <Liste a={a} label="Réalisée par" cell={INSTALL.par} options={["Notre équipe", "Sous-traitant"]} />
            <Liste a={a} label="Lieu" cell={INSTALL.lieu} options={["Intérieur", "Extérieur"]} />
            {t("Adresse *", INSTALL.adresse)}
            {t("Date souhaitée *", INSTALL.date, "date")}
            {t("Personne-ressource", INSTALL.ressource)}
            {t("Surface *", INSTALL.surface)}
            {t("Préparation de surface", INSTALL.preparation)}
            {n("Nombre d'installateurs *", INSTALL.nb)}
            {n("Heures *", INSTALL.heures, "h")}
            {n("Taux horaire *", INSTALL.taux, "$/h")}
            {n("Distance", INSTALL.distance, "km")}
            {n("Frais de déplacement", INSTALL.deplacement, "$")}
            {t("Équipement d'accès", INSTALL.acces)}
            {n("Coût de l'équipement", INSTALL.accesCout, "$")}
            {t("Formation sécurité", INSTALL.securite)}
            {t("Contraintes", INSTALL.contraintes)}
          </>
        ) : null}
      </div>
      {requise ? <p className="s2-note">Installation : <b>{argent(montantInstallation(entrees))}</b>, ajoutée au total sans facteur.</p> : null}
    </>
  );
}

// ── brouillons de bons de commande ───────────────────────────────────────────
export function PopupPO({ liste, seul, reference, onClose }: { liste: Achat[]; seul: string; reference: string; onClose: () => void }) {
  useEchap(onClose);
  useEffect(() => {
    document.body.classList.add("mode-proposition");
    return () => document.body.classList.remove("mode-proposition");
  }, []);
  const groupes = parFournisseur(liste).filter((g) => !seul || g.fournisseur.toLowerCase() === seul.toLowerCase());
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-proposition" role="dialog" aria-modal="true" aria-label="Brouillons de bons de commande">
        <div className="modal-head">
          <h2>Brouillons de bons de commande</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="modal-body">
          {groupes.map((g) => (
            <div className="prop-doc prop-page s2-po" key={g.fournisseur}>
              <p className="s2-po-tampon">BROUILLON · non émis, rien n'est envoyé ni créé dans Books</p>
              <h3>{g.fournisseur}</h3>
              <p>Soumission {reference || "non enregistrée"}</p>
              <table className="s2-table">
                <thead><tr><th>Type</th><th>Description</th><th>N° soum. fournisseur</th><th>Délai</th><th>Coût</th></tr></thead>
                <tbody>
                  {g.lignes.map((l) => (
                    <tr key={l.n}>
                      <td>{l.type}</td><td>{l.description}</td><td>{l.noSoumission}</td><td>{l.delai ? l.delai + " j" : ""}</td><td className="num">{nombre2(l.cout)} $</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p><b>Total {nombre2(g.total)} $</b></p>
            </div>
          ))}
          <div className="prop-actions">
            <button type="button" className="btn" onClick={() => window.print()}>Imprimer les brouillons</button>
          </div>
        </div>
      </div>
    </div>
  );
}
