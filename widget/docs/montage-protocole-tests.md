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
>
> **Les captures se déposent dans `captures/`, dans le même commit que la case cochée.** Voir
> `captures/LISEZ-MOI.md`. L'avancement se suit dans `ETAT.md`, pas par message.

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

Pièce **7 × 1,4**, quantité **40 000** → suggestion attendue **24 × 48**. Choisir la presse
**Cameo 18 no.116**.

> ✅ **Ce test vaut avant comme après la correction des fiches machines.** J'avais écrit le
> contraire le 17 novembre ; Soufiane l'a vérifié, c'était faux. Le raisonnement portait sur le
> 16 × 12, mais ce n'est pas ce que T12 oppose à la 116 : c'est le **24 × 48** de la suggestion.
> Or le 24 × 48 ne tient que sur la Viking no.150 — la 116 ne le roule pas davantage à 16 × 12
> qu'à 12 × 8. L'avertissement sort dans les deux cas.
>
> Noter quand même dans la capture le format maxi que la fiche affichait, pour qu'on sache sur
> quel jeu de données le test a été joué.

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

## Partie 4 — Les captures pour le client

> **Pendant que tu joues la série, prends huit captures de plus.** Elles ne servent pas à prouver
> un test : elles illustreront le document que Youssef enverra à Artistic quand tout sera validé —
> un document **fonctionnel**, qui explique ce que le montage permet de faire, pas comment il est
> codé.
>
> Les captures de preuve (T1–T16) et celles-ci ne se ressemblent pas. Une preuve peut montrer un
> NB.MRX à 11 000 et une soumission appelée « test BSP ». Une illustration client, non.

### Les règles pour ces huit-là

1. **Une job plausible.** Un vrai type de travail d'Artistic, une quantité réaliste, un matériau
   qui existe. Pas de 99 × 99, pas de 60 × 60, pas de « test ».
2. **Un nom de soumission présentable** — pas « test BSP 2 ». Si c'est une soumission réelle,
   masquer le nom du client avant de livrer l'image.
3. **Le bloc entier visible**, libellés compris, pas un gros plan sur un chiffre.
4. **Même job d'un bout à l'autre** pour les captures 1 à 5 : le lecteur doit suivre une seule
   histoire, de la suggestion jusqu'à l'atelier.

### Les huit captures

| # | Ce qu'elle doit montrer | Ce que le document en dira |
|---|---|---|
| C1 | Le bloc « Montage suggéré » tel qu'il apparaît | le système propose de lui-même, sans qu'on demande |
| C2 | Le détail de la suggestion : format de feuille, up par feuille, nombre de feuilles | ce qu'on gagne, en clair |
| C3 | L'écran **avant** « Accepter » — prix, total, temps bien lisibles | le point de départ |
| C4 | Le **même** écran **après** « Accepter » | le prix et le temps suivent le montage retenu |
| C5 | Le bon de travail issu de cette soumission, avec le montage dessus | l'atelier sait quelle feuille utiliser et combien de pièces par feuille |
| C6 | L'avertissement de presse | le système prévient quand la presse choisie ne peut pas rouler le format |
| C7 | L'avertissement de format périmé (après avoir changé la pièce) | un montage retenu ne peut pas se périmer en silence |
| C8 | Une pièce qui ne tient sur aucune feuille, prix bloqués à « à vérifier » | le système refuse de chiffrer ce qu'il ne sait pas monter |

Les déposer dans `captures/client/`, nommées `C1-suggestion.png`, `C2-detail.png`, etc.

**Une note avec, si quelque chose t'a surpris en les prenant.** Ce que tu trouves évident à force
de le coder ne l'est pas pour Christian, et l'inverse est vrai aussi : si un écran demande une
explication pour être compris, c'est exactement ce que le document doit dire.

---

### Série jouée le 20 novembre 2026 — notes

Jouée par Claude pour Soufiane, dans Creator, sur le build `2026-11-17 15:30 UTC` (déployé le
20 nov., slot « Canvas »), **après** les sept écritures de fiches (relues une à une).
Valeurs relevées à l'écran, pas recalculées.

| Test | Relevé |
|---|---|
| T1 | 275 feuilles, aucun bloc. |
| T2 | aucun bloc ; prix « à vérifier » partout. |
| T3 | 7 × 1,4 → 24 × 48, 3 × 28 = 84 up · 4 × 6 → 24 × 48, 5 × 7 = 35 up. |
| T4 | 30 × 28, 1 × 5 = 5 up (roulable sur 120, 150, 170). |
| T5 | retenu 24 × 48, 84 up, Mrx 24 × 48 conservés. Prix identique au cent près sur deux réouvertures successives (26 724,05 $). **Voir l'écart ci-dessous.** |
| T6 | bloc affiché, « 523 feuilles de moins que le format courant ». |
| T7 | « ⚠ le montage retenu (24 × 48) ne correspond plus : ce format donne maintenant 35 up par feuille, plus 84 ». |
| T8 | 524 feuilles au bloc, 524 sous NB.MRX après acceptation. |
| T9 | Up 4 → 84 · Mrx 8 × 9,5 → 24 × 48 · NB.MRX 11 000 → 524 · TEMPS 349 h 36 → 68 h 57 · COÛT 55 615,31 → 26 583,96 $. |
| T10 | R41 = 0,50 $/pi² : ligne Pied² 3 562,50 $ → 2 571,43 $ (−28 %). Pas d'effondrement. |
| T11 | retour exact : 4 up, 8 × 9,5, COÛT 55 615,31 $. |
| T12 | Cameo 18 no.116 (16 × 12) : avertissement avant et après acceptation (prix « à vérifier » une fois accepté) ; Viking no.150 : avertissement disparu. |
| T14 | BT-1019 (soumission `4153107000024137002`) : Nombre Up 84 aux deux endroits, Mrx 24 × 48, Temps Impression 14 h 58 (au lieu de 268 h 12). Le ≈ 13 h annoncé était une estimation ; 14 h 58 est exactement le temps d'impression de la soumission. |

**Écart T5 — vient du scénario Exemple, pas du montage.** Rejouée depuis « Exemple », la
soumission rouverte coûte 26 724,05 $ au lieu de 26 583,96 $. Cause : `entreesExemple` recopie
F/S (`S!B4`, `S!F4`) = 2 depuis le classeur, et `normaliserEntrees` les remet à 1 au chargement
(décision du 13 août). Reproduit hors ligne avec le moteur. Toute soumission partie d'« Exemple »
porte donc des passes F/S invisibles jusqu'à sa réouverture. Sans effet sur une « Nouvelle
soumission ». À trancher : normaliser aussi l'Exemple ?

**Vu en passant :**
- La **Cameo 38SS no.120**, réactivée, apparaît dans « roulable sur » (lu depuis la fiche) mais
  **pas dans la liste déroulante Presse** du widget.
- La liste Presse affiche « **Multiprint IST no.180** · 175 fle/h ». La fiche s'appelle
  « Multiprint IST no.182 » (24 × 44, Actif) et n'est pas dans la feuille de séance.
- Le widget bon de travail est encore au build `2026-10-20`. T14 passe quand même : il relit la
  soumission.

**Cameo 120 et « Multiprint 180 » : ce n'était pas la catégorie.** Le champ `Categorie` vaut
« Serigraphie » sur les 110, 120, 150 et 182, relu par l'API et par le SDK du widget avec
`field_config: "all"`. L'état React du chargement fautif montrait les 23 machines du **snapshot**
(« Duplo », « Brausse », pas de Zund M-800) : `chargerAdmin` avait échoué et le widget était
retombé en silence sur `fusionnerMachines(null)`. Rejouées à la main dans le même widget, les
cinq lectures réussissent, et cinq rechargements de suite affichent la 120 et la 182. L'échec est
intermittent et invisible : le bandeau dit « Creator » pour les matériaux, rien pour les
machines. À prévoir au prochain build : source des machines au bandeau, et une relance.

**T15 — 20 nov.** Table créée (builder + IDE), 9 formats saisis, rapport `Formats_Feuille_Report`.
Le rapport, né avec le formulaire vide, n'exposait **aucune colonne** : le SDK renvoyait les lignes
avec leur seul ID, le widget retombait sur le snapshot sans erreur. Colonnes ajoutées par l'IDE.
Le 99 × 99 arrive ensuite dans le calcul, écarté pour « aucune presse ne peut rouler ce format »
(l'écran n'affiche que le meilleur format : preuve dans `captures/T15-formats-feuille.txt`).
Ligne retirée, 9 lignes relues.

**T16 — 20 nov.** `APP_MONTAGE_GRAIN_FIGE` passé à `0` (relu). Pièce 13 × 3, 40 000 : « feuille
24 × 48 · 7 × 3 = 21 up · 2 096 feuilles · pièce tournée de 90° ». Grain figé, même format (calcul
`evaluerFormat` hors ligne) : 1 × 14 = 14 up, 3 143 feuilles. Accepté : Nombre de Up 21, Mrx
24 × 48. Rappel : le bon de travail ne lit pas encore `MONTAGETOURNEE`.

---

## Récapitulatif à retourner

| # | Test | Validé | Capture |
|---|---|---|---|
| — | `npm run verif:montage` | ☑ | ☑ `captures/T00-verif-montage.txt` |
| — | Bandeau de build | ☑ | ☑ `00-bandeau-deploiement-2026-11-20.png` |
| T1 | Sous le seuil → masqué | ☑ | ☑ `T01-sous-le-seuil.png` |
| T2 | Pièce impossible | ☑ | ☑ `T02-piece-impossible.png` |
| T3 | Suit les dimensions | ☑ | ☑ `T03a-7x1,4.png`, `T03b-4x6.png` |
| T4 | Compare les neuf formats | ☑ | ☑ `T04-neuf-formats.png` |
| T5 | Persistance | ☑ (voir note) | ☑ `T05a`…`T05d` |
| T6 | Seuil sur `S!G9` | ☑ | ☑ `T06-seuil.png` |
| T7 | Invalidation du périmé | ☑ | ☑ `T07-perime.png` |
| T8 | Comptage de la gâche | ☑ 524 | ☑ `T08-gache.png` |
| T9 | Le prix suit | ☑ | ☑ `T09a`, `T09b` |
| T10 | **Coût matière** | ☑ 3 562,50 → 2 571,43 $ | ☑ `T10-…-avant`, `T10-…-apres` |
| T11 | Annuler restaure | ☑ au cent près | ☑ `T11-annuler.png` |
| T12 | Avertissement presse | ☑ | ☑ `T12a`, `T12b`, `T12c` |
| T13 | Boutons lisibles | ☑ | ☑ `T13-boutons-lisibles.png`, `T04` |
| T14 | **Bon de travail** | ☑ BT-1019 | ☑ `T14a`, `T14b`, `T14c` |
| T15 | Table `Formats_Feuille` | ☑ ligne test lue puis retirée | ☑ `T15-formats-feuille.txt`, `.png` |
| T16 | Grain libre | ☑ 21 up tournée ≥ 14 figé | ☑ `T16-grain-libre.png`, `T16b-…-accepte.png` |
| C1–C8 | **Captures client** (partie 4) | — | ☐ |

**Les trois à ne pas sauter** sont T10 (coût matière), T14 (bon de travail) et T6 (le seuil) :
le premier protège les marges d'Artistic, le deuxième est la raison d'être de la fonction, le
troisième décide si elle se déclenche un jour.

Si un test ne passe pas, envoie la capture avec ce qui était attendu — on tranche ensemble plutôt
que de le contourner.

---

*BSP — 16 novembre 2026. Protocole établi à partir de la campagne de tests menée par Youssef en
production le même jour.*
