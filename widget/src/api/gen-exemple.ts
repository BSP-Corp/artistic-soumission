// Générateur du livrable client : docs/api/CONTRAT-SOUMISSION.md + exemple-soumission.json.
// Tourne en Node (hors navigateur) sur le vrai moteur, scénario « Exemple » du classeur
// (BSP / 4152464 / 50 pièces), normalisé comme le widget v1.1 (F/S = 1/1/1) et complété d'un
// sous-contrat : les chiffres de l'exemple sont ceux que le widget calcule réellement.
//
// Build + exécution : voir package.json → `npm run gen:api`.
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { Moteur, type Classeur } from "@/lib/moteur";
import { TAUX_HORAIRE_CLASSEUR } from "@/lib/methodeCout";
import { entreesExemple, normaliserEntrees, OUT } from "@/lib/modele";
import classeurJson from "@/data/classeur.json";
import { MATERIAUX_LOCAL } from "@/data/materiaux";
import { construireSoumissionJSON, docChamps, SCHEMA_VERSION, CHAMPS } from "./contratSoumission";

const CLASSEUR = classeurJson as unknown as Classeur;
const moteur = new Moteur(CLASSEUR);
// normalisé comme le widget le fait (v1.1) : F/S = 1/1/1, interrupteurs de découpe à 0/1
const entrees = normaliserEntrees(entreesExemple(CLASSEUR));
// quelques saisies réalistes en plus du scénario du classeur
entrees["S!V2"] = "C-0084";
entrees["S!V4"] = "Panneau de contrôle";
entrees["S!Y9"] = "S-2026-0142";
entrees["FT!C3"] = "M-118";
entrees["FT!Y5"] = "2026-09-26";
entrees["X!PRESSE"] = "Cameo 18";
entrees["S!K38"] = "Gravure Laser Québec";
entrees["S!R38"] = 85;
// v1.1 : prix vendu décidé par le chargé de projet (ici arrondi au-dessus du 15,10 $ calculé)
entrees["X!VENDU"] = 15.5;
entrees["X!VENDU1"] = 11.75;
// v1.3 : les dates du dossier et la correction du chef d'atelier. Elles n'entrent dans aucun
// calcul — l'exemple montre juste ce que la plateforme recevra.
entrees["X!DATE_CMD"] = "2026-09-11";
entrees["X!DATE_EXP"] = "2026-09-24";
// Le scénario d'exemple calcule 14 feuilles (50 pièces, 4 up, 10 % de perte) ; l'atelier en
// compte 16. L'exemple doit montrer le cas qui pose problème — celui de leur question 2 :
// production.nb_matrices = 16, nb_matrices_calcule = 14, nb_matrices_source = "correction".
entrees["X!NBF_CORR"] = 16;
// même socle que le widget : le cache INV du classeur fige 73 $/h, le taux courant est 74
const SOCLE = { "INV!CF8": TAUX_HORAIRE_CLASSEUR };
moteur.setInputs({ ...SOCLE, ...entrees });
moteur.calculer();

const sim = new Moteur(CLASSEUR);
const simuler = (qte: number) => {
  sim.setInputs({ ...SOCLE, ...entrees, "S!E2": qte });
  sim.calculer();
  // `cout` et `prix` restent distincts : le contrat les expose séparément.
  const unit = sim.num(OUT.prixUnitaire);
  return { cout: qte > 0 ? sim.num(OUT.montant) / qte : 0, prix: unit, vendu: unit, us: sim.num(OUT.prixUnitaireUs) };
};

const EPAISSEURS = new Map(
  MATERIAUX_LOCAL.filter((m) => m.epaisseur > 0).map((m) => [m.nom.toLowerCase(), m.epaisseur] as const),
);

const json = construireSoumissionJSON({
  m: moteur,
  e: entrees,
  meta: {
    id: "4153107000022542146",
    statut: "Valide",
    source: "widget",
    date_soumission: "2026-09-10",
    reference_externe: null,
    notes: "Client demande une épreuve PDF avant production.",
    moment: "validation",
  },
  simuler,
  // Hors Zoho l'inventaire Creator n'est pas joignable : l'exemple lit le snapshot embarqué,
  // qui porte les mêmes épaisseurs. Les valeurs de l'exemple sont donc de vraies épaisseurs
  // de catalogue, pas des chiffres inventés pour la documentation.
  epaisseurPo: (nom) => EPAISSEURS.get(nom.toLowerCase()) ?? null,
});

const outDir = resolve(process.cwd(), "docs/api"); // exécuté depuis widget/
mkdirSync(outDir, { recursive: true });
const exemple = JSON.stringify(json, null, 2);
writeFileSync(resolve(outDir, "exemple-soumission.json"), exemple + "\n", "utf8");

const nbIn = CHAMPS.filter((c) => c.origine === "in").length;
const nbOut = CHAMPS.filter((c) => c.origine === "out").length;

const doc = `# Contrat d'échange — Soumission (Zoho Creator → plateforme client)

**Version du schéma : \`${SCHEMA_VERSION}\`** · Généré le ${new Date().toISOString().slice(0, 10)} à partir du code du widget
(le document et le payload sont produits par la même source : ils ne peuvent pas diverger).

Ce document décrit **ce que Zoho enverra** à votre API à chaque soumission validée.
L'exemple ci-dessous n'est pas inventé : il est calculé par le moteur de prix réel sur le
job d'exemple de l'entreprise (50 pièces, 4 matériaux, découpe platine).

---

## 1. Vue d'ensemble

| | |
|---|---|
| Format | JSON, UTF-8, \`Content-Type: application/json\` |
| Sens | Zoho Creator **→** votre API (POST) |
| Déclencheur | passage d'une soumission au statut **Valide** (bouton « Valider » du widget) |
| Rejeu | si votre API répond autre chose que 2xx, Zoho réessaie (3 tentatives, puis journalisation) |
| Idempotence | \`soumission.id\` est stable : deux envois avec le même \`id\` = la même soumission (mise à jour) |
| Taille typique | 6 à 12 Ko |

### Conventions

- **Aucune référence au fichier Excel d'origine** n'est exposée : les noms sont des noms métier stables.
- Les **pourcentages sont en 0-100** (\`perte_pct: 10\` = 10 %), jamais en fraction.
- Les **cases à cocher sont des booléens** ; un nombre non saisi est \`null\` (pas \`0\`, pas \`""\`).
- Les **montants sont en CAD**, arrondis à 2 décimales — sauf \`prix.prix_unitaire\` (4 décimales).
- Les **temps** sont donnés sous la forme \`{ heures, minutes, minutes_totales }\`.
- Les **tableaux** (\`materiaux\`, \`sous_contrat\`, \`quantites_alternatives\`) n'incluent que les lignes renseignées ; \`ventilation_couts\` a toujours 7 lignes.
- Colonne **Origine** : *saisi* = entré par l'estimateur ; ***calculé*** = produit par le moteur de prix ; *méta* = ajouté par Zoho.
- Nouveaux champs = version mineure (\`1.x\`), compatible. Suppression / renommage = version majeure, annoncée à l'avance.

**${nbIn} champs saisis · ${nbOut} champs calculés.**

### Historique des versions

| Version | Date | Changements |
|---|---|---|
| \`1.3\` | 2026-11-05 | **Réponses aux questions 1, 2, 3 et 5.** *Ajouts (compatibles)* : \`soumission.date_commande\`, \`soumission.date_expedition_prevue\`, \`soumission.date_requise_texte\`, \`soumission.moment\`, \`materiaux[].epaisseur_po\`, \`materiaux[].epaisseur_mil\`, \`production.nb_matrices_calcule\`, \`production.nb_matrices_corrige\`, \`production.nb_matrices_source\`. *Deux changements à lire avant d'intégrer* : (1) \`soumission.date_requise\` **passe de texte libre à date ISO** et vaut \`null\` quand la saisie n'est pas une date — le texte d'origine part intact dans \`date_requise_texte\` ; (2) \`production.nb_matrices\` **change de sens** : il porte désormais la valeur **retenue** (la correction de l'atelier quand elle existe), le calcul seul restant dans \`nb_matrices_calcule\`. |
| \`1.2\` | 2026-09-28 | **Élargissement de type (compatible)** : \`decoupe.finition.coins_ronds.quantite\` accepte \`null\` — l'opération « coins ronds » a été retirée de l'outil, le champ reste au contrat et vaut toujours \`null\`. Aucun autre changement de structure. À noter : le **taux horaire passe de 73 à 74 $/h**, donc les montants d'une même fiche changent — c'est une donnée, pas une rupture de contrat. |
| \`1.1\` | 2026-09-16 | **Ajouts (compatibles)** : \`prix.prix_vendu_unitaire\`, \`prix.prix_vendu_total\`, \`production.quantites_alternatives[].prix_vendu_unitaire\` — le prix **décidé par le chargé de projet**, distinct du prix calculé. Précisions sans changement de type : \`decoupe.zund.*.contour\` et \`decoupe.platine.kiss_cut.nb_die\` valent désormais 0 ou 1 ; \`impression.faces.*\` vaut toujours 1. |
| \`1.0\` | 2026-09-10 | Version initiale. |

> **Pour votre intégration (v1.1)** : le prix à retenir pour le client est \`prix.prix_vendu_unitaire\`
> **s'il n'est pas \`null\`**, sinon \`prix.prix_unitaire\`.
>
> **Pour votre intégration (v1.3)** — trois points, dans l'ordre d'importance :
> 1. **Le nombre de feuilles sur lequel raisonner est \`production.nb_matrices\`.** Il vaut
>    maintenant la correction du chef d'atelier quand il y en a une. \`nb_matrices_source\` vous
>    dit laquelle a servi (\`calcul\` ou \`correction\`) sans avoir à comparer les champs.
>    C'était votre question 2 : lire le calcul là où l'atelier avait corrigé produisait une
>    fausse alerte sur chaque dossier corrigé.
> 2. **\`soumission.date_requise\` est maintenant une date ISO**, ou \`null\`. Un \`null\` ne veut pas
>    dire « pas de date demandée » : il veut dire « ce qui a été saisi n'est pas une date »
>    (\`ASAP\`, \`fin du mois\`). Dans ce cas, \`date_requise_texte\` porte la saisie telle quelle.
>    Pour comparer un délai, utilisez \`date_requise\` et \`date_expedition_prevue\`.
> 3. **\`soumission.moment\` vous dit où vous êtes dans le parcours** — voir la section 2 bis.

---

## 2. Exemple complet

\`\`\`json
${exemple}
\`\`\`

---

## 2 bis. Quand l'envoi part — les deux moments

C'est la réponse à votre question 5, et c'est le point à lire en premier.

Vous partiez du passage au statut **Valide**. Or dans Zoho, « Valide » est posé par le bouton
**« Valider → Bon de travail »** : il marque le moment où la job **part en production**, donc
**après** que la proposition a été envoyée au client et acceptée. Une alerte à ce moment-là
arrive après la décision qu'elle devait éclairer.

Nous avons donc ouvert **un second moment**, en amont. Les deux envoient le même contrat, au
même endpoint ; \`soumission.moment\` dit lequel :

| \`soumission.moment\` | Quand | Appels | Ce que vous pouvez encore faire |
|---|---|---|---|
| \`avant_envoi\` | Le chargé de projet vient de produire la proposition. **Le client ne l'a pas encore reçue.** Déclenché par le bouton « Analyser avant envoi » du widget. | \`POST /analyses\` seulement | **Tout.** Un oubli signalé ici se corrige avant que le client voie quoi que ce soit. |
| \`validation\` | La soumission passe en production (« Valider → Bon de travail »), après acceptation du client. | \`PUT /history\` puis \`POST /analyses\` | Alimenter l'historique et la comparaison ; la correction coûte déjà quelque chose. |

**Pourquoi \`avant_envoi\` n'alimente pas \`/history\`** : l'historique est votre base de
comparaison entre soumissions réelles. Y verser des propositions qui ne seront peut-être
jamais acceptées fausserait les comparaisons à venir. L'historique reste alimenté par la
validation seule.

**Vos 8 à 20 secondes sont prises en compte.** Aucun des deux moments n'appelle votre API
depuis le workflow d'enregistrement : l'utilisateur serait bloqué devant un bouton figé, et
Deluge coupe de toute façon les exécutions longues. Le widget pose un drapeau
(\`Webhook_Statut\`), et une fonction séparée fait l'appel.

Dans l'exemple ci-dessus, \`moment\` vaut \`validation\`.

---

## 3. Référence des champs
${docChamps()}

---

## 4. Sécurité

### 4.1 Zoho → votre API (envoi des soumissions)

Zoho appelle votre endpoint avec un **jeton secret partagé** en en-tête :

\`\`\`http
POST /api/soumissions HTTP/1.1
Host: api.votre-plateforme.com
Authorization: Bearer <JETON_SECRET_PARTAGE>
Content-Type: application/json
X-Zoho-Signature: sha256=<HMAC-SHA256 du corps, clé = jeton>
X-Zoho-Event: soumission.validee
X-Zoho-Delivery: <uuid unique par envoi>
\`\`\`

- Le jeton est généré par nous, transmis hors bande (jamais par courriel en clair), stocké chiffré côté Zoho.
- \`X-Zoho-Signature\` vous permet de vérifier que le corps n'a pas été altéré, indépendamment du transport.
  Vérification : \`hex(HMAC_SHA256(jeton, corps_brut)) == signature\`. Comparez en temps constant.
- \`X-Zoho-Delivery\` est unique par tentative : dédoublonnez sur \`soumission.id\` (métier), pas sur cet en-tête.
- Votre réponse attendue : **\`200\`/\`202\`** avec un corps JSON libre (il sera stocké dans Zoho et affiché dans le widget, ex. un verdict d'analyse). \`4xx\` = erreur définitive, pas de rejeu. \`5xx\`/timeout = rejeu.
- Rotation du jeton : nous supportons deux jetons actifs simultanément pour une rotation sans coupure.
- Transport : HTTPS obligatoire, TLS 1.2+.

### 4.2 Votre plateforme → Zoho (lecture inventaire, fournisseurs, clients…)

Deux options, selon ce que vous préférez côté implémentation :

| | Option A — Jeton partagé (simple) | Option B — OAuth 2.0 Zoho (standard) |
|---|---|---|
| Mécanisme | Endpoints **Custom API** Creator, protégés par une clé que nous vous remettons | Client OAuth Zoho (client credentials), scope \`ZohoCreator.customapi.EXECUTE\` |
| Appel | \`GET https://creator.zoho.com/api/v2.1/<compte>/<app>/custom/<endpoint>?publickey=<CLE>\` | \`Authorization: Zoho-oauthtoken <access_token>\` (jeton 1 h, refresh token) |
| Pour qui | démarrage rapide, scripts, tests | production, révocation fine, audit Zoho |
| Rotation | on régénère la clé | standard OAuth |

Recommandation : **A pour démarrer les tests dès maintenant, B avant la mise en production.**
Les deux exposent exactement les mêmes endpoints, en **lecture seule**.

Endpoints prévus (à confirmer avec votre liste d'entités) :

\`\`\`
GET /custom/inventaire                 → liste des matériaux (nom, catégorie, format, coût pi², stock, fournisseur, actif)
GET /custom/inventaire?nom=<nom>       → un matériau par nom exact (clé = materiaux[].nom du contrat)
GET /custom/inventaire?categorie=Vinyle
GET /custom/fournisseurs               → (à confirmer)
GET /custom/clients                    → (à confirmer)
\`\`\`

Pagination : \`?page=1&par_page=200\`, réponse \`{ "donnees": [...], "page": 1, "total": 356 }\`.

---

## 5. Ce qui n'est pas encore figé

| Point | État |
|---|---|
| \`soumission.date_requise\` | **Réglé en v1.3** — date ISO, avec le texte d'origine conservé dans \`date_requise_texte\`. Côté Zoho, le champ du formulaire reste à retyper en Date : tant que ce n'est pas fait, un estimateur peut encore saisir « ASAP », et le contrat renverra alors \`null\`. |
| Heures par **département** et charge planifiée | N'existent pas dans Zoho (votre question 11). Le temps par **opération** est dans \`ventilation_couts[].temps\`. Les heures par département se construiraient à partir des opérations — c'est un développement ; la charge planifiée supposerait un ordonnancement, qui n'existe pas. |
| Composition et fiche technique des matériaux | N'existent nulle part dans Zoho (votre question 4a). L'épaisseur, elle, est livrée depuis la v1.3. |
| \`soumission.notes\` + fichiers joints | champ Notes long prévu ; **fichiers : nombre et taille max à confirmer** (25 fichiers / 50-100 Mo évoqués, vs limites de votre moteur d'analyse) — nous proposons d'envoyer des **URL signées** plutôt que les fichiers eux-mêmes dans le JSON |
| Réponse de votre API | libre pour l'instant ; si vous renvoyez un verdict structuré (ex. \`{ "alertes": [...] }\`), dites-nous le format et on l'affichera tel quel dans le widget |
| Règles métier | à répartir Zoho / IA d'après votre liste — les règles déterministes (seuils, champs obligatoires, combinaisons interdites) restent côté Zoho |
| Entités en lecture | inventaire confirmé ; fournisseurs / clients / autres à confirmer par vous |

---

*Contact technique : voir le fil courriel. Toute question sur un champ précis : citez son chemin (ex. \`decoupe.platine.coupe.up\`).*
`;

writeFileSync(resolve(outDir, "CONTRAT-SOUMISSION.md"), doc, "utf8");

console.log("OK — docs/api/exemple-soumission.json (" + exemple.length + " car.) + CONTRAT-SOUMISSION.md");
console.log("champs saisis :", nbIn, "· calculés :", nbOut);
console.log("prix :", JSON.stringify(json.prix));
console.log("materiaux :", (json.materiaux as unknown[]).length, "· ventilation :", (json.ventilation_couts as unknown[]).length);
