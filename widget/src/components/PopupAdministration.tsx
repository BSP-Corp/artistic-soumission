// Popup « Administration » : tableau de bord à deux niveaux de navigation (barre latérale +
// contenu). « Paramètres standards » regroupe les champs des 4 formulaires singleton Creator
// (Parametres_Base, Fournitures_Production, Transport, Amortissements) en cartes — tous les
// champs d'un groupe sont visibles en même temps, cliquer une valeur l'édite en ligne. L'admin ne
// voit et ne modifie QUE ces formulaires lisibles — jamais les codes INV_n/CF_Valeur de
// Taux_Calcul. Certains champs (marqués `syncTaux`) sont en plus répercutés vers la ligne
// Taux_Calcul correspondante — Taux_Calcul reste le seul pont vers le moteur de calcul, l'admin ne
// le voit jamais directement (répercussion faite ici côté widget via sauvegarderTaux ; voir
// mémoire projet pour l'historique de cette décision).
import { useEchap } from "@/hooks/useEchap";
import { useMemo, useState, type ReactElement } from "react";
import type { ParametresBase, FournituresProduction, TransportParams, Amortissements, Machine, TauxCreator } from "@/services/zohoService";
import {
  sauvegarderParametresBase,
  sauvegarderFournitures,
  sauvegarderTransport,
  sauvegarderAmortissements,
  sauvegarderTaux,
  sauvegarderMachine,
  creerMachine,
  desactiverMachine,
} from "@/services/zohoService";
import {
  PARAMETRES_BASE_SNAPSHOT,
  FOURNITURES_PRODUCTION_SNAPSHOT,
  TRANSPORT_SNAPSHOT,
  AMORTISSEMENTS_SNAPSHOT,
  MACHINES_SNAPSHOT,
} from "@/data/administrationSnapshot";

// ── icônes (traits simples, cohérentes avec le reste du widget) ─────────────
type NomIcone =
  | "reglages"
  | "dollar"
  | "horloge"
  | "camion"
  | "boite"
  | "goutte"
  | "eclair"
  | "cle"
  | "imprimante"
  | "ciseaux"
  | "liste"
  | "plus";
function Icone({ nom }: { nom: NomIcone }) {
  const chemins: Record<NomIcone, ReactElement> = {
    reglages: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    ),
    dollar: (
      <>
        <path d="M12 2v20" />
        <path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
    horloge: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </>
    ),
    camion: (
      <>
        <path d="M1 8h13v9H1z" />
        <path d="M14 11h4l4 4v2h-8z" />
        <circle cx="6" cy="19.5" r="1.8" />
        <circle cx="17.5" cy="19.5" r="1.8" />
      </>
    ),
    boite: (
      <>
        <path d="M21 8 12 3 3 8l9 5 9-5Z" />
        <path d="M3 8v9l9 5 9-5V8" />
        <path d="M12 13v9" />
      </>
    ),
    goutte: (
      <>
        <path d="M12 2s6 7 6 12a6 6 0 1 1-12 0c0-5 6-12 6-12Z" />
      </>
    ),
    eclair: (
      <>
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
      </>
    ),
    cle: (
      <>
        <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L2 19v3h3l7.3-7.3a4 4 0 0 0 5.4-5.4l-2.83 2.83-2.83-.83-.83-2.83Z" />
      </>
    ),
    imprimante: (
      <>
        <path d="M6 9V3h12v6" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v7H6z" />
      </>
    ),
    ciseaux: (
      <>
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="6" cy="18" r="2.5" />
        <path d="M8.1 7.6 20 18M20 6 8.1 16.4" />
      </>
    ),
    liste: (
      <>
        <path d="M8 6h13M8 12h13M8 18h13" />
        <path d="M3 6h.01M3 12h.01M3 18h.01" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
  };
  return (
    <svg className="admin-icone" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {chemins[nom]}
    </svg>
  );
}

// ── Paramètres standards ─────────────────────────────────────────────────────
type FormKey = "base" | "fournitures" | "transport" | "amortissements";

interface ChampStd {
  formKey: FormKey;
  champ: string; // lien Creator
  label: string;
  carte: string; // titre de la carte à l'intérieur de la section
  syncTaux?: string; // code Taux_Calcul répercuté (voir en-tête de fichier)
  /** colonne de la ligne Taux_Calcul à écrire. Une ligne INV_n porte jusqu'à 3 valeurs
   *  indépendantes (CF_Valeur / CH_Cadence / CI_Temps) : la vitesse laser vit dans la
   *  CADENCE de INV_26, pas dans sa valeur (qui est le coût de nettoyage partiel petit). */
  syncColonne?: "valeur" | "cadence" | "temps";
  bool?: boolean;
}

const CHAMPS_BASE: ChampStd[] = [
  { formKey: "base", champ: "Taux_horaire_Artistic", label: "Taux horaire — Artistic ($/hre)", carte: "Taux et multiplicateurs", syncTaux: "INV_8" },
  { formKey: "base", champ: "Taux_horaire_Flash", label: "Taux horaire — Flash ($/hre)", carte: "Taux et multiplicateurs" },
  { formKey: "base", champ: "Multiplicateur_materiaux", label: "Multiplicateur matériaux", carte: "Taux et multiplicateurs", syncTaux: "INV_6" },
  { formKey: "base", champ: "Taux_direct_labour_Artistic", label: "Direct labour — Artistic ($/hre)", carte: "Taux et multiplicateurs" },
  { formKey: "base", champ: "Taux_direct_labour_Flash", label: "Direct labour — Flash ($/hre)", carte: "Taux et multiplicateurs" },
  { formKey: "base", champ: "Indirect_labour_Artistic", label: "Indirect labour — Artistic ($/hre)", carte: "Taux et multiplicateurs" },
  { formKey: "base", champ: "Indirect_labour_Flash", label: "Indirect labour — Flash ($/hre)", carte: "Taux et multiplicateurs" },
  { formKey: "base", champ: "Heures_par_semaine", label: "Heures / semaine", carte: "Heures disponibles (standard)" },
  { formKey: "base", champ: "Semaines_par_annee", label: "Semaines / année", carte: "Heures disponibles (standard)" },
  { formKey: "base", champ: "Heures_vacances", label: "Vacances (heures)", carte: "Heures disponibles (standard)" },
  { formKey: "base", champ: "Taux_shutdown", label: "Taux shutdown (%)", carte: "Heures disponibles (standard)" },
  { formKey: "base", champ: "Seuil_alerte_heures", label: "Seuil alerte heures op.", carte: "Divers" },
  { formKey: "base", champ: "Mode_debug", label: "Afficher refs Excel (mode debug)", carte: "Divers", bool: true },
];
const CHAMPS_FOURNITURES: ChampStd[] = [
  { formKey: "fournitures", champ: "Cout_soie_emulsion_expo", label: "Soie émulsion + expo.", carte: "Soies et matrices", syncTaux: "INV_20" },
  { formKey: "fournitures", champ: "Cout_soie_emulsion_simple", label: "Soie émulsion simple", carte: "Soies et matrices", syncTaux: "INV_21" },
  { formKey: "fournitures", champ: "Cout_matrice_adhesif", label: "Matrice Adhésif", carte: "Soies et matrices", syncTaux: "INV_22" },
  { formKey: "fournitures", champ: "Cout_matrice_coupe", label: "Matrice Coupe", carte: "Soies et matrices", syncTaux: "INV_23" },
  { formKey: "fournitures", champ: "Cout_matrice_kiss_cut", label: "Matrice Kiss-cut", carte: "Soies et matrices", syncTaux: "INV_24" },
  { formKey: "fournitures", champ: "Cout_matrice_embossage", label: "Matrice Embossage", carte: "Soies et matrices", syncTaux: "INV_25" },
  { formKey: "fournitures", champ: "Cout_nettoyage_petit", label: "Nettoyage partiel petit", carte: "Nettoyage", syncTaux: "INV_26" },
  { formKey: "fournitures", champ: "Cout_nettoyage_moyen", label: "Nettoyage partiel moyen", carte: "Nettoyage", syncTaux: "INV_27" },
  { formKey: "fournitures", champ: "Cout_nettoyage_grand", label: "Nettoyage partiel grand", carte: "Nettoyage", syncTaux: "INV_28" },
  { formKey: "fournitures", champ: "Cout_recto_verso_moyen", label: "Recto/Verso moyen", carte: "Nettoyage", syncTaux: "INV_29" },
  { formKey: "fournitures", champ: "Cout_recto_verso_grand", label: "Recto/Verso grand", carte: "Nettoyage" },
  // Impression laser : opération de type machine mais une seule imprimante et absente
  // d'Artistic CG → paramètres GLOBAUX, pas de sélecteur par soumission (décision client
  // 2026-07-23). Ces deux champs n'avaient aucun syncTaux : ils étaient éditables mais
  // n'atteignaient jamais le moteur, qui restait sur les constantes figées.
  { formKey: "fournitures", champ: "Vitesse_laser", label: "Cadence laser (fle/hre)", carte: "Impression laser", syncTaux: "INV_26", syncColonne: "cadence" },
  { formKey: "fournitures", champ: "Cout_laser_par_feuille", label: "Amortissement + cartouche ($/feuille)", carte: "Impression laser", syncTaux: "INV_33", syncColonne: "valeur" },
  // mise en train laser : C!J11 = max((CF8/60) × CI48 × nbUp , CH48) — les deux valeurs vivent
  // sur la MÊME ligne INV_48, dans deux colonnes différentes
  { formKey: "fournitures", champ: "Setup_laser_min_par_up", label: "Mise en train (min par up)", carte: "Impression laser", syncTaux: "INV_48", syncColonne: "temps" },
  { formKey: "fournitures", champ: "Setup_laser_minimum", label: "Mise en train — minimum ($)", carte: "Impression laser", syncTaux: "INV_48", syncColonne: "cadence" },
];
const CHAMPS_TRANSPORT: ChampStd[] = [
  { formKey: "transport", champ: "Cout_km_autoroute", label: "Coût/km — autoroute", carte: "Kilométrage" },
  { formKey: "transport", champ: "Cout_km_ville", label: "Coût/km — ville", carte: "Kilométrage" },
  { formKey: "transport", champ: "Vitesse_autoroute", label: "Vitesse — autoroute", carte: "Kilométrage" },
  { formKey: "transport", champ: "Vitesse_ville", label: "Vitesse — ville", carte: "Kilométrage" },
];
const CHAMPS_AMORTISSEMENTS: ChampStd[] = [
  { formKey: "amortissements", champ: "Amort_Mimaki_Ion", label: "Mimaki / Ion", carte: "Amortissement machines", syncTaux: "INV_15" },
  { formKey: "amortissements", champ: "Amort_Zund_hre", label: "Zund ($/hre)", carte: "Amortissement machines", syncTaux: "INV_16" },
  { formKey: "amortissements", champ: "Amort_Zund_min", label: "Zund ($/min)", carte: "Amortissement machines" },
  { formKey: "amortissements", champ: "Maint_Fujifilm_R404", label: "Fujifilm R404-LT", carte: "Maintenance" },
  { formKey: "amortissements", champ: "Maint_Fujifilm_R40i", label: "Fujifilm ONSET R40i", carte: "Maintenance" },
  { formKey: "amortissements", champ: "Maint_Acuity_Prime", label: "Fujifilm Acuity Prime 30", carte: "Maintenance" },
  { formKey: "amortissements", champ: "Maint_Agfa", label: "Agfa", carte: "Maintenance" },
];
const CHAMPS_PAR_FORM: Record<FormKey, ChampStd[]> = {
  base: CHAMPS_BASE,
  fournitures: CHAMPS_FOURNITURES,
  transport: CHAMPS_TRANSPORT,
  amortissements: CHAMPS_AMORTISSEMENTS,
};

const NAV_STD: { key: FormKey; label: string; icone: NomIcone; sousTitre: string }[] = [
  { key: "base", label: "Paramètres de base", icone: "reglages", sousTitre: "Paramètres globaux utilisés dans tous les calculs de soumission." },
  { key: "fournitures", label: "Fournitures de prod.", icone: "goutte", sousTitre: "Coûts unitaires des fournitures de production (soies, matrices, nettoyage, laser)." },
  { key: "transport", label: "Transport", icone: "camion", sousTitre: "Coûts et vitesses utilisés pour estimer les frais de transport." },
  { key: "amortissements", label: "Amortissements", icone: "boite", sousTitre: "Taux d'amortissement et de maintenance des équipements." },
];
const ICONE_CARTE: Record<string, NomIcone> = {
  "Taux et multiplicateurs": "dollar",
  "Heures disponibles (standard)": "horloge",
  Divers: "reglages",
  "Soies et matrices": "goutte",
  Nettoyage: "goutte",
  "Impression laser": "eclair",
  Kilométrage: "camion",
  "Amortissement machines": "boite",
  Maintenance: "cle",
};

const CATEGORIES_MACHINE: { key: string; label: string; icone: NomIcone }[] = [
  { key: "Serigraphie", label: "Sérigraphie", icone: "goutte" },
  { key: "Decoupe", label: "Découpe (Zund)", icone: "ciseaux" },
  // Platine manquait : les 5 fiches Die Cut (MG 18"/24", Brausse ×2, Guangya) n'étaient
  // atteignables que par « Toutes les machines », alors qu'elles pilotent le calcul.
  { key: "Platine", label: "Platine (Die Cut)", icone: "ciseaux" },
  { key: "Finition", label: "Finition matière", icone: "cle" },
  { key: "Numerique", label: "Impression numérique", icone: "imprimante" },
];

type Donnees = Record<string, unknown>;
function valeurChamp(donnees: Donnees | null, c: ChampStd): string {
  if (!donnees) return "";
  const v = donnees[toObjKey(c.champ)];
  if (v === null || v === undefined || v === "") return "";
  return c.bool ? String(!!v) : String(v);
}
// convertit "Taux_horaire_Artistic" → "tauxHoraireArtistic" (camelCase des interfaces TS)
function toObjKey(champ: string): string {
  const parts = champ.split("_");
  return parts[0].toLowerCase() + parts.slice(1).map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("");
}

interface Props {
  base: ParametresBase | null;
  fournitures: FournituresProduction | null;
  transport: TransportParams | null;
  amortissements: Amortissements | null;
  taux: TauxCreator[] | null;
  machines: Machine[] | null;
  isZoho: boolean;
  onClose: () => void;
  onMachinesChange: (machines: Machine[]) => void;
  /** Applique immédiatement au moteur la cellule INV correspondant au taux qui vient d'être
   *  répercuté. Sans cela l'écriture partait bien dans Creator mais la soumission ouverte
   *  continuait de calculer avec l'ancienne valeur jusqu'à réouverture du widget. */
  onTauxApplique: (cellule: string, valeur: number) => void;
}

type Section = { type: "std"; key: FormKey } | { type: "machines"; categorie: string | null };

export function PopupAdministration({ base, fournitures, transport, amortissements, taux, machines, isZoho, onClose, onMachinesChange, onTauxApplique }: Props) {
  useEchap(onClose);
  const [section, setSection] = useState<Section>({ type: "std", key: "base" });

  const listeMachines = machines && machines.length ? machines : machinesSnapshot();
  const compteParCategorie = useMemo(() => {
    const m = new Map<string, number>();
    for (const mac of listeMachines) m.set(mac.categorie, (m.get(mac.categorie) ?? 0) + 1);
    return m;
  }, [listeMachines]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-admin" role="dialog" aria-modal="true" aria-label="Administration">
        <div className="modal-head">
          <h2>⚙ Administration</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="admin-layout">
          <nav className="admin-sidebar">
            {!isZoho && <p className="taux-note admin-note-sidebar">Hors Creator — snapshot embarqué.</p>}
            <div className="admin-sidebar-groupe">
              <div className="admin-sidebar-titre">Paramètres standards</div>
              {NAV_STD.map((n) => (
                <button
                  type="button"
                  key={n.key}
                  className={"admin-nav-item" + (section.type === "std" && section.key === n.key ? " actif" : "")}
                  onClick={() => setSection({ type: "std", key: n.key })}
                >
                  <Icone nom={n.icone} />
                  {n.label}
                </button>
              ))}
            </div>
            <div className="admin-sidebar-groupe">
              <div className="admin-sidebar-titre">Configuration machines</div>
              {CATEGORIES_MACHINE.map((c) => (
                <button
                  type="button"
                  key={c.key}
                  className={"admin-nav-item" + (section.type === "machines" && section.categorie === c.key ? " actif" : "")}
                  onClick={() => setSection({ type: "machines", categorie: c.key })}
                >
                  <Icone nom={c.icone} />
                  {c.label}
                  <span className="admin-nav-compte">{compteParCategorie.get(c.key) ?? 0}</span>
                </button>
              ))}
              <button
                type="button"
                className={"admin-nav-item" + (section.type === "machines" && section.categorie === null ? " actif" : "")}
                onClick={() => setSection({ type: "machines", categorie: null })}
              >
                <Icone nom="liste" />
                Toutes les machines
                <span className="admin-nav-compte">{listeMachines.length}</span>
              </button>
            </div>
          </nav>
          {section.type === "std" ? (
            <VueParametresStandards
              sectionKey={section.key}
              base={base}
              fournitures={fournitures}
              transport={transport}
              amortissements={amortissements}
              taux={taux}
              isZoho={isZoho}
              onTauxApplique={onTauxApplique}
            />
          ) : (
            <VueMachines categorie={section.categorie} machines={machines} isZoho={isZoho} onMachinesChange={onMachinesChange} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── carte champ éditable en ligne ────────────────────────────────────────────
function ChampCarteValeur({
  c,
  valeur,
  editable,
  enEdition,
  brouillon,
  onOuvrir,
  onChangerBrouillon,
  onValider,
  onAnnuler,
}: {
  c: ChampStd;
  valeur: string;
  editable: boolean;
  enEdition: boolean;
  brouillon: string;
  onOuvrir: () => void;
  onChangerBrouillon: (v: string) => void;
  onValider: () => void;
  onAnnuler: () => void;
}) {
  if (enEdition) {
    return (
      <div className="admin-champ">
        <span className="admin-champ-label">{c.label}</span>
        {c.bool ? (
          <select
            className="admin-champ-input"
            autoFocus
            value={brouillon}
            onChange={(e) => onChangerBrouillon(e.target.value)}
            onBlur={onValider}
            // stopPropagation : Échap annule la saisie en cours, il ne doit pas remonter
            // jusqu'au gestionnaire global qui fermerait tout le popup (cf. useEchap)
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                onAnnuler();
              }
            }}
          >
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </select>
        ) : (
          <input
            className="admin-champ-input"
            type="number"
            step="any"
            autoFocus
            value={brouillon}
            onChange={(e) => onChangerBrouillon(e.target.value)}
            onBlur={onValider}
            onKeyDown={(e) => {
              if (e.key === "Enter") onValider();
              if (e.key === "Escape") {
                e.stopPropagation();
                onAnnuler();
              }
            }}
          />
        )}
      </div>
    );
  }
  return (
    <div className="admin-champ">
      <span className="admin-champ-label">{c.label}</span>
      <button type="button" className="admin-champ-valeur" disabled={!editable} onClick={onOuvrir} title={editable ? "Cliquer pour modifier" : undefined}>
        {c.bool ? (valeur === "true" ? "Oui" : "Non") : valeur || "—"}
      </button>
    </div>
  );
}

function VueParametresStandards({
  sectionKey,
  base,
  fournitures,
  transport,
  amortissements,
  taux,
  isZoho,
  onTauxApplique,
}: {
  sectionKey: FormKey;
  base: ParametresBase | null;
  fournitures: FournituresProduction | null;
  transport: TransportParams | null;
  amortissements: Amortissements | null;
  taux: TauxCreator[] | null;
  isZoho: boolean;
  onTauxApplique: (cellule: string, valeur: number) => void;
}) {
  const donnees: Record<FormKey, Donnees | null> = {
    base: base ? (base as unknown as Donnees) : (PARAMETRES_BASE_SNAPSHOT as unknown as Donnees),
    fournitures: fournitures ? (fournitures as unknown as Donnees) : (FOURNITURES_PRODUCTION_SNAPSHOT as unknown as Donnees),
    transport: transport ? (transport as unknown as Donnees) : (TRANSPORT_SNAPSHOT as unknown as Donnees),
    amortissements: amortissements ? (amortissements as unknown as Donnees) : (AMORTISSEMENTS_SNAPSHOT as unknown as Donnees),
  };
  // les objets Zoho sont en camelCase (tauxHoraireArtistic) ; les snapshots générés sont en
  // snake_case Creator (Taux_horaire_Artistic) — on relit via toObjKey pour les 1ers, tel quel
  // pour les seconds.
  function lire(formKey: FormKey, c: ChampStd): string {
    const d = donnees[formKey];
    if (!d) return "";
    const viaSnapshot = d[c.champ];
    if (viaSnapshot !== undefined) return viaSnapshot === null ? "" : c.bool ? String(!!viaSnapshot) : String(viaSnapshot);
    return valeurChamp(d, c);
  }
  const idsForm: Record<FormKey, string> = {
    base: (base?.id ?? "") as string,
    fournitures: (fournitures?.id ?? "") as string,
    transport: (transport?.id ?? "") as string,
    amortissements: (amortissements?.id ?? "") as string,
  };

  const nav = NAV_STD.find((n) => n.key === sectionKey)!;
  const champs = CHAMPS_PAR_FORM[sectionKey];
  const cartes = useMemo(() => {
    const m = new Map<string, ChampStd[]>();
    for (const c of champs) (m.get(c.carte) ?? m.set(c.carte, []).get(c.carte)!).push(c);
    return [...m.entries()];
  }, [champs]);

  const [editingChamp, setEditingChamp] = useState<string | null>(null);
  const [brouillon, setBrouillon] = useState("");
  const [message, setMessage] = useState("");

  function ouvrir(c: ChampStd) {
    setEditingChamp(c.champ);
    setBrouillon(lire(c.formKey, c));
    setMessage("");
  }
  function annuler() {
    setEditingChamp(null);
  }

  async function valider(c: ChampStd) {
    setEditingChamp(null);
    const id = idsForm[c.formKey];
    if (!id) {
      setMessage("Non lié à un enregistrement Creator (snapshot hors ligne).");
      return;
    }
    const valeur = c.bool ? (brouillon === "true" ? 1 : 0) : Number(brouillon.replace(",", "."));
    setMessage("Enregistrement de « " + c.label + " »…");
    const champsMaj = { [c.champ]: valeur };
    const fn = { base: sauvegarderParametresBase, fournitures: sauvegarderFournitures, transport: sauvegarderTransport, amortissements: sauvegarderAmortissements }[
      c.formKey
    ];
    const res = await fn(id, champsMaj);
    if (!res.ok || !c.syncTaux) {
      setMessage(res.message);
      return;
    }
    // répercute vers la ligne Taux_Calcul liée (Taux_Calcul reste le seul pont vers le moteur —
    // l'admin ne le voit jamais, cette répercussion est automatique).
    const ligneTaux = (taux ?? []).find((t) => t.code === c.syncTaux);
    if (!ligneTaux?.id) {
      setMessage(res.message + " (Taux_Calcul " + c.syncTaux + " introuvable — non répercuté.)");
      return;
    }
    const colonne = c.syncColonne ?? "valeur";
    const resTaux = await sauvegarderTaux(ligneTaux.id, { [colonne]: valeur });
    if (resTaux.ok && valeur !== null) {
      // INV_26 + cadence → INV!CH26 (même convention que lib/parametres.ts)
      const n = c.syncTaux.replace("INV_", "");
      const prefixe = { valeur: "CF", cadence: "CH", temps: "CI" }[colonne];
      onTauxApplique("INV!" + prefixe + n, valeur);
    }
    setMessage(resTaux.ok ? res.message + " Répercuté sur Taux_Calcul (" + c.syncTaux + ")." : res.message + " Écriture Taux_Calcul échouée : " + resTaux.message);
  }

  return (
    <div className="admin-main">
      <div className="admin-main-header">
        <h3>{nav.label}</h3>
        <p className="admin-main-soustitre">{nav.sousTitre}</p>
      </div>
      {!isZoho && <p className="taux-note">Hors Creator — snapshot embarqué (lecture seule côté serveur).</p>}
      {message && <p className="taux-msg admin-msg-fixe">{message}</p>}
      <div className="admin-cartes">
        {cartes.map(([titreCarte, cs]) => (
          <div className="admin-carte" key={titreCarte}>
            <div className="admin-carte-titre">
              <Icone nom={ICONE_CARTE[titreCarte] ?? "reglages"} />
              {titreCarte}
            </div>
            <div className="admin-grid2">
              {cs.map((c) => (
                <ChampCarteValeur
                  key={c.champ}
                  c={c}
                  valeur={lire(c.formKey, c)}
                  editable={isZoho}
                  enEdition={editingChamp === c.champ}
                  brouillon={brouillon}
                  onOuvrir={() => ouvrir(c)}
                  onChangerBrouillon={setBrouillon}
                  onValider={() => void valider(c)}
                  onAnnuler={annuler}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Configuration machines ───────────────────────────────────────────────────
// Les machines sont des enregistrements du formulaire dédié Fiche_Machine (décision client
// 2026-07-21 : Product = catalogue produits/matériaux Zoho Inventory/Books, les machines n'y
// vivent plus). Les presses sérigraphie et machines de découpe (catégories Serigraphie /
// Decoupe / Platine) sont sélectionnables directement dans la soumission — leurs vitesses et
// mises en train pilotent le moteur de calcul (voir lib/machines.ts).
const CHAMPS_MACHINE: { label: string; cle: keyof Omit<Machine, "id">; type: "text" | "number"; creator: string }[] = [
  { label: "Nom", cle: "nomMachine", type: "text", creator: "Nom_machine" },
  { label: "Code machine", cle: "codeMachine", type: "text", creator: "Code_machine" },
  { label: "Site", cle: "site", type: "text", creator: "Site" },
  { label: "Catégorie", cle: "categorie", type: "text", creator: "Categorie" },
  { label: "Taux machine ($/hre)", cle: "tauxMachine", type: "number", creator: "Taux_machine" },
  { label: "Prix acquisition ($)", cle: "prixAcquisition", type: "number", creator: "Prix_acquisition" },
  { label: "Date acquisition", cle: "dateAcquisition", type: "text", creator: "Date_acquisition" },
  { label: "Période amortissement (ans)", cle: "periodeAmortissement", type: "number", creator: "Periode_amortissement" },
  { label: "Heures dispo. (nettes)", cle: "heuresDisponiblesNettes", type: "number", creator: "Heures_disponibles_nettes" },
  { label: "Taux d'utilisation (fraction)", cle: "tauxUtilisation", type: "number", creator: "Taux_utilisation" },
  { label: "Heures réelles", cle: "heuresReelles", type: "number", creator: "Heures_reelles" },
  { label: "Employés / machine", cle: "employesMachine", type: "number", creator: "Employes_machine" },
  { label: "Vitesse de base", cle: "vitesseBase", type: "number", creator: "Vitesse_base" },
  { label: "Unité vitesse", cle: "uniteVitesse", type: "text", creator: "Unite_vitesse" },
  { label: "Vitesse — 1 up (Zund)", cle: "vitesse1up", type: "number", creator: "Vitesse_1up" },
  { label: "Vitesse — <4 up (Zund)", cle: "vitesseMoins4up", type: "number", creator: "Vitesse_moins_4up" },
  { label: "Vitesse — 5+ up (Zund)", cle: "vitessePlus5up", type: "number", creator: "Vitesse_plus_5up" },
  { label: "Vitesse variante", cle: "vitesseVariante", type: "number", creator: "Vitesse_variante" },
  { label: "Setup (min)", cle: "setupMinutes", type: "number", creator: "Setup_minutes" },
  { label: "Format max", cle: "formatMax", type: "text", creator: "Format_max" },
  { label: "Largeur max (po)", cle: "largeurMaxPo", type: "number", creator: "Largeur_max_po" },
  { label: "Hauteur max (po)", cle: "hauteurMaxPo", type: "number", creator: "Hauteur_max_po" },
  { label: "Platine Adhésif (fle/hre)", cle: "vitessePlatineAdhesif", type: "number", creator: "Vitesse_platine_adhesif" },
  { label: "Platine Coupe (fle/hre)", cle: "vitessePlatineCoupe", type: "number", creator: "Vitesse_platine_coupe" },
  { label: "Platine Kiss-cut (fle/hre)", cle: "vitessePlatineKissCut", type: "number", creator: "Vitesse_platine_kiss_cut" },
  { label: "Platine Embossage (fle/hre)", cle: "vitessePlatineEmbossage", type: "number", creator: "Vitesse_platine_embossage" },
  { label: "Notes", cle: "notes", type: "text", creator: "Notes" },
];
const MACHINE_VIERGE: Omit<Machine, "id"> = {
  nomMachine: "",
  codeMachine: "",
  site: "Artistic",
  categorie: "Serigraphie",
  statut: "Actif",
  tauxMachine: null,
  prixAcquisition: null,
  dateAcquisition: "",
  periodeAmortissement: null,
  heuresDisponiblesNettes: null,
  tauxUtilisation: null,
  heuresReelles: null,
  employesMachine: null,
  vitesseBase: null,
  uniteVitesse: "",
  vitesse1up: null,
  vitesseMoins4up: null,
  vitessePlus5up: null,
  vitesseVariante: null,
  setupMinutes: null,
  setupParCouleur: false,
  formatMax: "",
  largeurMaxPo: null,
  hauteurMaxPo: null,
  vitessePlatineAdhesif: null,
  vitessePlatineCoupe: null,
  vitessePlatineKissCut: null,
  vitessePlatineEmbossage: null,
  notes: "",
  dateCreation: "",
  dateMaj: "",
};

function machinesSnapshot(): Machine[] {
  return (MACHINES_SNAPSHOT as Array<Record<string, unknown>>).map((m) => ({
    id: "",
    nomMachine: String(m.Nom_machine ?? ""),
    codeMachine: String(m.Code_machine ?? ""),
    site: String(m.Site ?? ""),
    categorie: String(m.Categorie ?? ""),
    statut: String(m.Statut ?? "Actif"),
    tauxMachine: (m.Taux_machine as number | null) ?? null,
    prixAcquisition: (m.Prix_acquisition as number | null) ?? null,
    dateAcquisition: String(m.Date_acquisition ?? ""),
    periodeAmortissement: (m.Periode_amortissement as number | null) ?? null,
    heuresDisponiblesNettes: (m.Heures_disponibles_nettes as number | null) ?? null,
    tauxUtilisation: (m.Taux_utilisation as number | null) ?? null,
    heuresReelles: (m.Heures_reelles as number | null) ?? null,
    employesMachine: (m.Employes_machine as number | null) ?? null,
    vitesseBase: (m.Vitesse_base as number | null) ?? null,
    uniteVitesse: String(m.Unite_vitesse ?? ""),
    vitesse1up: (m.Vitesse_1up as number | null) ?? null,
    vitesseMoins4up: (m.Vitesse_moins_4up as number | null) ?? null,
    vitessePlus5up: (m.Vitesse_plus_5up as number | null) ?? null,
    vitesseVariante: (m.Vitesse_variante as number | null) ?? null,
    setupMinutes: typeof m.Setup_minutes === "number" ? m.Setup_minutes : null,
    setupParCouleur: m.Setup_par_couleur === 1,
    formatMax: String(m.Format_max ?? ""),
    largeurMaxPo: null,
    hauteurMaxPo: null,
    vitessePlatineAdhesif: null,
    vitessePlatineCoupe: null,
    vitessePlatineKissCut: null,
    vitessePlatineEmbossage: null,
    notes: String(m.Notes ?? ""),
    dateCreation: "",
    dateMaj: "",
  }));
}

function VueMachines({
  categorie,
  machines,
  isZoho,
  onMachinesChange,
}: {
  categorie: string | null;
  machines: Machine[] | null;
  isZoho: boolean;
  onMachinesChange: (m: Machine[]) => void;
}) {
  const liste = machines && machines.length ? machines : machinesSnapshot();
  const filtrees = useMemo(() => (categorie ? liste.filter((m) => m.categorie === categorie) : liste), [liste, categorie]);
  const nomCategorie = CATEGORIES_MACHINE.find((c) => c.key === categorie)?.label ?? "Toutes les machines";

  const [selection, setSelection] = useState<string | null>(null); // id, ou nom, ou "__neuf__"
  const [brouillon, setBrouillon] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [enCreation, setEnCreation] = useState(false);

  const choisie = selection === "__neuf__" ? null : liste.find((m) => m.id === selection || m.nomMachine === selection) ?? null;

  function champVersBrouillon(m: Omit<Machine, "id">): Record<string, string> {
    const b: Record<string, string> = {};
    for (const c of CHAMPS_MACHINE) {
      const v = m[c.cle];
      b[c.cle] = v === null || v === undefined ? "" : String(v);
    }
    return b;
  }

  function ouvrir(m: Machine) {
    setSelection(m.id || m.nomMachine);
    setEnCreation(false);
    setBrouillon(champVersBrouillon(m));
    setMessage("");
  }
  function nouvelle() {
    setSelection("__neuf__");
    setEnCreation(true);
    setBrouillon(champVersBrouillon({ ...MACHINE_VIERGE, categorie: categorie ?? "Serigraphie" }));
    setMessage("");
  }
  function retour() {
    setSelection(null);
    setEnCreation(false);
    setMessage("");
  }

  /** Inverse de brouillonVersData : des liens Creator vers les clés de l'objet Machine, pour
   *  rafraîchir la fiche en mémoire à l'identique de ce qui vient d'être écrit. */
  function dataVersMachine(data: Record<string, unknown>): Partial<Machine> {
    const out: Record<string, unknown> = {};
    for (const c of CHAMPS_MACHINE) {
      if (!(c.creator in data)) continue;
      const v = data[c.creator];
      out[c.cle] = c.type === "number" ? (v === null || v === "" ? null : Number(v)) : String(v ?? "");
    }
    return out as Partial<Machine>;
  }

  function brouillonVersData(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const c of CHAMPS_MACHINE) {
      const raw = brouillon[c.cle] ?? "";
      if (raw === "") {
        if (c.type === "number") data[c.creator] = null; // efface explicitement une valeur numérique
        continue; // champ texte vide : on n'envoie rien (évite les erreurs Zoho sur ex. un champ Date vide)
      }
      data[c.creator] = c.type === "number" ? Number(raw.replace(",", ".")) : raw;
    }
    return data;
  }

  async function enregistrer() {
    const data = brouillonVersData();
    if (!data.Nom_machine) {
      setMessage("Le nom de la machine est requis.");
      return;
    }
    if (enCreation) {
      setMessage("Création…");
      const res = await creerMachine(data);
      setMessage(res.message);
      if (res.ok) {
        const nouvelleMachine: Machine = {
          ...MACHINE_VIERGE,
          id: res.id ?? "",
          nomMachine: String(data.Nom_machine),
          codeMachine: String(data.Code_machine ?? ""),
          site: String(data.Site ?? ""),
          categorie: String(data.Categorie ?? ""),
        };
        onMachinesChange([...liste, nouvelleMachine]);
        setEnCreation(false);
        setSelection(nouvelleMachine.id || nouvelleMachine.nomMachine);
      }
      return;
    }
    if (!choisie?.id) {
      setMessage("Non lié à un enregistrement Creator (snapshot hors ligne) — modification non persistée.");
      return;
    }
    setMessage("Enregistrement…");
    const res = await sauvegarderMachine(choisie.id, data);
    setMessage(res.message);
    if (res.ok) {
      // On réinjecte TOUS les champs enregistrés, pas seulement nom/taux/format : la vitesse et
      // le setup — les deux qui pilotent le calcul — étaient perdus, si bien qu'une modification
      // partait bien dans Creator mais restait invisible dans la soumission ouverte.
      onMachinesChange(liste.map((m) => (m.id === choisie.id ? { ...m, ...dataVersMachine(data) } : m)));
    }
  }

  async function toggleActif() {
    if (!choisie) return;
    if (!choisie.id) {
      setMessage("Non lié à un enregistrement Creator (snapshot hors ligne).");
      return;
    }
    const nouvelActif = choisie.statut !== "Actif";
    setMessage(nouvelActif ? "Réactivation…" : "Désactivation…");
    const res = await desactiverMachine(choisie.id, nouvelActif);
    setMessage(res.message);
    if (res.ok) onMachinesChange(liste.map((m) => (m.id === choisie.id ? { ...m, statut: nouvelActif ? "Actif" : "Inactif" } : m)));
  }

  if (choisie || enCreation) {
    return (
      <div className="admin-main">
        <div className="admin-main-header admin-main-header-retour">
          <button type="button" className="admin-retour" onClick={retour}>
            ← Retour
          </button>
          <h3>{enCreation ? "Nouvelle machine" : choisie!.nomMachine}</h3>
          <p className="admin-main-soustitre">
            Fiche machine — les catégories Serigraphie / Decoupe / Platine sont sélectionnables dans la soumission :
            vitesse et setup (min) y pilotent alors le calcul. Les autres catégories restent un référentiel de gestion.
          </p>
        </div>
        <div className="admin-cartes">
          <div className="admin-carte">
            <div className="admin-carte-titre">
              <Icone nom="reglages" />
              Caractéristiques
            </div>
            <div className="admin-champs-machine">
              {CHAMPS_MACHINE.map((c) => (
                <label key={c.cle} className="taux-champ">
                  <span>{c.label}</span>
                  <input
                    type={c.type}
                    step={c.type === "number" ? "any" : undefined}
                    value={brouillon[c.cle] ?? ""}
                    onChange={(e) => setBrouillon((b) => ({ ...b, [c.cle]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
            <div className="taux-actions">
              <button type="button" className="btn solid" onClick={() => void enregistrer()}>
                {enCreation ? "Créer la machine" : "Enregistrer"}
              </button>
              {!enCreation && choisie && (
                <button type="button" className="btn ghost-fonce" onClick={() => void toggleActif()}>
                  {choisie.statut === "Actif" ? "Désactiver" : "Réactiver"}
                </button>
              )}
            </div>
            {message && <p className="taux-msg">{message}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-main">
      <div className="admin-main-header">
        <h3>{nomCategorie}</h3>
        <p className="admin-main-soustitre">{filtrees.length} machine{filtrees.length > 1 ? "s" : ""} — cliquez une fiche pour la consulter ou la modifier.</p>
      </div>
      {!isZoho && <p className="taux-note">Hors Creator — catalogue embarqué (lecture seule côté serveur).</p>}
      {message && <p className="taux-msg admin-msg-fixe">{message}</p>}
      <button type="button" className="btn ghost-fonce admin-ajouter" onClick={nouvelle}>
        <Icone nom="plus" /> Ajouter une machine
      </button>
      <div className="admin-machine-grid">
        {filtrees.map((m) => (
          <button
            type="button"
            key={m.id || m.nomMachine}
            className={"admin-machine-carte" + (m.statut !== "Actif" ? " inactif" : "")}
            onClick={() => ouvrir(m)}
          >
            <span className="admin-machine-nom">{m.nomMachine}</span>
            <span className="admin-machine-meta">{m.site || "—"} · {m.codeMachine || "—"}</span>
            <span className="admin-machine-taux">{m.tauxMachine !== null ? m.tauxMachine + " $/hre" : "—"}</span>
            {m.statut !== "Actif" && <span className="admin-machine-badge">Désactivée</span>}
          </button>
        ))}
        {filtrees.length === 0 && <p className="modal-intro">Aucune machine dans cette catégorie.</p>}
      </div>
    </div>
  );
}
