// Table Creator `Config_Champs_Produit_Numerique` : les questions de chaque produit numérique.
//
// Le mécanisme promis au client : ajouter une option = saisir une ligne, pas redéployer. Tant que
// la table n'existe pas, ou si elle est incohérente, le widget garde la configuration embarquée
// et le DIT : une condition fausse masquerait une question pour toujours, sans message.
import { CONFIG_CHAMPS_NUMERIQUE, type ChampNumerique, type TypeChampNum } from "@/data/produitsNumeriques";
import { incoherencesConfig } from "@/lib/numerique";
import { isZohoEnv } from "@/services/zohoService";

export const REPORT_CONFIG_NUM = "Config_Champs_Produit_Numerique_Report";
const TYPES: TypeChampNum[] = ["choix", "multi", "case", "texte", "decimal"];

const liste = (v: unknown) => String(v ?? "").split(";").map((x) => x.trim()).filter(Boolean);
const oui = (v: unknown) => /^(oui|true|1)$/i.test(String(v ?? "").trim());

/** Une ligne Creator, ou null si elle n'est pas exploitable. */
export function ligneConfig(r: Record<string, unknown>): ChampNumerique | null {
  const champ = String(r.Champ_technique ?? "").trim();
  const typeChamp = String(r.Type_champ ?? "").trim().toLowerCase() as TypeChampNum;
  const typeProduit = String(r.Type_produit ?? "").trim();
  if (!champ || !typeProduit || !TYPES.includes(typeChamp)) return null;
  const sauf = liste(r.Sauf);
  const dependValeurs = liste(r.Depend_valeurs);
  const dependDe = String(r.Depend_de ?? "").trim();
  return {
    typeProduit,
    ...(sauf.length ? { sauf } : {}),
    bloc: String(r.Bloc ?? "").trim(),
    champ,
    libelle: String(r.Libelle ?? "").trim() || champ,
    typeChamp,
    options: liste(r.Options),
    ordre: Number(r.Ordre) || 0,
    actif: oui(r.Actif),
    requis: oui(r.Requis),
    ...(dependDe ? { dependDe, dependValeurs } : {}),
  };
}

export interface ConfigNum {
  champs: ChampNumerique[];
  source: string;
  /** à montrer à l'écran, vide si tout va bien */
  alerte: string;
}

export function configDepuisLignes(lignes: Record<string, unknown>[]): ConfigNum {
  const champs = lignes.map(ligneConfig);
  const bonnes = champs.filter((c): c is ChampNumerique => c !== null);
  const problemes = [
    ...(bonnes.length < champs.length ? [`${champs.length - bonnes.length} ligne(s) illisible(s)`] : []),
    ...incoherencesConfig(bonnes),
  ];
  // Sans le champ qui choisit le produit, l'écran n'affiche plus rien.
  if (!bonnes.some((c) => c.champ === "Num_Type_produit" && c.actif)) problemes.push("le champ « Type de produit » manque");
  if (problemes.length) return { champs: CONFIG_CHAMPS_NUMERIQUE, source: "copie embarquée", alerte: "Table des questions numériques ignorée : " + problemes.slice(0, 3).join(" ; ") + "." };
  return { champs: bonnes, source: `Creator (${bonnes.length} questions)`, alerte: "" };
}

export const CONFIG_EMBARQUEE: ConfigNum = { champs: CONFIG_CHAMPS_NUMERIQUE, source: "copie embarquée", alerte: "" };

export async function chargerConfigNumerique(): Promise<ConfigNum> {
  if (!isZohoEnv()) return CONFIG_EMBARQUEE;
  try {
    const res = (await ZOHO.CREATOR.DATA.getRecords({ report_name: REPORT_CONFIG_NUM, max_records: 200 })) as {
      code: number;
      data?: Record<string, unknown>[];
    };
    if (res.code !== 3000 || !res.data?.length) return CONFIG_EMBARQUEE;
    return configDepuisLignes(res.data);
  } catch {
    return CONFIG_EMBARQUEE; // la table n'existe pas encore
  }
}
