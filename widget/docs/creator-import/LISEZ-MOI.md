# Import des trois tables Creator qui restent à créer

Ces CSV sont **générés depuis le code** (`npm run gen:import`). Ne pas les éditer à la main :
la prochaine génération écraserait la modification. Pour changer une valeur, changer la donnée
dans `src/data/` et régénérer.

## Pourquoi un import, et pas une création par l'API

Les Builder APIs de Creator ne peuvent pas créer ces tables sur ce compte. `createForm` exige
`environment: "development"` — c'est le seul environnement supporté — et cet environnement
n'existe pas ici :

```
getAppEnvironmentStatus → 11580 : Environments are not supported for this version of creator
```

Ce n'est pas un refus temporaire ni un problème de droits : c'est une limite du forfait
Creator. La création des tables passe donc par l'interface, à la main.

Mais ce qui est à la main n'a pas à être **recopié** à la main. 68 lignes tapées, ce sont 68
occasions de faute de frappe — et dans ces tables, une faute de frappe **ne produit aucune
erreur** : la ligne est écartée par le filtre, la table renvoie une liste vide, le code retombe
en silence sur les données embarquées. Tout a l'air de fonctionner, et plus rien de ce qu'on
change dans la table n'a d'effet.

## Les trois tables

| Fichier | Table à créer | Rapport attendu | Lignes |
|---|---|---|---|
| `Formats_Feuille.csv` | `Formats_Feuille` | **`Formats_Feuille_Report`** | 9 |
| `Config_Champs_Produit_Numerique.csv` | `Config_Champs_Produit_Numerique` | — | 39 |
| `Filtre_Materiau_Produit.csv` | `Filtre_Materiau_Produit` | — | 20 |

Le nom du rapport de `Formats_Feuille` n'est pas libre : c'est celui que le code demande
(`REPORT_FORMATS_FEUILLE`).

## Types de champs

**`Formats_Feuille`** — `Nom_format` ligne simple · `Largeur_po` décimal · `Hauteur_po`
décimal · `Actif` liste Oui/Non. Une ligne sans largeur **ou** hauteur > 0 est ignorée.
« Non » ou `0` ⇒ inactif ; **tout le reste, y compris un champ vide, vaut actif** — d'où le
« Oui » explicite dans le CSV.

**`Config_Champs_Produit_Numerique`** — `Type_produit`, `Sauf`, `Bloc`, `Champ_technique`,
`Libelle`, `Depend_de` en ligne simple · `Type_champ` liste
(`choix`/`multi`/`case`/`texte`/`decimal`) · `Options` et `Depend_valeurs` en zone de texte,
valeurs séparées par `;` · `Ordre` nombre · `Actif` et `Requis` nombre (1/0).

**`Filtre_Materiau_Produit`** — `Type_produit` et `Materiau` en ligne simple. Une ligne par
couple : une liste dans une cellule ne se filtre pas.

## ⚠ Deux pièges à connaître avant d'importer

**1. Les noms de champs doivent être exacts.** `Largeur_po`, pas `Largeur` ni `Largeur_PO`.
Zoho dérive le nom de lien du libellé affiché et peut en changer la casse en silence — vérifier
le nom réel après création, pas celui qu'on a tapé.

**2. `Ordre` est une numérotation GLOBALE** dans `Config_Champs_Produit_Numerique` : les champs
communs et ceux d'un produit sont triés ensemble. Les bandes réservées sont documentées dans
`src/data/produitsNumeriques.ts` et dans `docs/production-numerique.md`. Renuméroter au hasard
coupe un bloc en deux à l'écran et fait passer les questions du produit avant le champ qui
choisit le produit. Le code refuse une telle configuration (`incoherencesConfig`), mais autant
ne pas la créer.

## Vérification obligatoire après création

L'import ne prouve rien : il faut vérifier que le widget **lit** la table.

1. Ajouter dans `Formats_Feuille` une ligne évidente : `99 × 99`, Actif = Oui.
2. Ouvrir une soumission avec une grosse quantité, assez pour que le bloc de montage sorte.
3. Le format 99 × 99 doit apparaître parmi les candidats.
4. S'il n'apparaît pas, **la table n'est pas lue** — vérifier les noms de champs et le nom du
   rapport.
5. Retirer la ligne de test.
