// Sections ajoutées après la phase 0 : numérique, renseignements d'atelier, livraison,
// certifications, notes, disposition des poses.
//
// AUCUN de ces champs n'entre dans le prix. Ce sont des pseudo-cellules X! : elles voyagent avec
// la soumission et aucune formule du classeur ne les lit. L'écran le dit là où on pourrait
// croire le contraire.
import type { ReactNode } from "react";
import type { CellValue } from "@/lib/moteur";
import type { MontageCandidat } from "@/lib/montage";
import { IN, CELL_PROP } from "@/lib/modele";
import { nombre2, toNum } from "@/lib/format";
import { PRODUITS_NUMERIQUES, type ChampNumerique } from "@/data/produitsNumeriques";
import { blocsVisibles, champsAVider, constantesProduit, controlerNumerique, listeValeurs, type ValeursNum } from "@/lib/numerique";
import { Champ, Coche, Nombre, Texte } from "./champs";

export interface Acces {
  saisie: (cell: string) => CellValue;
  set: (cell: string, v: CellValue) => void;
  unset: (cell: string) => void;
}

export const CELL_METHODE = "X!METHODE";
export const PREFIXE_NUM = "X!N_";
export type Methode = "serigraphie" | "numerique" | "decoupe";

export function lireMethode(v: CellValue): Methode {
  return v === "numerique" || v === "decoupe" ? v : "serigraphie";
}

/** Valeurs du formulaire numérique. Dimensions et quantité viennent des sections 02 et 04 :
 *  une information se saisit une seule fois. */
export function valeursNumeriques(entrees: Record<string, CellValue>): ValeursNum {
  const v: ValeursNum = {
    Num_Unite: "Pouces",
    Num_Largeur: String(entrees[IN.dimPceX] ?? ""),
    Num_Hauteur: String(entrees[IN.dimPceY] ?? ""),
    Num_Quantite: String(entrees[IN.quantite] ?? ""),
  };
  for (const [c, x] of Object.entries(entrees)) if (c.startsWith(PREFIXE_NUM)) v[c.slice(PREFIXE_NUM.length)] = x as string | number | boolean;
  return v;
}

/** Contrôles du numérique, sans ceux que les sections 02 et 04 couvrent déjà sous d'autres mots. */
export function controlesNumeriques(entrees: Record<string, CellValue>, config?: ChampNumerique[]) {
  const v = valeursNumeriques(entrees);
  return controlerNumerique(String(v.Num_Type_produit ?? ""), v, config);
}

// ── petits champs ────────────────────────────────────────────────────────────
export function Liste({ label, cell, options, a, vide = "Choisir", onChange }: { label: string; cell: string; options: string[]; a: Acces; vide?: string; onChange?: (v: string) => void }) {
  const v = String(a.saisie(cell) ?? "");
  return (
    <Champ label={label}>
      <select className="in" aria-label={label} data-cell={cell} value={v} onChange={(e) => (onChange ?? ((x: string) => a.set(cell, x)))(e.target.value)}>
        <option value="">{vide}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
        {v && !options.includes(v) ? <option value={v}>{v} (hors liste)</option> : null}
      </select>
    </Champ>
  );
}

function Multi({ label, cell, options, a }: { label: string; cell: string; options: string[]; a: Acces }) {
  const choisis = listeValeurs(a.saisie(cell) as string);
  return (
    <fieldset className="s2-multi">
      <legend>{label}</legend>
      {options.map((o) => (
        <label key={o} className="s2-coche">
          <input
            type="checkbox"
            checked={choisis.includes(o)}
            onChange={(e) => a.set(cell, options.filter((x) => (x === o ? e.target.checked : choisis.includes(x))).join(";"))}
          />
          {o}
        </label>
      ))}
    </fieldset>
  );
}

const T = (a: Acces, label: string, cell: string, type: "text" | "date" = "text") => (
  <Texte key={cell} label={label} cell={cell} value={a.saisie(cell)} onChange={a.set} type={type} />
);
const N = (a: Acces, label: string, cell: string, unite?: string) => (
  <Nombre key={cell} label={label} cell={cell} value={a.saisie(cell)} onChange={a.set} unite={unite} />
);
const C = (a: Acces, label: string, cell: string) => <Coche key={cell} label={label} cell={cell} value={a.saisie(cell)} onChange={a.set} />;

const SansPrix = ({ children }: { children?: ReactNode }) => (
  <p className="s2-note">{children ?? "Renseignements pour l'atelier : sans effet sur le prix pour l'instant."}</p>
);

// ── 01 coordonnées d'un nouveau client ───────────────────────────────────────
export const CELL_TYPE_CLIENT = "X!CLI_TYPE";
const COORDONNEES: [string, string, boolean][] = [
  ["Adresse", CELL_PROP.adresseClient, true],
  ["Ville", "X!CLI_VILLE", true],
  ["Province", "X!CLI_PROVINCE", true],
  ["Code postal", "X!CLI_CP", true],
  ["Pays", "X!CLI_PAYS", true],
  ["Téléphone", CELL_PROP.telClient, true],
  ["Poste", "X!CLI_POSTE", false],
  ["Courriel", CELL_PROP.courrielClient, true],
];

/** Coordonnées obligatoires manquantes (spec §7.1). Vide pour un client existant. */
export function coordonneesManquantes(entrees: Record<string, CellValue>): string[] {
  if (entrees[CELL_TYPE_CLIENT] !== "Nouveau client") return [];
  const vide = (c: string) => String(entrees[c] ?? "").trim() === "";
  return [...(vide(IN.client) ? ["Client"] : []), ...COORDONNEES.filter(([, c, requis]) => requis && vide(c)).map(([l]) => l)];
}

export function Coordonnees({ a }: { a: Acces }) {
  if (a.saisie(CELL_TYPE_CLIENT) !== "Nouveau client") return null;
  return (
    <>
      <h3>Coordonnées du nouveau client</h3>
      <div className="s2-champs">
        {COORDONNEES.map(([l, c, requis]) => T(a, requis ? l + " *" : l, c))}
        {C(a, "Adresse de livraison différente", "X!CLI_LIVR_DIFF")}
      </div>
    </>
  );
}

// ── 02 fichier et infographie ────────────────────────────────────────────────
export function Fichier({ a, taux }: { a: Acces; taux: number }) {
  const heures = toNum(a.saisie("X!INFO_HEURES"));
  return (
    <>
      <h3>Fichier et infographie</h3>
      <div className="s2-champs">
        <Liste a={a} label="État du fichier" cell="X!FICHIER_ETAT" options={["Prêt à imprimer", "À modifier", "À redessiner"]} />
        <Liste a={a} label="Épreuve demandée" cell="X!FICHIER_EPREUVE" options={["Oui", "Non"]} />
        {N(a, "Nombre d'heures", "X!INFO_HEURES", "h")}
      </div>
      {heures > 0 ? (
        <SansPrix>
          Infographie : {nombre2(heures)} h × {nombre2(taux)} $ = <b>{nombre2(heures * taux)} $</b>. Ce montant n'est pas encore compris dans le prix.
        </SansPrix>
      ) : null}
    </>
  );
}

// ── 03 certifications ────────────────────────────────────────────────────────
export function Certifications({ a }: { a: Acces }) {
  return (
    <div className="s2-champs">
      {C(a, "UL", "X!CERT_UL")}
      {C(a, "CSA", "X!CERT_CSA")}
      {C(a, "FAIR (premier article)", "X!CERT_FAIR")}
      {T(a, "Exigence ou n° de dossier", "X!CERT_NO")}
    </div>
  );
}

// ── 05 numérique ─────────────────────────────────────────────────────────────
const BLOCS_AILLEURS = new Set(["Numérique", "Dimensions", "Notes / précisions"]);

function ChampNum({ c, a }: { c: ChampNumerique; a: Acces }) {
  const cell = PREFIXE_NUM + c.champ;
  const label = c.requis ? c.libelle + " *" : c.libelle;
  if (c.typeChamp === "choix") return <Liste a={a} label={label} cell={cell} options={c.options} />;
  if (c.typeChamp === "multi") return <Multi a={a} label={label} cell={cell} options={c.options} />;
  if (c.typeChamp === "case") return C(a, c.libelle, cell);
  return c.typeChamp === "decimal" ? N(a, label, cell) : T(a, label, cell);
}

export function Numerique({ a, entrees, config }: { a: Acces; entrees: Record<string, CellValue>; config: ChampNumerique[] }) {
  const valeurs = valeursNumeriques(entrees);
  const produit = String(valeurs.Num_Type_produit ?? "");
  // Changer de produit vide ce qui n'appartenait qu'à l'ancien : des œillets restés sur une face
  // graphique, invisibles à l'écran, partiraient quand même avec la soumission.
  const choisir = (nouveau: string) => {
    for (const c of champsAVider(produit, nouveau, config)) a.unset(PREFIXE_NUM + c);
    a.set(PREFIXE_NUM + "Num_Type_produit", nouveau);
  };
  const blocs = produit ? blocsVisibles(produit, valeurs, config) : [];
  const constantes = Object.values(constantesProduit(produit));
  const alertes = controlerNumerique(produit, valeurs, config).filter((x) => x.type !== "info");
  return (
    <>
      <div className="s2-champs">
        <Liste a={a} label="Usage" cell={PREFIXE_NUM + "Num_Usage"} options={["Intérieur", "Extérieur"]} />
        <Champ label="Type de produit *">
          <select className="in" aria-label="Type de produit" value={produit} onChange={(e) => choisir(e.target.value)}>
            <option value="">Choisir</option>
            {PRODUITS_NUMERIQUES.map((p) => (
              <option key={p.code} value={p.libelle} disabled={!p.actif}>
                {p.libelle}{p.actif ? "" : " (feuille produit attendue)"}
              </option>
            ))}
          </select>
        </Champ>
      </div>
      {blocs
        .map((b) => ({ ...b, champs: b.champs.filter((c) => c.champ !== "Num_Quantite") }))
        .filter((b) => !BLOCS_AILLEURS.has(b.bloc) && b.champs.length)
        .map((b) => (
          <div key={b.bloc}>
            <h3>{b.bloc}</h3>
            <div className="s2-champs">
              {b.champs.map((c) => (
                <ChampNum key={c.champ} c={c} a={a} />
              ))}
            </div>
          </div>
        ))}
      {constantes.length ? <p className="s2-note">Fixe pour ce produit : {constantes.join(", ")}.</p> : null}
      {produit && alertes.length ? (
        <ul className="s2-liste" aria-label="Points à compléter">
          {alertes.map((x) => (
            <li key={x.cle} className="s2-alerte">{x.message}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

// ── 06 / 07 renseignements d'atelier ─────────────────────────────────────────
export function Laminage({ a }: { a: Acces }) {
  const lam = String(a.saisie("X!LAM_FINI") ?? "");
  const rouleau = a.saisie("X!MAT_FORMAT") === "Rouleau";
  return (
    <>
      <h3>Matériau et laminage</h3>
      <div className="s2-champs">
        <Liste a={a} label="Fini d'origine" cell="X!MAT_FINI" options={["Lustré", "Mat", "Velvet"]} />
        {N(a, "Épaisseur", "X!MAT_EPAISSEUR", "mil")}
        <Liste a={a} label="Format" cell="X!MAT_FORMAT" options={["Feuille", "Rouleau"]} onChange={(v) => { a.set("X!MAT_FORMAT", v); if (v !== "Rouleau") a.unset("X!MAT_LARGEUR_ROULEAU"); }} />
        {rouleau ? N(a, "Largeur du rouleau", "X!MAT_LARGEUR_ROULEAU", "po") : null}
        <Liste a={a} label="Type d'adhésif" cell="X!ADH_TYPE" options={["Permanent", "Amovible", "Repositionnable", "Haute adhérence"]} />
        {N(a, "Épaisseur de l'adhésif", "X!ADH_EPAISSEUR", "mil")}
        <Liste
          a={a}
          label="Laminage"
          cell="X!LAM_FINI"
          vide="Aucun"
          options={["Glacé", "Lustré", "Mat", "Plancher (antidérapant)", "Texturé"]}
          onChange={(v) => {
            a.set("X!LAM_FINI", v);
            if (!v) for (const c of ["X!LAM_FILM", "X!LAM_COTE", "X!LAM_EPAISSEUR", "X!LAM_PRODUIT"]) a.unset(c);
          }}
        />
        {lam ? (
          <>
            <Liste a={a} label="Type de film" cell="X!LAM_FILM" options={["Calendré", "Cast (coulé)"]} />
            <Liste a={a} label="Côté" cell="X!LAM_COTE" options={["Recto", "Verso", "Recto-verso"]} />
            {T(a, "Épaisseur du laminé", "X!LAM_EPAISSEUR")}
            {T(a, "Produit / fournisseur", "X!LAM_PRODUIT")}
          </>
        ) : null}
      </div>
      <SansPrix />
    </>
  );
}

export function Outillage({ a }: { a: Acces }) {
  const outil = String(a.saisie("X!OUTIL") ?? "");
  const transfert = toNum(a.saisie("X!TRANSFERT")) >= 1;
  const eche = toNum(a.saisie("X!ECHENILLAGE")) >= 1;
  return (
    <>
      <h3>Outil et pose</h3>
      <div className="s2-champs">
        <Liste a={a} label="Outil" cell="X!OUTIL" options={["Aucun (coupe Zünd)", "Existant", "À fabriquer"]} onChange={(v) => { a.set("X!OUTIL", v); if (v !== "Existant" && v !== "À fabriquer") a.unset("X!OUTIL_NO"); if (v !== "À fabriquer") a.unset("X!OUTIL_COUT"); }} />
        {outil === "Existant" || outil === "À fabriquer" ? T(a, "N° d'outil", "X!OUTIL_NO") : null}
        {outil === "À fabriquer" ? N(a, "Coût de l'outil", "X!OUTIL_COUT", "$") : null}
        <Coche label="Échenillage" cell="X!ECHENILLAGE" value={a.saisie("X!ECHENILLAGE")} onChange={(c, v) => { a.set(c, v); if (!v) a.unset("X!ECHENILLAGE_H"); }} />
        {eche ? N(a, "Temps d'échenillage", "X!ECHENILLAGE_H", "h") : null}
        <Coche label="Papier de transfert" cell="X!TRANSFERT" value={a.saisie("X!TRANSFERT")} onChange={(c, v) => { a.set(c, v); if (!v) { a.unset("X!TRANSFERT_TYPE"); a.unset("X!TRANSFERT_H"); } }} />
        {transfert ? (
          <>
            <Liste a={a} label="Type de transfert" cell="X!TRANSFERT_TYPE" options={["Papier", "Plastique transparent"]} />
            {N(a, "Temps de pose", "X!TRANSFERT_H", "h")}
          </>
        ) : null}
      </div>
      <SansPrix />
    </>
  );
}

// ── 08 livraison ─────────────────────────────────────────────────────────────
export function Livraison({ a }: { a: Acces }) {
  return (
    <div className="s2-champs">
      <Liste a={a} label="Format de sortie" cell="X!LIV_FORMAT" options={["En feuilles", "En rouleau", "Individuel", "À plat (boîte)"]} />
      {T(a, "Délai de production (jours ouvrables)", CELL_PROP.delai)}
      {N(a, "Quantité par paquet", "X!LIV_PAQUET")}
      <Liste
        a={a}
        label="Mode d'expédition"
        cell="X!LIV_MODE"
        options={["Livraison par nos soins", "Cueillette", "Compte client", "FedEx", "Purolator", "UPS", "Autre"]}
        onChange={(v) => { a.set("X!LIV_MODE", v); if (v !== "Compte client") a.unset("X!LIV_COMPTE"); }}
      />
      {a.saisie("X!LIV_MODE") === "Compte client" ? T(a, "N° de compte transporteur", "X!LIV_COMPTE") : null}
      {T(a, "Livrer à", CELL_PROP.livraison)}
      {T(a, "Date d'expédition prévue", "X!DATE_EXP", "date")}
      {T(a, "Notes d'emballage", "X!LIV_NOTES")}
    </div>
  );
}

/** Note imprimée. `CELL_PROP.notes` est la note INTERNE de l'écran actuel : la reprendre ici
 *  aurait imprimé, sur le document du client, ce qui ne devait jamais sortir. */
export const CELL_NOTES_CLIENT = "X!NOTES_CLIENT";

// ── 10 notes ─────────────────────────────────────────────────────────────────
export function Notes({ a }: { a: Acces }) {
  const zone = (label: string, cell: string) => (
    <Champ label={label}>
      <textarea className="in s2-zone" aria-label={label} data-cell={cell} rows={3} value={String(a.saisie(cell) ?? "")} onChange={(e) => a.set(cell, e.target.value)} />
    </Champ>
  );
  return (
    <div className="s2-champs large">
      {zone("Notes internes (jamais imprimées)", CELL_PROP.notes)}
      {zone("Notes au client (imprimées sur la soumission)", CELL_NOTES_CLIENT)}
    </div>
  );
}

// ── disposition des poses sur la feuille ─────────────────────────────────────
export function Disposition({ c, pieceL, pieceH, espace, pourtour }: { c: MontageCandidat; pieceL: number; pieceH: number; espace: number; pourtour: number }) {
  const l = c.pieceTournee ? pieceH : pieceL;
  const h = c.pieceTournee ? pieceL : pieceH;
  const { largeurPo: L, hauteurPo: H } = c.format;
  const occupeL = c.upHorizontal * l + (c.upHorizontal - 1) * espace;
  const occupeH = c.upVertical * h + (c.upVertical - 1) * espace;
  // Feuille montrée à l'horizontale quand elle est plus haute que large : le panneau est étroit.
  const couchee = H > L;
  const pieces = [];
  if (c.upParFeuille <= 600)
    for (let i = 0; i < c.upHorizontal; i++)
      for (let j = 0; j < c.upVertical; j++) {
        const x = (L - occupeL) / 2 + i * (l + espace);
        const y = (H - occupeH) / 2 + j * (h + espace);
        pieces.push(couchee ? <rect key={i + "-" + j} x={y} y={x} width={h} height={l} /> : <rect key={i + "-" + j} x={x} y={y} width={l} height={h} />);
      }
  const W = couchee ? H : L;
  const V = couchee ? L : H;
  return (
    <figure className="s2-disposition">
      <svg viewBox={`-0.5 -0.5 ${W + 1} ${V + 1}`} role="img" aria-label={`${c.upParFeuille} poses sur une feuille de ${L} × ${H} po${c.pieceTournee ? ", pièce tournée de 90°" : ""}`}>
        <rect className="feuille" x={0} y={0} width={W} height={V} />
        <rect className="utile" x={pourtour} y={pourtour} width={Math.max(0, W - 2 * pourtour)} height={Math.max(0, V - 2 * pourtour)} />
        <g className="poses">{pieces}</g>
      </svg>
      <figcaption>
        Feuille {L} × {H} po{couchee ? ", montrée couchée" : ""}. Pointillé : zone utile, pourtour de {nombre2(pourtour)} po.
        {pieces.length ? "" : " Trop de poses pour les dessiner une à une."}
      </figcaption>
    </figure>
  );
}
