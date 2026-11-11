# Production numérique — formulaire intelligent

État au 11 novembre 2026. Handoff du 10 novembre. Le cerveau du formulaire est livré et vérifié
(`npm run verif:numerique`, 10 sections, tout au vert). L'étape 6 — le prix — n'est pas faite,
et le handoff se trompe sur deux points qui la concernent : voir **Deux prémisses à corriger**.

| Étape du handoff | État |
|---|---|
| 1 — champs communs numérique | **fait** — `Num_Usage`, `Num_Type_produit` + les 5 blocs communs |
| 2 — encadrés par produit | **fait pour les 4 produits fournis** ; E et F présents mais inactifs |
| 3 — table de config | **fait côté code** (`data/produitsNumeriques.ts`, 39 lignes) ; la table Creator est **à créer à la main** |
| 4 — comportement widget | **fait** — `lib/numerique.ts` : filtrage, affichage conditionnel, vidage au changement de produit |
| 5 — filtrage des matériaux | **fait**, mais non rapproché de l'inventaire (colonne « type numérique » pas encore remplie) |
| 6 — branchement sur le calcul | **pas fait** — et ce n'est pas un branchement, voir ci-dessous |
| 7 — validations | **fait** — requis par produit, requis conditionnels, blocage |

L'écran lui-même n'est pas construit : le « 2e widget » n'existe pas encore dans le dépôt
(il y a `canevas`, `bontravail`, `pointage`). Ce qui est livré est la couche que cet écran
consommera, avec ses tests — pas une coquille d'interface vide.

---

## Deux prémisses à corriger

Le handoff dit : « **Backend conservé** — on branche sur le calcul numérique existant
(`S!O5` = numérique) ». Les deux moitiés de cette phrase sont fausses. Vérifié dans le code le
11 novembre.

**1. `S!O5` n'est pas le numérique.** Dans `lib/modele.ts` :

```ts
multiprint: "S!O5",        // 1 = oui
numeriqueMultiUp: "S!O6",  // 1 = oui
```

`S!O5` est la bascule **Multiprint IST** — une presse de sérigraphie. Router le numérique
dessus brancherait sur un mode sérigraphie et donnerait des prix de sérigraphie.

**2. Il n'y a pas de calcul numérique à conserver.** `data/machinesCalc.ts` :

```ts
export type FamilleMachine = "presse" | "zund" | "platine" | "laminoir" | "slitter" | "guillotine";
```

Aucune famille `numerique`. Les machines Flash — Inca Onset R40Lt, Inca Onset R40i, HP Latex,
Acuity, Anapurna — n'existent que dans `administrationSnapshot.ts` avec
`Categorie: "Numerique"` : un inventaire administratif, **sans vitesse ni taux horaire**. Rien
ne pilote un coût.

**Conséquence.** L'étape 6 est une construction, pas un branchement. Il faut, dans cet ordre :

1. une famille de machines `numerique` dans `FamilleMachine` + ses défauts de famille ;
2. les **vitesses** des machines numériques dans `Fiche_Machine` (comme `Largeur_max_po` pour
   les presses) — c'est le point 2 de la liste « En attente » du handoff ;
3. les **taux des finitions** (œillet, ourlet, montage substrat, perçage, lampe DEL,
   installation, infographie) — point 3 de la même liste.

Tant que 2 et 3 manquent, le module **signale** ces postes au lieu de les chiffrer
(`postesACouter()`). Un zéro silencieux serait pire : il se lit comme « gratuit » et part dans
une proposition client.

---

## Ce qui a été ajouté au handoff, et pourquoi

### Deux colonnes dans la table de configuration

Le handoff décrit `Config_Champs_Produit_Numerique` avec 8 colonnes. Il manque de quoi
exprimer l'étape 7 :

| Colonne ajoutée | Ce qu'elle permet |
|---|---|
| `Requis` | « laminage obligatoire sur les autocollants » — une règle de données, pas de mise en page |
| `Depend_de` + `Depend_valeurs` | « si montage substrat → type/dim/qté requis », « si installation demandée → adresse/surface/date » |

Sans elles, l'étape 7 serait écrite en dur dans le widget — exactement ce que la table doit
éviter (« BSP/client ajuste une ligne au lieu de recoder »). C'est le seul écart avec le handoff.

### Des bandes réservées pour la colonne `Ordre`

`Ordre` est une numérotation **globale** : les champs communs et les champs d'un produit
sont triés ensemble. S'ils partagent les mêmes numéros, les blocs se télescopent. C'est le
défaut le plus difficile à voir dans la table Creator — chaque ligne y est correcte prise
isolément, mais à l'écran le bloc « Numérique » se retrouve **coupé en deux** et les
questions du produit passent **avant** le champ qui choisit le produit.

| Bande | Contenu |
|---|---|
| 10 – 90 | bloc pilote : usage, type de produit |
| 100 – 899 | encadré du produit (un seul visible à la fois) |
| 1000 – 8999 | sections communes : dimensions, quantité, infographie, installation |
| 9000 | notes, toujours en dernier |

`incoherencesConfig()` **refuse** une configuration où un bloc se retrouve coupé en deux :
c'est le garde-fou qui rattrape une renumérotation faite dans Creator, plutôt que de la
laisser se découvrir à l'écran.

L'ordre obtenu, pour les autocollants : *Numérique > Média / matière adhésive > Type
d'impression > Laminage > Finition > Montage sur substrat > Dimensions > Quantité >
Infographie > Installation > Notes*. L'encadré du produit vient juste après le bloc pilote,
conformément à l'étape 4 du handoff (« sélection d'un produit → afficher son encadré ») ;
pour le faire passer après les dimensions, il suffit de changer les `Ordre` dans la table.

### Les constantes ne sont pas des questions

Le handoff le dit pour le roll-up : « Vinyle 9 oz à dos gris · Recto seulement (constantes, pas
des questions) ». Elles sont donc dans `CONSTANTES_PRODUIT`, pas dans la configuration — sinon
l'écran afficherait une liste déroulante à un seul choix. Elles voyagent quand même jusqu'au
bon de travail.

---

## Trois points à confirmer avec le client

**1. Les dimensions du roll-up.** ⚠ *Décision d'implémentation.* Le handoff retire
l'installation du roll-up mais ne dit rien du bloc Dimensions. Or le roll-up se commande par
format catalogue (33 × 80, 48 × 80) : demander en plus une largeur et une hauteur libres
contredirait le premier principe du handoff (« une info se saisit une fois ») et permettrait une
soumission où le format dit 33 × 80 et les dimensions 24 × 60. Les dimensions sont donc
**déduites du format** et le bloc Dimensions est masqué pour ce produit. À confirmer.

**2. Le plancher de 4 œillets.** Le handoff donne la formule : `nb = périmètre ÷ espacement`.
Appliquée telle quelle, une bannière 12 × 12 po aux 24 po donne **2** œillets. Or une bannière
porte toujours un œillet à chaque coin. Un plancher de 4 est donc appliqué — **c'est une
hypothèse, pas une donnée du handoff**. À valider avec Roberto avant d'y brancher un coût.
Si les deux espacements sont cochés, le plus serré gagne : c'est le plus coûteux, et se tromper
vers le bas sous-facturerait.

**3. « Coins arrondis » est de retour.** L'option figure dans la finition des **panneaux**
(feuille client). Elle avait été retirée du contrat sérigraphie le 28 septembre 2026
(contrat v1.2). Les deux faits peuvent coexister — la feuille numérique est une autre source —
mais il faut le dire, pas le trancher seul.

À signaler aussi, sans décision requise : **`Ban_Impr_couleur` n'a qu'une option**
(« 4 couleurs process »). C'est une constante posée comme question dans la feuille client. Le
champ est conservé — le jour où une deuxième couleur apparaît, la ligne est déjà là — et
`optionUnique()` le signale.

---

## Un effet de bord à arbitrer : 14 blocages sur un formulaire vierge

Un encadré Autocollants vide produit **14 bloquants** (usage, type de produit, unité, largeur,
hauteur, quantité, infographie, installation, média, faces, couleurs, laminage, montage, plus
« dimensions manquantes »). C'est le comportement demandé par l'étape 7 — mais c'est exactement
la question ouverte des **règles 2 et 15** de la liste Openmind : *bloque-t-on l'envoi tant
qu'une info manque, alors que les chargés de projet travaillent souvent avec des infos
partielles ?*

La réponse de Philippe s'applique aux deux dossiers. Si c'est « non », il suffit de passer les
`Requis` à `0` dans la table de configuration — aucun code à changer. C'est précisément ce que
la table est là pour permettre.

Un requis **masqué** ne bloque jamais : on ne bloque pas sur un champ que l'utilisateur ne voit
pas. Vérifié (`verif-numerique`, section 6).

---

## À créer à la main dans Creator

L'API Builder de ce compte refuse la création de formulaires et de champs
(`30120 — Allowed only for C6 Account`), comme pour `Formats_Feuille`. Les deux tables sont donc
à créer dans le concepteur, et les lignes à semer sont exactement celles du code :

| Table | Colonnes | Semence |
|---|---|---|
| `Config_Champs_Produit_Numerique` | `Type_produit`, `Sauf`, `Bloc`, `Champ_technique`, `Libelle`, `Type_champ`, `Options` (`;`), `Ordre` (⚠ bandes réservées, voir plus haut), `Actif`, `Requis`, `Depend_de`, `Depend_valeurs` | `CONFIG_CHAMPS_NUMERIQUE` — 39 lignes |
| `Filtre_Materiau_Produit` | `Type_produit`, `Materiau` | `FILTRE_MATERIAU_PRODUIT` — 20 lignes |

Tant qu'elles n'existent pas, le widget tourne sur le repli embarqué, comme pour le montage.

---

## Vérification

```
npm run verif:numerique
```

Dix sections, toutes au vert :

1. **Cohérence de la configuration** — aucune condition qui pointe vers un champ ou une valeur
   inexistants, aucun champ déclaré deux fois, aucun ordre en double dans un bloc. Une condition
   fausse masquerait un champ pour toujours, sans message : invisible à l'œil nu dans la table
   Creator.
2. **Les options, comptées une par une** contre les feuilles client : 7 médias adhésifs,
   8 matières rigides, 6 finitions de panneau, 4 matériaux de bannière… et le contrôle qui compte
   le plus : le laminage des autocollants est requis **et** n'offre pas « Aucun » — sinon
   l'obligation serait respectée formellement et contournée en pratique.
3. **Un seul encadré à la fois**, et dans le bon ORDRE : pour chacun des 4 produits, aucun
   champ d'un autre produit, aucun bloc affiché deux fois, bloc pilote en premier, notes en
   dernier, encadré du produit groupé. Plus le garde-fou lui-même : une configuration
   volontairement mal numérotée doit être *détectée*, pas découverte à l'écran.
4. **Affichages conditionnels**, y compris le cas où le parent est un multi (« Autre finition »
   cochée parmi d'autres) et la forme stockée `a;b` de Creator.
5. **Changement de produit** : les champs de l'ancien produit partent, les champs communs
   survivent — sauf ceux dont le nouveau produit est exclu. Garder une adresse d'installation sur
   un roll-up laisserait une donnée orpheline, invisible à l'écran mais bien présente dans la
   soumission enregistrée. C'est l'anomalie US du Lot A.
6. **Validations** : requis, requis conditionnels (substrat → 3, installation → 4), produits à
   venir bloqués avec leur raison, produit inconnu sans plantage, case non cochée qui ne bloque
   pas, et **quantité 0 bloquante** — « 0 » passe le contrôle « champ rempli » puisque c'est
   une saisie, mais ne produit rien à chiffrer ; sans contrôle dédié la soumission se
   validerait à 0 $, ce qui se lit « gratuit » et non « incomplet ».
7. **Dimensions** : 25,4 mm = 1 po, virgule décimale acceptée, saisie invalide → 0 jamais `NaN`,
   roll-up déduit du format — et le format est lu dans **le** champ de format, identifié par la
   configuration : un « 33 × 80 po » tapé dans les notes n'est pas un format de pièce.
8. **Œillets** : 96 × 48 aux 24 po = 12 ; aux 12 po = 24 ; plancher de 4 ; pas de division par
   zéro. Et le cas qui se perdait : **« Perçage / œillets »** (panneaux) n'a pas d'espacement,
   donc n'est comptée nulle part — elle doit rester dans la liste des postes à chiffrer au lieu
   d'être filtrée avec les finitions déjà comptées.
9. **Filtrage des matériaux** : sans inventaire, tout est marqué « non rapproché » — rapprocher
   par ressemblance de nom donnerait le prix d'un autre matériau, et un champ vide coûte moins
   cher qu'un faux prix.
10. **Postes à coûter** : signalés, jamais chiffrés à zéro ; un formulaire vierge n'en signale
    aucun.

---

## En attente (ne bloque pas les 4 produits livrés)

1. **Feuilles Faces graphiques + Affiches** → compléter E et F (les produits sont déjà déclarés,
   inactifs, avec la raison écrite).
2. **Machines numériques + vitesses** → prérequis de l'étape 6.
3. **Coûts unitaires des finitions** → prérequis de l'étape 6.
4. **Colonne « type numérique » de l'inventaire** (courriel Christian du 30 octobre) → rapproche
   les libellés des feuilles produit avec les fiches matière.
5. Les trois confirmations ci-dessus : dimensions du roll-up, plancher d'œillets, coins arrondis.
6. La réponse de Philippe sur les règles 2/15, qui décide des 14 blocages.
