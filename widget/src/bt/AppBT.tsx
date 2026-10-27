// Bon de travail — widget d'atelier. Reproduit la feuille FT du classeur.
//
// Il ne recalcule rien de son côté : il recharge les entrées de la soumission dans le moteur
// partagé (useSoumission), y superpose les saisies atelier (cellules FT jaunes) et lit les
// cellules FT bleues. Toute formule reste celle du classeur.

import { useCallback, useEffect, useMemo, useState } from "react";
import { controlesBonTravail, estEnvoiProduction } from "./controlesBT";
import { chargerCouleurs, couleursSelectionnables, indexParCode, trouverCouleur, type Couleur } from "@/services/couleursService";
import { useSoumission } from "@/hooks/useSoumission";
import type { CellValue } from "@/lib/moteur";
import { toNum, minutes, dateOuTexte } from "@/lib/format";
import {
  initZohoEnv,
  isZohoEnv,
  chargerParametres,
  chargerAdmin,
  chargerSoumissions,
  type SoumissionResume,
} from "@/services/zohoService";
import {
  chargerBonsTravail,
  emballerDonnees,
  creerBonTravail,
  sauvegarderBonTravail,
  type BonTravail,
  type StatutBT,
} from "@/services/bonTravailService";
import {
  FT_IN,
  FT_OUT,
  FT_QTE,
  FT_COULEURS,
  ligneCouleurSupp,
  MAX_COULEURS,
  FT_PLATINE,
  FT_MATERIAUX,
  FT_TEMPS,
  FT_DECOUPE_GAUCHE,
  FT_DECOUPE_DROITE,
  CELLULES_SAISIE,
  lireSaisiesBT,
  champsPlatsBT,
  presseFT,
} from "./modeleFT";
import "./bt.css";

const SAISIE_SET = new Set(CELLULES_SAISIE);

/** Étiquette d'un bon dans la liste. Le client et le n° de pièce se répètent souvent d'un
 *  bon à l'autre (sept bons « BSP · 4152464 » distincts) : sans le statut, des bons bien
 *  différents paraissent identiques. `No_Soum` et `Qte_Commandee` ne servent à rien ici,
 *  ils sont vides sur tous les enregistrements existants. */
function etiquetteBon(b: BonTravail, jumeaux: number): string {
  const statut = String(b.Statut ?? "").replace(/_/g, " ");
  // Dernier recours contre les sosies : sept bons portent « BSP · 4152464 · Valide » et ne
  // diffèrent que par leur soumission. On en montre les 6 derniers chiffres — court, et
  // suffisant pour que deux lignes ne soient jamais identiques à l'œil.
  const sid = String(b.Soumission_ID ?? "").trim();
  const ref = sid && sid !== "0" ? "soum " + sid.slice(-6) : "";
  return [b.no_bt || b.id, b.Client || "sans client", b.No_Piece || "sans pièce", statut, ref]
    .filter(Boolean)
    .join(" · ") + (jumeaux > 1 ? ` (${jumeaux} bons)` : "");
}


/** Libellé de repli des cases de découpe, quand la condition est fausse (cellule vide). */
const LIB_DECOUPE: Record<string, string> = {
  "FT!S22": "Lazer",
  "FT!S23": "Adh. Laminé",
  "FT!S24": "Position Adh. & Lam.",
  "FT!S25": "Over Lam.",
  "FT!S26": "Brillant",
  "FT!V26": "Mat",
  "FT!S27": "Prémask",
  "FT!S28": "Protecteur",
  "FT!S29": "Protec. Fenêtre",
  "FT!V29": "(fenêtres)",
  "FT!S30": "Platine",
  "FT!U30": "Chauf",
  "FT!S35": "Finition 1",
  "FT!S36": "Coins Ronds",
  "FT!V36": "Qté",
  "FT!W36": "(qté coins)",
  "FT!X36": "Ray.",
  "FT!W23": "Assemblage",
  "FT!Z23": "Slit",
  "FT!AA23": "(nb slit)",
  "FT!W24": "Guillotine",
  "FT!W25": "Finition matière",
  "FT!W26": "Zund",
  "FT!W27": "Adhésif",
  "FT!W28": "Coupe",
  "FT!W29": "Kiss-Cut",
  "FT!Y29": "Décortiquer",
  "FT!W35": "Finition 2",
};

function texte(v: CellValue): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Math.round(v * 10000) / 10000);
  return String(v);
}

// ── champ de saisie (commit au blur / Entrée) ───────────────────────────────
function ChampSaisie({
  cell,
  valeur,
  onChange,
  num,
  aide,
  liste,
  invalide,
}: {
  cell: string;
  valeur: CellValue;
  onChange: (cell: string, v: CellValue) => void;
  num?: boolean;
  aide?: string;
  /** id d'une <datalist> : le champ propose alors les valeurs du catalogue (§11b couleurs) */
  liste?: string;
  /** signale une valeur hors catalogue sans l'empêcher (le bon reste saisissable) */
  invalide?: boolean;
}) {
  const [brut, setBrut] = useState<string | null>(null);
  const affiche = brut ?? texte(valeur);
  const commit = () => {
    if (brut === null) return;
    const t = brut.trim();
    onChange(cell, num ? (t === "" ? "" : toNum(t.replace(",", "."))) : t);
    setBrut(null);
  };
  return (
    <input
      className={(num ? "num" : "") + (invalide ? " hors-catalogue" : "")}
      value={affiche}
      list={liste}
      title={aide ? aide + " — " + cell : cell}
      aria-label={aide ?? cell}
      onChange={(e) => setBrut(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setBrut(null);
      }}
    />
  );
}

export default function AppBT() {
  const s = useSoumission();
  const { setParametres, setMachinesCreator, set, entrees } = s;

  const [source, setSource] = useState("chargement…");
  const [message, setMessage] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [bons, setBons] = useState<BonTravail[] | null>(null);
  const [soumissions, setSoumissions] = useState<SoumissionResume[] | null>(null);
  const [bonCourant, setBonCourant] = useState<BonTravail | null>(null);
  const [statut, setStatut] = useState<StatutBT>("Brouillon");
  /** soumission d'origine quand le bon n'existe pas encore (créé depuis « Ouvrir une soumission ») */
  const [soumissionId, setSoumissionId] = useState("");
  /** catalogue Couleurs (§11) — null tant que le formulaire Creator n'existe pas : la colonne
   *  COULEURS reste alors une saisie libre, comme avant. */
  const [couleurs, setCouleurs] = useState<Couleur[] | null>(null);

  // ── amorçage : paramètres vivants + machines, puis listes ────────────────
  // On part d'une fiche VIERGE, pas du job d'exemple du classeur : celui-ci affichait
  // « BSP » / pièce 4152464, qu'on prenait pour les données du bon ouvert (§9 du 28 sept.).
  useEffect(() => {
    s.reset("vierge");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void (async () => {
      await initZohoEnv();
      const p = await chargerParametres();
      if (p && (p.materiaux.length || p.taux.length)) {
        setParametres(p);
        setSource(`Creator : ${p.materiaux.length} matériaux · ${p.taux.length} taux`);
      } else {
        setSource("snapshot classeur (hors Zoho)");
      }
      const a = await chargerAdmin();
      if (a) setMachinesCreator(a.machines);
      setBons(await chargerBonsTravail());
      setSoumissions(await chargerSoumissions());
      const cat = await chargerCouleurs();
      if (cat && cat.length) setCouleurs(cat);
    })();
  }, [setParametres, setMachinesCreator]);

  // ── ouverture d'un bon / d'une soumission ────────────────────────────────
  // Changer de bon doit TOUT remplacer. Avant, quand `Donnees_Soum` revenait vide (colonne
  // absente du rapport Creator), `chargerDonnees` échouait et laissait l'état intact : on
  // gardait à l'écran le bon précédent — la fiche paraissait « figée ». On repart donc d'une
  // fiche vierge dans ce cas, puis on applique les saisies atelier du bon choisi : on affiche
  // au pire des champs bleus vides, jamais les données d'un autre bon.
  const chargerEtat = useCallback(
    (donneesSoum: string, donneesBT: string) => {
      const ok = s.chargerDonnees(donneesSoum);
      if (!ok) s.reset("vierge");
      const saisies = lireSaisiesBT(donneesBT);
      for (const [cell, v] of Object.entries(saisies)) set(cell, v);
      return ok;
    },
    [s, set],
  );

  function ouvrirBon(b: BonTravail) {
    setBonCourant(b);
    setStatut((b.Statut as StatutBT) ?? "Brouillon");
    const ok = chargerEtat(b.donnees_soum, b.donnees_bt);
    // Sans Donnees_Soum, l'état reste celui d'avant (au démarrage : le job d'exemple du
    // classeur — client « BSP », pièce 4152464). On le dit au lieu d'afficher en silence les
    // informations d'un autre job. Cause connue : la colonne Donnees_Soum absente du rapport
    // Creator `bon_travail_Report` (le widget l'écrit mais ne peut pas la relire).
    // Depuis le 28 sept. les nouveaux bons embarquent la soumission dans Donnees_BT, la seule
    // colonne que le rapport expose : ils se rouvrent complets. Les bons créés AVANT n'ont rien
    // à relire — sauf si la colonne Donnees_Soum est ajoutée au rapport.
    setMessage(
      ok
        ? `Bon ${b.no_bt || b.id} ouvert.`
        : `Bon ${b.no_bt || b.id} ouvert — saisies atelier seulement. Ce bon date d'avant la correction du 28 septembre : sa soumission n'a pas été enregistrée de façon relisible. Réenregistrez-le depuis sa soumission, ou ajoutez la colonne « Donnees_Soum » au rapport bon_travail_Report pour récupérer les anciens.`,
    );
  }

  function ouvrirSoumission(so: SoumissionResume) {
    setBonCourant(null);
    setStatut("Brouillon");
    // on retient l'ID : sans lui, le bon créé ensuite perdait son lien vers la soumission
    setSoumissionId(so.id);
    const ok = chargerEtat(so.donnees, "{}");
    setMessage(ok ? `Soumission ${so.id} chargée — bon non encore créé.` : "Soumission illisible (JSON Donnees vide ?).");
  }

  // ── séparation entrées soumission / saisies atelier ──────────────────────
  const { jsonSoum, jsonBT, saisies } = useMemo(() => {
    const soum: Record<string, CellValue> = {};
    const bt: Record<string, CellValue> = {};
    for (const [cell, v] of Object.entries(entrees)) {
      if (SAISIE_SET.has(cell)) bt[cell] = v;
      else soum[cell] = v;
    }
    return { jsonSoum: JSON.stringify(soum), jsonBT: JSON.stringify(bt), saisies: bt };
  }, [entrees]);

  // ── liste des bons : une seule entrée par soumission ──────────────────────
  // Deux bons portant la MÊME `Soumission_ID` sont des jumeaux : l'ancien a été fabriqué par
  // un clic de trop sur « Créer le bon » (voir `ecrire`). On n'affiche que le plus récent —
  // `bons` est déjà trié par ID décroissant, donc le premier vu d'un groupe est le bon.
  // Le compteur « (2 bons) » garde la chose visible : rien n'est masqué en douce.
  // Le bon ouvert reste toujours listé, sinon le <select> perdrait sa valeur.
  const bonsVisibles = useMemo(() => {
    const vus = new Map<string, { bon: BonTravail; jumeaux: number }>();
    const seuls: { bon: BonTravail; jumeaux: number }[] = [];
    for (const b of bons ?? []) {
      const sid = String(b.Soumission_ID ?? "").trim();
      // sans soumission rattachée, aucun regroupement possible : on garde tel quel
      if (!sid || sid === "0") { seuls.push({ bon: b, jumeaux: 1 }); continue; }
      const deja = vus.get(sid);
      if (!deja) vus.set(sid, { bon: b, jumeaux: 1 });
      else {
        deja.jumeaux += 1;
        // le bon actuellement ouvert doit rester sélectionnable même s'il est le plus ancien
        if (bonCourant && b.id === bonCourant.id) deja.bon = b;
      }
    }
    const sortie = [...vus.values(), ...seuls];
    sortie.sort((a, b) => (a.bon.id < b.bon.id ? 1 : -1));
    return sortie;
  }, [bons, bonCourant]);

  // ── enregistrement ────────────────────────────────────────────────────────
  // Trois actions volontairement distinctes (retest du 29 sept.) :
  //   · « Créer le bon »          → toujours un NOUVEAU bon ;
  //   · « Enregistrer »           → met à jour le bon ouvert, jamais de doublon ;
  //   · « Envoyer en production » → contrôle la matrice PUIS passe le statut.
  // Un brouillon ne se fait jamais refuser : seul l'envoi en production contrôle quoi que ce soit.
  async function ecrire(statutCible: StatutBT, forcerCreation: boolean) {
    setOccupe(true);
    const creation = forcerCreation || !bonCourant;
    setMessage(creation ? "Création du bon…" : "Enregistrement…");
    const sid = String(bonCourant?.Soumission_ID || soumissionId || "");
    const plats = champsPlatsBT(s.moteur, saisies, sid, statutCible);
    const res: { ok: boolean; message: string; id?: string; no_bt?: string } = creation
      ? await creerBonTravail({ plats, donnees_soum: jsonSoum, donnees_bt: jsonBT })
      : await sauvegarderBonTravail(bonCourant!.id, {
          ...plats,
          // même enveloppe qu'à la création : Donnees_BT porte les deux JSON, car c'est la
          // seule des deux colonnes que bon_travail_Report expose (voir bonTravailService.ts)
          Donnees_BT: emballerDonnees(jsonSoum, jsonBT, sid),
          Donnees_Soum: jsonSoum,
        });
    setMessage(res.message);
    if (res.ok) {
      setStatut(statutCible);
      const liste = await chargerBonsTravail();
      setBons(liste);
      // Après une création, on ADOPTE le bon créé : sans ça le bouton restait sur « Créer »
      // et un second clic fabriquait un doublon.
      //
      // L'adoption ne doit PAS dépendre de la relecture : `chargerBonsTravail` renvoie `null`
      // dès qu'elle échoue (son catch avale l'erreur), et elle peut aussi ne pas encore voir
      // la ligne tout juste écrite. Dans ces deux cas `bonCourant` restait nul, « Créer le
      // bon » restait actif, et le clic suivant fabriquait un jumeau sur la même soumission —
      // c'est l'origine de BT-1010/BT-1011 et BT-1013/BT-1014. La création, elle, a réussi et
      // nous a rendu l'ID : on s'en sert comme filet.
      if (creation && res.id) {
        const cree =
          liste?.find((b) => b.id === res.id) ?? liste?.find((b) => b.no_bt === res.no_bt);
        setBonCourant(
          cree ?? {
            ...plats,
            id: res.id,
            no_bt: res.no_bt ?? "",
            donnees_soum: jsonSoum,
            donnees_bt: jsonBT,
          },
        );
      }
    }
    setOccupe(false);
    return res.ok;
  }

  /** §1 du retest — le seul point de passage vers l'atelier, et le seul qui contrôle. */
  async function envoyerEnProduction() {
    const bloquants = controlesBonTravail(s.moteur, saisies, "En_production");
    if (bloquants.length) {
      setMessage("Envoi en production refusé — " + bloquants.map((a) => a.message).join(" ") + " " + (bloquants[0].conseil ?? ""));
      return;
    }
    await ecrire("En_production", false);
  }

  /** valeur brute d'une cellule de saisie : ce qui est saisi, sinon ce que porte le classeur */
  const valeurBrute = (cell: string): CellValue => {
    const v = s.saisie(cell);
    return v !== "" && v !== undefined && v !== null ? v : s.val(cell);
  };

  // ── §11b : la grille M / COULEURS / FILM devient une liste dynamique ──────
  // Les 10 premières lignes restent les vraies cellules FT (les bons existants se rouvrent
  // sans conversion) ; au-delà, des pseudo-cellules X!COUL*. M et FILM gardent leur rôle,
  // seule COULEURS devient un choix contrôlé dans la base Couleurs quand elle existe.
  const catalogue = useMemo(() => (couleurs ? couleursSelectionnables(couleurs) : []), [couleurs]);
  const parCode = useMemo(() => indexParCode(catalogue), [catalogue]);

  const lignesCouleur = useMemo(() => {
    const base = FT_COULEURS.map((c, i) => ({ ...c, rang: i + 1, supprimable: false }));
    const supp: (ReturnType<typeof ligneCouleurSupp> & { supprimable: boolean })[] = [];
    for (let n = 1; n <= MAX_COULEURS - FT_COULEURS.length; n++) {
      const l = ligneCouleurSupp(n);
      if (entrees[l.m] || entrees[l.couleur] || entrees[l.film]) supp.push({ ...l, supprimable: true });
    }
    return [...base, ...supp];
  }, [entrees]);

  const ajouterCouleur = () => {
    for (let n = 1; n <= MAX_COULEURS - FT_COULEURS.length; n++) {
      const l = ligneCouleurSupp(n);
      if (!entrees[l.m] && !entrees[l.couleur] && !entrees[l.film]) {
        set(l.couleur, " "); // occupe la ligne : elle apparaît, prête à être remplie
        return;
      }
    }
  };
  const retirerCouleur = (l: { m: string; couleur: string; film: string }) => {
    for (const c of [l.m, l.couleur, l.film]) s.unset(c);
  };

  /** « Nbre de films » : FT!R33 ne compte que les 10 lignes du classeur (COUNTIF(R23:R32)),
   *  on recompte donc sur TOUTES les lignes, y compris celles ajoutées. */
  const nbFilms = useMemo(
    () => lignesCouleur.filter((l) => String(valeurBrute(l.film) ?? "").trim() !== "").length,
    [lignesCouleur, entrees], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // §10 — ce qui empêcherait l'envoi en production. Affiché en permanence pour prévenir, mais
  // sans jamais retenir un enregistrement : on doit pouvoir préparer un bon incomplet.
  const alertes = useMemo(
    () => controlesBonTravail(s.moteur, saisies, "En_production"),
    [s.moteur, saisies, entrees], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── raccourcis de rendu ─────────────────────────────────────────────────
  const V = (cell: string) => texte(s.val(cell));

  /** Valeur affichée d'un champ jaune : la saisie, sinon le défaut du classeur.
   *  Plusieurs cellules d'entrée FT portent une valeur dans le master (C11=4010, Z4=1,
   *  C39=0,1, R43=24, W48=48) — le moteur s'en sert déjà, il faut donc la montrer.
   *  Exception : L4 contient le libellé « No. Presse » tant qu'aucune presse n'est choisie. */
  const valeurSaisie = (cell: string): CellValue => {
    if (cell === FT_IN.noPresse) return presseFT(s.moteur, entrees);
    const v = s.saisie(cell);
    if (v !== "" && v !== undefined && v !== null) return v;
    return s.val(cell);
  };
  const C = (cell: string, opts: { colSpan?: number; classe?: string; contenu?: string } = {}) => (
    <td
      className={"calc " + (opts.classe ?? "")}
      colSpan={opts.colSpan}
      title={`${cell} — calculé par le classeur`}
    >
      {opts.contenu ?? V(cell)}
    </td>
  );
  const J = (cell: string, opts: { colSpan?: number; num?: boolean; aide?: string; classe?: string } = {}) => (
    <td className={"saisie " + (opts.classe ?? "")} colSpan={opts.colSpan}>
      <ChampSaisie cell={cell} valeur={valeurSaisie(cell)} onChange={set} num={opts.num} aide={opts.aide} />
    </td>
  );

  const flags = (cellules: string[]) => (
    <ul className="bt-flags">
      {cellules.map((c) => {
        const v = V(c);
        return (
          <li key={c} className={v ? "" : "off"} title={c}>
            {v || LIB_DECOUPE[c] || c}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="bt-page">
      {/* liste de choix des codes couleur (§11b) — vide tant que le formulaire Creator n'existe pas */}
      {catalogue.length > 0 && (
        <datalist id="liste-couleurs">
          {catalogue.map((c) => (
            <option key={c.id || c.code} value={c.code}>
              {/color\s*match/i.test(c.pms) ? c.commentaires || "COLOR MATCH" : c.pms} · {c.cartable}
            </option>
          ))}
        </datalist>
      )}
      <div className="bt-topbar">
        <h1>Bon de travail</h1>
        <span className="bt-src">{source}</span>
        <span className="bt-src" title="Version du widget réellement déployée dans Creator">
          build {__BUILD__}
        </span>

        {/* Rappel de la règle de lecture de la fiche. Dans la barre d'outils, qui ne
            s'imprime pas : la disposition de la fiche n'est pas touchée. */}
        <span className="bt-legende">
          <span>
            <i className="lu" />
            Repris de la soumission
          </span>
          <span>
            <i className="sa" />
            À remplir
          </span>
        </span>

        <select
          className="bt-btn"
          value={bonCourant?.id ?? ""}
          onChange={(e) => {
            const b = bons?.find((x) => x.id === e.target.value);
            if (b) ouvrirBon(b);
          }}
          aria-label="Bons de travail"
        >
          <option value="">— bons enregistrés —</option>
          {bonsVisibles.map(({ bon: b, jumeaux }) => (
            <option key={b.id} value={b.id}>
              {etiquetteBon(b, jumeaux)}
            </option>
          ))}
        </select>

        <select
          className="bt-btn"
          value=""
          onChange={(e) => {
            const so = soumissions?.find((x) => x.id === e.target.value);
            if (so) ouvrirSoumission(so);
          }}
          aria-label="Soumissions"
        >
          <option value="">— depuis une soumission —</option>
          {(soumissions ?? []).map((so) => (
            <option key={so.id} value={so.id}>
              {so.id + " · " + (so.client || "sans client") + " · " + (so.noPce || "")}
            </option>
          ))}
        </select>

        <select
          className={"bt-btn" + (estEnvoiProduction(statut) && alertes.length ? " bloque" : "")}
          value={statut}
          onChange={(e) => setStatut(e.target.value as StatutBT)}
          aria-label="Statut"
          title="Le passage en production se fait par le bouton « Envoyer en production », qui contrôle la matrice"
        >
          <option value="Brouillon">Brouillon</option>
          <option value="Valide">Validé</option>
          <option value="En_production">En production</option>
          <option value="Termine">Terminé</option>
        </select>

        <button className="bt-btn" onClick={() => window.print()}>
          Imprimer
        </button>
        {/* Un bon ne se crée qu'UNE fois : dès qu'il existe, le bouton se désactive et tout
            passe par « Enregistrer ». Sans ça, un clic de trop fabriquait un bon jumeau
            (BT-1012 / BT-1013 au retest du 29 sept.). Pour repartir d'un bon neuf, on ouvre
            une soumission — ce qui relâche le bon courant. */}
        <button
          className="bt-btn"
          disabled={occupe || !!bonCourant}
          title={
            bonCourant
              ? `Le bon ${bonCourant.no_bt || bonCourant.id} existe déjà — utilisez « Enregistrer ». Pour en créer un autre, ouvrez une soumission.`
              : "Crée le bon de travail à partir de ce qui est à l'écran"
          }
          onClick={() => void ecrire(statut, true)}
        >
          Créer le bon
        </button>
        <button
          className="bt-btn solid"
          disabled={occupe || !bonCourant}
          title={bonCourant ? `Met à jour le bon ${bonCourant.no_bt || bonCourant.id}` : "Ouvrez un bon pour l'enregistrer"}
          onClick={() => void ecrire(statut, false)}
        >
          Enregistrer
        </button>
        <button
          className={"bt-btn" + (alertes.length ? " bloque" : " prod")}
          disabled={occupe || !bonCourant}
          title={
            alertes.length
              ? alertes.map((a) => a.message).join(" ")
              : bonCourant
                ? "Contrôle la matrice puis passe le bon en production"
                : "Créez ou ouvrez un bon d'abord"
          }
          onClick={() => void envoyerEnProduction()}
        >
          Envoyer en production
        </button>
        {message && <span className="bt-msg">{message}</span>}
        {!isZohoEnv() && <span className="bt-src">mode démo</span>}
      </div>

      {alertes.length > 0 && (
        <ul className="bt-alertes" role="alert">
          {alertes.map((a) => (
            <li key={a.cle}>
              <b>{a.message}</b>
              {a.conseil ? " " + a.conseil : ""}
            </li>
          ))}
        </ul>
      )}

      <div className="bt-fiche">
        {/* ── rangée 1 : entête ───────────────────────────────────────── */}
        <div className="bt-grille c3">
          {/* identification */}
          <div className="bt-bloc">
            <table className="bt-t">
              <colgroup>
                <col style={{ width: "26%" }} />
                <col style={{ width: "12%" }} />
                <col />
                <col style={{ width: "18%" }} />
              </colgroup>
              <tbody>
                <tr>
                  <td className="lab">M-</td>
                  {J(FT_IN.codeM, { aide: "Code M" })}
                  <td className="lab ct">R</td>
                  {J(FT_IN.codeR, { aide: "Code R" })}
                </tr>
                <tr>
                  <td className="lab">No.Client</td>
                  {C(FT_OUT.noClient, { colSpan: 3 })}
                </tr>
                <tr>
                  <td className="lab">Client</td>
                  {C(FT_OUT.client, { colSpan: 3, classe: "on" })}
                </tr>
                <tr>
                  <td className="lab">Modèle</td>
                  {C(FT_OUT.modele, { colSpan: 3 })}
                </tr>
                <tr>
                  <td className="lab">No.Pièce</td>
                  {C(FT_OUT.noPce, { colSpan: 3, classe: "on" })}
                </tr>
                <tr>
                  <td className="lab plain">Autre</td>
                  {C(FT_OUT.autre, { colSpan: 3 })}
                </tr>
                <tr>
                  <td className="lab">P.O.</td>
                  {J(FT_IN.po, { colSpan: 3, aide: "Bon de commande client" })}
                </tr>
                <tr>
                  <td className="lab">No.Soum.</td>
                  {C(FT_OUT.noSoum, { colSpan: 2 })}
                  {C(FT_OUT.initiales)}
                </tr>
                <tr>
                  <td className="lab">Code</td>
                  {J(FT_IN.code, { colSpan: 3, aide: "Code (4010 par défaut)" })}
                </tr>
                <tr>
                  <td className="lab">Vérif.</td>
                  {J(FT_IN.verif1)}
                  <td className="lab ct">Date</td>
                  {J(FT_IN.date1)}
                </tr>
              </tbody>
            </table>
          </div>

          {/* presse / cadre / commandé le */}
          <div className="bt-bloc">
            <table className="bt-t">
              <colgroup>
                <col style={{ width: "42%" }} />
                <col />
              </colgroup>
              <tbody>
                <tr>
                  <td className="lab">COMMANDÉ LE</td>
                  {J(FT_IN.commandeLe, { aide: "Date de commande" })}
                </tr>
                <tr>
                  <td className="lab">Date requise</td>
                  {J(FT_IN.dateRequise, { aide: "Date requise (alimente P21)" })}
                </tr>
                <tr>
                  <td className="lab plain">Date requise (calc.)</td>
                  {/* cellule de date : le classeur y met un numéro de série Excel, ou son
                      message « Date Exp.Erreur » quand la date tombe un week-end (pas assez
                      de jours ouvrables avant l'expédition) */}
                  {C(FT_OUT.dateRequiseCalc, { contenu: dateOuTexte(s.val(FT_OUT.dateRequiseCalc)) })}
                </tr>
                <tr>
                  <td className="lab">No. Presse</td>
                  {J(FT_IN.noPresse, { aide: "Presse — pré-remplie par la soumission" })}
                </tr>
                <tr>
                  <td className="lab">No. Cadre</td>
                  {J(FT_IN.noCadre)}
                </tr>
                <tr>
                  <td className="lab">E-</td>
                  {J(FT_IN.codeE, { aide: "Code E" })}
                </tr>
                <tr>
                  <td className="lab">Surplus (0/1)</td>
                  {J(FT_IN.surplus, { num: true, aide: "1 = surplus 10 %" })}
                </tr>
                <tr>
                  <td className="lab plain">Surplus</td>
                  {C(FT_OUT.surplusOuiNon, { classe: "on" })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* QTÉ / EXP */}
          <div className="bt-bloc">
            <table className="bt-t">
              <colgroup>
                <col style={{ width: "16%" }} />
                <col />
                <col style={{ width: "16%" }} />
                <col />
              </colgroup>
              <tbody>
                {FT_QTE.map((q) => (
                  <tr key={q.rang}>
                    <td className="lab">QTÉ.{q.rang}</td>
                    {J(q.qte, { num: true, aide: `Quantité livraison ${q.rang}` })}
                    <td className="lab">EXP.{q.rang}</td>
                    {J(q.exp, { aide: `Expédition ${q.rang}` })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── rangée 2 : INFOGRAPHIE ──────────────────────────────────── */}
        <div className="bt-bloc" style={{ marginTop: 6 }}>
          <h2>INFOGRAPHIE</h2>
          <table className="bt-t">
            <colgroup>
              <col style={{ width: "9%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "3%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "10%" }} />
              <col />
            </colgroup>
            <tbody>
              <tr>
                <td className="lab">Épreuve</td>
                {J(FT_IN.epreuve)}
                <td className="lab">Nombre Up</td>
                {C(FT_OUT.nbUp, { classe: "ct on" })}
                <td className="lab">Format</td>
                {C(FT_OUT.formatX, { classe: "ct" })}
                <td className="ct">X</td>
                {C(FT_OUT.formatY, { classe: "ct" })}
                <td className="lab">MultiPrint</td>
                {C(FT_OUT.multiprint)}
              </tr>
              <tr>
                <td className="lab">e-mail</td>
                {J(FT_IN.courriel)}
                <td className="lab">Films</td>
                {J(FT_IN.films, { colSpan: 5 })}
                <td className="lab">Numérique</td>
                {C(FT_OUT.numeriqueMultiup)}
              </tr>
              <tr>
                <td className="lab">Vérif.</td>
                {J(FT_IN.verif2)}
                <td className="lab">Date</td>
                {J(FT_IN.date2, { colSpan: 3 })}
                <td className="lab" colSpan={2}>
                  Temps Numérique
                </td>
                {C("FT!X20", { classe: "ct" })}
                {C("FT!Z20", { classe: "ct" })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── rangée 3 : matériaux / impression / découpe ──────────────── */}
        <div className="bt-grille c3" style={{ marginTop: 6 }}>
          {/* MATÉRIAUX */}
          <div className="bt-bloc">
            <h2>MATÉRIAUX</h2>
            <table className="bt-t">
              <colgroup>
                <col />
                <col style={{ width: "22%" }} />
              </colgroup>
              <tbody>
                <tr>
                  <td className="lab">DESCRIPTION</td>
                  <td className="lab ct">INV.</td>
                </tr>
                {FT_MATERIAUX.map((m) => (
                  <tr key={m.ligne}>
                    {C(m.nom)}
                    {m.inv ? C(m.inv, { classe: "rt" }) : <td className="calc" />}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* IMPRESSION */}
          <div className="bt-bloc">
            <h2>IMPRESSION</h2>
            <table className="bt-t">
              <colgroup>
                <col style={{ width: "12%" }} />
                <col />
                <col style={{ width: "20%" }} />
              </colgroup>
              <tbody>
                <tr>
                  <td className="lab ct">M</td>
                  <td className="lab ct">COULEURS</td>
                  <td className="lab ct">FILM</td>
                </tr>
                {lignesCouleur.map((c) => {
                  const choisie = trouverCouleur(parCode, valeurBrute(c.couleur));
                  const saisi = String(valeurBrute(c.couleur) ?? "").trim();
                  const inconnue = catalogue.length > 0 && saisi !== "" && !choisie;
                  return (
                    <tr key={c.couleur}>
                      {J(c.m, { aide: "M" })}
                      <td className="saisie coul">
                        <ChampSaisie
                          cell={c.couleur}
                          valeur={valeurBrute(c.couleur)}
                          onChange={set}
                          aide={`Couleur ligne ${c.rang}`}
                          liste={catalogue.length ? "liste-couleurs" : undefined}
                          invalide={inconnue}
                        />
                        {choisie && (
                          // Un color match n'a pas de numéro Pantone : afficher « COLOR MATCH »
                          // n'apprend rien à l'atelier, le nom du client oui.
                          <span
                            className={"pms" + (/color\s*match/i.test(choisie.pms) ? " match" : "")}
                            title={`${choisie.cartable}${choisie.commentaires ? " — " + choisie.commentaires : ""}${
                              /color\s*match/i.test(choisie.pms) ? " (color match, pas de Pantone)" : ""
                            }`}
                          >
                            {/color\s*match/i.test(choisie.pms) ? choisie.commentaires || "COLOR MATCH" : choisie.pms}
                          </span>
                        )}
                        {inconnue && <span className="pms hors" title="Ce code n'est pas au catalogue — demandez-le au directeur de production">hors catalogue</span>}
                      </td>
                      <td className="saisie film">
                        <ChampSaisie cell={c.film} valeur={valeurBrute(c.film)} onChange={set} aide="Film" />
                        {c.supprimable && (
                          <button type="button" className="coul-suppr" title="Retirer cette couleur" onClick={() => retirerCouleur(c)}>
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={3} className="coul-ajout-cell">
                    <button
                      type="button"
                      className="coul-ajout"
                      onClick={ajouterCouleur}
                      disabled={lignesCouleur.length >= MAX_COULEURS}
                    >
                      + Ajouter une couleur
                    </button>
                    {catalogue.length > 0 && <span className="coul-src">{catalogue.length} couleurs au catalogue</span>}
                  </td>
                </tr>
                <tr>
                  <td className="lab" colSpan={2}>
                    Nbre de films
                  </td>
                  <td className="calc ct" title="Compté sur toutes les lignes, y compris celles ajoutées">
                    {nbFilms || ""}
                  </td>
                </tr>
              </tbody>
            </table>
            <table className="bt-t">
              <colgroup>
                <col />
                <col style={{ width: "13%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <tbody>
                {FT_TEMPS.filter((t) => t.cle !== "numerique").map((t) => (
                  <tr key={t.cle}>
                    <td className="lab">{t.libelle}</td>
                    {C(t.h, { classe: "ct", contenu: String(Math.trunc(s.num(t.h))) })}
                    <td className="ct">hrs</td>
                    {C(t.m, { classe: "ct", contenu: minutes(s.val(t.m)) })}
                    <td className="ct">min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PRODUCTION DÉCOUPE */}
          <div className="bt-bloc">
            <h2>PRODUCTION DÉCOUPE</h2>
            {flags(FT_DECOUPE_GAUCHE)}
            {flags(FT_DECOUPE_DROITE)}
            <table className="bt-t">
              <colgroup>
                <col style={{ width: "22%" }} />
                <col />
                <col style={{ width: "12%" }} />
                <col />
                <col style={{ width: "12%" }} />
              </colgroup>
              <tbody>
                <tr>
                  <td className="lab">Platine</td>
                  <td className="lab ct">Matrice No</td>
                  <td className="lab ct">UP</td>
                  <td className="lab ct">Matrice No</td>
                  <td className="lab ct">UP</td>
                </tr>
                {FT_PLATINE.map((p) => (
                  <tr key={p.ligne}>
                    {C(p.procede)}
                    {J(p.matrice1, { aide: "Matrice No" })}
                    {C(p.up1, { classe: "ct" })}
                    {J(p.matrice2, { aide: "Matrice No (2)" })}
                    {J(p.up2, { num: true, aide: "UP (2)" })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="bt-zone">
              <div className="lab" style={{ padding: "1px 3px" }}>
                Procédure
              </div>
              <textarea
                value={texte(s.saisie(FT_IN.procedure))}
                onChange={(e) => set(FT_IN.procedure, e.target.value)}
                aria-label="Procédure"
              />
            </div>
          </div>
        </div>

        {/* ── rangée 4 : instructions + quantités ─────────────────────── */}
        <div className="bt-grille c2" style={{ marginTop: 6 }}>
          <div className="bt-bloc">
            <h2>INSTRUCTIONS</h2>
            <div className="bt-zone">
              <textarea
                value={texte(s.saisie(FT_IN.instructions))}
                onChange={(e) => set(FT_IN.instructions, e.target.value)}
                aria-label="Instructions"
                style={{ minHeight: 150 }}
              />
            </div>
          </div>

          <div className="bt-bloc">
            <h2>QUANTITÉS &amp; FEUILLES</h2>
            <table className="bt-t">
              <colgroup>
                <col style={{ width: "34%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "22%" }} />
                <col />
              </colgroup>
              <tbody>
                <tr>
                  <td className="lab">Qté Commandé</td>
                  {J(FT_IN.qteCommandee, { num: true })}
                  <td className="lab">Nbre mrcx feuille</td>
                  {J(FT_IN.nbreMrcxFeuille, { num: true })}
                </tr>
                <tr>
                  <td className="lab">Protection (fraction)</td>
                  {J(FT_IN.protectionPct, { num: true, aide: "0,1 = 10 %" })}
                  <td className="lab plain">Protection</td>
                  {C(FT_OUT.protection, { classe: "rt" })}
                </tr>
                <tr>
                  <td className="lab">Maximum (fraction)</td>
                  {J(FT_IN.maximumPct, { num: true })}
                  <td className="lab plain">Qté Maximum</td>
                  {C(FT_OUT.qteMaximum, { classe: "rt" })}
                </tr>
                <tr>
                  <td className="lab plain">Qté Produite</td>
                  {C(FT_OUT.qteProduite, { classe: "rt" })}
                  <td className="lab plain">Nombre de Up</td>
                  {C(FT_OUT.nombreUp, { classe: "rt on" })}
                </tr>
                <tr>
                  <td className="lab plain">Nbre de Feuilles</td>
                  {C(FT_OUT.nbreFeuilles, { classe: "rt" })}
                  <td className="lab">Feuilles Corr.</td>
                  {J(FT_IN.feuillesCorr, { num: true })}
                </tr>
                <tr>
                  <td className="lab">Set-up (po.)</td>
                  {J(FT_IN.setupX, { num: true })}
                  <td className="lab ct">x</td>
                  {J(FT_IN.setupY, { num: true })}
                </tr>
                <tr>
                  <td className="lab plain">Mrx (po.)</td>
                  {C(FT_OUT.mrxX, { classe: "rt" })}
                  <td className="ct">x</td>
                  {C(FT_OUT.mrxY, { classe: "rt" })}
                </tr>
                <tr>
                  <td className="lab">MX À IMPR.</td>
                  {C(FT_OUT.mxAImpr, { classe: "rt on" })}
                  <td className="lab">Vérif.</td>
                  {J(FT_IN.verif3)}
                </tr>
                <tr>
                  <td className="lab">FT!R43 (à nommer)</td>
                  {J(FT_IN.divR43, { num: true, aide: "cellule FT!R43 (24 dans le master) — libellé à confirmer" })}
                  <td className="lab">Date</td>
                  {J(FT_IN.date3)}
                </tr>
                <tr>
                  <td className="lab">FT!W48 (à nommer)</td>
                  {J(FT_IN.divW48, { num: true, aide: "cellule FT!W48 (48 dans le master) — libellé à confirmer" })}
                  <td className="vide" colSpan={2} />
                </tr>
              </tbody>
            </table>
            <p className="bt-note bt-noprint">
              Les deux cellules <code>FT!R43</code> et <code>FT!W48</code> portent une valeur dans le classeur
              (24 et 48) mais aucun libellé identifiable — à nommer quand tu me le confirmes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
