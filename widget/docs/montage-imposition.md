# Optimisation du montage (imposition)

État au 3 novembre 2026. Donne la dimension d'une pièce et la quantité : le widget propose le
format de feuille qui met le plus de « up » par feuille, donc le moins de feuilles imprimées.

| Étape du handoff (2 nov.) | État |
|---|---|
| 1a — table `Presses` | **déjà en place**, rien à créer (voir plus bas) |
| 1b — table `Formats_Feuille` | **à créer à la main** dans le builder (API indisponible) ; le widget tourne en attendant sur le snapshot |
| 2 — paramètres | **fait** — 3 enregistrements `APP_MONTAGE_*` dans `Taux_Calcul` |
| 3 — fonction de calcul | **fait** — `widget/src/lib/montage.ts` (+ version Deluge dans `docs/api/deluge/Calc_Montage.ds`) |
| 4 — validation contre l'Excel | **fait** — `npm run verif:montage`, 1 568 cas d'aller-retour + les cas du handoff |
| 5 — affichage « Montage suggéré » | **fait** — bloc dans la carte Presse de la soumission |
| 6 — réinjection dans le temps d'impression | **pas fait** — demande une décision, voir « Ce qui reste » |

---

## La formule, et d'où elle vient

Le classeur calcule dans le sens direct, en `FT!AF39` / `FT!AI39` :

```
dim_feuille = pièce × N + espace × (N − 1) + 2 × pourtour
```

avec `AF41 = S!V7` (largeur pièce), `AI41 = S!Y7` (hauteur pièce), `AH43 = 0,25` po (espace
entre up) et `AH44 = 0,5` po (pourtour, par côté). Vérifié contre les valeurs mises en cache
par Excel : pièce 7 × 1,4 avec 1 up horizontal et 4 verticaux → **8 × 7,35 po**.

On cherche le N maximum qui tient. En résolvant pour N :

```
N = partie_entière( (dim_feuille − 2 × pourtour + espace) ÷ (pièce + espace) )
```

Le `+ espace` au numérateur n'est pas cosmétique : il y a **N − 1** espaces entre N up, pas N.

### Correction à apporter au handoff : le 2ᵉ cas de test annonce 13, c'est 14

Le handoff donne deux cas. Le premier est juste, le second non :

| Pièce | Feuille | Handoff | Calculé | |
|---|---|---|---|---|
| 7 × 1,4 | 24 × 48 | 84 (3 × 28) | **84** | ✔ |
| 7 × 1,4 | 12 × 24 | 13 (1 × 13) | **14** (1 × 14) | ✘ handoff |

Détail : `(24 − 1 + 0,25) / (1,4 + 0,25) = 14,09 → 14`. Et la vérification par la formule
directe tranche sans ambiguïté : 14 up occupent `1,4 × 14 + 0,25 × 13 + 1 = 23,85 po ≤ 24 po`
— ils tiennent. 13 up n'occupent que 22,20 po : il reste de la place inutilisée.

Les deux cas du handoff ne sortent pas de la même formule : 13 s'obtient en oubliant le
`+ espace`, c'est-à-dire en réservant un espace après le dernier up. Comme le premier cas
donne 84 avec ou sans ce terme, l'erreur ne s'y voit pas. **C'est la formule du classeur qui
a été retenue** — elle est l'autorité, et elle donne 14.

---

## Les paramètres

`espace` et `pourtour` **ne sont pas** des paramètres nouveaux : ils sont déjà dans le
classeur (`FT!AH43`, `FT!AH44`) et c'est de là qu'ils sont lus. Les créer ailleurs aurait
donné deux sources pour la même valeur.

Les trois autres sont des enregistrements `Taux_Calcul`, créés et vérifiés le 3 novembre
(même mécanisme que `APP_SEUIL_DOUBLE_CHECK`) :

| Code | Valeur | Rôle |
|---|---|---|
| `APP_MONTAGE_SEUIL_FEUILLES` | 350 | au-delà de ce nombre de feuilles, on propose un format |
| `APP_MONTAGE_DIM_MIN` | 8 | aucun côté de feuille sous 8 po |
| `APP_MONTAGE_GRAIN_FIGE` | 1 | 1 = une seule orientation ; 0 = rotation 90° permise |

Modifiables dans Creator sans redéploiement. Le code garde les mêmes valeurs en défaut :
une valeur absente ou aberrante retombe sur le défaut, jamais sur 0.

---

## Étape 1a : la table `Presses` existe déjà

Le handoff demande de créer une table `Presses` avec `Format_max_L` / `Format_max_H`. **Elle
existe** : le formulaire `Fiche_Machine`, catégorie `Serigraphie`, porte déjà
`Largeur_max_po` et `Hauteur_max_po`, et l'écran de soumission les affiche depuis juillet
(« feuille max 30×50 po » sous le sélecteur de presse). En créer une seconde aurait installé
deux sources de vérité pour la même donnée. Le calcul lit donc les fiches machines.

### ⚠ Conflit de données à trancher à la rencontre

Les « format maxi » fournis par le client le 2 novembre **ne correspondent pas** aux fiches
en place. Relevé en direct dans Creator le 3 novembre :

| Presse | Client (2 nov.) | Creator (en place) | |
|---|---|---|---|
| 110 | 21 × 30 | 26 × 18 | ≠ |
| 116 | 16 × 12 | 12 × 8 | ≠ |
| 120 | 30 × 28 | vides — fiche **inactive** | ≠ |
| 130 | 21 × 28 | 21 × 28 | ✔ seule concordance |
| 140 | 24 × 24 | 25 × 38 | ≠ |
| 150 | 44 × 64 | 30 × 50 | ≠ |
| 170 | 30 × 39 | 30 × 40 | ≈ |
| 182 (Multiprint) | absente | 24 × 44, active | absente de la liste client |

« One man » (48 × 96) et « DTS » (48"–96"), actives elles aussi, sont également absentes de
la liste client.

Conséquence concrète, et c'est elle qui montre que le conflit est réel : la liste client
contient le format **16 × 12 uniquement parce que la presse 116 ferait 16 × 12**. Avec sa
fiche Creator (12 × 8), le 116 ne peut rouler **aucun** des 9 formats permis — pas même le
12 × 12. Le format 16 × 12 reste proposé (7 autres presses le roulent), mais sa justification
tombe.

**Rien n'a été écrasé.** Les valeurs client sont conservées, sans servir au calcul, dans
`widget/src/data/montageSnapshot.ts` (`FORMAT_MAX_PRESSE_CLIENT_2NOV`). Une fois la question
tranchée, il n'y a qu'un endroit à corriger : les fiches machines.

---

## Étape 1b : la table `Formats_Feuille` reste à créer

L'API Builder de Creator est refusée sur ce compte (`code 30120 — Allowed only for C6
Account`), donc la table n'a pas pu être créée par script. **Le widget fonctionne sans elle** :
il retombe sur `FORMATS_FEUILLE_SNAPSHOT` (les 9 formats du client). Dès que la table existe,
elle fait foi — même règle que les machines.

À créer dans le builder, formulaire **`Formats_Feuille`** :

| Champ | Type | Lien attendu |
|---|---|---|
| Nom format | Single line | `Nom_format` |
| Largeur po | Decimal | `Largeur_po` |
| Hauteur po | Decimal | `Hauteur_po` |
| Actif | Number (1/0) | `Actif` |

Puis un rapport nommé **`Formats_Feuille_Report`** exposant les quatre colonnes — un champ
absent de la configuration du rapport revient vide, en silence. Vérifier les noms de liens
réels par une lecture API avant de s'y fier : Creator les dérive du libellé et change parfois
la casse.

Lignes à semer (client, 2 nov.) : 24 × 48, 24 × 36, 21 × 28, 24 × 24, 30 × 28, 21 × 30,
12 × 24, 12 × 12, 16 × 12 — toutes actives.

> La compatibilité format ↔ presse **ne se stocke pas** : elle se déduit des formats maxi
> (`W ≤ maxW et H ≤ maxH`). Une table de liaison aurait à être maintenue à chaque changement
> de parc.

---

## L'ordre de préférence

À quantité donnée, les candidats sont classés :

1. le **moins de feuilles** ;
2. à égalité, le **plus petit format** (moins de perte) ;
3. puis le plus de up, puis le nom — pour que deux exécutions donnent le même résultat.

Un format est écarté, en disant pourquoi, s'il est inactif, s'il a un côté sous la dimension
minimale, si aucune presse ne peut le rouler, ou si la pièce n'y tient pas.

Conséquence de la règle 2, visible dans la vérification : à 50 pièces de 7 × 1,4, c'est
`30 × 28` qui gagne (64 up, 1 feuille) et non `24 × 48` (84 up, 1 feuille aussi) — à feuille
égale, la plus petite est préférable.

---

## L'affichage

Bloc « Montage suggéré » dans la carte Presse. Il **n'apparaît qu'au-delà du seuil** : sur un
petit job la question ne se pose pas. Il annonce le format, les up par feuille, le nombre de
feuilles, le gain, et les presses capables de le rouler. Deux boutons : **Accepter** (range le
format dans la pseudo-cellule `X!MONTAGEFORMAT`, et les up dans `X!MONTAGEUP`) et **Annuler**.

Comme toutes les pseudo-cellules `X!`, elles voyagent et se sauvegardent avec la soumission,
et **aucune formule du classeur ne les lit**. Le moteur n'est pas touché.

### Le seuil : une hypothèse à lever

Le handoff dit : « calculer d'abord `feuillesBase` sur le format courant ; ne proposer que si
`feuillesBase > 350` ». **La soumission n'a pas de champ « format de feuille »** aujourd'hui.
Le classeur a bien une chaîne de comptage de feuilles —
`FT!E44 = E39 / E42 / E43` (quantité ÷ up par matrice ÷ matrices par feuille) — mais `E38` et
`E43` se saisissent sur le bon de travail, pas dans la soumission : `FT!E44` vaut 0 ici.

En attendant, donc : le seuil se mesure sur `FT!E44` quand il est renseigné, sinon sur le
nombre de feuilles du format recommandé — faute de base, c'est la seule mesure de la taille du
job disponible. Le gain, lui, n'est chiffré que si une base existe ; sinon le bloc le dit
(« pas de format courant saisi »). **Décision à prendre :** ajouter un champ « format courant »
à la soumission, ou accepter cette mesure de substitution.

---

## Vérification

```bash
cd widget && npm run verif:montage
```

Sept sections, toutes au vert :

1. **1 568 cas d'aller-retour** contre la formule directe du classeur, sur 4 espaces × 4
   pourtours × 7 pièces × 14 dimensions : pour chacun, le N annoncé doit tenir dans la feuille
   **et** N + 1 doit la dépasser. C'est ce qui prouve que l'inversion est exacte et maximale,
   pas seulement plausible.
2. `FT!AH43 = 0,25` et `FT!AH44 = 0,5` lus dans le moteur ; la formule directe reproduit le
   cache Excel (8 et 7,35).
3. Les deux cas de test du handoff, dont la correction 13 → 14.
4. La sélection sur les 9 formats, avec les formats maxi client **et** avec les fiches
   Creator, côte à côte — c'est la sortie qui documente le conflit.
5. Garde-fous : quantité 0, dimensions manquantes, pièce trop grande, dimension minimale,
   grain libre jamais moins bon que grain figé.
6. Le seuil : un job de 143 feuilles ne déclenche rien, un job de 2 143 feuilles déclenche et
   annonce un gain cohérent.
7. Intégration : mêmes entrées que l'écran (moteur, fiches machines, scénario Exemple).

---

## Ce qui reste

1. **Étape 6 — réinjecter le format dans le temps d'impression.** Pas fait, et volontairement :
   cela change des prix. Le temps de roulement du classeur est porté par six cellules de
   cadence (voir le commentaire de `lib/machines.ts`) ; décider lesquelles le nombre de
   feuilles doit alimenter, et avec quel effet sur le prix, est un arbitrage client, pas un
   choix d'implémentation.
2. **Créer `Formats_Feuille`** + son rapport (ci-dessus).
3. **Trancher le conflit des formats maxi** et corriger les fiches machines.
4. Les 4 points « À reconfirmer » du handoff. Le point 2 (« minimum 8″ » = dimension minimale
   d'une feuille) est implémenté selon l'interprétation retenue ; le point 4 (grain figé =
   pièce telle que saisie) aussi, et le code sait déjà faire tourner la pièce si la réponse
   change (`APP_MONTAGE_GRAIN_FIGE = 0`).

## Hors sujet, noté à la réunion du 2 nov.

- PDF de proposition : mettre l'adresse de **Laval**.
- **Garder le US** (prix en US).

Ces deux points touchent la proposition client (`components/PopupProposition.tsx`), pas le
montage. Non faits.
