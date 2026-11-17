# Montage — protocole de validation après correctifs

> Pour Soufiane. **À exécuter dans Creator sur le build déployé**, pas en développement : deux des
> défauts trouvés le 16 novembre (boutons illisibles, bon de travail) ne se voyaient que là.
>
> **Chaque test demande une capture d'écran.** Coche la case, note la valeur obtenue, joins
> l'image. C'est ce qui permet à Youssef de confirmer au client que tout est validé, sans
> reprendre lui-même toute la série.
>
> Demandé par Youssef le 16 novembre 2026, après la campagne de tests qu'il a menée sur la version
> actuelle. Les correctifs sont décrits dans `montage-etape6.md` (§1 à §6) et
> `montage-a-completer.md` (§4).
>
> BSP — 16 novembre 2026.

---

## Avant de commencer

1. `npm run verif:montage` doit passer — **29 assertions, 1 568 cas**. S'il échoue, rien d'autre
   n'a de sens. *Capture de la sortie.*
2. Noter le **bandeau du haut** du widget déployé : `build …`, source des prix, source des règles.
   Il doit porter la date de ton nouveau déploiement. *Capture.*
3. Travailler sur une **soumission nommée** (ex. « test montage 2 »), pour pouvoir la retrouver
   sans ambiguïté à la réouverture. C'est ce qui nous a fait conclure à tort à un bug de
   persistance le 16 novembre.

> ⚠️ **Les valeurs attendues ci-dessous sont celles d'APRÈS tes correctifs.** Plusieurs diffèrent
> de ce qu'affiche la version actuelle — c'est voulu, ce n'est pas une régression. Les deux
> colonnes sont données quand elles diffèrent.

---

## Partie 1 — Non-régression : ce qui marchait doit continuer à marcher

Ces sept comportements ont été validés en production le 16 novembre. Ils doivent tenir après les
correctifs.

### T1 — Job sous le seuil : aucun bloc

Pièce **7 × 1,4 po**, quantité **1 000**, Nombre de Up **4**, presse générique.

Calcul de contrôle : 1 000 × 1,1 ÷ 4 = **275 feuilles**, sous le seuil de 350.

- **Attendu :** aucun bloc « Montage suggéré ».
- ☐ Validé — capture : ______

### T2 — Pièce qui ne tient nulle part

Quantité **40 000**, **Dim. Pce = 60 × 60**.

- **Attendu :** aucune suggestion. Les contrôles bloquent le prix (« à vérifier » partout) —
  c'est le comportement voulu, pas un défaut.
- ☐ Validé — capture : ______

### T3 — Le calcul suit les dimensions de la pièce

Quantité **40 000**, presse générique. Deux saisies successives :

| Dim. Pce | Attendu |
|---|---|
| 7 × 1,4 | feuille 24 × 48 · **3 × 28 = 84 up/feuille** |
| 4 × 6 | feuille 24 × 48 · **5 × 7 = 35 up/feuille** |

- ☐ Validé — captures : ______

### T4 — La sélection compare bien les neuf formats

Quantité **40 000**, **Dim. Pce = 26 × 5**.

- **Attendu :** feuille **30 × 28**, 1 × 5 = **5 up/feuille**. Surtout **pas** 24 × 48 : une pièce
  de 26 po de large n'y rentre pas.
- ☐ Validé — capture : ______

### T5 — Persistance

Pièce **7 × 1,4**, quantité **40 000**. Accepter le montage → **Enregistrer** → **Ouvrir** →
rouvrir **la même** soumission.

- **Attendu :** « retenu : 24 × 48 » toujours affiché. **Et désormais aussi** : Nombre de Up,
  Dim. Mrx et le prix identiques à avant l'enregistrement.
- ☐ Validé — capture : ______

---

## Partie 2 — Un test par correctif

### T6 — Le seuil lit `S!G9` (correctif §4)

Pièce **7 × 1,4 po**, quantité **2 000**, Nombre de Up **4**.

Calcul de contrôle : 2 000 × 1,1 ÷ 4 = **550 feuilles aujourd'hui**, au-dessus du seuil de 350.

| | Avant correctif | **Après correctif** |
|---|---|---|
| Bloc affiché ? | non | **oui** |
| Gain | « pas de format courant saisi : aucun gain chiffré » | **« 523 feuilles de moins que le format courant »** |

C'est le cas que Christian décrivait le 27 octobre et que le système ratait. **Le changement
d'affichage sur ce test est la preuve que le correctif fonctionne.**

- ☐ Validé — capture : ______
- Gain affiché : ______

### T7 — L'invalidation du format périmé (correctif §3)

1. Pièce **7 × 1,4**, quantité **40 000** → **Accepter** (retenu : 24 × 48, 84 up)
2. Changer la pièce pour **4 × 6** sans rien toucher d'autre

| | Avant correctif | **Après correctif** |
|---|---|---|
| Affichage | « retenu : 24 × 48 » reste, up mémorisés = 84 (faux) | **avertissement que le format retenu ne correspond plus**, réacceptation demandée |

Le format affiché restait cohérent en apparence : c'est le nombre de up mémorisé qui était faux.
**Vérifier la valeur, pas seulement le libellé.**

- ☐ Validé — capture : ______

### T8 — Le comptage de la gâche (correctif §7)

Pièce **7 × 1,4**, quantité **40 000**, Nombre de Up **4**.

- **Attendu :** le nombre de feuilles annoncé par le bloc compte la gâche, comme `S!G9`.
  Soit `ceil(40 000 × 1,1 ÷ 84)` = **524 feuilles**, et non 477.
- Les deux comptages — bloc et NB.MRX — doivent désormais répondre à la même règle.
- ☐ Validé — feuilles annoncées : ______ — capture : ______

### T9 — L'étape 6 : le prix suit (correctif §2-3) ⭐

Pièce **7 × 1,4**, quantité **40 000**, Nombre de Up **4**, presse générique.

**Relever avant d'accepter :** Nombre de Up ___ · Dim. Mrx ___ × ___ · COÛT ___ · TOTAL ___ ·
UNITAIRE ___ · TEMPS ___

**Accepter**, puis relever les mêmes.

| Champ | Attendu après « Accepter » |
|---|---|
| Nombre de Up | **84** |
| Dim. Mrx | **24 × 48** |
| NB.MRX | **524** (au lieu de 11 000) |
| TEMPS | chute d'un facteur ≈ 21 sur la part roulement |
| COÛT / TOTAL / UNITAIRE | baissent nettement |

- ☐ Validé — captures avant et après : ______

### T10 — L'étape 6 : le coût matière ne s'effondre pas ⭐⭐ **le test à ne pas sauter**

**Même scénario que T9, mais sur une soumission qui porte une vraie ligne fournisseur**
(`S!R41` renseignée — un matériau avec son prix au pi²). Le scénario Exemple a `R41` vide, donc
**il ne révèle pas ce défaut**.

Contrôle à la main, avec 40 000 pièces :

| | Base matière | Surface facturée |
|---|---|---|
| Avant acceptation (8 × 9,5) | 10 000 | ≈ **5 278 pi²** |
| **Attendu après** (24 × 48) | 476 | ≈ **3 810 pi²** — une baisse d'environ 28 % |
| **Si le défaut est présent** (8 × 9,5 conservé) | 476 | ≈ **251 pi²** — **15× trop bas** |

> ⚠️ **Piège de lecture, relevé par Soufiane le 16 novembre.** La colonne « base matière » n'est
> **pas** le NB.MRX affiché à l'écran. `S!V41` facture sur `E2/E5`, **sans la gâche**, alors que
> `S!G9` compte les feuilles **avec**. À l'écran on lit donc **11 000** avant et **524** après,
> pas 10 000 et 476. Les deux comptages sont justes ; qui compare 476 au NB.MRX affiché croira
> à un échec.

Si le coût matière s'effondre, c'est que `S!E6` / `S!H6` n'ont pas été écrites.
**C'est le défaut qui sous-facturerait Artistic sans que personne le voie.**

- ☐ Validé — coût matière avant : ______ après : ______ — capture : ______

### T11 — « Annuler » restaure l'état d'origine

Après T9, cliquer **Annuler**.

- **Attendu :** Nombre de Up revient à **4**, Dim. Mrx à **8 × 9,5**, et le prix exactement à sa
  valeur de départ — au cent près.
- ☐ Validé — capture : ______

### T12 — L'avertissement de presse (correctif §6)

Pièce **7 × 1,4**, quantité **40 000** → suggestion attendue **24 × 48**.

> ⚠️ **Le choix de presse dépend de l'état des fiches machines.** Roberto a tranché le 16 novembre
> au soir (« utilise ma liste ») : les fiches sont à corriger, voir `montage-a-completer.md` §3.
>
> - **Fiches pas encore corrigées** → choisir la **Cameo 18 no.116** (12 × 8 à sa fiche).
> - **Fiches corrigées** → la 116 passe à 16 × 12 et roule ce format : prendre la **140**
>   (24 × 24) à la place, qui ne peut pas rouler du 24 × 48.
>
> Noter dans la capture quelle presse a été choisie et quel format maxi sa fiche affichait.

- **Attendu :** le bloc continue de proposer 24 × 48, **et** affiche un avertissement visible :
  la presse choisie ne peut pas rouler ce format.
- Vérifier ensuite avec la **Viking no.150** : l'avertissement doit disparaître. (Sa fiche porte
  30 × 50 aujourd'hui, 44 × 64 après correction — dans les deux cas le 24 × 48 passe.)
- Reprendre l'essai **montage retenu** : le message doit être plus net une fois accepté, puisque
  le prix porte alors un montage que l'atelier ne pourra pas monter.
- ☐ Validé — captures avec les deux presses : ______

### T13 — Les boutons sont lisibles (`montage-a-completer.md` §4)

**Dans Creator**, pas en développement.

- **Attendu :** « Accepter » et « Annuler » affichent leur libellé, lisible sur le fond clair.
- ☐ Validé — capture : ______

---

## Partie 3 — Le bout de la chaîne

### T14 — Le bon de travail reçoit le montage (correctif §5) ⭐

Depuis la soumission de T9, montage accepté : **Valider → Bon de travail**. Ouvrir le bon de
travail créé.

| Champ du bon de travail | Avant correctif | **Après correctif** |
|---|---|---|
| Nombre de Up (haut, INFOGRAPHIE) | 4 | **84** |
| Nombre de Up (QUANTITÉS & FEUILLES) | 4 | **84** |
| Mrx (po.) | 8 × 9,5 | **24 × 48** |
| Temps Impression | 268 h 12 | **≈ 13 h** |

C'était la demande d'origine de Christian le 27 octobre : que l'atelier sache quelle feuille
utiliser. **Tant que ce test ne passe pas, la fonction ne sert à personne.**

- ☐ Validé — capture : ______

### T15 — La table `Formats_Feuille` est bien lue (`montage-a-completer.md` §1)

Une fois la table créée et semée des 9 formats :

1. Ajouter une ligne de test évidente : **99 × 99**, Actif = Oui
2. Ouvrir une soumission avec une grosse quantité et une petite pièce
3. Le format 99 × 99 doit apparaître parmi les candidats
4. **Retirer la ligne de test**

Si le 99 × 99 n'apparaît pas, la table n'est pas lue et le widget tourne encore sur le snapshot —
toute modification faite dans la table resterait sans effet, **sans aucune erreur visible**.

- ☐ Validé — capture avec la ligne de test : ______
- ☐ Ligne de test retirée

### T16 — Le grain libre (`montage-a-completer.md` §2)

> ⛔ **Après le déploiement, jamais avant.** Le `1` de `Taux_Calcul` tient le grain fermé tant
> que l'ancien build est en ligne : celui-là ne fait pas voyager le sens de pose avec la
> soumission, donc grain libre = rotation active sans orientation enregistrée. Voir
> `montage-a-completer.md` §2.

Une fois `APP_MONTAGE_GRAIN_FIGE` passé à **0** :

- **Attendu :** sur au moins un cas, le bloc affiche « **pièce tournée de 90°** », et le nombre de
  up est supérieur ou égal à ce qu'il était grain figé — jamais inférieur.
- Cas de contrôle donné par la vérification : grain figé 2 × 3 = 6 up ; grain libre 7 × 1 = **7 up**.
- ☐ Validé — capture : ______

---

## Récapitulatif à retourner

| # | Test | Validé | Capture |
|---|---|---|---|
| — | `npm run verif:montage` | ☐ | ☐ |
| — | Bandeau de build | ☐ | ☐ |
| T1 | Sous le seuil → masqué | ☐ | ☐ |
| T2 | Pièce impossible | ☐ | ☐ |
| T3 | Suit les dimensions | ☐ | ☐ |
| T4 | Compare les neuf formats | ☐ | ☐ |
| T5 | Persistance | ☐ | ☐ |
| T6 | Seuil sur `S!G9` | ☐ | ☐ |
| T7 | Invalidation du périmé | ☐ | ☐ |
| T8 | Comptage de la gâche | ☐ | ☐ |
| T9 | Le prix suit | ☐ | ☐ |
| T10 | **Coût matière** | ☐ | ☐ |
| T11 | Annuler restaure | ☐ | ☐ |
| T12 | Avertissement presse | ☐ | ☐ |
| T13 | Boutons lisibles | ☐ | ☐ |
| T14 | **Bon de travail** | ☐ | ☐ |
| T15 | Table `Formats_Feuille` | ☐ | ☐ |
| T16 | Grain libre | ☐ | ☐ |

**Les trois à ne pas sauter** sont T10 (coût matière), T14 (bon de travail) et T6 (le seuil) :
le premier protège les marges d'Artistic, le deuxième est la raison d'être de la fonction, le
troisième décide si elle se déclenche un jour.

Si un test ne passe pas, envoie la capture avec ce qui était attendu — on tranche ensemble plutôt
que de le contourner.

---

*BSP — 16 novembre 2026. Protocole établi à partir de la campagne de tests menée par Youssef en
production le même jour.*
