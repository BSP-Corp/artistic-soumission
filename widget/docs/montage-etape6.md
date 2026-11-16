# Montage — étape 6 : faire descendre le gain dans le prix

> Pour Soufiane. **Youssef a donné son accord le 16 novembre 2026, et le demande en priorité.**
> Le montage cesse d'être une aide à la décision pour l'atelier : il devient un outil de prix.
> C'était l'arbitrage que tu attendais.
>
> Ce document donne la mécanique exacte, mesurée dans l'application, et **le piège qui produirait
> des prix faux si on l'ignore**.
>
> BSP — 16 novembre 2026.

---

## 1. Ce qu'on cherche

Aujourd'hui « Accepter » range le format dans `X!MONTAGEFORMAT` / `X!MONTAGEUP`, qu'aucune formule
ne lit. Le prix ne bouge pas. Vérifié en production le 16 novembre : coût, total, prix unitaire et
temps **identiques au cent près** avant et après le clic.

Il faut que l'acceptation se répercute sur le temps de presse et donc sur le prix.

---

## 2. La bonne nouvelle : il n'y a aucune cadence à toucher

Ton commentaire dans `montage-imposition.md` dit que le temps de roulement est porté par six
cellules de cadence et qu'il faut « décider lesquelles le nombre de feuilles doit alimenter ».

**Il n'y en a aucune à alimenter.** Les six partent déjà de `S!G9`, et `S!G9` part déjà de `S!E5` :

```
S!G9  = IF(ISBLANK(E2), 0, (E2*I2 + E2) / E5)     ← quantité × (1+gâche) ÷ up = NB. DE FEUILLES
C!G15 = IF(S!O6=1, 0, ((S!G9*S!E3)*E15) + ...)    ← roulement de base
C!R37 = IF(S!O5=1, ((S!G9/CF70) * (CF8*CF71)) ... ← mode « 1 à 6 coul. »
C!U39 = IF(S!O6=1, (S!E6*S!H6*S!G9)/144 * CI109, 0)
```

La chaîne est donc : **`S!E5` → `S!G9` → les cadences → le coût → le prix.** Le classeur fait tout
le travail dès qu'on écrit dans `S!E5`.

### Mesuré dans l'application

Scénario Exemple, pièce 7 × 1,4 po, quantité 2 000. **Seul `S!E5` a été modifié** :

| | Up = 4 | Up = 84 |
|---|---|---|
| COÛT | 3 319,99 $ | **922,63 $** |
| TOTAL | 4 149,99 $ | **1 153,29 $** |
| UNITAIRE | 2,07 $ | **0,58 $** |
| TEMPS | 24 h 40 | **10 h 57** |

Tout se recalcule seul. C'est exactement l'effet recherché.

---

## 3. ⚠️ Le piège : écrire `S!E5` seul donne des prix FAUX

`S!E5` ne suffit pas, parce que le **coût matière** se calcule à partir des dimensions de la
feuille, qui sont dans d'autres cellules :

```
S!V41 = IF(R41="", 0, ((E6*H6/144) * (E2/E5)) * (R41*T41 + R41))
         surface feuille (pi²) ─┘        └─ nb de feuilles
```

`S!E6` × `S!H6` = **« Dim. Mrx »**, les dimensions de la feuille. Dans le scénario Exemple elles
valent 8 × 9,5 po.

Si tu passes les up de 4 à 84 **sans toucher à E6/H6**, le classeur croit qu'il consomme
**27 feuilles de 8 × 9,5** au lieu de **550 feuilles de 8 × 9,5**. Le coût matière s'effondre d'un
facteur 20, alors qu'en réalité la surface de matière consommée est à peu près la même : on passe à
27 feuilles, mais de 24 × 48.

| | Surface par feuille | Feuilles | Matière totale |
|---|---|---|---|
| Aujourd'hui (8 × 9,5) | 76 po² | 550 | 41 800 po² |
| Correct (24 × 48) | 1 152 po² | 27 | 31 104 po² |
| **Faux** (8 × 9,5, 27 feuilles) | 76 po² | 27 | **2 052 po²** ← 20× trop bas |

Dans le scénario Exemple le piège ne se voit pas : `R41` est vide, donc `V41 = 0` et le coût
matière ne participe pas. **Sur une vraie soumission avec une ligne fournisseur, il sauterait aux
yeux — ou pire, passerait inaperçu dans le bon sens pour le client et le mauvais pour Artistic.**

### Donc : « Accepter » doit écrire TROIS cellules

| Cellule | Champ à l'écran | Valeur à écrire |
|---|---|---|
| `S!E5` | Nombre de Up | les up/feuille du format retenu (84) |
| `S!E6` | Dim. Mrx — largeur | la largeur du format retenu (24) |
| `S!H6` | Dim. Mrx — hauteur | la hauteur du format retenu (48) |

`montage.ts` renvoie déjà tout ce qu'il faut dans `MontageCandidat` : `upParFeuille`,
`format.largeurPo`, `format.hauteurPo`.

« Annuler » doit **restaurer les trois valeurs d'origine** — donc les mémoriser avant d'écrire.
Les pseudo-cellules `X!` sont l'endroit naturel pour ça (`X!MONTAGE_E5_AVANT`, etc.).

### Et d'abord : le format retenu devient périmé sans que rien ne le dise

Relevé en testant le 16 novembre. `accepterMontage` écrit `X!MONTAGEFORMAT` et `X!MONTAGEUP`, et
**rien ne les invalide ensuite**. On a accepté 24 × 48 / 84 up sur une pièce 7 × 1,4, puis changé
la pièce pour 4 × 6 : le bloc recalcule correctement (35 up/feuille) mais affiche toujours
« retenu : 24 × 48 », et `X!MONTAGEUP` vaut encore **84**.

Aujourd'hui c'est sans conséquence, puisque aucune formule ne lit ces cellules. **Dès que l'étape 6
les branche sur `S!E5`, ça devient un générateur de prix faux** : le prix serait calculé sur 84 up
alors que la pièce n'en permet que 35, soit 2,4 fois trop peu de feuilles. Silencieusement.

**À faire avant tout le reste :** invalider le format retenu dès qu'une entrée du montage change —
dimensions de pièce, quantité, et plus tard le matériau. Soit en effaçant les pseudo-cellules, soit
en comparant le retenu au recalcul et en affichant « le format retenu ne correspond plus » avec
réacceptation explicite. La seconde option est préférable : elle ne fait pas disparaître en silence
une décision prise par le chargé de projet.

---

## 4. Le seuil ne se déclenche pas quand il devrait

Relevé en testant le 16 novembre, et c'est au moins aussi important que l'étape 6 elle-même.

Le déclenchement lit `FT!E44` :

```
FT!E44 = IF(E43=0, 0, E39/E42/E43)
```

`E43` est une saisie de la feuille **bon de travail**, vide pendant une soumission. Donc
**`FT!E44` vaut toujours 0** à ce stade, `feuillesBase` est toujours `null`, et le seuil se mesure
sur `meilleur.nbFeuilles` — le nombre de feuilles de la solution **optimale**.

Le système compare donc la solution au seuil, au lieu de comparer la situation actuelle au seuil.
C'est inversé.

**Cas réel observé** : pièce 7 × 1,4, quantité 2 000, 4 up → **550 feuilles aujourd'hui**. Le seuil
est à 350. Le bloc aurait dû s'afficher. Il est resté masqué, parce que la solution optimale ne
fait que 24 feuilles.

Conséquence : le bloc ne sort que sur des jobs énormes (il a fallu 40 000 pièces), alors qu'il
devrait sortir dès 2 000 pièces mal montées — exactement le cas que Christian décrivait le
27 octobre.

**Correctif : `feuillesBase` doit venir de `S!G9`, pas de `FT!E44`.** `S!G9` est le nombre de
feuilles du montage courant, il est toujours renseigné pendant une soumission, et c'est lui que
l'écran affiche sous le libellé **NB.MRX**. Ton commentaire dit « tant que la soumission n'a pas de
champ format de feuille, on retombe sur le nombre de feuilles du meilleur format » — le champ
existe, c'est `S!G9`.

Ça corrige du même coup la mention « pas de format courant saisi : aucun gain chiffré » : le gain
devient chiffrable, et il est énorme (550 → 27 feuilles sur le cas ci-dessus).

---

## 5. Le bon de travail ne reçoit rien — et c'est le même correctif

**Testé dans Creator le 16 novembre.** Soumission avec « retenu : 24 × 48 » accepté →
**Valider → Bon de travail** → le bon de travail créé porte :

| Champ du bon de travail | Valeur | Attendu si le montage suivait |
|---|---|---|
| Nombre de Up (et INFOGRAPHIE › Nombre Up) | **4** | 84 |
| Mrx (po.) | **8 × 9,5** | 24 × 48 |
| Temps Impression | **268 h 12** | ~13 h |

Le pressier monte donc la job exactement comme avant. Recherche de « montage » dans tout
`src/bt/` : **aucune occurrence**. La donnée voyage bien (`validerVersBonTravail` sérialise toutes
les entrées, `X!` comprises), mais **aucun écran ne l'affiche et aucune cellule ne la consomme**.

C'était pourtant la demande d'origine de Christian le 27 octobre : que l'atelier sache quelle
feuille utiliser.

**La bonne nouvelle : le correctif est le même.** `FT!E42 = S!E5` — le bon de travail reprend déjà
le nombre de up de la soumission. Dès que l'étape 6 écrira dans `S!E5`, le bon de travail suivra
tout seul. Reste à vérifier que la dimension de feuille du BT (« Mrx (po.) ») est bien reliée à
`S!E6` / `S!H6` de la même façon ; si oui, il n'y a rien d'autre à faire.

Afficher en plus un libellé explicite sur le bon de travail (« Montage retenu : 24 × 48,
84 up/feuille ») serait un vrai plus pour l'atelier, mais ce n'est pas indispensable si les trois
cellules portent déjà les bonnes valeurs.

### Confirmé au passage : « Nbre de Feuilles » est vide sur le bon de travail

Le champ **« Nbre de Feuilles »** du bon de travail (`FT!E43`) est **vide** sur le bon de travail
créé. C'est la confirmation à l'écran de ce que le §4 déduisait du code : `FT!E44` dépend de
`E43`, personne ne la remplit, donc le seuil du montage n'a jamais de point de comparaison —
ni pendant la soumission, ni après.

### Et ce qui marche : la persistance

Vérifié dans Creator, sur une soumission nommée pour être repérée sans ambiguïté : format accepté
→ **Enregistrer** → **Ouvrir** → réouverture → « retenu : 24 × 48 » **toujours présent**. Les
pseudo-cellules `X!` survivent bien à l'aller-retour Creator. Rien à corriger de ce côté.

---

## 6. Deux incohérences de comptage à trancher au passage

**La gâche.** `S!G9` compte les feuilles **avec** la gâche (`(E2*I2+E2)/E5`), `montage.ts` compte
**sans** (`Math.ceil(qte / upParFeuille)`, commentaire « Quantité retenue : celle du job, sans la
perte »). D'où 24 feuilles annoncées par le bloc contre 27 réelles. Les deux doivent compter la
même chose, sinon le gain affiché sera faux. Je suggère **avec la gâche**, pour coller au classeur
et au bon de travail.

**`V41` aussi.** Il utilise `E2/E5` (sans gâche) alors que `G9` utilise `(E2*I2+E2)/E5` (avec).
C'est antérieur au montage, mais autant le signaler : le coût matière ne couvre pas la gâche.

---

## 7. Ce qui reste hors de portée aujourd'hui

**Rien ne vérifie que la matière existe dans le format proposé.** Une fiche matériau dans Creator
porte un nom, une catégorie, un coût au pi², un `format` en **texte libre** et un drapeau actif —
**pas de largeur ni de hauteur**. Le commentaire de `zohoService.ts` le dit déjà à propos du prix
d'achat.

Le montage peut donc proposer du 24 × 48 sur une matière qui n'existe qu'en 12 × 12, sans le
moindre avertissement. Ça passe aujourd'hui parce qu'Artistic achète en 24 × 48 et redécoupe (dit
par Christian le 27 octobre), mais ça cassera sur la première matière en rouleau ou d'une autre
laize.

**À remonter à Youssef** : ajouter `Largeur_po` / `Hauteur_po` aux fiches matériau, puis filtrer
les formats candidats sur ce que la matière permet. Ce n'est pas dans l'étape 6, mais c'est la
suite logique.

---

## 8. Ordre proposé

1. **Le seuil** (§4) — `feuillesBase` depuis `S!G9`. Petit changement, gros effet : la fonction
   commence enfin à se déclencher quand il faut. Aucun prix ne change.
2. **L'invalidation** (§3) — un format retenu qui ne correspond plus doit le dire. À faire **avant**
   le point 4, sinon on branche une valeur périmée sur le prix.
3. **Le comptage** (§6) — aligner `montage.ts` sur la gâche du classeur.
4. **L'étape 6** (§2-3) — « Accepter » écrit `S!E5`, `S!E6`, `S!H6` ; « Annuler » restaure.
   **C'est ici que les prix changent, et c'est aussi ce qui débloque le bon de travail** (§5).
5. **Le CSS des boutons** (`montage-a-completer.md` §4) — tant qu'à redéployer.

Après le 4, refaire le test de bout en bout **dans Creator** avec une soumission qui porte une
vraie ligne fournisseur, pour vérifier que le coût matière suit. Le scénario Exemple ne le montre
pas (`R41` vide). Et pousser jusqu'au **bon de travail** : « Nombre de Up » et « Mrx (po.) » doivent
y porter les valeurs du format retenu, pas celles d'origine.

### Ce que les tests du 16 novembre ont déjà validé — ne pas le refaire

Quatre comportements vérifiés dans Creator sur le build `2026-11-05 15:12 UTC` : le bloc reste
masqué sous le seuil ; une pièce qui ne tient dans aucune feuille ne produit aucune suggestion (et
les contrôles bloquent le prix, ce qui est le comportement voulu) ; le calcul suit bien les
dimensions de la pièce (7 × 1,4 → 84 up/feuille ; 4 × 6 → 35) ; et le format retenu survit à
l'enregistrement et à la réouverture. **Le calcul et la persistance sont sains.** Ce qui manque,
ce sont les branchements.

---

## 9. À confirmer avec le client avant de déployer le point 3

Youssef a donné son accord côté BSP. Mais le point 3 **change les prix sortants**, donc Artistic
doit le savoir avant que ça parte en production : une soumission dont on accepte le montage
proposera un prix sensiblement plus bas qu'aujourd'hui. C'est l'effet voulu — c'est tout l'objet de
la demande de Christian du 27 octobre, « donner le meilleur prix au client » — mais ça ne doit
surprendre personne le jour où ça tombe.

---

*BSP — 16 novembre 2026. Mécanique vérifiée dans le classeur et mesurée dans l'application.*
