# Architecture de l'API — hiérarchie, conventions, implémentation Zoho

Décisions prises le 2026-09-10 :
- source des données = **notre app `groupecanva`** (mode dev pour l'instant) ;
- fournisseurs = lus dans l'ancienne app `s-c-ft-groupe-canva` (`Fournisseur_Report`) ;
- clients = **dérivés des soumissions** (`Form1`) pour l'instant, CRM plus tard ;
- pas de Custom API pour ce que le client peut lire directement… **sauf** qu'on veut une API
  propre et stable pour lui → on met une façade (voir §3).

---

## 1. La contrainte Zoho qui dicte le design

Une **Custom API Creator = une fonction Deluge = une URL plate** :

```
https://www.zohoapis.com/creator/custom/groupecanva/<api_name>?param=valeur
```

- pas de segment de chemin dynamique (`/materiaux/{id}` impossible) ;
- un seul verbe HTTP par fonction (GET **ou** POST) ;
- les paramètres passent en **query string** (GET) ou en **corps JSON** (POST).

Donc la hiérarchie est **logique** (dans les noms et les paramètres), pas physique (dans les
chemins). C'est la norme sur Creator ; on la rend propre par une convention stricte (§2).
Si un jour on veut de vrais chemins REST, c'est **Zoho Catalyst API Gateway** (§5).

---

## 2. La hiérarchie logique (ce que le client voit)

```
v1
├── soumissions                       liste · filtres statut / client / depuis · pagination
│   ├── {id}                          la soumission complète = le JSON du contrat
│   └── {id} / bons-travail           les bons de travail liés
├── bons-travail
│   └── {id}
├── materiaux                         catalogue matières · filtres categorie / nom / actif
│   └── {id}
├── fournisseurs                      (ancienne app, lecture)
├── clients                           (dérivés des soumissions, lecture)
├── machines                          presses / Zund / platines (fiches)
└── webhooks
    └── soumission-validee            SORTANT : Zoho → client, POST, contrat v1.0
```

### Traduction en URLs Creator (Option A — maintenant)

| Ressource logique | URL réelle | Paramètres |
|---|---|---|
| `GET /v1/soumissions` | `…/custom/groupecanva/v1_soumissions` | `statut`, `client`, `depuis` (ISO), `page`, `par_page` |
| `GET /v1/soumissions/{id}` | `…/custom/groupecanva/v1_soumissions` | **`id`** — présence de `id` = « une seule » |
| `GET /v1/soumissions/{id}/bons-travail` | `…/custom/groupecanva/v1_bons_travail` | `soumission_id` |
| `GET /v1/bons-travail/{id}` | `…/custom/groupecanva/v1_bons_travail` | `id` |
| `GET /v1/materiaux` | `…/custom/groupecanva/v1_materiaux` | `categorie`, `nom` (exact), `recherche` (contient), `actif`, `page`, `par_page` |
| `GET /v1/materiaux/{id}` | `…/custom/groupecanva/v1_materiaux` | `id` |
| `GET /v1/fournisseurs` | `…/custom/groupecanva/v1_fournisseurs` | `page` |
| `GET /v1/clients` | `…/custom/groupecanva/v1_clients` | `recherche`, `page` |
| `GET /v1/machines` | `…/custom/groupecanva/v1_machines` | `famille` (presse/zund/platine/…), `actif` |
| `POST webhook` | **l'URL du client** | corps = contrat v1.0 |

**Règles de nommage**
- `api_name` = `v<majeur>_<ressource>` en minuscules, pluriel, sans accent : `v1_materiaux`.
- La **version majeure est dans le nom** → `v2_materiaux` peut coexister avec `v1_materiaux`
  pendant la transition. Les ajouts compatibles ne changent pas le nom (`schema_version` mineure).
- `id` seul → un objet ; sinon → une liste paginée. Jamais les deux formats mélangés.
- Sous-ressource = paramètre `<parent>_id` (`soumission_id`), pas un chemin.

---

## 3. Conventions communes à tous les endpoints

### Enveloppe de réponse

```jsonc
// liste
{ "donnees": [ … ], "page": 1, "par_page": 200, "total": 356, "page_suivante": 2 }

// objet
{ "donnees": { … } }

// erreur — TOUJOURS ce format, quel que soit l'endpoint
{ "erreur": { "code": "MATERIAU_INTROUVABLE", "message": "Aucun matériau nommé « Lexan Clair ,005 ».", "details": {} } }
```

### Codes HTTP

| Code | Quand |
|---|---|
| 200 | OK (liste vide = 200 avec `donnees: []`, pas 404) |
| 400 | paramètre invalide (`page` négatif, `depuis` mal formé) |
| 401 | jeton / clé absent ou invalide |
| 404 | `id` inconnu |
| 429 | quota dépassé (Creator limite les appels : voir §6) |
| 500 | erreur interne — le `message` ne révèle jamais de détail Deluge |

### Pagination
`page` ≥ 1, `par_page` ≤ 200 (limite Creator), défaut 100. Tri stable par `ID` décroissant.

### Filtres
- égalité : `?statut=Valide`
- date : `?depuis=2026-09-01` (ISO, inclusif)
- texte : `?nom=` exact (clé de jointure avec le contrat) · `?recherche=` contient, insensible à la casse

### Formats = ceux du contrat
Mêmes conventions que `CONTRAT-SOUMISSION.md` : noms métier, `%` en 0-100, booléens, `null`,
CAD 2 déc., dates ISO. **Un matériau a la même forme** qu'il arrive par `/v1/materiaux` ou dans
`soumission.materiaux[]` → le client écrit un seul mapping.

### En-têtes
```
X-API-Version: 1.0          (renvoyé par chaque endpoint)
X-Request-Id: <uuid>        (renvoyé ; à citer en cas de problème)
Cache-Control: max-age=300  (matériaux, fournisseurs, machines — données lentes)
```

---

## 4. Implémentation Zoho — endpoint par endpoint

| Endpoint | Source | Déjà là ? | Reste à faire |
|---|---|---|---|
| `v1_soumissions` | `Form1_Report` (colonne `Soumission_JSON`) | Form1 ✅, JSON ⏳ | ajouter `Soumission_JSON` + `Statut` sur Form1, le widget l'écrit à l'enregistrement, la fonction le renvoie **tel quel** (aucune transformation en Deluge) |
| `v1_bons_travail` | `bon_travail_Report` | ✅ | fonction Deluge : lit, mappe les colonnes plates |
| `v1_materiaux` | `Machines_Report` (Product, `Est_materiau = 1`) | ✅ 356 lignes, **prix à 0** | **réconcilier les 169 prix** de l'ancienne app → `Mat_Cout_pi2` (script) ; fonction Deluge = gabarit fourni |
| `v1_fournisseurs` | `s-c-ft-groupe-canva` / `Fournisseur_Report` | ✅ 15 | fonction Deluge **inter-app** (`zoho.creator.getRecords` avec le nom de l'ancienne app + connexion) |
| `v1_clients` | distinct de `Form1.Client` + `No_Client` | ✅ | fonction Deluge : agrège ; **provisoire** — bascule CRM plus tard sans changer l'URL |
| `v1_machines` | `Fiche_Machine_Report` | ✅ 37 | fonction Deluge |
| webhook sortant | workflow Form1 « Statut → Valide » | ⏳ | Deluge `invokeUrl` + `Integration_Log` |

**Principe : Deluge ne calcule rien, ne transforme presque rien.** Il lit un rapport, renomme
les colonnes en noms métier, met l'enveloppe. Toute la logique (prix, JSON de soumission) reste
dans le widget/moteur. Une fonction Deluge = 40-60 lignes, toutes construites sur le même gabarit
(`deluge/v1_materiaux.ds`).

### Auth par phase

| Phase | Mécanisme | Où |
|---|---|---|
| Dev (maintenant) | `?publickey=<clé>` | clé générée dans le builder de chaque Custom API ; **une clé par endpoint**, on peut en révoquer un sans toucher aux autres |
| Prod | OAuth 2.0 client credentials, scope `ZohoCreator.customapi.EXECUTE` | un client OAuth dédié au client, révocable |

---

## 5. Option B — Catalyst API Gateway (plus tard, si besoin de vrais chemins)

```
client ──► https://api.groupecanva.com/v1/materiaux/{id}     (Catalyst API Gateway)
                    │  auth, quota, versions, journal — gérés par la passerelle
                    ▼
           fonction Advanced I/O (Node/Express) ──► REST API Creator v2.1 / SDK
```

Ce que ça apporte : vrais chemins REST, **un seul domaine**, throttling par consommateur,
versions gérées par la passerelle, et — important — **le moteur de prix peut y tourner**
(Node, 0 dépendance DOM) pour un futur `POST /v1/soumissions` qui renvoie le prix.
Ce que ça coûte : un projet Catalyst à maintenir + licence. **Pas maintenant.**
L'Option A est conçue pour qu'un passage à B ne change **que l'URL de base** côté client.

---

## 6. Limites Creator à connaître

- Appels API : quota journalier par compte selon le plan (vérifier dans Paramètres → API) ;
  d'où `Cache-Control` sur les données lentes et la pagination à 200 max.
- Une fonction Deluge : temps d'exécution limité → ne jamais boucler sur tout un rapport
  sans pagination.
- `publickey` voyage dans l'URL → journaux HTTP côté client : **dev seulement**.

---

## 7. Ordre de construction

1. `v1_materiaux` (gabarit fourni) — c'est celui que l'IA du client utilisera en premier.
   Prérequis : réconciliation des prix.
2. `v1_soumissions` — après ajout de `Soumission_JSON` sur Form1 + branchement widget.
3. `v1_fournisseurs`, `v1_clients`, `v1_machines` — copies du gabarit.
4. `v1_bons_travail`.
5. Webhook sortant.
6. Spec `openapi.yaml` publiée au client → il génère son SDK.
