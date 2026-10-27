// Widget « Canevas » — soumission matériaux souples.
// Disposition fidèle au classeur Excel FT_Soumission Rev.06, habillage Groupe Canva.
// Chaque champ écrit dans la cellule d'entrée du classeur ; le moteur recalcule tout en direct.
// Survol ou focus d'une valeur calculée → InfoBulle « comment ce chiffre est calculé ».
import { useEffect, useMemo, useRef, useState, Fragment, type ReactNode } from "react";
import { useSoumission, simulerQuantite, CLASSEUR } from "@/hooks/useSoumission";
import { tauxApplicable, LIBELLE_NIVEAU, type TauxRetenu } from "@/services/tauxChangeService";
import { IN, OUT, DECOUPE_HM, CATALOGUES, listeCatalogue, cellVendu, CELL_VENDU, cellContrat, CELL_TAUX_INV, CELLS_MATERIAU_IMPR, XTRA_PLACEHOLDER } from "@/lib/modele";
import { controlesSoumission, controlesPrix, SEUIL_DOUBLE_CHECK_DEFAUT } from "@/lib/controles";
import { REGLES_DEFAUT, fusionnerRegles, type RegleMateriau } from "@/lib/reglesMateriaux";
import { deduireAdhesif } from "@/lib/adhesif";
import { comparerParMoteur, type ComparatifMoteur } from "@/lib/comparatifMoteur";
import { argent, nombre2, nombre3, minutes, toNum, dateOuTexte } from "@/lib/format";
import {
  machinesFamille,
  cleMachine,
  cadencePresse,
  vitessePresseManquante,
  CELL_PRESSE,
  CELL_ZUND,
  // CELL_PLATINE : son sélecteur est masqué (26 oct. 2026) ; la cellule reste alimentée
  // par le classeur, elle n'est simplement plus référencée depuis cet écran.
  CELL_LAMINOIR,
  CELL_SLITTER,
  CELL_GUILLOTINE,
  CELL_MATRICE,
} from "@/lib/machines";
import { METHODE_COUT, tauxOperation, TAUX_HORAIRE_CLASSEUR } from "@/lib/methodeCout";
import type { FamilleMachine } from "@/data/machinesCalc";
import type { CellValue } from "@/lib/moteur";

/** familles de finition matière disposant d'un sélecteur dans le bloc Découpe */
type FamilleFinition = "laminoir" | "slitter" | "guillotine";
import { CelluleNum, CellulePct, CelluleTexte, CelluleDate, CelluleFlag, SelectMateriau, Va } from "@/components/cellules";
import { InfoBulle } from "@/components/InfoBulle";
import {
  initZohoEnv,
  sauvegarderSoumission,
  majSoumission,
  chargerParametres,
  chargerAdmin,
  chargerSoumissions,
  chargerReglesMateriaux,
  isZohoEnv,
  type SoumissionResume,
  type TauxCreator,
  type ParametresBase,
  type FournituresProduction,
  type TransportParams,
  type Amortissements,
  type Machine,
} from "@/services/zohoService";
import { creerBonTravail } from "@/services/bonTravailService";
import { construireSoumissionJSON } from "@/api/contratSoumission";

/** Remplacé par le vrai ID Creator dans le workflow Deluge (voir webhook_soumission_validee.ds). */
const ID_SUBSTITUTION = "__ID_SOUMISSION__";

/** Masquer aussi le COÛT de revient tant que les vérifications ne sont pas faites.
 *  Recommandation BSP du 28 sept. (« verrou propre »), en attente de l'arbitrage de Christian :
 *  mettre à false lui redonne sa visibilité permanente, rien d'autre à changer. */
const MASQUER_COUT = true;
import { CELLULES_SAISIE, champsPlatsBT } from "@/bt/modeleFT";
import { CATEGORIE_VERS_CHAMP } from "@/lib/parametres";
import { PopupGuide } from "@/components/PopupGuide";
import { PopupAdministration } from "@/components/PopupAdministration";
import { PopupSoumissions } from "@/components/PopupSoumissions";
import { PopupVerification } from "@/components/PopupVerification";
import { PopupProposition, type LigneProposition } from "@/components/PopupProposition";

export default function App() {
  const s = useSoumission();
  const [message, setMessage] = useState("");
  const [sourcePrix, setSourcePrix] = useState("chargement…");
  const [tauxCreator, setTauxCreator] = useState<TauxCreator[] | null>(null);
  const [parametresBase, setParametresBase] = useState<ParametresBase | null>(null);
  const [fournitures, setFournitures] = useState<FournituresProduction | null>(null);
  const [transportParams, setTransportParams] = useState<TransportParams | null>(null);
  const [amortissements, setAmortissements] = useState<Amortissements | null>(null);
  const [machines, setMachines] = useState<Machine[] | null>(null);
  /** règles « tel matériau exige tel élément » — Creator (Regles_Materiaux) sinon défauts embarqués */
  const [regles, setRegles] = useState<RegleMateriau[]>(REGLES_DEFAUT);
  const [sourceRegles, setSourceRegles] = useState("défauts embarqués");
  /** taux de change applicable, lu dans Taux_Change (null = aucun taux paramétré) */
  const [tauxInv, setTauxInv] = useState<TauxRetenu | null>(null);
  const [guideOuvert, setGuideOuvert] = useState(false);
  const [administrationOuvert, setAdministrationOuvert] = useState(false);
  const [soumissionsOuvert, setSoumissionsOuvert] = useState(false);
  const [soumissions, setSoumissions] = useState<SoumissionResume[] | null>(null);
  const [soumissionsChargement, setSoumissionsChargement] = useState(false);
  /** popup de vérification : `valider` = enchaîne sur le bon de travail quand tout est en ordre */
  const [propositionOuverte, setPropositionOuverte] = useState(false);
  const [verification, setVerification] = useState<null | { action: "valider" | null }>(null);
  /** ID Creator de la soumission en cours — vide tant qu'elle n'a jamais été enregistrée.
   *  Sert à mettre à jour le même enregistrement au lieu d'en empiler un par clic. */
  const [idSoumission, setIdSoumission] = useState("");

  function ouvrirSoumissions() {
    setSoumissionsOuvert(true);
    setSoumissionsChargement(true);
    void chargerSoumissions().then((liste) => {
      setSoumissions(liste);
      setSoumissionsChargement(false);
    });
  }
  const { setParametres, setMachinesCreator } = s;
  useEffect(() => {
    void (async () => {
      await initZohoEnv();
      const p = await chargerParametres();
      if (p && (p.materiaux.length || p.taux.length)) {
        setParametres(p);
        setTauxCreator(p.taux);
        setSourcePrix(`Creator : ${p.materiaux.length} matériaux · ${p.taux.length} taux`);
      } else {
        setSourcePrix("snapshot classeur (hors Zoho)");
      }
      const a = await chargerAdmin();
      if (a) {
        setParametresBase(a.base);
        setFournitures(a.fournitures);
        setTransportParams(a.transport);
        setAmortissements(a.amortissements);
        setMachines(a.machines);
        setMachinesCreator(a.machines);
      }
      const { regles: rr, source } = fusionnerRegles(await chargerReglesMateriaux());
      setRegles(rr);
      setSourceRegles(source);
      // Taux de change paramétré (Taux_Change) : cascade jour → semaine → mois → standard.
      setTauxInv(await tauxApplicable());
    })();
  }, [setParametres, setMachinesCreator]);

  // version du calcul (rafraîchit l'infobulle ouverte à chaque recalcul)
  const verRef = useRef(0);
  const version = useMemo(() => ++verRef.current, [s.entrees]); // eslint-disable-line react-hooks/exhaustive-deps

  const catalogues = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const [champ, col] of Object.entries(CATALOGUES)) map[champ] = listeCatalogue(CLASSEUR, col);
    // Le catalogue de Creator REMPLACE celui du classeur, catégorie par catégorie — il ne s'y
    // ajoute pas. Fusionner afficherait deux orthographes du même matériau (le classeur écrit
    // « Lexan Velv.Polish », l'inventaire « Lexan Velvet Polish ») et laisserait proposer des
    // matières qui ne sont plus en catalogue. Les listes du classeur contiennent par ailleurs
    // des lignes de section (« STYRÈNE », « 3M ») qui ne sont pas des matériaux.
    // Une catégorie absente de Creator garde sa liste du classeur : on ne vide jamais un champ.
    if (s.params) {
      for (const [cat, noms] of Object.entries(s.params.categories)) {
        const champ = CATEGORIE_VERS_CHAMP[cat];
        if (!champ || !map[champ] || !noms.length) continue;
        map[champ] = [...new Set(noms)].sort((a, b) => a.localeCompare(b, "fr"));
      }
    }
    return map;
  }, [s.params]);
  // « liste-tout » reprend exactement les listes par catégorie : rien de plus, pour que la
  // recherche libre ne propose jamais un matériau absent des listes ciblées.
  const catalogueComplet = useMemo(
    () => [...new Set(Object.values(catalogues).flat())].sort((a, b) => a.localeCompare(b, "fr")),
    [catalogues],
  );

  // table QTÉ : 2 lignes du classeur (S!J9/J10) + lignes ajoutées (pseudo-cellules X!QTEn,
  // sauvegardées dans le JSON de la soumission comme le reste des entrées)
  const qteCells = useMemo(() => {
    const extras = Object.keys(s.entrees)
      .filter((k) => k.startsWith("X!QTE"))
      .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)));
    return [IN.qte1, IN.qte2, ...extras];
  }, [s.entrees]);
  const ajouterLigneQte = () => {
    const max = Math.max(2, ...qteCells.filter((c) => c.startsWith("X!QTE")).map((c) => Number(c.slice(5))));
    s.set("X!QTE" + (max + 1), "");
  };
  const retirerLigneQte = (cell: string) => {
    s.unset(cell);
    s.unset(cellVendu(cell));
    s.unset(cellContrat(cell));
  };

  // ── §7 : adhésif laminé (rouleau) / régistre (feuille) posés automatiquement ──
  // Dès qu'un adhésif est choisi, sa forme décide laquelle des deux lignes s'active. On ne
  // touche rien si l'utilisateur a déjà une valeur cohérente : l'auto ne réécrit que ce qu'elle
  // a elle-même posé, pour qu'un décochage manuel reste possible.
  const adhesifDeduit = useMemo(() => deduireAdhesif(s.entrees), [s.entrees]);
  const autoAdhesif = useRef<string | null>(null);
  useEffect(() => {
    const cible = adhesifDeduit?.cellule ?? null;
    if (autoAdhesif.current === cible) return;
    // retire ce que l'auto avait posé précédemment, puis pose la nouvelle ligne
    if (autoAdhesif.current && toNum(s.saisie(autoAdhesif.current)) === 1) s.set(autoAdhesif.current, "");
    if (cible && !toNum(s.saisie(cible))) s.set(cible, 1);
    autoAdhesif.current = cible;
  }, [adhesifDeduit]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── scénarios (corr. 5) : chaque ligne = une quantité + le vendu décidé pour elle ──
  // La ligne ACTIVE est celle dont la quantité = la quantité principale (S!E2). Son vendu et
  // la case « Prix vendu » (X!VENDU) sont la même valeur, écrite aux deux endroits.
  const qtePrincipale = toNum(s.saisie(IN.quantite));
  const ligneActive = qteCells.find((c) => qtePrincipale > 0 && toNum(s.saisie(c)) === qtePrincipale) ?? null;
  /** cliquer une ligne : sa quantité devient la principale, son vendu devient le prix vendu */
  const activerLigne = (cell: string) => {
    const q = toNum(s.saisie(cell));
    if (!q) return;
    s.set(IN.quantite, q);
    s.set(CELL_VENDU, s.saisie(cellVendu(cell)));
  };
  // ── taux US : saisie manuelle ou taux paramétré (Artistic, 26 oct. 2026) ──
  const tauxInvActif = toNum(s.saisie(CELL_TAUX_INV)) >= 1;
  /** Cocher pose le taux de la cascade dans la cellule du moteur ; décocher efface le taux,
   *  donc la colonne US du tableau QTÉ et la ligne US de la carte de prix redeviennent vides
   *  (BSP, 27 oct. 2026 : un montant US figé après décochage se lisait comme encore valide). */
  const basculerTauxInventaire = (_: string, v: CellValue) => {
    const actif = toNum(v) >= 1;
    s.set(CELL_TAUX_INV, actif ? 1 : "");
    // cocher sans taux paramétré ne doit pas effacer ce que l'utilisateur a tapé
    if (!actif) s.set(IN.tauxUs, "");
    else if (tauxInv) s.set(IN.tauxUs, tauxInv.taux);
  };
  // Le taux paramétré peut arriver après le premier rendu : si la case est déjà cochée
  // (soumission rouverte), on applique le taux dès qu'il est connu.
  useEffect(() => {
    if (tauxInvActif && tauxInv && toNum(s.saisie(IN.tauxUs)) !== tauxInv.taux) s.set(IN.tauxUs, tauxInv.taux);
  }, [tauxInv, tauxInvActif]); // eslint-disable-line react-hooks/exhaustive-deps

  /** case « Prix vendu » : écrit X!VENDU et le vendu de la ligne active */
  const setVenduPrincipal = (_: string, v: CellValue) => {
    s.set(CELL_VENDU, v);
    if (ligneActive) s.set(cellVendu(ligneActive), v);
  };
  /** vendu d'une ligne : écrit la ligne et, si elle est active, X!VENDU */
  const setVenduLigne = (cell: string) => (_: string, v: CellValue) => {
    s.set(cellVendu(cell), v);
    if (cell === ligneActive) s.set(CELL_VENDU, v);
  };
  /** quantité d'une ligne : si elle était active, la principale suit */
  const setQteLigne = (cell: string) => (_: string, v: CellValue) => {
    s.set(cell, v);
    if (cell === ligneActive && toNum(v) > 0) s.set(IN.quantite, toNum(v));
  };
  // auto-ajout : la quantité principale figure toujours dans le tableau (une ligne active existe
  // toujours). Première cellule libre du classeur (S!J9/J10), sinon une ligne X!QTEn.
  useEffect(() => {
    if (!qtePrincipale || ligneActive) return;
    const libre = [IN.qte1, IN.qte2].find((c) => !toNum(s.saisie(c)));
    if (libre) {
      s.set(libre, qtePrincipale);
      s.set(cellVendu(libre), s.saisie(CELL_VENDU));
      return;
    }
    if (qteCells.length >= 10) return;
    const max = Math.max(2, ...qteCells.filter((c) => c.startsWith("X!QTE")).map((c) => Number(c.slice(5))));
    s.set("X!QTE" + (max + 1), qtePrincipale);
    s.set("X!VENDU" + (max + 1), s.saisie(CELL_VENDU));
  }, [qtePrincipale, ligneActive]); // eslint-disable-line react-hooks/exhaustive-deps
  const simulations = useMemo(() => {
    const surch = { ...s.overridesTaux, ...s.surchargesMach };
    const out: { qte: number; prix: number; vendu: number; us: number }[] = [];
    for (const cell of qteCells) {
      const q = toNum(s.saisie(cell));
      if (q > 0) out.push({ qte: q, ...simulerQuantite(s.entrees, q, s.params, surch) });
      else out.push({ qte: 0, prix: 0, vendu: 0, us: 0 });
    }
    return out;
  }, [qteCells, s.entrees, s.params, s.overridesTaux, s.surchargesMach]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── sélection machines (presse / zund / platine) ───────────────────────────
  // Les contrôles de format (feuille ⊂ machine, pièce ⊂ feuille) sont dans lib/controles.ts ;
  // `avertFormat` affiche ceux d'une famille sous son sélecteur.
  const presse = s.presseChoisie;
  const avertFormat = (cle: string, colSpan: number) =>
    controlesFormat
      .filter((c) => c.cle === cle)
      .map((c) => (
        <tr key={c.cle}>
          <td className="machine-warn" colSpan={colSpan}>⚠ {c.message}</td>
        </tr>
      ));
  // cadence réellement injectée dans le moteur (base unique : passes/heure) — cf. lib/machines.ts
  const couleursJob = Math.max(1, Math.trunc(s.num(IN.couleursVisibles)) || 1);
  const cadencePresseJob = presse ? cadencePresse(presse, couleursJob) : null;
  const presseSansVitesse = presse ? vitessePresseManquante(presse) : false;
  // taux réellement appliqué au roulement : CF8 en mode temps, machine rate en mode machine-rate
  const tauxApplique = tauxOperation(presse?.taux, s.num("INV!CF8") || TAUX_HORAIRE_CLASSEUR);
  // Contrôle de cohérence (arbitrage client 2026-07-23) : la « mise en train » agrégée de la
  // fiche presse est AFFICHÉE face à la décomposition du classeur, mais ne pilote rien — le
  // classeur décompose plus finement (par écran, par couleur), on garde sa décomposition.
  const prepClasseur = useMemo(() => {
    const gabarit = s.num("C!C6") === 1 ? 0 : s.num("C!C7") === 1 ? 1 : 2;
    const montage = s.num(["INV!CI71", "INV!CI72", "INV!CI73"][gabarit]);
    const nettoyage = s.num(["INV!CI79", "INV!CI80", "INV!CI81"][gabarit]);
    const coul = Math.trunc(s.num(IN.couleursVisibles));
    const setupCoul = coul >= 3 && coul <= 6 ? s.num(["INV!CF64", "INV!CF65", "INV!CF66", "INV!CF67"][coul - 3]) : 0;
    return { libelle: ["petite", "moyenne", "grande"][gabarit], montage, nettoyage, setupCoul, coul };
  }, [s]); // eslint-disable-line react-hooks/exhaustive-deps

  // comparatif découpe Zund vs Platine : le VRAI moteur tourne deux fois (lib/comparatifMoteur.ts).
  // Le coût de matrice vient du champ « Matrice job » du bloc Platine (X!MATRICE, saisi par job).
  // Une cinquantaine de recalculs (~5 ms chacun) : on attend une pause de saisie plutôt que
  // de recalculer à chaque frappe.
  const matriceJob = toNum(s.saisie(CELL_MATRICE));
  const embossageActif = toNum(s.saisie(IN.platEmbossageDie)) > 0;
  const [comparatif, setComparatif] = useState<ComparatifMoteur | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => {
      const cf8 = Number(s.overridesTaux["INV!CF8"] ?? s.params?.surcharges?.["INV!CF8"] ?? TAUX_HORAIRE_CLASSEUR);
      const couleurs = toNum(s.saisie(IN.couleursVisibles));
      setComparatif(
        comparerParMoteur({
          entrees: s.entrees,
          params: s.params,
          overridesTaux: s.overridesTaux,
          machinesCalc: s.machinesCalc,
          autres: { presse: s.presseChoisie, laminoir: s.laminoirChoisi, slitter: s.slitterChoisi, guillotine: s.guillotineChoisie },
          zundChoisi: s.zundChoisi,
          platineChoisie: s.platineChoisie,
          cf8: Number.isFinite(cf8) && cf8 > 0 ? cf8 : TAUX_HORAIRE_CLASSEUR,
          couleurs: couleurs >= 1 ? couleurs : 1,
        }),
      );
    }, 250);
    return () => window.clearTimeout(t);
  }, [s.entrees, s.params, s.overridesTaux, s.machinesCalc, s.presseChoisie, s.laminoirChoisi, s.slitterChoisi, s.guillotineChoisie, s.zundChoisi, s.platineChoisie]); // eslint-disable-line react-hooks/exhaustive-deps

  // contrôles de validation (format, prix à zéro, matériaux manquants…) — vivants, suivent la saisie
  const seuilDoubleCheck = s.params?.app?.SEUIL_DOUBLE_CHECK ?? SEUIL_DOUBLE_CHECK_DEFAUT;
  const controles = useMemo(
    () => controlesSoumission(s.moteur, s.entrees, { presse: s.presseChoisie, zund: s.zundChoisi, platine: s.platineChoisie }, regles, seuilDoubleCheck),
    [s.entrees, s.overridesTaux, s.surchargesMach, s.presseChoisie, s.zundChoisi, s.platineChoisie, regles, seuilDoubleCheck, version], // eslint-disable-line react-hooks/exhaustive-deps
  );
  // §2 — le prix unitaire reste caché tant que les vérifications « validation prix » (§6b)
  // ne sont pas traitées : on ne donne pas un prix au client sur une fiche incomplète.
  const manquePourPrix = useMemo(
    () => controlesPrix(s.moteur, s.entrees, regles),
    [s.entrees, regles, version], // eslint-disable-line react-hooks/exhaustive-deps
  );
  // Le prix ne s'affiche qu'une fois TOUTES les vérifications traitées (§2), pas seulement les
  // règles « validation prix » (§6b) : une fiche qui déclenche encore une alerte ne doit pas
  // donner de prix au client. Les rappels (§4) ne comptent pas.
  const bloquants = controles.filter((c) => c.type !== "info");
  const prixValide = bloquants.length === 0;
  const raisonPrix = (manquePourPrix.length ? manquePourPrix : bloquants)
    .map((c) => c.message.replace(/^Prix non validé — /, ""))
    .join(" · ");
  /** Tout ce qui permettrait de reconstituer un prix est masqué, pas seulement l'unitaire :
   *  montrer le Total et la Quantité revenait à donner l'unitaire par division. */
  const masque = (contenu: ReactNode, court = false) =>
    prixValide ? (
      contenu
    ) : (
      <span className="prix-cache" title={raisonPrix}>
        {court ? "à vérifier" : "À vérifier avant d'obtenir le prix"}
      </span>
    );
  const controlesFormat = controles.filter((c) => c.cle.startsWith("feuille-") || c.cle === "piece-feuille");

  // ── proposition client (Lot A, point 6) ───────────────────────────────────
  // Le document reprend les quantités du tableau QTÉ : le prix imprimé est le VENDU décidé
  // par le chargé de projet et, à défaut, le prix calculé (marqué comme tel sous le tableau).
  // Seule la quantité retenue sort sur le papier (BSP, 27 oct. 2026) ; les autres lignes
  // voyagent quand même pour que le document suive si on change de quantité active.
  // Le bouton reste fermé tant que le prix n'est pas validé : même règle que l'affichage à
  // l'écran (§2) — on ne sort pas un document client depuis une fiche incomplète.
  const lignesProposition = useMemo<LigneProposition[]>(
    () =>
      qteCells.map((cell, i) => {
        const qte = toNum(s.saisie(cell));
        const vendu = toNum(s.saisie(cellVendu(cell)));
        return {
          qte,
          unitaire: vendu > 0 ? vendu : (simulations[i]?.prix ?? 0),
          suggere: vendu <= 0,
          active: cell === ligneActive,
        };
      }),
    [qteCells, simulations, ligneActive, s.entrees], // eslint-disable-line react-hooks/exhaustive-deps
  );
  // Les lignes « MATÉRIEL » et « COULEUR(S) » du gabarit viennent de la fiche : les matériaux
  // d'impression réellement choisis, et le nombre de couleurs visibles. Rien n'est inventé —
  // une ligne sans valeur sort vide.
  const materiauxChoisis = CELLS_MATERIAU_IMPR.map((c) => String(s.saisie(c) ?? "").trim())
    // les lignes Xtra portent un libellé d'invite tant qu'aucun matériau n'est choisi :
    // il ne doit évidemment pas partir chez le client comme un matériau
    .filter((v) => v && !XTRA_PLACEHOLDER.includes(v));
  const nbCouleurs = toNum(s.saisie(IN.couleursVisibles));
  const infosProposition = {
    noSoumission: String(s.saisie(IN.codeS) ?? "").trim(),
    date: dateOuTexte(s.saisie(IN.date)) || new Date().toLocaleDateString("fr-CA"),
    client: String(s.saisie(IN.client) ?? "").trim(),
    noClient: String(s.saisie(IN.noClient) ?? "").trim(),
    description: String(s.saisie(IN.modele) ?? "").trim(),
    noPce: String(s.saisie(IN.noPce) ?? "").trim(),
    dimensions: [s.saisie(IN.dimPceX), s.saisie(IN.dimPceY)].every((v) => toNum(v) > 0)
      ? `${nombre3(s.saisie(IN.dimPceX))} × ${nombre3(s.saisie(IN.dimPceY))} po`
      : "",
    materiau: [...new Set(materiauxChoisis)].join(" · "),
    couleurs: nbCouleurs > 0 ? `${nbCouleurs} couleur${nbCouleurs > 1 ? "s" : ""}` : "",
  };

  // ── finition matière : sélecteur + ligne d'info, inséré au-dessus du groupe d'opérations ──
  const FINITION = {
    laminoir: {
      cell: CELL_LAMINOIR,
      titre: "Laminoir",
      choisie: () => s.laminoirChoisi,
      placeholder: "Laminoir générique (classeur)",
      pilote: "adhésif laminé · régistre · over laminating · prémask · protecteur (+ fenêtre)",
    },
    slitter: {
      cell: CELL_SLITTER,
      titre: "Slitter",
      choisie: () => s.slitterChoisi,
      placeholder: "Slitter générique (classeur)",
      pilote: "slit",
    },
    guillotine: {
      cell: CELL_GUILLOTINE,
      titre: "Guillotine",
      choisie: () => s.guillotineChoisie,
      placeholder: "Guillotine générique (classeur)",
      pilote: "guillotine — mise en train seulement",
    },
  } as const;

  // Sélecteurs de machine retirés de l'ÉCRAN à la demande d'Artistic (26 oct. 2026) :
  // slitter, guillotine et platine. Masquage d'affichage SEULEMENT — les cellules et leurs
  // valeurs par défaut restent en place, et le calcul continue d'utiliser la machine
  // générique du classeur. Supprimer les champs changerait les temps de découpe.
  const MACHINES_MASQUEES = new Set<FamilleFinition>(["slitter", "guillotine"]);

  const ligneMachineFinition = (famille: FamilleFinition) => {
    const cfg = FINITION[famille];
    const m = cfg.choisie();
    return (
      <>
        <tr>
          <td className="lb">{cfg.titre}</td>
          <td colSpan={4}>{selectMachine(cfg.cell, famille, cfg.placeholder, cfg.titre)}</td>
        </tr>
        <tr>
          <td className="machine-info" colSpan={5}>
            {m
              ? `${m.vitesse} ${m.uniteVitesse || "fle/h"} · mise en train ${m.setup} min · pilote ${cfg.pilote}`
              : `cadences et mises en train du classeur · pilote ${cfg.pilote}`}
            {famille === "guillotine" && (
              <>
                {" "}
                — le tarif de roulage reste la saisie « taux » de la ligne ($/pièce) : le classeur n'a pas de
                cadence guillotine, la vitesse machine relève d'un autre modèle de coût (à trancher).
              </>
            )}
          </td>
        </tr>
      </>
    );
  };

  const selectMachine = (cell: string, famille: FamilleMachine, placeholder: string, label: string) => {
    const liste = machinesFamille(s.machinesCalc, famille);
    const valeur = String(s.saisie(cell) ?? "");
    const inconnue = valeur !== "" && !liste.some((m) => cleMachine(m.nom) === cleMachine(valeur));
    return (
      <select
        className="sel-machine"
        value={valeur}
        onChange={(e) => s.set(cell, e.target.value)}
        aria-label={label}
        title={label}
      >
        <option value="">{placeholder}</option>
        {/* libellé court : le détail complet (format, cadence, taux) est sur la ligne d'info
            sous le sélecteur — une option trop longue est illisible dans une cellule étroite */}
        {liste.map((m) => (
          <option key={m.nom} value={m.nom}>
            {m.nom} · {m.vitesse} {famille === "zund" ? "po-lin/min" : "fle/h"}
          </option>
        ))}
        {inconnue && <option value={valeur}>{valeur} (fiche introuvable)</option>}
      </select>
    );
  };

  /** JSON contractuel envoyé à la plateforme du client (voir docs/api/CONTRAT-SOUMISSION.md).
   *  `id` n'est connu qu'après l'insert → passé en paramètre. */
  function contratJSON(id: string, statut: string) {
    return construireSoumissionJSON({
      m: s.moteur,
      e: s.entrees,
      meta: {
        id,
        statut,
        source: "widget",
        date_soumission: new Date().toISOString().slice(0, 10),
        reference_externe: null,
        notes: "",
      },
      simuler: (qte) => simulerQuantite(s.entrees, qte, s.params, { ...s.overridesTaux, ...s.surchargesMach }),
    });
  }

  async function enregistrer(statut: "Brouillon" | "Valide" = "Brouillon") {
    setMessage("Enregistrement…");
    // Une soumission déjà enregistrée pendant cette session est MISE À JOUR, pas recréée :
    // « Enregistrer » puis « Valider » fabriquaient deux enregistrements pour le même travail
    // (retest du 29 sept.). Tant qu'aucun ID n'est connu, on crée — c'est la création par API
    // qui déclenche le workflow d'envoi vers la plateforme du client.
    // À la création, l'ID Creator n'existe pas encore : on met un jeton de substitution que le
    // workflow Deluge remplace par le vrai ID avant l'envoi, puis réécrit dans Soumission_JSON.
    const dossier = {
      soumission_json: JSON.stringify(contratJSON(idSoumission || ID_SUBSTITUTION, statut)),
      statut,
      webhook_statut: statut === "Valide" ? "En_attente" : "",
      client: String(s.saisie(IN.client) ?? ""),
      no_client: String(s.saisie(IN.noClient) ?? ""),
      modele: String(s.saisie(IN.modele) ?? ""),
      no_pce: String(s.saisie(IN.noPce) ?? ""),
      quantite: toNum(s.saisie(IN.quantite)),
      facteur: toNum(s.saisie(IN.facteur)),
      montant: s.num(OUT.montant),
      total: s.num(OUT.total),
      prix_unitaire: s.num(OUT.prixUnitaire),
      donnees_json: JSON.stringify(s.entrees),
    };
    const res = idSoumission ? await majSoumission(idSoumission, dossier) : await sauvegarderSoumission(dossier);
    if (res.ok && res.id) setIdSoumission(res.id);
    setMessage(
      res.ok && idSoumission && statut === "Valide"
        ? res.message + " Envoi vers la plateforme : utilisez « Renvoyer à la plateforme » sur la soumission."
        : res.message,
    );
    return res;
  }

  /** Valide la soumission : l'enregistre puis ouvre un bon de travail (feuille FT) pré-rempli.
   *  Les cellules FT de saisie atelier partent dans Donnees_BT, le reste dans Donnees_Soum. */
  /** Point d'entrée du bouton : s'il reste une alerte, on l'affiche et on s'arrête là ;
   *  la validation réelle ne part qu'une fois la liste vide (bouton du popup). */
  function demanderValidation() {
    if (controles.some((c) => c.type !== "info")) {
      setVerification({ action: "valider" });
      return;
    }
    void validerVersBonTravail();
  }

  async function validerVersBonTravail() {
    setVerification(null);
    setMessage("Validation…");
    const soumission = await enregistrer("Valide");
    const saisieSet = new Set(CELLULES_SAISIE);
    const soum: Record<string, unknown> = {};
    const bt: Record<string, unknown> = {};
    for (const [cell, v] of Object.entries(s.entrees)) (saisieSet.has(cell) ? bt : soum)[cell] = v;
    const res = await creerBonTravail({
      plats: champsPlatsBT(s.moteur, bt as Record<string, never>, soumission.id ?? "", "Valide"),
      donnees_soum: JSON.stringify(soum),
      donnees_bt: JSON.stringify(bt),
    });
    setMessage(res.message);
  }

  // raccourcis de rendu
  const N = (cell: string, w?: number, label?: string) => (
    <CelluleNum cell={cell} value={s.saisie(cell)} onChange={s.set} width={w} label={label} />
  );
  const P = (cell: string, w?: number, label?: string) => (
    <CellulePct cell={cell} value={s.saisie(cell)} onChange={s.set} width={w} label={label} />
  );
  const T = (cell: string, w?: number, label?: string, lectureSeule?: boolean) => (
    <CelluleTexte cell={cell} value={s.saisie(cell)} onChange={s.set} width={w} label={label} lectureSeule={lectureSeule} />
  );
  const F = (cell: string, label?: string) => (
    <CelluleFlag cell={cell} value={s.saisie(cell)} onChange={s.set} label={label} />
  );
  /** Drapeau « SANS » (S!I11-14) : plus cliquable — c'est la vérification (oui/non) qui le pose.
   *  Une fois posé, on le montre et on permet de le révoquer. */
  const SANS = (cell: string, quoi: string) => {
    const actif = toNum(s.saisie(cell)) >= 1;
    return actif ? (
      <button
        type="button"
        className="sans-ok"
        title={`« Sans ${quoi} » accepté à la vérification — cliquer pour révoquer`}
        onClick={() => s.set(cell, "")}
      >
        ✓ accepté <span aria-hidden="true">✕</span>
      </button>
    ) : (
      <span className="sans-vide" title={`Se pose à la vérification si aucun ${quoi} n'est prévu`}>—</span>
    );
  };
  const HM = (key: string, label: string) => {
    const [h, m] = DECOUPE_HM[key];
    return (
      <>
        <td className="ct calccell">
          <Va cell={h} label={label + " (hrs)"}>{Math.trunc(s.num(h))}</Va>
        </td>
        <td className="ct calccell">
          <Va cell={m} label={label + " (min)"}>{minutes(s.val(m))}</Va>
        </td>
      </>
    );
  };

  /** Dernier coût d'achat du matériau choisi (Product.Last_Cost), affiché sous le coût pi².
   *  Purement indicatif : il dit d'où vient le prix et quand il a été payé. Il n'entre PAS
   *  dans le calcul — un prix d'achat est au format d'achat (feuille, rouleau) et sa
   *  conversion en $/pi² exige largeur × longueur, que Product ne porte pas encore. */
  const dernierAchat = (nom: CellValue) => {
    const a = s.params?.achatParNom?.[String(nom ?? "").trim().toLowerCase()];
    if (!a) return null;
    return (
      <div className="achat-dernier" title={"Dernier coût d'achat payé pour ce matériau" + (a.date ? ", le " + a.date : "")}>
        achat {argent(a.cout)}
        {a.date ? " · " + a.date : ""}
      </div>
    );
  };

  const ligneMat = (
    label: string,
    champ: keyof typeof CATALOGUES | null,
    cellNom: string,
    cout: string | null,
    mont: string,
    min: string | null,
  ) => (
    <tr>
      <td className="lb">{label}</td>
      <td colSpan={2}>
        {champ ? (
          <SelectMateriau
            cell={cellNom}
            value={s.saisie(cellNom)}
            onChange={s.set}
            options={catalogues[champ]}
            listId={"liste-" + champ}
            placeholder={"Rechercher un " + label.toLowerCase() + "…"}
            label={"Matériau " + label}
          />
        ) : null}
      </td>
      <td className="rt calccell">
        {cout ? <Va cell={cout} label={"Coût pi² " + label}>{nombre3(s.val(cout))}</Va> : ""}
        {dernierAchat(s.saisie(cellNom))}
      </td>
      <td className="rt calccell"><Va cell={mont} label={"Montant " + label}>{argent(s.val(mont))}</Va></td>
      <td className="ct calccell">{min ? <Va cell={min} label={"Temps débitage " + label + " (min)"}>{minutes(s.val(min))}</Va> : ""}</td>
    </tr>
  );

  return (
    <div className="app">
      {/* listes de recherche des matériaux */}
      {Object.entries(catalogues).map(([champ, noms]) => (
        <datalist id={"liste-" + champ} key={champ}>
          {noms.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      ))}
      <datalist id="liste-tout">
        {catalogueComplet.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {/* barre de marque */}
      <div className="topbar">
        <span className="logo">
          <span className="mark" />
          <span className="wm">
            <small>groupe</small>
            <b>canva</b>
          </span>
        </span>
        <span className="doc">
          Soumission — <b>Matériaux souples</b> · FT Rev.06
        </span>
        <span className="doc" title="Source des prix matières et des taux">
          {sourcePrix}
        </span>
        <span className="doc" title="Règles matériaux (formulaire Regles_Materiaux dans Creator)">
          règles : {sourceRegles}
        </span>
        <span className="doc" title="Version du widget réellement déployée dans Creator">
          build {__BUILD__}
        </span>
        <span className="sp" />
        {message && <span className="msg" role="status">{message}</span>}
        <button className="btn ghost" onClick={() => setGuideOuvert(true)}>
          Guide des paramètres
        </button>
        <button className="btn ghost" onClick={() => setAdministrationOuvert(true)}>
          Administration
        </button>
        <button className="btn ghost" onClick={ouvrirSoumissions}>
          Ouvrir
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            s.reset("vierge");
            setIdSoumission(""); // dossier neuf : le prochain enregistrement crée un enregistrement
            setMessage("");
          }}
        >
          Nouvelle soumission
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            s.reset("exemple");
            setIdSoumission("");
            setMessage("");
          }}
        >
          Exemple
        </button>
        <button
          className="btn ghost"
          title={
            prixValide
              ? "Aperçu du document client : logo, quantités, prix, conditions — téléchargeable en PDF ou envoyable par courriel"
              : "Prix non validé : " + raisonPrix
          }
          disabled={!prixValide}
          onClick={() => setPropositionOuverte(true)}
        >
          Proposition client
        </button>
        <button className="btn ghost" title="Imprime la fiche de soumission complète (usage interne)" onClick={() => window.print()}>
          Imprimer la fiche
        </button>
        <button
          className={"btn ghost" + (controles.some((c) => c.type !== "info") ? " alerte" : "")}
          title="Passe en revue les alertes (matériaux, format, prix à zéro) sans enregistrer"
          onClick={() => setVerification({ action: null })}
        >
          Vérifier{controles.length ? ` (${controles.length})` : ""}
        </button>
        <button className="btn solid" onClick={() => void enregistrer()}>
          Enregistrer
        </button>
        <button
          className="btn solid"
          title="Vérifie la soumission, l'enregistre puis crée le bon de travail (feuille FT) pré-rempli"
          onClick={demanderValidation}
        >
          Valider → Bon de travail
        </button>
      </div>

      {guideOuvert && <PopupGuide onClose={() => setGuideOuvert(false)} />}
      {propositionOuverte && (
        <PopupProposition
          infos={infosProposition}
          lignes={lignesProposition}
          libre={s.saisie}
          setLibre={s.set}
          onClose={() => setPropositionOuverte(false)}
        />
      )}
      {verification && (
        <PopupVerification
          controles={controles}
          action={verification.action === "valider" ? "Valider → Bon de travail" : undefined}
          onAccepter={(drapeau) => s.set(drapeau, 1)}
          onRefuser={(c) => {
            setVerification(null);
            setMessage(c.type === "confirmation" ? c.conseil + " Puis relancez la validation." : c.message);
          }}
          onAction={verification.action === "valider" ? () => void validerVersBonTravail() : undefined}
          onClose={() => setVerification(null)}
        />
      )}
      {soumissionsOuvert && (
        <PopupSoumissions
          soumissions={soumissions}
          chargement={soumissionsChargement}
          onOuvrir={(sr) => {
            const ok = s.chargerDonnees(sr.donnees);
            // on reprend SON identité : réenregistrer met à jour cette soumission-là
            setIdSoumission(ok ? sr.id : "");
            setSoumissionsOuvert(false);
            setMessage(
              ok
                ? "Soumission « " + (sr.client || sr.noPce || sr.id) + " » ouverte — modifiez puis Enregistrer pour créer une nouvelle version."
                : "Impossible d'ouvrir cette soumission (données absentes ou format inattendu).",
            );
          }}
          onSupprimee={(id) => setSoumissions((prev) => (prev ? prev.filter((x) => x.id !== id) : prev))}
          onClose={() => setSoumissionsOuvert(false)}
        />
      )}
      {administrationOuvert && (
        <PopupAdministration
          base={parametresBase}
          fournitures={fournitures}
          transport={transportParams}
          amortissements={amortissements}
          taux={tauxCreator}
          machines={machines}
          isZoho={isZohoEnv()}
          // Deux copies existent : `machines` alimente l'affichage de l'Administration, et
          // `s.machinesCalc` (via setMachinesCreator) alimente le MOTEUR. Ne mettre à jour que
          // la première laissait le calcul figé jusqu'à la réouverture du widget.
          onMachinesChange={(m) => {
            setMachines(m);
            s.setMachinesCreator(m);
          }}
          // un taux répercuté doit agir sur la soumission ouverte immédiatement : les
          // surcharges `params` ne sont construites qu'au chargement, on passe donc par
          // l'override qui a la priorité sur elles.
          onTauxApplique={(cellule, valeur) => s.appliquerOverrideTaux(cellule, valeur)}
          onClose={() => setAdministrationOuvert(false)}
        />
      )}

      <div className="sheet num">
        <div className="titlebar">
          <h1>
            FT_Soumission <span>Matériaux Souples</span>
          </h1>
          <span className="hint">Survolez un chiffre gris pour voir comment il est calculé</span>
          <span className="rev">Janvier 2010 Rev.06</span>
        </div>

        <div className="cols">
          {/* ══════ COLONNE GAUCHE ══════ */}
          <div className="leftcol">
            {/* paramètres */}
            <div className="carte">
            <table className="blk w100">
              <tbody>
                <tr>
                  <td className="lb" style={{ width: 175 }}>Quantité</td>
                  <td className="ct" style={{ width: 120 }}>{N(IN.quantite, 68, "Quantité")}</td>
                  <td className="ct" colSpan={3}>{P(IN.perte, 56, "Perte")}</td>
                </tr>
                <tr>
                  <td className="lb">Couleurs visibles</td>
                  <td className="ct">{N(IN.couleursVisibles, 68, "Couleurs visibles")}</td>
                  <td className="n" colSpan={3}></td>
                </tr>
                {/* F/S (S!B4/D4/F4) retirés de l'interface (réunion du 13 août) : ils valent 1/1/1
                    par défaut — S!W14 met le prix unitaire à zéro tant que B4+D4+F4 < 3. */}
                <tr>
                  <td className="lb">Nombre de Up</td>
                  <td className="ct">{N(IN.nbUp, 68, "Nombre de Up")}</td>
                  <td className="n" colSpan={3}></td>
                </tr>
                <tr>
                  <td className="lb">Dim. <b>Mrx</b> pouces</td>
                  <td className="ct" style={{ width: 120 }}>{N(IN.dimMrxX, 68, "Dim. matrice X")}</td>
                  <td className="ct noborder" style={{ width: 22 }}>x</td>
                  <td className="ct" style={{ width: 104 }}>{N(IN.dimMrxY, 68, "Dim. matrice Y")}</td>
                  <td className="n"></td>
                </tr>
              </tbody>
            </table>
            </div>

            {/* SÉRIGRAPHIE */}
            <div className="carte">
            <table className="blk w100">
              <tbody>
                <tr>
                  <td className="hd" colSpan={3}>Sérigraphie</td>
                  <td className="n"></td>
                  <td className="hd" colSpan={2}>Nb.Mrx</td>
                </tr>
                <tr>
                  <td className="lb" style={{ width: 175 }}>Séparateur</td>
                  <td className="ct" style={{ width: 68 }}>{N(IN.separateur1, 52)}</td>
                  <td className="ct" style={{ width: 68 }}>{N(IN.separateur2, 52)}</td>
                  <td className="n"></td>
                  <td className="ct calccell bold" colSpan={2}>
                    <Va cell={OUT.nbMrxExact} label="Nb. matrices (arrondi au plein)">{Math.ceil(s.num(OUT.nbMrxExact))}</Va>
                  </td>
                </tr>
                {/* Le sélecteur de presse et sa ligne d'info occupent toute la largeur du bloc :
                    logés dans les colonnes étroites du gabarit Excel (68 px), ils débordaient la
                    carte et se faisaient rogner silencieusement (.carte overflow). */}
                <tr>
                  <td className="lb">Presse</td>
                  <td colSpan={5}>{selectMachine(CELL_PRESSE, "presse", "Presse générique (classeur)", "Presse sérigraphie")}</td>
                </tr>
                <tr>
                  <td className="machine-info" colSpan={6}>
                    {presse
                      ? (presse.largeurPo && presse.hauteurPo ? `feuille max ${presse.largeurPo}×${presse.hauteurPo} po · ` : "") +
                        `${presse.vitesse ?? "—"} ${presse.uniteVitesse || "fle/h"}` +
                        (presse.unePasseToutesCouleurs ? ` → ${cadencePresseJob} passes/h (${couleursJob} coul.)` : " = passes/h") +
                        ` · roulement ${nombre2(tauxApplique)} $/h` +
                        // le machine rate CG n'entre pas dans le coût en mode temps : on le signale
                        (METHODE_COUT === "temps" && presse.taux ? ` (rate CG ${nombre2(presse.taux)} $/h non appliqué)` : "")
                      : `roulement classeur — 250 passes/h (mode 1 à 6 coul. : 225 fle/h) · ${nombre2(tauxApplique)} $/h`}
                  </td>
                </tr>
                {presse && presse.setup > 0 && (
                  <tr>
                    <td className="machine-info" colSpan={6}>
                      mise en train de la fiche : {presse.setup} min — <b>indicatif, non appliqué</b>. Le classeur
                      décompose la préparation (gabarit {prepClasseur.libelle}) : montage soie {prepClasseur.montage} min
                      par écran · nettoyage {prepClasseur.nettoyage} min par écran
                      {prepClasseur.setupCoul > 0 ? ` · set-up ${prepClasseur.coul} couleurs ${prepClasseur.setupCoul} min` : ""}.
                    </td>
                  </tr>
                )}
                {presseSansVitesse && (
                  <tr>
                    <td className="machine-warn" colSpan={6}>
                      ⚠ Vitesse manquante ou non numérique pour {presse!.nom} — cadence classeur 250 passes/h utilisée. À compléter dans Administration → Configuration machines.
                    </td>
                  </tr>
                )}
                {/* en mode temps le machine rate n'est pas utilisé : son absence n'est pas un défaut */}
                {METHODE_COUT !== "temps" && presse && presse.taux === null && (
                  <tr>
                    <td className="machine-warn" colSpan={6}>
                      ⚠ Machine rate manquant pour {presse.nom} — taux base {nombre2(tauxApplique)} $/h utilisé. À compléter dans Administration → Configuration machines.
                    </td>
                  </tr>
                )}
                {avertFormat("feuille-presse", 6)}
                <tr>
                  <td className="lb">Passe Additionnel</td>
                  <td className="ct">{N(IN.passeAdd1, 52)}</td>
                  <td className="ct">{N(IN.passeAdd2, 52)}</td>
                  <td className="ctv" rowSpan={5}><span className="vert">S<br />A<br />N<br />S</span></td>
                  <td className="g ct" colSpan={2}>Adhésif {SANS(IN.sansAdhesif, "adhésif")}</td>
                </tr>
                <tr>
                  <td className="lb">Ajust. Additionnel</td>
                  <td className="ct">{N(IN.ajustAdd, 52)}</td>
                  <td className="ct"></td>
                  <td className="g ct" colSpan={2}>Matériau {SANS(IN.sansMateriau, "matériau")}</td>
                </tr>
                <tr>
                  <td className="lb">Nettoyage Add.</td>
                  <td className="ct">{N(IN.nettoyage1, 52)}</td>
                  <td className="ct">{N(IN.nettoyage2, 52)}</td>
                  <td className="g ct" colSpan={2}>Coupe {SANS(IN.sansCoupe, "coupe")}</td>
                </tr>
                <tr>
                  <td className="lb">Recto / Verso</td>
                  <td className="ct">{N(IN.rectoVerso1, 52)}</td>
                  <td className="ct">{N(IN.rectoVerso2, 52)}</td>
                  <td className="g ct" colSpan={2}>Encre {SANS(IN.sansEncre, "encre")}</td>
                </tr>
                <tr>
                  <td className="g bold">ENCRES</td>
                  <td className="ct" colSpan={2}>{P(IN.encres, 56, "Encres")}</td>
                  <td className="g ct" colSpan={2}>Vinyle {F(IN.sansUv, "Sans vinyle / UV")}</td>
                </tr>
                <tr>
                  <td className="bl ct"><Va cell="S!A15" label="UV recto (auto)">{String(s.val("S!A15"))}</Va></td>
                  <td className="ct">UV</td>
                  <td className="bl ct"><Va cell="S!E15" label="UV verso (auto)">{String(s.val("S!E15"))}</Va></td>
                  <td className="n"></td>
                  <td className="hd" colSpan={2}>Temps Impression</td>
                </tr>
                <tr>
                  <td className="lb" colSpan={3}></td>
                  <td className="n"></td>
                  <td className="ct calccell" colSpan={2}>
                    <Va cell={OUT.tempsImprHrs} label="Temps impression (hrs)"><b>{Math.trunc(s.num(OUT.tempsImprHrs))}</b></Va> hrs{" "}
                    <Va cell={OUT.tempsImprMin} label="Temps impression (min)"><b>{minutes(s.val(OUT.tempsImprMin))}</b></Va> min.
                  </td>
                </tr>
                <tr>
                  <td className="lb">HPPL</td>
                  <td className="ct">{N(IN.hppl, 52, "HPPL")}</td>
                  <td></td>
                  <td className="n"></td>
                  <td className="lb ct">Ajust. Impr.</td>
                  <td className="ct">{P(IN.ajustImpr, 56, "Ajustement impression")}</td>
                </tr>
                <tr>
                  <td className="ct">{P(IN.texture, 56, "Texture")}</td>
                  <td className="ct">Texture</td>
                  <td className="ct calccell"><Va cell="S!E18" label="Texture (auto)">{String(s.val("S!E18"))}</Va></td>
                  <td className="n" colSpan={3}></td>
                </tr>
                <tr>
                  <td className="lb" colSpan={2}>Argent Clavier (gr)</td>
                  <td className="ct">{N(IN.argentClavier, 68, "Argent clavier (gr)")}</td>
                  <td className="n" colSpan={3}></td>
                </tr>
              </tbody>
            </table>
            </div>

            {/* DÉCOUPE */}
            <div className="carte">
            <table className="blk w100">
              <tbody>
                <tr>
                  <td className="hd" colSpan={3}>Découpe</td>
                  <td className="ct bold" style={{ width: 48 }}>hrs</td>
                  <td className="ct bold" style={{ width: 48 }}>min.</td>
                </tr>
                {/* Le 5e élément insère le sélecteur de machine qui pilote le GROUPE d'opérations
                    commençant à cette ligne (finition matière — même patron que presse/zund/platine). */}
                {(
                  [
                    ["Adhésif Laminé", IN.adhesifLamine, null, "adhesifLamine", "laminoir"],
                    ["Adhésif Régistre", IN.adhesifRegistre, null, "adhesifRegistre", null],
                    ["Over Laminating", IN.overLaminating, IN.overLaminatingB, "overLaminating", null],
                    ["Prémask Std", IN.premaskStd, null, "premaskStd", null],
                    ["Protecteur", IN.protecteur, null, "protecteur", null],
                    ["Protecteur Fenêtre", IN.protecteurFenetre, IN.protecteurFenetreB, "protecteurFenetre", null],
                    ["Slit", IN.slit, null, "slit", "slitter"],
                    ["Guillotine", IN.guillotineQte, IN.guillotineTaux, "guillotine", "guillotine"],
                    ["Assemblage", IN.assemblageQte, IN.assemblageTaux, "assemblage", null],
                    ["Autres", IN.autresDecoupeQte, IN.autresDecoupeTaux, "autresDecoupe", null],
                  ] as [string, string, string | null, string, FamilleFinition | null][]
                ).map(([label, c1, c2, hm, famille]) => (
                  <Fragment key={label}>
                    {famille && !MACHINES_MASQUEES.has(famille) && ligneMachineFinition(famille)}
                    <tr>
                      <td className="lb" colSpan={c2 ? 1 : 2}>{label}</td>
                      {c2 ? <td className="ct">{N(c2, 52, label + " (taux)")}</td> : null}
                      <td className="ct">{N(c1, 52, label)}</td>
                      {HM(hm, label)}
                    </tr>
                    {/* §7 — la ligne posée automatiquement d'après la forme de l'adhésif choisi */}
                    {adhesifDeduit && adhesifDeduit.cellule === c1 && (
                      <tr>
                        <td className="machine-info" colSpan={5}>
                          activé automatiquement — adhésif en {adhesifDeduit.forme} ({adhesifDeduit.indice}
                          {adhesifDeduit.source === "nom" ? ", déduit du nom" : ", fiche matériau"}). Décochez pour l'annuler.
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            </div>

            {/* PLATINE */}
            <div className="carte">
            <table className="blk w100">
              <tbody>
                <tr>
                  <td className="hd" style={{ width: 140 }}>Platine</td>
                  <td className="ct bold" style={{ width: 54 }}>Die</td>
                  <td className="ct bold" style={{ width: 54 }}>Up</td>
                  <td className="n" style={{ width: 54 }}></td>
                  <td className="ct" style={{ width: 48 }}></td>
                  <td className="ct" style={{ width: 48 }}></td>
                </tr>
                {/* Sélecteur de machine platine masqué (Artistic, 26 oct. 2026) — voir
                    MACHINES_MASQUEES. La cellule reste alimentée par le classeur. */}
                {avertFormat("feuille-platine", 6)}
                {(
                  [
                    ["Adhésif", IN.platAdhesifDie, IN.platAdhesifUp, "platAdhesif"],
                    ["Coupe", IN.platCoupeDie, IN.platCoupeUp, "platCoupe"],
                    ["Kiss-cut", IN.platKisscutDie, IN.platKisscutUp, "platKisscut"],
                    ["Embossage", IN.platEmbossageDie, IN.platEmbossageUp, "platEmbossage"],
                  ] as [string, string, string, string][]
                ).map(([label, die, up, hm]) => (
                  <tr key={label}>
                    <td className="lb">{label}</td>
                    {/* kiss-cut : C!Q8/J9 exigent D35 = 1 → interrupteur ; les autres « Die » sont
                        un nombre de matrices (N mises en train + N passes) et restent numériques */}
                    <td className="ct">{die === IN.platKisscutDie ? F(die, "Platine kiss-cut (activer)") : N(die, 52, "Platine " + label + " (nb de matrices)")}</td>
                    <td className="ct">{N(up, 52, "Platine " + label + " (up)")}</td>
                    <td className="n"></td>
                    {HM(hm, "Platine " + label)}
                  </tr>
                ))}
                <tr>
                  <td className="lb">Matrice job $</td>
                  <td className="ct">{N(CELL_MATRICE, 56, "Coût matrice du job ($) — vide = coûts classeur par type de die")}</td>
                  <td className="machine-info" colSpan={4}>vide = coûts classeur par die (7,50 / 9,37 / 15,37 / 5,00 $)</td>
                </tr>
                <tr>
                  <td className="lb">Ajust. Platine</td>
                  <td className="ct">{P(IN.ajustPlatine, 56, "Ajustement platine")}</td>
                  <td className="n"></td>
                  <td className="ct bold">Total</td>
                  {HM("platTotal", "Total platine")}
                </tr>
              </tbody>
            </table>
            </div>

            {/* ZUND */}
            <div className="carte">
            <table className="blk w100">
              <tbody>
                <tr>
                  <td className="hd" style={{ width: 140 }}>Zund</td>
                  <td className="ct bold" style={{ width: 54 }}>Cont.</td>
                  <td className="ct bold" style={{ width: 54 }}>Cut O</td>
                  <td className="n" style={{ width: 54 }}></td>
                  <td className="ct" style={{ width: 48 }}></td>
                  <td className="ct" style={{ width: 48 }}></td>
                </tr>
                <tr>
                  <td className="lb">Machine</td>
                  <td colSpan={5}>{selectMachine(CELL_ZUND, "zund", "Zund générique (classeur, 280 po-lin/min)", "Machine Zund")}</td>
                </tr>
                {avertFormat("feuille-Zund", 6)}
                {(
                  [
                    ["Adhésif", IN.zundAdhesifC, IN.zundAdhesifO, "zundAdhesif"],
                    ["Coupe", IN.zundCoupeC, IN.zundCoupeO, "zundCoupe"],
                    ["Kiss-cut", IN.zundKisscutC, IN.zundKisscutO, "zundKisscut"],
                  ] as [string, string, string, string][]
                ).map(([label, c, o, hm]) => (
                  <tr key={label}>
                    <td className="lb">{label}</td>
                    {/* Cont. est un interrupteur (C!Q10 multiplie la mise en train par D39+D40+D41,
                        X33-35 exigent = 1) ; Cut O reste un nombre de découpes intérieures par feuille */}
                    <td className="ct">{F(c, "Zund " + label + " contour (activer)")}</td>
                    <td className="ct">{N(o, 52, "Zund " + label + " (nb de cut-outs par feuille)")}</td>
                    <td className="n"></td>
                    {HM(hm, "Zund " + label)}
                  </tr>
                ))}
                <tr>
                  <td className="lb">Ajust. Zund</td>
                  <td className="ct">{P(IN.ajustZund, 56, "Ajustement Zund")}</td>
                  <td className="n"></td>
                  <td className="ct bold">Total</td>
                  {HM("zundTotal", "Total Zund")}
                </tr>
              </tbody>
            </table>
            </div>

            {/* comparatif découpe : Zund vs Platine — même moteur, même méthode de coût que le récap */}
            <div className="carte comparatif">
              <div className="cmp-titre">
                Zund ou platine ?
                <span>
                  set-up découpe + découpe/numérique du récap, recalculés par le moteur pour chaque famille
                  {comparatif ? ` — ${comparatif.operations.join(" + ")}` : ""}
                </span>
              </div>
              {comparatif && (comparatif.zund || comparatif.platine) ? (
                <>
                  <div className="cmp-lignes">
                    <div className={"cmp-box" + (comparatif.zund && (!comparatif.platine || comparatif.zund.total <= comparatif.platine.total) ? " gagnant" : "")}>
                      <b>Numérique (Zund)</b>
                      {comparatif.zund ? (
                        <span title={`set-up ${argent(comparatif.zund.setup)} + découpe ${argent(comparatif.zund.decoupe)}`}>
                          {comparatif.zund.machine ? comparatif.zund.machine.nom : "Zund générique (classeur)"}
                          {comparatif.zund.selectionnee ? " (sélectionnée)" : ""} — {argent(comparatif.zund.total)} · {minutes(comparatif.zund.minutes)} min
                        </span>
                      ) : (
                        <span>aucune machine active</span>
                      )}
                    </div>
                    <div className={"cmp-box" + (comparatif.platine && (!comparatif.zund || comparatif.platine.total < comparatif.zund.total) ? " gagnant" : "")}>
                      <b>Platine (die-cut)</b>
                      {comparatif.platine ? (
                        <span title={`set-up + matrice ${argent(comparatif.platine.setup)} + découpe ${argent(comparatif.platine.decoupe)}`}>
                          {comparatif.platine.machine ? comparatif.platine.machine.nom : "Platine générique (classeur)"}
                          {comparatif.platine.selectionnee ? " (sélectionnée)" : ""} — {argent(comparatif.platine.total)} · {minutes(comparatif.platine.minutes)} min
                        </span>
                      ) : (
                        <span>aucune machine active</span>
                      )}
                    </div>
                  </div>
                  <div className="cmp-pied">
                    <span className="cmp-matrice">
                      matrice job : <b>{matriceJob ? argent(matriceJob) : "coûts classeur"}</b> (champ « Matrice job $ » du bloc Platine)
                    </span>
                    <span className="cmp-verdict">
                      {comparatif.zund && comparatif.platine
                        ? comparatif.bascule
                          ? `bascule ≈ ${comparatif.bascule} pcs : en-dessous ${comparatif.zund.total <= comparatif.platine.total ? "le Zund" : "la platine"} gagne, au-dessus l'autre`
                          : "un type domine à toutes les quantités (vérifiez le coût de matrice)"
                        : "activez au moins une machine de chaque famille pour comparer"}
                    </span>
                  </div>
                  {embossageActif && (
                    <div className="machine-warn">⚠ Embossage demandé — seule une platine est éligible (le Zund ne fait pas d'embossage).</div>
                  )}
                </>
              ) : (
                <div className="cmp-vide">Renseignez la quantité et activez une machine Zund ou platine pour comparer les deux familles.</div>
              )}
            </div>

            {/* finition */}
            <div className="carte">
            <table className="blk w100">
              <tbody>
                {/* §5 — Décorticage / Vérification / Emballage sont des interrupteurs dans le
                    classeur (C!Q77-82 : la « qté » vaut 1 ou rien) ; le nombre à droite est le
                    temps estimé par pièce, qui reste saisissable. Coins ronds retiré (plus
                    utilisé) — sa cellule est remise à zéro par normaliserEntrees(). */}
                <tr>
                  <td className="lb" style={{ width: 175 }}>Décorticage</td>
                  <td className="ct">{F(IN.decorticageQte, "Décorticage (activer)")}</td>
                  <td className="ct">{N(IN.decorticageTaux, 52, "Décorticage — temps estimé par pièce")}</td>
                  {HM("decorticage", "Décorticage")}
                </tr>
                <tr>
                  <td className="lb">Impression Laser</td>
                  <td className="ct">{N(IN.laserQte, 52, "Impression laser (qté)")}</td>
                  <td className="ct">{P(IN.laserAjust, 56, "Impression laser (ajust)")}</td>
                  {HM("laser", "Impression laser")}
                </tr>
                <tr>
                  <td className="lb">{T(IN.autres1Label, 90, "Autres 1 (libellé)")}</td>
                  <td className="ct">{N(IN.autres1A, 52)}</td>
                  <td className="ct">{N(IN.autres1B, 52)}</td>
                  {HM("autres1", "Autres 1")}
                </tr>
                <tr>
                  <td className="lb">{T(IN.autres2Label, 90, "Autres 2 (libellé)")}</td>
                  <td className="ct">{N(IN.autres2A, 52)}</td>
                  <td className="ct">{N(IN.autres2B, 52)}</td>
                  {HM("autres2", "Autres 2")}
                </tr>
                <tr>
                  <td className="lb">Vérifi. / Comptage</td>
                  <td className="ct">{F(IN.verifQte, "Vérification / comptage (activer)")}</td>
                  <td className="ct">{N(IN.verifTaux, 52, "Vérification — temps estimé par pièce")}</td>
                  {HM("verif", "Vérification / comptage")}
                </tr>
                <tr>
                  <td className="lb">Emballage</td>
                  <td className="ct">{F(IN.emballageQte, "Emballage (activer)")}</td>
                  <td className="ct">{N(IN.emballageTaux, 52, "Emballage — temps estimé par pièce")}</td>
                  {HM("emballage", "Emballage")}
                </tr>
              </tbody>
            </table>
            </div>

            {/* transport */}
            <div className="carte">
            <table className="blk w100">
              <tbody>
                <tr>
                  <td className="lb" style={{ width: 175 }}>Transport</td>
                  <td className="ct">{N(IN.transport, 88, "Transport ($)")}</td>
                </tr>
                <tr>
                  <td className="lb">Autres Frais</td>
                  <td className="ct">{N(IN.autresFrais, 88, "Autres frais ($)")}</td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>

          {/* ══════ ZONE DROITE ══════ */}
          <div className="rightarea">
            <div className="toprow">
              <div className="midcol">
                <div className="redtx">
                  *Toutes les textures sur lexan sont des couleurs
                  <br />
                  visibles voir (Q22). Encre HPPL aussi voir (E17)
                </div>
                <table>
                  <tbody>
                    <tr>
                      <td className="g ct bold" style={{ width: 150 }}>MULTIPRINT</td>
                      <td className="ct">{F(IN.multiprint, "Mode Multiprint")}</td>
                    </tr>
                    <tr>
                      <td className="ct">NUMÉRIQUE Multi-up</td>
                      <td className="ct">{F(IN.numeriqueMultiUp, "Mode numérique multi-up")}</td>
                    </tr>
                  </tbody>
                </table>
                {/* QTÉ / PRIX / VENDU / US */}
                <div className="carte">
                <table className="blk w100">
                  <tbody>
                    <tr>
                      <td className="hd" style={{ width: 130 }}>Qté</td>
                      <td className="hd">Prix</td>
                      <td className="hd">Vendu</td>
                      <td className="hd" style={{ width: 70 }}>US</td>
                      <td className="hd" style={{ width: 110 }}>Contrat</td>
                    </tr>
                    {/* chaque ligne est un scénario : ● l'active pilote la soumission (corr. 5) */}
                    {qteCells.map((cell, i) => (
                      <tr key={cell} className={cell === ligneActive ? "scenario actif" : "scenario"}>
                        <td className="ct qtecell">
                          <button
                            type="button"
                            className="qte-sel"
                            aria-pressed={cell === ligneActive}
                            disabled={!toNum(s.saisie(cell))}
                            title={cell === ligneActive ? "Scénario actif : c'est cette quantité que la soumission calcule" : "Activer ce scénario : cette quantité et ce vendu passent dans la soumission"}
                            aria-label={cell === ligneActive ? "Scénario actif" : "Activer ce scénario"}
                            onClick={() => activerLigne(cell)}
                          >
                            {cell === ligneActive ? "●" : "○"}
                          </button>
                          <CelluleNum cell={cell} value={s.saisie(cell)} onChange={setQteLigne(cell)} width={56} label="Quantité du scénario" />
                          {cell.startsWith("X!") && (
                            <button
                              type="button"
                              className="suppr-ligne"
                              title={cell === ligneActive ? "Scénario actif — changez d'abord de quantité" : "Retirer cette quantité"}
                              aria-label="Retirer cette quantité"
                              disabled={cell === ligneActive}
                              onClick={() => retirerLigneQte(cell)}
                            >
                              ✕
                            </button>
                          )}
                        </td>
                        <td className="rt calccell" title={simulations[i]?.qte ? "Coût unitaire — recalcul complet avec Qté = " + simulations[i].qte : ""}>
                          {simulations[i]?.qte ? masque(nombre2(simulations[i].prix), true) : ""}
                        </td>
                        {/* prix vendu : décidé par le chargé de projet, jamais recalculé ; vide = suggestion
                            du moteur en grisé (prix vendant unitaire pour cette quantité) */}
                        <td className="ct venducell" title={simulations[i]?.qte ? "Prix vendu unitaire (saisie libre) — suggestion : " + nombre2(simulations[i].vendu) : ""}>
                          {simulations[i]?.qte
                            ? masque(
                                <CelluleNum
                                  cell={cellVendu(cell)}
                                  value={s.saisie(cellVendu(cell))}
                                  onChange={setVenduLigne(cell)}
                                  width={72}
                                  label={"Prix vendu unitaire pour " + simulations[i].qte}
                                  placeholder={nombre2(simulations[i].vendu)}
                                />,
                                true,
                              )
                            : ""}
                        </td>
                        <td className="rt calccell">
                          {simulations[i]?.qte && simulations[i].us ? masque(nombre2(simulations[i].us), true) : ""}
                        </td>
                        {/* Contrat : texte libre, une valeur par quantité (Artistic, 26 oct. 2026).
                            Aucune formule ne la lit ; elle voyage avec la soumission comme les
                            autres pseudo-cellules X!, donc elle est sauvegardée et relue. */}
                        <td className="ct">
                          <CelluleTexte
                            cell={cellContrat(cell)}
                            value={s.saisie(cellContrat(cell))}
                            onChange={s.set}
                            width={100}
                            label="Référence de contrat pour cette quantité"
                          />
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={5} className="ajout-qte-cell">
                        <button type="button" className="ajout-qte" onClick={ajouterLigneQte} disabled={qteCells.length >= 10}>
                          + Ajouter une quantité
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>

              <div className="clientcol">
                <div className="carte">
                <table className="blk w100">
                  <tbody>
                    <tr>
                      <td className="lb" style={{ width: 105 }}>No.Client</td>
                      <td colSpan={4}>{T(IN.noClient, undefined, "No. client")}</td>
                    </tr>
                    <tr>
                      <td className="lb">Client</td>
                      <td colSpan={4}>{T(IN.client, undefined, "Client")}</td>
                    </tr>
                    <tr>
                      <td className="lb">Modèle</td>
                      <td colSpan={4}>{T(IN.modele, undefined, "Modèle")}</td>
                    </tr>
                    <tr>
                      <td className="lb">No.pce</td>
                      <td colSpan={4}>{T(IN.noPce, undefined, "No. pièce")}</td>
                    </tr>
                    <tr>
                      <td className="lb">Autre</td>
                      <td colSpan={4}>{T(IN.autre)}</td>
                    </tr>
                    <tr>
                      <td className="lb">Dim. Pce</td>
                      <td className="ct">{N(IN.dimPceX, 68, "Dim. pièce X")}</td>
                      <td className="ct noborder" style={{ width: 16 }}>x</td>
                      <td className="ct">{N(IN.dimPceY, 68, "Dim. pièce Y")}</td>
                      <td className="ct noborder">po.</td>
                    </tr>
                    <tr>
                      <td className="lb ct">M-</td>
                      <td>{T(IN.codeM, 52, "Numéro M (rempli par le bon de travail)", true)}</td>
                      <td className="ct noborder">R</td>
                      <td colSpan={2}>{T(IN.codeR, 52)}</td>
                    </tr>
                    <tr>
                      <td className="lb ct">E-</td>
                      <td>{T(IN.codeE, 52, "Numéro d'expédition (rempli par le bon de travail)", true)}</td>
                      <td className="ct noborder">S-</td>
                      <td>{T(IN.codeS, 52)}</td>
                      <td className="ct">{T(IN.codeRB, 52)}</td>
                    </tr>
                    <tr>
                      <td className="lb">Date</td>
                      <td colSpan={4}>
                        <CelluleDate cell={IN.date} value={s.saisie(IN.date)} onChange={s.set} label="Date de la soumission" />
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>

                {/* bloc prix vedette */}
                {/* La colonne latérale (Valeur / $Cda / vs / taux US) fait partie de la MÊME table
                    que la carte prix : en table séparée, ses 4 lignes ne pouvaient pas s'aligner
                    sur les 5 lignes du prix et le bloc se lisait comme un fragment détaché. */}
                <div className="carte carte-prix pricewrap">
                  <table className="pricecard w100">
                    <tbody>
                      {/* Montant et Total : masqués le 16 sept., RÉAFFICHÉS le 28 (décision
                          inversée par Christian — visibles pour tout le monde, §3). */}
                      <tr>
                        <td className="lb" style={{ width: 96 }}>Montant</td>
                        <td className="rt bold">{masque(<Va cell={OUT.montant} label="Montant (coût de revient)">{argent(s.val(OUT.montant))}</Va>)}</td>
                        <td className="ct bold sidecol" style={{ width: 58 }}>Valeur</td>
                      </tr>
                      <tr>
                        <td className="lb">Facteur</td>
                        <td className="ct dark">{P(IN.facteur, 56, "Facteur (marge)")}</td>
                        <td className="ct sidecol">$Cda</td>
                      </tr>
                      <tr>
                        <td className="lb">Total</td>
                        <td className="rt big">{masque(<Va cell={OUT.total} label="Total (prix vendant)">{argent(s.val(OUT.total))}</Va>)}</td>
                        <td className="ct sidecol"></td>
                      </tr>
                      <tr>
                        <td className="lb">Prix Unitaire</td>
                        <td className="rt bold">{masque(<Va cell={OUT.prixUnitaire} label="Prix unitaire">{nombre2(s.val(OUT.prixUnitaire))}</Va>)}</td>
                        <td className="ct sidecol"></td>
                      </tr>
                      <tr>
                        <td className="lb">Prix vendu</td>
                        <td className="rt big venducell" title={"Prix vendu unitaire, décidé par le chargé de projet — suggestion : " + nombre2(s.val(OUT.prixUnitaire))}>
                          {masque(
                            <CelluleNum
                              cell={CELL_VENDU}
                              value={s.saisie(CELL_VENDU)}
                              onChange={setVenduPrincipal}
                              label="Prix vendu unitaire (saisie libre)"
                              placeholder={nombre2(s.val(OUT.prixUnitaire))}
                            />,
                          )}
                        </td>
                        <td className="ct or sidecol">vs</td>
                      </tr>
                      <tr>
                        {/* §8 — 2 décimales arrondies (1,57 $), plus 3 */}
                        <td className="lb">
                          Prix Unit.Us{" "}
                          {/* Cochée : le taux vient de Taux_Change (cascade jour → semaine →
                              mois → standard) au lieu d'être tapé à la main. Décochée : le
                              taux est effacé, donc plus aucun montant US nulle part. */}
                          <CelluleFlag
                            cell={CELL_TAUX_INV}
                            value={s.saisie(CELL_TAUX_INV)}
                            onChange={basculerTauxInventaire}
                            label={
                              tauxInv
                                ? `Utiliser le taux de l'inventaire (${LIBELLE_NIVEAU[tauxInv.niveau]} : ${tauxInv.taux})`
                                : "Aucun taux paramétré dans Taux_Change"
                            }
                          />
                        </td>
                        <td className="rt">
                          {toNum(s.saisie(IN.tauxUs))
                            ? masque(<Va cell={OUT.prixUnitaireUs} label="Prix unitaire US">{nombre2(s.val(OUT.prixUnitaireUs))}</Va>, true)
                            : ""}
                        </td>
                        <td
                          className="ct dark sidecol"
                          title={tauxInvActif && tauxInv ? `Taux de l'inventaire — ${LIBELLE_NIVEAU[tauxInv.niveau]}` : "Taux saisi à la main"}
                        >
                          {tauxInvActif ? <b>{s.saisie(IN.tauxUs) || "—"}</b> : N(IN.tauxUs, 52, "Taux US")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="carte">
                <table className="blk w100">
                  <tbody>
                    <tr>
                      <td className="hd">Temps Total</td>
                    </tr>
                    {/* un seul groupe centré « 5 hrs 54 min. » : réparti sur 3 cellules, la cellule
                        « hrs » absorbait 315 px et rejetait les minutes à l'autre bout du bloc */}
                    <tr>
                      <td className="ct calccell bold">
                        <Va cell={OUT.tempsTotalHrs} label="Temps total (hrs)">{Math.trunc(s.num(OUT.tempsTotalHrs))}</Va> hrs{" "}
                        <Va cell={OUT.tempsTotalMin} label="Temps total (min)">{minutes(s.val(OUT.tempsTotalMin))}</Va> min.
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>
            </div>

            {/* ══ MATÉRIAUX IMPRESSION + ADHÉSIF ══ */}
            <div className="carte">
            <table className="blk w100">
              <tbody>
                <tr>
                  <td className="ct bold" style={{ width: 60 }}>Temps</td>
                  <td className="orangeband" colSpan={2}>Matériaux&nbsp; impression&nbsp;+&nbsp;adhésif</td>
                  <td style={{ width: 150 }}><span className="inline-champ">Diff. Déc. {P(IN.diffDec, 56, "Différence découpe")}</span></td>
                  <td className="o" style={{ width: 92 }}><span className="inline-champ">Mat {P(IN.perteMat, 56, "Perte matériaux")}</span></td>
                  <td className="o" style={{ width: 92 }}><span className="inline-champ">Adh {P(IN.perteAdh, 56, "Perte adhésif")}</span></td>
                </tr>
                <tr>
                  <td className="ct calccell">
                    <Va cell="S!K22" label="Temps débitage (hrs)"><b>{Math.trunc(s.num("S!K22"))}</b></Va>&nbsp;&nbsp;
                    <Va cell="S!L22" label="Temps débitage (min)"><b>{minutes(s.val("S!L22"))}</b></Va>
                  </td>
                  <td className="ct bold" style={{ width: 120 }}>Matériau</td>
                  <td className="ct bold">Détails</td>
                  <td className="ct bold" style={{ width: 95 }}>Coût pi²</td>
                  <td className="ct bold" style={{ width: 105 }}>Mont.</td>
                  <td className="ct bold" style={{ width: 52 }}>min.</td>
                </tr>
              </tbody>
              <tbody>
                {ligneMat("Lexan", "matLexan", IN.matLexan, OUT.coutLexan, OUT.montLexan, OUT.minLexan)}
                {ligneMat("Vinyle", "matVinyle", IN.matVinyle, OUT.coutVinyle, OUT.montVinyle, OUT.minVinyle)}
                {ligneMat("Polyester", "matPolyester", IN.matPolyester, OUT.coutPolyester, OUT.montPolyester, OUT.minPolyester)}
                {ligneMat("Alu. Foil", "matAluFoil", IN.matAluFoil, OUT.coutAluFoil, OUT.montAluFoil, OUT.minAluFoil)}
                {ligneMat("Divers", "matDivers", IN.matDivers, OUT.coutDivers, OUT.montDivers, OUT.minDivers)}
                {ligneMat("Adhésif F/R", "matAdhesif", IN.matAdhesif, OUT.coutAdhesif, OUT.montAdhesif, OUT.minAdhesif)}
                {ligneMat("Overlaminating", "matOverlam", IN.matOverlam, OUT.coutOverlam, OUT.montOverlam, null)}
                {(
                  [
                    [IN.matXtra1, IN.xtra1Cout, IN.xtra1Perte, OUT.montXtra1],
                    [IN.matXtra2, IN.xtra2Cout, IN.xtra2Perte, OUT.montXtra2],
                    [IN.matXtra3, IN.xtra3Cout, IN.xtra3Perte, OUT.montXtra3],
                    [IN.matXtra4, IN.xtra4Cout, IN.xtra4Perte, OUT.montXtra4],
                  ] as [string, string, string, string][]
                ).map(([nom, cout, perte, mont], i) => (
                  <tr key={nom}>
                    <td className="lb">
                      Xtra <span className="flagmini" />
                    </td>
                    <td colSpan={2}>
                      <span className="inline-champ">
                        <SelectMateriau
                          cell={nom}
                          value={s.saisie(nom)}
                          onChange={s.set}
                          options={catalogueComplet}
                          listId="liste-tout"
                          libre
                          // libellé court : « Choisir matériau avec/sans débitage » débordait
                          // le champ sur les écrans < 1350 px
                          placeholder={i < 2 ? "Matériau (avec débitage)…" : "Matériau (sans débitage)…"}
                          label={"Matériau Xtra " + (i + 1)}
                        />
                        <span className="dimtx">Perte</span> {P(perte, 56, "Perte Xtra")}
                      </span>
                    </td>
                    <td className="ct">{N(cout, 52, "Coût pi² Xtra (manuel)")}</td>
                    <td className="rt calccell"><Va cell={mont} label={"Montant Xtra " + (i + 1)}>{argent(s.val(mont))}</Va></td>
                    <td className="ct calccell"></td>
                  </tr>
                ))}
                <tr>
                  <td className="lb">
                    Prémask <b>{String(s.saisie(IN.premaskStd) || 0)}</b>
                  </td>
                  <td className="ct">
                    Protecteur <b>{String(s.saisie(IN.protecteur) || 0)}</b> &nbsp;&nbsp; OverLam{" "}
                    <b>{String(s.saisie(IN.overLaminating) || 0)}</b>
                  </td>
                  <td className="ct">
                    <span className="g pill">Brill. {F(IN.brillant, "Fini brillant")}</span>{" "}
                    <span className="o pill">Mat {F(IN.mat_, "Fini mat")}</span>
                  </td>
                  <td className="rt calccell" colSpan={2}>
                    <Va cell={OUT.montPremask} label="Montant Prémask / Protecteur / OverLam">{argent(s.val(OUT.montPremask))}</Va>
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
            </div>

            {/* ══ FOURNISSEUR / SOUS-CONTRAT ══ */}
            <div className="carte">
            <table className="blk w100">
              <tbody>
                <tr>
                  <td className="hd" style={{ width: 300 }}>Fournisseur</td>
                  <td className="hd" colSpan={3}>Sous-contrat</td>
                </tr>
                {(
                  [
                    [IN.fourn1, "Job", IN.sc1Cout, IN.sc1Taux, OUT.sc1Mont],
                    [IN.fourn2, "Pièces", IN.sc2Cout, IN.sc2Taux, OUT.sc2Mont],
                    [IN.fourn3, "Pièces", IN.sc3Cout, IN.sc3Taux, OUT.sc3Mont],
                    [IN.fourn4, "Pied²", IN.sc4Cout, IN.sc4Taux, OUT.sc4Mont],
                  ] as [string, string, string, string, string][]
                ).map(([fourn, base, cout, taux, mont], i) => (
                  <tr key={fourn}>
                    <td>{T(fourn, undefined, "Fournisseur " + (i + 1))}</td>
                    <td style={{ width: 180 }}>
                      <span className="inline-champ">{base} {N(cout, 68, "Coût sous-contrat (" + base + ")")}</span>
                    </td>
                    <td className="g ct" style={{ width: 80 }}>{P(taux, 56, "Majoration sous-contrat")}</td>
                    <td className="rt calccell" style={{ width: 110 }}>
                      <Va cell={mont} label={"Sous-contrat ligne " + (i + 1)}>{nombre2(s.val(mont))}</Va>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        {/* ══ RÉSUMÉ (rangée 61 du classeur) — pleine largeur ══ */}
        <div className="carte carte-resume">
        <table className="blk w100 resume">
          <tbody>
            <tr>
              <td className="hd">Mat.1ère</td>
              <td className="hd" colSpan={3}>Soies, encres, dév.</td>
              <td className="hd" colSpan={3}>Set-up découpe</td>
              <td className="hd" colSpan={3}>Sérigraphie</td>
              <td className="hd" colSpan={3}>Découpe / Numérique</td>
              <td className="hd" colSpan={3}>Divers</td>
              <td className="hd">S-Contrat</td>
            </tr>
            <tr className="soushd">
              <td className="ct bold">$</td>
              <td className="ct bold">$</td>
              <td className="ct">hrs</td>
              <td className="ct">min.</td>
              <td className="ct bold">$</td>
              <td className="ct">hrs</td>
              <td className="ct">min.</td>
              <td className="ct bold">$</td>
              <td className="ct">hrs</td>
              <td className="ct">min.</td>
              <td className="ct bold">$</td>
              <td className="ct">hrs</td>
              <td className="ct">min.</td>
              <td className="ct bold">$</td>
              <td className="ct">hrs</td>
              <td className="ct">min.</td>
              <td className="ct bold">$</td>
            </tr>
            <tr>
              <td className="rt calccell"><Va cell={OUT.cat1Mat} label="MAT. 1ère ($)">{nombre2(s.val(OUT.cat1Mat))}</Va></td>
              <td className="rt calccell"><Va cell={OUT.cat2Soies} label="Soies, encres, dév. ($)">{nombre2(s.val(OUT.cat2Soies))}</Va></td>
              <td className="ct calccell"><Va cell={OUT.cat2Hrs} label="Soies (hrs)">{Math.trunc(s.num(OUT.cat2Hrs))}</Va></td>
              <td className="ct calccell"><Va cell={OUT.cat2Min} label="Soies (min)">{minutes(s.val(OUT.cat2Min))}</Va></td>
              <td className="rt calccell"><Va cell={OUT.cat3Setup} label="Set-up découpe ($)">{nombre2(s.val(OUT.cat3Setup))}</Va></td>
              <td className="ct calccell"><Va cell={OUT.cat3Hrs} label="Set-up découpe (hrs)">{Math.trunc(s.num(OUT.cat3Hrs))}</Va></td>
              <td className="ct calccell"><Va cell={OUT.cat3Min} label="Set-up découpe (min)">{minutes(s.val(OUT.cat3Min))}</Va></td>
              <td className="rt calccell"><Va cell={OUT.cat4Seri} label="Sérigraphie ($)">{nombre2(s.val(OUT.cat4Seri))}</Va></td>
              <td className="ct calccell"><Va cell={OUT.cat4Hrs} label="Sérigraphie (hrs)">{Math.trunc(s.num(OUT.cat4Hrs))}</Va></td>
              <td className="ct calccell"><Va cell={OUT.cat4Min} label="Sérigraphie (min)">{minutes(s.val(OUT.cat4Min))}</Va></td>
              <td className="rt calccell"><Va cell={OUT.cat5Dec} label="Découpe / Numérique ($)">{nombre2(s.val(OUT.cat5Dec))}</Va></td>
              <td className="ct calccell"><Va cell={OUT.cat5Hrs} label="Découpe (hrs)">{Math.trunc(s.num(OUT.cat5Hrs))}</Va></td>
              <td className="ct calccell"><Va cell={OUT.cat5Min} label="Découpe (min)">{minutes(s.val(OUT.cat5Min))}</Va></td>
              <td className="rt calccell"><Va cell={OUT.cat6Divers} label="Divers ($)">{nombre2(s.val(OUT.cat6Divers))}</Va></td>
              <td className="ct calccell"><Va cell={OUT.cat6Hrs} label="Divers (hrs)">{Math.trunc(s.num(OUT.cat6Hrs))}</Va></td>
              <td className="ct calccell"><Va cell={OUT.cat6Min} label="Divers (min)">{minutes(s.val(OUT.cat6Min))}</Va></td>
              <td className="rt calccell"><Va cell={OUT.cat7SousContrat} label="Sous-contrat ($)">{nombre2(s.val(OUT.cat7SousContrat))}</Va></td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      <div className="legend">
        <span><i className="sw in-sw" /> saisie</span>
        <span><i className="sw calc-sw" /> calculé — survolez pour voir la formule</span>
        <span><i className="sw hd-sw" /> en-tête</span>
        <span><i className="sw flag-sw" /> indicateur (cliquer pour activer)</span>
        <span>⏎ Entrée = valider et passer au champ suivant</span>
      </div>

      {/* barre de totaux épinglée : l'essentiel reste visible en défilant */}
      <div className="totalsbar" role="status">
        <span className="tb-item">
          <span className="tb-l">Coût</span>
          {/* MASQUER_COUT : le coût de revient ne permet pas de reconstituer le prix de vente,
              mais BSP recommande de le masquer aussi pour un verrou net. En attente de Christian
              — une seule ligne à basculer. */}
          {MASQUER_COUT
            ? masque(<Va cell={OUT.montant} label="Montant (coût de revient)">{argent(s.val(OUT.montant))}</Va>, true)
            : <Va cell={OUT.montant} label="Montant (coût de revient)">{argent(s.val(OUT.montant))}</Va>}
        </span>
        <span className="tb-item">
          <span className="tb-l">Total</span>
          {masque(<Va cell={OUT.total} label="Total (prix vendant)">{argent(s.val(OUT.total))}</Va>, true)}
        </span>
        <span className="tb-item">
          <span className="tb-l">Unitaire</span>
          {masque(<Va cell={OUT.prixUnitaire} label="Prix unitaire">{nombre2(s.val(OUT.prixUnitaire))} $</Va>, true)}
        </span>
        {/* le prix vendu manuel est le héros ; tant qu'il n'est pas décidé, la suggestion du moteur en grisé */}
        <span className="tb-item tb-total">
          <span className="tb-l">Vendu</span>
          {masque(
            toNum(s.saisie(CELL_VENDU)) ? (
              <span className="va" title="Prix vendu unitaire décidé par le chargé de projet">{nombre2(s.saisie(CELL_VENDU))} $</span>
            ) : (
              <span className="va suggere" title="Aucun prix vendu saisi — suggestion : prix unitaire calculé">{nombre2(s.val(OUT.prixUnitaire))} $</span>
            ),
            true,
          )}
        </span>
        <span className="tb-item">
          <span className="tb-l">Temps</span>
          <Va cell={OUT.tempsTotalHrs} label="Temps total">
            {Math.trunc(s.num(OUT.tempsTotalHrs))} h {minutes(s.val(OUT.tempsTotalMin))}
          </Va>
        </span>
      </div>

      <InfoBulle classeur={CLASSEUR} valeur={(c) => s.val(c)} version={version} />
    </div>
  );
}
