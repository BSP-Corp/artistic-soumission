// Configuration du formulaire intelligent « Production numérique » — semence de la table
// Creator `Config_Champs_Produit_Numerique` (handoff du 10 novembre 2026, étapes 1 à 3).
//
// ── RÔLE ─────────────────────────────────────────────────────────────────────
// Même rôle que `montageSnapshot.ts` : c'est un REPLI. En production le widget lit la table
// Creator ; ce fichier sert à le faire tourner hors Zoho, à fournir la configuration tant que
// la table n'existe pas, et à documenter la source. L'API Builder de ce compte refuse la
// création de formulaires (`30120 — Allowed only for C6 Account`), donc la table se crée à la
// main dans le concepteur : les lignes ci-dessous sont exactement ce qu'il faut y semer.
//
// ── SOURCE ───────────────────────────────────────────────────────────────────
// Les vraies feuilles produit du client (`Formulaires_soumission_Artistic.docx`, faites par
// José / Artistic). 4 produits fournis, 2 manquants. Rien n'est inventé ici : chaque option
// est recopiée de la feuille correspondante. Les deux produits sans feuille sont présents
// mais INACTIFS — ils n'apparaissent pas dans la liste tant que leur feuille n'est pas
// arrivée, plutôt que d'afficher un encadré vide.
//
// ── DEUX COLONNES AJOUTÉES AU HANDOFF, ET POURQUOI ───────────────────────────
// Le handoff décrit la table avec 8 colonnes (Type_produit, Bloc, Champ_technique, Libelle,
// Type_champ, Options, Ordre, Actif). Il manque de quoi exprimer l'étape 7 :
//
//   · `Requis`        — « laminage obligatoire sur les autocollants » est une règle de
//                       données, pas de mise en page ;
//   · `Depend_de` / `Depend_valeurs` — « si montage substrat → type/dim/qté requis » et
//                       « si installation demandée → adresse/surface/date » sont des
//                       affichages conditionnels.
//
// Sans ces colonnes, l'étape 7 serait écrite en dur dans le widget — exactement ce que la
// table de configuration doit éviter (« BSP/client ajuste une ligne au lieu de recoder »).
// Elles sont donc ajoutées ; c'est le seul écart avec le handoff.

/** Types de champ de la colonne `Type_champ`. */
export type TypeChampNum = "choix" | "multi" | "case" | "texte" | "decimal";

/** Une ligne de `Config_Champs_Produit_Numerique`. */
export interface ChampNumerique {
  /** code du produit, ou `*` pour un champ commun à tous les produits numériques */
  typeProduit: string;
  /** produits à EXCLURE d'un champ commun (l'installation est absente du roll-up) */
  sauf?: string[];
  bloc: string;
  champ: string;
  libelle: string;
  typeChamp: TypeChampNum;
  /** options d'un `choix` / `multi` — dans Creator : une chaîne séparée par `;` */
  options: string[];
  ordre: number;
  actif: boolean;
  /** le champ doit porter une valeur pour que la soumission se valide */
  requis: boolean;
  /** ne s'affiche que si `dependDe` porte l'une de `dependValeurs` */
  dependDe?: string;
  dependValeurs?: string[];
}

/** Un produit numérique. `actif = false` = feuille client pas encore reçue. */
export interface ProduitNumerique {
  code: string;
  libelle: string;
  actif: boolean;
  /** pourquoi le produit est inactif — affiché en clair plutôt que de le masquer en silence */
  note?: string;
}

export const PRODUITS_NUMERIQUES: ProduitNumerique[] = [
  { code: "autocollants", libelle: "Autocollants / décalques", actif: true },
  { code: "panneaux", libelle: "Panneaux (matières rigides)", actif: true },
  { code: "bannieres", libelle: "Bannières", actif: true },
  { code: "rollup", libelle: "Bannière rétractable (roll-up)", actif: true },
  {
    code: "faces_graphiques",
    libelle: "Faces graphiques",
    actif: false,
    note: "feuille produit non fournie — éclairage, dimensions de la boîte, impression haute densité jour/nuit à confirmer",
  },
  {
    code: "affiches",
    libelle: "Affiches / matières souples",
    actif: false,
    note: "feuille produit non fournie — montage (aucun / carton mousse / encadrement / barres haut et bas) à confirmer",
  },
];

// ── Constantes de produit : ce qui est FIXE et ne se demande donc pas ────────
// Le handoff est explicite pour le roll-up : « Vinyle 9 oz à dos gris · Recto seulement
// (constantes, pas des questions) ». Elles ne sont pas des lignes de configuration — sinon
// on afficherait une liste à un seul choix — mais elles doivent voyager jusqu'au bon de
// travail et au contrat, d'où ce tableau à part.
export const CONSTANTES_PRODUIT: Record<string, Record<string, string>> = {
  rollup: {
    Retr_Materiel: "Vinyle 9 oz à dos gris",
    Retr_Impr_face: "Recto seulement",
  },
};

// ── Dimensions imposées par un format catalogue ─────────────────────────────
// ⚠ DÉCISION D'IMPLÉMENTATION, À CONFIRMER. Le handoff retire l'installation du roll-up mais
// ne dit rien du bloc Dimensions. Or le roll-up se commande par format catalogue
// (33 × 80, 48 × 80) : demander en plus une largeur et une hauteur libres contredirait le
// premier principe du handoff (« une info se saisit une fois ») et ouvrirait la porte à une
// soumission où le format dit 33 × 80 et les dimensions 24 × 60. Les dimensions sont donc
// DÉDUITES du format pour ce produit, et le bloc Dimensions lui est masqué.
export const DIMENSIONS_SELON_FORMAT: Record<string, Record<string, { largeurPo: number; hauteurPo: number }>> = {
  rollup: {
    "33 × 80 po": { largeurPo: 33, hauteurPo: 80 },
    "48 × 80 po": { largeurPo: 48, hauteurPo: 80 },
  },
};

// ── Les lignes de configuration ─────────────────────────────────────────────
// `ordre` est espacé de 10 : on insère une ligne sans renuméroter les autres.
//
// ⚠ BANDES D'ORDRE — à respecter en modifiant la table dans Creator.
// `ordre` est une numérotation GLOBALE : les champs communs et les champs d'un produit sont
// triés ensemble. S'ils partagent les mêmes numéros, les blocs se télescopent — le bloc
// « Numérique » se retrouve coupé en deux et les questions du produit passent AVANT le champ
// qui choisit le produit. D'où quatre bandes réservées :
//
//     10 –   90   bloc pilote : usage, type de produit
//    100 –  899   encadré du produit (un seul visible à la fois)
//   1000 – 8999   sections communes : dimensions, quantité, infographie, installation
//         9000    notes, toujours en dernier
//
// `incoherencesConfig()` refuse une configuration où un bloc se retrouve coupé en deux :
// c'est le garde-fou qui rattrape une renumérotation faite dans Creator.

/** Champs communs (étape 1 + sections COMMUNES du handoff). `typeProduit = "*"`. */
const COMMUNS: ChampNumerique[] = [
  // bloc pilote : ces deux champs commandent tout le reste de l'écran
  { typeProduit: "*", bloc: "Numérique", champ: "Num_Usage", libelle: "Usage", typeChamp: "choix", options: ["Intérieur", "Extérieur"], ordre: 10, actif: true, requis: true },
  {
    typeProduit: "*",
    bloc: "Numérique",
    champ: "Num_Type_produit",
    libelle: "Type de produit",
    typeChamp: "choix",
    // Les options sont dérivées de PRODUITS_NUMERIQUES actifs par `optionsTypeProduit()` :
    // les écrire ici aussi aurait créé deux listes à tenir à jour en parallèle.
    options: [],
    ordre: 20,
    actif: true,
    requis: true,
  },

  // Dimensions — masquées sur le roll-up, qui se commande par format catalogue
  { typeProduit: "*", sauf: ["rollup"], bloc: "Dimensions", champ: "Num_Unite", libelle: "Unité", typeChamp: "choix", options: ["Pouces", "Millimètres"], ordre: 1000, actif: true, requis: true },
  { typeProduit: "*", sauf: ["rollup"], bloc: "Dimensions", champ: "Num_Largeur", libelle: "Largeur", typeChamp: "decimal", options: [], ordre: 1010, actif: true, requis: true },
  { typeProduit: "*", sauf: ["rollup"], bloc: "Dimensions", champ: "Num_Hauteur", libelle: "Hauteur", typeChamp: "decimal", options: [], ordre: 1020, actif: true, requis: true },

  // Quantité
  { typeProduit: "*", bloc: "Quantité", champ: "Num_Quantite", libelle: "Quantité totale", typeChamp: "decimal", options: [], ordre: 1100, actif: true, requis: true },
  { typeProduit: "*", bloc: "Quantité", champ: "Num_Nb_lots", libelle: "Nombre de lots", typeChamp: "decimal", options: [], ordre: 1110, actif: true, requis: false },

  // Infographie
  {
    typeProduit: "*",
    bloc: "Infographie",
    champ: "Num_Infographie",
    libelle: "Infographie",
    typeChamp: "choix",
    options: ["Fichier fourni par le client", "Infographie à réaliser par Artistic"],
    ordre: 1200,
    actif: true,
    requis: true,
  },

  // Installation — « présente sur tous sauf Roll-up » (handoff)
  { typeProduit: "*", sauf: ["rollup"], bloc: "Installation", champ: "Num_Installation", libelle: "Installation", typeChamp: "choix", options: ["Non requise", "Demandée"], ordre: 1300, actif: true, requis: true },
  { typeProduit: "*", sauf: ["rollup"], bloc: "Installation", champ: "Num_Install_lieu", libelle: "Adresse ou lieu", typeChamp: "texte", options: [], ordre: 1310, actif: true, requis: true, dependDe: "Num_Installation", dependValeurs: ["Demandée"] },
  { typeProduit: "*", sauf: ["rollup"], bloc: "Installation", champ: "Num_Install_surface", libelle: "Type de surface", typeChamp: "texte", options: [], ordre: 1320, actif: true, requis: true, dependDe: "Num_Installation", dependValeurs: ["Demandée"] },
  { typeProduit: "*", sauf: ["rollup"], bloc: "Installation", champ: "Num_Install_qte", libelle: "Quantité à installer", typeChamp: "decimal", options: [], ordre: 1330, actif: true, requis: true, dependDe: "Num_Installation", dependValeurs: ["Demandée"] },
  { typeProduit: "*", sauf: ["rollup"], bloc: "Installation", champ: "Num_Install_date", libelle: "Date souhaitée", typeChamp: "texte", options: [], ordre: 1340, actif: true, requis: true, dependDe: "Num_Installation", dependValeurs: ["Demandée"] },

  // Notes
  { typeProduit: "*", bloc: "Notes / précisions", champ: "Num_Notes", libelle: "Notes ou précisions", typeChamp: "texte", options: [], ordre: 9000, actif: true, requis: false },
];

/** A. AUTOCOLLANTS / DÉCALQUES */
const AUTOCOLLANTS: ChampNumerique[] = [
  {
    typeProduit: "autocollants",
    bloc: "Média / matière adhésive",
    champ: "Auto_Media",
    libelle: "Média adhésif",
    typeChamp: "choix",
    options: ["Permanent", "Amovible", "Mural", "Clair (transparent)", "Perforé 60/40", "Perforé 70/30", "Vinyle super adhésif"],
    ordre: 100,
    actif: true,
    requis: true,
  },
  { typeProduit: "autocollants", bloc: "Type d'impression", champ: "Auto_Impr_face", libelle: "Faces imprimées", typeChamp: "choix", options: ["Recto", "Recto verso"], ordre: 110, actif: true, requis: true },
  {
    typeProduit: "autocollants",
    bloc: "Type d'impression",
    champ: "Auto_Impr_couleur",
    libelle: "Couleurs",
    typeChamp: "choix",
    options: ["4 couleurs process", "4 couleurs process + blanc", "Blanc seulement"],
    ordre: 120,
    actif: true,
    requis: true,
  },
  // Le laminage est OBLIGATOIRE sur ce produit : pas d'option « Aucun », et `requis: true`.
  // C'est la seule règle du handoff marquée « (obligatoire) » en toutes lettres.
  { typeProduit: "autocollants", bloc: "Laminage", champ: "Auto_Laminage", libelle: "Laminage (obligatoire)", typeChamp: "choix", options: ["Glacé", "Lustré", "Mat", "Antidérapant"], ordre: 130, actif: true, requis: true },
  {
    typeProduit: "autocollants",
    bloc: "Finition",
    champ: "Auto_Finition",
    libelle: "Finition",
    typeChamp: "multi",
    options: ["Coupé au format final", "Découpé à la forme", "Découpe multiple", "Kiss-cut", "Slit", "Lettrage découpé + papier de transfert"],
    ordre: 140,
    actif: true,
    requis: false,
  },
  {
    typeProduit: "autocollants",
    bloc: "Montage sur substrat",
    champ: "Auto_Montage",
    libelle: "Montage sur substrat",
    typeChamp: "choix",
    options: ["Aucun", "Substrat fourni par le client", "Substrat fourni par Artistic"],
    ordre: 150,
    actif: true,
    requis: true,
  },
  { typeProduit: "autocollants", bloc: "Montage sur substrat", champ: "Auto_Substrat_type", libelle: "Type de substrat", typeChamp: "texte", options: [], ordre: 160, actif: true, requis: true, dependDe: "Auto_Montage", dependValeurs: ["Substrat fourni par le client", "Substrat fourni par Artistic"] },
  { typeProduit: "autocollants", bloc: "Montage sur substrat", champ: "Auto_Substrat_dim", libelle: "Dimensions du substrat", typeChamp: "texte", options: [], ordre: 170, actif: true, requis: true, dependDe: "Auto_Montage", dependValeurs: ["Substrat fourni par le client", "Substrat fourni par Artistic"] },
  { typeProduit: "autocollants", bloc: "Montage sur substrat", champ: "Auto_Substrat_qte", libelle: "Quantité de substrat", typeChamp: "decimal", options: [], ordre: 180, actif: true, requis: true, dependDe: "Auto_Montage", dependValeurs: ["Substrat fourni par le client", "Substrat fourni par Artistic"] },
];

/** B. PANNEAUX (matières rigides) */
const PANNEAUX: ChampNumerique[] = [
  {
    typeProduit: "panneaux",
    bloc: "Matériel",
    champ: "Pan_Materiel",
    libelle: "Matériel",
    typeChamp: "choix",
    options: ["Coroplast", "Foam core", "Styrène", "Sintra", "Dibond", "Carton", "Polycarbonate", "Acrylique"],
    ordre: 100,
    actif: true,
    requis: true,
  },
  { typeProduit: "panneaux", bloc: "Matériel", champ: "Pan_Epaisseur", libelle: "Épaisseur", typeChamp: "texte", options: [], ordre: 110, actif: true, requis: false },
  { typeProduit: "panneaux", bloc: "Matériel", champ: "Pan_Couleur_materiel", libelle: "Couleur du matériel", typeChamp: "texte", options: [], ordre: 120, actif: true, requis: false },
  { typeProduit: "panneaux", bloc: "Type d'impression", champ: "Pan_Impr_face", libelle: "Faces imprimées", typeChamp: "choix", options: ["Recto", "Recto verso"], ordre: 130, actif: true, requis: true },
  {
    typeProduit: "panneaux",
    bloc: "Type d'impression",
    champ: "Pan_Impr_couleur",
    libelle: "Couleurs",
    typeChamp: "choix",
    options: ["4 couleurs process", "4 couleurs process + blanc", "Blanc seulement"],
    ordre: 140,
    actif: true,
    requis: true,
  },
  {
    typeProduit: "panneaux",
    bloc: "Type d'impression",
    champ: "Pan_Impr_methode",
    libelle: "Méthode d'impression",
    typeChamp: "choix",
    options: ["Impression directe sur le matériel", "Vinyle imprimé contrecollé"],
    ordre: 150,
    actif: true,
    requis: true,
  },
  // Ici le laminage a bien une option « Aucun » : contrairement aux autocollants, il n'est
  // pas obligatoire. D'où `requis: true` quand même — il faut CHOISIR, y compris « Aucun »,
  // pour qu'un oubli ne se lise pas comme « pas de laminage ».
  { typeProduit: "panneaux", bloc: "Laminage", champ: "Pan_Laminage", libelle: "Laminage", typeChamp: "choix", options: ["Aucun", "Glacé", "Lustré", "Mat"], ordre: 160, actif: true, requis: true },
  {
    typeProduit: "panneaux",
    bloc: "Finition",
    champ: "Pan_Finition",
    libelle: "Finition",
    typeChamp: "multi",
    // ⚠ « Coins arrondis » est de retour ici. Il avait été retiré du contrat sérigraphie le
    // 28 septembre 2026 (contrat v1.2). Les deux faits peuvent coexister — la feuille
    // numérique est une autre source — mais c'est à signaler, pas à trancher seul.
    options: ["Coupé au format final", "Découpé à la forme", "Coins arrondis", "Perçage / œillets", "Ruban adhésif double face", "Velcro"],
    ordre: 170,
    actif: true,
    requis: false,
  },
];

/** C. BANNIÈRES */
const BANNIERES: ChampNumerique[] = [
  {
    typeProduit: "bannieres",
    bloc: "Matériel",
    champ: "Ban_Materiel",
    libelle: "Matériel",
    typeChamp: "choix",
    options: ["Bannière extérieure 18 oz renforcée", "Bannière intérieure 15 oz lisse", "Mesh (filet)", "Blockout (opaque)"],
    ordre: 100,
    actif: true,
    requis: true,
  },
  { typeProduit: "bannieres", bloc: "Type d'impression", champ: "Ban_Impr_face", libelle: "Faces imprimées", typeChamp: "choix", options: ["Recto", "Recto verso"], ordre: 110, actif: true, requis: true },
  // Une seule option : c'est une constante déguisée en question dans la feuille client. On la
  // garde comme champ (la feuille la pose) mais `optionUnique()` la signale — le jour où une
  // deuxième couleur apparaît, la ligne est déjà là.
  { typeProduit: "bannieres", bloc: "Type d'impression", champ: "Ban_Impr_couleur", libelle: "Couleurs", typeChamp: "choix", options: ["4 couleurs process"], ordre: 120, actif: true, requis: true },
  {
    typeProduit: "bannieres",
    bloc: "Finition",
    champ: "Ban_Finition",
    libelle: "Finition",
    typeChamp: "multi",
    options: ["Couture + œillets aux 24 po", "Couture + œillets aux 12 po", "Ourlet en haut", "Ourlet en bas", "Autre finition"],
    ordre: 130,
    actif: true,
    requis: false,
  },
  { typeProduit: "bannieres", bloc: "Finition", champ: "Ban_Finition_autre", libelle: "Préciser l'autre finition", typeChamp: "texte", options: [], ordre: 140, actif: true, requis: true, dependDe: "Ban_Finition", dependValeurs: ["Autre finition"] },
];

/** D. BANNIÈRE RÉTRACTABLE (ROLL-UP) */
const ROLLUP: ChampNumerique[] = [
  { typeProduit: "rollup", bloc: "Modèle", champ: "Retr_Modele", libelle: "Modèle", typeChamp: "choix", options: ["Artistic Économique", "Artistic Luxe (mécanisme supérieur)"], ordre: 100, actif: true, requis: true },
  { typeProduit: "rollup", bloc: "Format", champ: "Retr_Format", libelle: "Format", typeChamp: "choix", options: ["33 × 80 po", "48 × 80 po"], ordre: 110, actif: true, requis: true },
  { typeProduit: "rollup", bloc: "Options", champ: "Retr_Lampe_DEL", libelle: "Lampe DEL", typeChamp: "case", options: [], ordre: 120, actif: true, requis: false },
];

/** La table complète — ce qu'il faut semer dans `Config_Champs_Produit_Numerique`. */
export const CONFIG_CHAMPS_NUMERIQUE: ChampNumerique[] = [...COMMUNS, ...AUTOCOLLANTS, ...PANNEAUX, ...BANNIERES, ...ROLLUP];

// ── Étape 5 : filtrage des matériaux par produit ────────────────────────────
// Semence de `Filtre_Materiau_Produit`. Les valeurs sont celles des feuilles produit, pas des
// noms d'inventaire : le rapprochement avec les fiches se fera par la colonne « type
// numérique » que le client ajoute à l'inventaire (courriel Christian du 30 octobre). Tant
// qu'elle n'est pas remplie, `materiauxPermis()` renvoie ces libellés et le widget ne peut
// pas encore proposer de prix — c'est voulu : un faux rapprochement coûterait plus cher qu'un
// champ vide.
export const FILTRE_MATERIAU_PRODUIT: Record<string, string[]> = {
  autocollants: ["Permanent", "Amovible", "Mural", "Clair (transparent)", "Perforé 60/40", "Perforé 70/30", "Vinyle super adhésif"],
  panneaux: ["Coroplast", "Foam core", "Styrène", "Sintra", "Dibond", "Carton", "Polycarbonate", "Acrylique"],
  bannieres: ["Bannière extérieure 18 oz renforcée", "Bannière intérieure 15 oz lisse", "Mesh (filet)", "Blockout (opaque)"],
  rollup: ["Vinyle 9 oz à dos gris"],
  // faces_graphiques et affiches : à venir, volontairement absents plutôt que vides
};
