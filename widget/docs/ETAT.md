# Montage — état du chantier

> **Ce fichier est la source unique de l'avancement.** Il remplace les messages Cliq et les
> courriels entre nous. Chacun le met à jour **par un commit**, pas par un message : ce qui n'est
> pas ici n'existe pas, et personne n'a à demander « où on en est ».
>
> Mis à jour en dernier : **25 novembre 2026** — Soufiane.

---

## Pour Soufiane — 25 novembre, après l'essai de la refonte

> Youssef a passé l'après-midi dans `Soumission_essai` avec une vraie job sous les yeux. Voici ce
> qui en sort, dans l'ordre où ça presse. Le détail de chaque point est dans le Journal, plus bas.
> **La rencontre client est jeudi 13 h.**

**0. D'ABORD — Roberto a répondu aux quatre questions, hier soir.** Détail complet dans le Journal.
Ce qu'il faut en retenir pour demain :

- **Les taux du classeur sont validés par la production** — *« ceux dans le système actuel sont
  correct »*. La réserve « justes dans leur logique, pas dans leurs montants » tombe pour la
  sérigraphie. Rien à coder : un caveat de moins à dire devant le client.
- **Seuil de revalidation : 3 000 $** (au lieu des 4 000 $ par défaut). C'est le paramètre
  `APP_SEUIL_DOUBLE_CHECK` de `Taux_Calcul` — **une saisie dans Creator, aucun déploiement**.
- **Prix minimum de commande : 250 $.** N'existe nulle part dans le code. Contrôle à écrire, petit.
- **Révisions : S-2026-0000R1, R2, R3…** à la fin de la séquence. Petit, sur la numérotation.
- **Montage mixte autorisé pour les pièces pleines, interdit dès qu'il y a une fenêtre.**
  ⚠️ **L'hypothèse de la refonte est donc fausse** : elle chiffre les pièces comme s'imprimant
  toujours séparément. Ce bloc est à refaire — c'est un chantier, pas une correction, et ce n'est
  pas pour demain — les deux questions de **chiffrage** restent sans réponse (comment répartir le
  coût d'une feuille partagée, et que faire quand les quantités ne tombent pas juste).

→ **Les demandes précises, chiffrées en effort, sont dans le Journal** : deux petits travaux pour ce
soir (prix minimum, suffixe de révision), un affichage d'éligibilité livrable demain, et le montage
mixte lui-même mis en attente des deux arbitrages.

**1. Le repliage des sections.** ✅ **Fait et en ligne** — Soufiane a fusionné, construit et
téléversé le 25 novembre, build `2026-11-25 15:47 UTC`. Plus rien à faire ici. Écrit sur la branche
`repliage-sections`, commit
`4eb766b`, partie de `refonte-soumission`. Il restait à fusionner, `npm run pack:s2` et téléverser
dans Creator : c'est fait. Les dix sections se replient, 01 à
08 ouvertes par défaut, et une section repliée résume son contenu sur sa ligne de titre. `build:s2`
et `verif:s2` passent. Ne touche que `s2/AppS2.tsx` et `s2/s2.css`.

**2. L'essai 2 est passé — bonne nouvelle, à savoir avant jeudi.** Sur la job de Youssef, les deux
écrans donnent **534,32 $ de coût, 667,90 $ de total, 13,36 $ l'unité et 5 h 47**, au cent et à la
minute. Rien à corriger.

**3. Des champs manquent au nouvel écran, et leur absence est silencieuse.** ✅ *Contrôle en ligne
(Soufiane, 25 nov.). À corriger ici : le prix n'est pas recalculé sans eux, voir le Journal.* Trois lignes de platine
(adhésif, kiss-cut, embossage), six opérations de finition (protecteur fenêtre, slit, assemblage,
décorticage, vérification, emballage), deux champs de perte (`S!Y22`, `S!Z22`). Une soumission
existante qui les porte est rechiffrée sans elles, sans un mot.

→ **Plutôt que de boucher trou par trou : un contrôle qui compare les cellules d'une soumission
rouverte à celles que l'écran sait afficher, et qui alerte sur toute valeur non nulle sans case.**
C'est le même défaut qui est revenu trois fois en deux jours ; il y en a sûrement d'autres.

**4. Quatre champs libres pour des cellules qui ne valent que 1 ou vide** — séparateur avant,
séparateur après, recto/verso après, guillotine. Le classeur met le prix unitaire à zéro dès qu'un
indicateur dépasse 1 (`INDICATEURS` dans `controles.ts`). Des cases à cocher diraient la règle au
lieu de la cacher. Le pire est le recto/verso : « avant » est une quantité, « après » un drapeau,
les deux côte à côte et identiques à l'œil. L'écran actuel a le même défaut — ce n'est pas une
régression, c'est l'occasion de le corriger.

**5. À trancher : « Adhésif laminé » et « Adhésif régistre »** sont des champs numériques dans
l'écran actuel et des cases à cocher dans le nouveau. Peuvent-ils dépasser 1 ? Si oui, la case à
cocher perd de l'information ; si non, ils devraient rejoindre `INDICATEURS`.

**6. Renommer « Gâche » en « Perte ».** Même cellule (`S!I2`), deux noms selon l'écran. Youssef ne
l'a pas trouvée. Le vocabulaire d'Artistic prime sur le nôtre.

**7. Une suggestion, pas une demande : un bouton « reprendre cette soumission dans le nouvel
écran ».** Il a fallu aligner **huit réglages à la main** — quantité, facteur, gâche, ligne de
platine, séparateurs, ajustement additionnel, couverture d'encre, transport — pour rejouer une
seule job. Recopier les cellules vaudrait mieux que n'importe quelle consigne écrite, et
permettrait de rejouer les 51 soumissions existantes en lot plutôt qu'une à une.

**8. Reste de lundi :** supprimer BT-1013 et BT-1014, attachés à la soumission d'essai « YDOUAA ».
Youssef a confirmé que les trois soumissions douteuses sont des essais.

---

## Comment on travaille (la convention)

Le 17 novembre, on s'est rendu compte qu'on s'échangeait par message des choses qui auraient dû
être dans le dépôt : un build prêt, des corrections de protocole, une décision client. Résultat,
chacun devait demander à l'autre où il en était, et personne ne pouvait le savoir seul.

**La règle :** tout ce qui fait avancer le chantier est un commit.

| Ce que tu as | Où ça va |
|---|---|
| Un correctif, une trouvaille, une correction de doc | un commit, avec le pourquoi dans le message |
| « j'ai fini X », « je bloque sur Y » | une ligne dans le **Journal** ci-dessous |
| Un résultat de test, une capture | `docs/captures/` + la case cochée dans le protocole |
| Une réponse client (Roberto, Christian) | résumée dans le document concerné, avec la date |
| Une décision (feu vert, arbitrage de prix) | une ligne dans le **Journal**, signée |

**Ce qui reste légitimement hors du dépôt :** une urgence qui ne peut pas attendre un `git push`,
et les échanges avec le client. Tout le reste passe par ici.

**Conséquence pratique :** avant de demander quoi que ce soit à l'autre, `git pull` et lire ce
fichier. Si la réponse n'y est pas, c'est que quelqu'un a oublié de la committer — et c'est ça
qu'il faut corriger, pas poser la question.

---

## Où on en est

### Le code : tout est livré, rien n'est vérifié

Les sept défauts relevés en production le 16 novembre sont corrigés et fusionnés dans `main`.
**Aucun n'a été rejoué sur un build déployé.** C'est le seul écart qui reste avant livraison.

| # | Défaut relevé le 16 nov. | Corrigé par | Vérifié en prod |
|---|---|---|---|
| 1 | Le seuil lit `FT!E44`, toujours 0 → ne se déclenche jamais | `49b623e` | ☐ T6 |
| 2 | Le format retenu ne s'invalide pas quand la pièce change | `49b623e` | ☐ T7 |
| 3 | Accepter ne touche pas au prix (étape 6) | `49b623e` | ☐ T9 |
| 4 | Écrire `S!E5` seul effondre le coût matière | `49b623e` | ☐ **T10** |
| 5 | Le bon de travail ne reçoit pas le montage | `49b623e` | ☐ **T14** |
| 6 | Le montage ignore la presse choisie | `1e788c5` | ☐ T12 |
| 7 | Les feuilles se comptent sans la gâche | `992ac31` | ☐ T8 |
| 8 | Boutons « Accepter » / « Annuler » illisibles | `1e788c5` | ☐ T13 |

`npm run verif:montage` : **29 assertions, 1 568 cas, au vert.** `npm run verif:numerique` : au
vert. Les deux lancés sur `main` fusionné le 16 novembre au soir.

### Les données Creator : deux saisies, aucune faite

| Quoi | Pourquoi ça bloque | État |
|---|---|---|
| Table `Formats_Feuille` + import du CSV | sans elle le widget tourne sur le snapshot embarqué, **en silence** | ☐ — CSV prêt dans `creator-import/` |
| Les 7 fiches machines selon la liste Roberto | sans ça T12 teste la mauvaise chose et le 16 × 12 reste écarté | ☐ — liste dans `montage-a-completer.md` §3 |

### Le chemin critique jusqu'à la livraison

```
  ✅ téléversement + les 7 écritures de fiches        fait le 20 nov.
  ✅ T1 → T14, 25 captures, relevés au protocole      fait le 20 nov. (862ac8e)
  ─────────────────────────────────────────────────────────────────
  catégorie des fiches 120 et 182             10 min   Soufiane
  table Formats_Feuille (9 formats) → T15     45 min   Soufiane
  APP_MONTAGE_GRAIN_FIGE : 1 → 0 → T16        20 min   Soufiane
  captures client C1 → C8                     45 min   Soufiane
  ─────────────────────────────────────────────────────────────────
  document fonctionnel + courriel au client      —     Youssef + Claude
```

**L'ordre ne tient plus qu'à deux choses.** Les **captures client se prennent en dernier**, grain
libre, sinon elles illustrent un comportement qui ne sera plus celui d'Artistic. Et la
**catégorie des fiches passe en premier** : tant qu'elle n'est pas corrigée, la Cameo 38SS no.120
que Roberto a fait réactiver reste invisible dans la liste des presses — c'est le genre de trou
qu'un client repère le premier jour.


---

## Ce qui conclut le chantier : le document au client

Quand la série est au vert, le montage n'est pas livré pour autant. Il reste à **dire à Artistic
ce qu'ils ont** — un document fonctionnel, pas technique : ce que le montage permet de faire, ce
qu'il change dans leur façon de chiffrer, ce que l'atelier reçoit maintenant. Avec des captures.
Puis un courriel qui porte ce document.

Décidé par Youssef le 17 novembre. C'est le vrai point final, et c'est ce que Christian attend
depuis le 27 octobre.

**Ce qui est déjà en place pour le préparer :** la partie 4 du protocole demande huit captures
spécifiques pendant la série, prises sur une job plausible et présentable — pas les captures de
preuve, qui montrent des soumissions de test et des chiffres de contrôle. Elles vont dans
`captures/client/`.

Ce que le document devra couvrir, dans l'ordre où ça se vit :

1. Le système propose de lui-même quand il y a un gain à prendre — personne n'a à y penser.
2. Ce qu'il propose : quelle feuille, combien de pièces dessus, combien de feuilles en tout.
3. Ce qui se passe quand on accepte : le prix et le temps de presse suivent.
4. Ce que l'atelier reçoit : le bon de travail porte le montage retenu.
5. Les garde-fous : presse incompatible, format périmé, pièce qui ne tient nulle part.
6. Ce qui reste à leur main : accepter ou non, c'est une décision du chargé de projet.

---

## Journal

Le plus récent en haut. Une ligne par événement qui change l'état du chantier.

### 25 nov. — Le repliage est en ligne, et un contrôle montre les valeurs sans case *(Soufiane + Claude)*
**En ligne sur `Soumission_essai`, build `2026-11-25 15:51 UTC`** (branche `refonte-soumission`, `064a241`).
Relu dans Creator : 01 à 08 ouvertes, 09 et 10 fermées, cinq soumissions au même prix que l'écran
actuel, et FC-940 à 62 723,50 $ tout replié comme tout ouvert. Un ajustement : la pastille de la
section 06 ne s'allume plus hors sérigraphie, où son message n'existe pas.

**Point 3, une correction : rien n'est perdu à la réouverture.** Une soumission rouverte garde toutes
ses cellules et le moteur les chiffre. Mesuré sur banc : les 47 soumissions chiffrées, plus les onze
champs cités ajoutés un par un à FC-940, donnent le même coût et le même total sur les deux écrans
(deux autres sont masquées « à vérifier » des deux côtés). Le défaut réel : ces valeurs comptent sans
qu'on les voie ni qu'on puisse les changer, et une fiche neuve ne peut pas les saisir.

**Le contrôle général est fait** (`s2/caches.ts`). Il compare les cellules de la soumission à celles
affichées dans la page, sans liste à tenir à jour, et donne ce que chacune pèse dans le total. Sept
des 49 soumissions en portent : Zünd adhésif et cut-out, protecteur, slit, multi-up, over laminating,
premask, Xtra 1 (3 202,26 $ sur une), sous-contrat. Les choix de machine (Zünd, platine…) sont
signalés sans montant. Limite : contrôle en sérigraphie seulement, sur la pièce 1.
« Protecteur fenêtre » à 1, seul, ne change pas le prix, sur aucun des deux écrans.

**À savoir :** la vérification et l'emballage sont comptés d'office sur toute fiche neuve (687,50 $ et
343,75 $ sur FC-940, prix du banc) sans case à l'écran. C'est maintenant écrit au sommaire.

**Point 7 : le bouton existe déjà, c'est « Ouvrir ».** Il reprend une soumission de l'écran actuel avec
tous ses réglages, en copie ; l'originale reste intacte. Les huit réglages à la main étaient évitables.

**Pas touchés, comme convenu pour vendredi :** 4, 5, 6 et 8. BT-1013 et BT-1014 ne sont pas supprimés.

### 24 nov. — L'alerte est corrigée ; deux choses à confirmer *(Youssef + Claude)*
**Le correctif de l'adhésif est complet et fusionné** (`b3fb839`, puis `d1a5ab1`). La note suit
maintenant l'état réel de la case : texte habituel quand elle est à 1, avertissement « son coût
n'est pas compté » quand elle est vide. C'est exactement ce qui manquait pour déployer.

**Deux choses ne sont écrites nulle part, et on en a besoin avant jeudi :**

1. **Le correctif est-il déployé dans Creator ?** Le dépôt ne peut pas le dire — le bandeau de
   build ne se committe pas. Une ligne ici avec l'horodatage du build suffit.
2. **Combien de soumissions enregistrées sont sous-coûtées ?** Celles parties de l'Exemple, sans
   la ligne d'adhésif. C'était le premier point de l'ordre de travail. Si le compte est nul, c'est
   une bonne nouvelle à écrire aussi.

**Pour information : une rencontre client est demandée jeudi 26 novembre, 13 h** (Philippe et
Christian), sur l'avancement et sur le partage du travail avec Jose, qui monte des formulaires de
son côté. Un état du projet leur part aujourd'hui. Rien à préparer, mais le contexte explique
pourquoi les deux points ci-dessus pressent.

### 25 nov. — Quatre champs acceptent n'importe quel nombre alors qu'ils ne valent que 1 ou vide *(Youssef + Claude)*
**Youssef, en remplissant l'essai :** « il y a des valeurs qui sont à 1… je pense que sur l'ancienne
soumission, c'est plus des cases à cocher ». Vérifié : son instinct est bon, même si la cause n'est
pas celle qu'il croyait.

`lib/controles.ts` tient une liste `INDICATEURS` — dix-sept cellules qui **ne valent que 1 ou vide**.
Le commentaire est sans ambiguïté : *« Le classeur met le prix unitaire à zéro dès qu'un indicateur
dépasse 1. »* Quatre d'entre elles sont offertes dans le nouvel écran comme de **simples champs
numériques**, sans rien qui le dise :

| Champ (section 05 / 07) | Cellule | Rendu |
|---|---|---|
| Séparateur avant | S!D9 | champ libre |
| Séparateur après | S!E9 | champ libre |
| Recto / verso après | S!E13 | champ libre |
| Guillotine | S!E29 | champ libre |

**Le cas le plus traître est le recto/verso.** « Recto / verso avant » (S!D13) est une vraie
quantité ; « Recto / verso après » (S!E13) ne vaut que 1 ou vide. Les deux champs sont côte à côte,
identiques à l'œil, et obéissent à des règles opposées.

**Ce n'est pas une régression : l'écran actuel a exactement le même défaut** (`App.tsx` les rend
aussi avec `N()`). Mais la refonte reconstruit l'interface — c'est l'occasion de le corriger, pas de
le recopier. Une case à cocher dit la règle au lieu de la cacher.

Le contrôle bloquant reste utile comme filet pour les soumissions déjà enregistrées qui portent une
valeur > 1, mais il arrive après coup : il rattrape l'erreur au lieu de l'empêcher.

**Et le cas inverse, à confirmer avec Soufiane :** « Adhésif laminé » et « Adhésif régistre »
(`IN.adhesifLamine`, `IN.adhesifRegistre`) sont des **champs numériques dans l'écran actuel** et des
**cases à cocher dans le nouveau**. Ils ne figurent pas dans `INDICATEURS`. Si le classeur les
multiplie, une job qui demande deux passes ne peut plus le dire, et une soumission rouverte qui
porte 2 sera réécrite à 1. Si au contraire ils ne valent que 0/1, c'est la case à cocher qui a
raison et ils devraient rejoindre la liste.

### 25 nov. — Le comparatif estimé / réalisé fonctionne de bout en bout *(Youssef)*
**Pointage fait sur BT-1019 depuis `Pointage_essai`, puis bon rouvert dans Creator.** La grille
s'est remplie toute seule :

| Opération | Temps prévu | Temps réel | Écart |
|---|---|---|---|
| **Fabrication des écrans (soie)** | 32 | **1,07** | **−30,93** |
| Impression sérigraphie | 157,94 | 0 | −157,94 |
| Découpe platine | 52,38 | 0 | −52,38 |

Et le tableau d'atelier dit la même chose : *1 / 6 · −31 min*, avec « soie · 1 min / 32 min ».

**La chaîne complète tourne : la soumission estime, l'atelier déclare, le bon de travail compare.**
Sans qu'une ligne de Deluge ait été écrite — tout existait déjà, il manquait un écran pour déclarer
et un bon correctement semé.

**C'est le chantier que le document remis au client annonce comme « le prochain ».** Il est fait,
au sens du mécanisme. À corriger avant de remontrer ce document.

#### Ce qui reste, exactement
Trois choses, aucune n'est un obstacle de fond :

1. **Redéployer le widget de bon de travail.** Les bons créés depuis cet écran — build du
   20 octobre — naissent encore sans lignes. Le paquet est prêt, la marche à suivre est dans
   `redeploiement-bon-travail.md`. Les bons créés depuis une soumission fonctionnent déjà.
2. **Les opérations sans estimation n'ont nulle part où se poser.** Coloriste, contrôle qualité,
   emballage : leur temps sera déclaré et n'apparaîtra pas dans la grille. Le bloc comparatif à
   écrire lira donc les pointages, où tout est présent.
3. **Aucun écran ne montre encore ce comparatif à un utilisateur.** Il n'est visible que dans le
   formulaire Creator. C'est précisément le bloc à ajouter au bon de travail — et il a maintenant
   des données réelles à afficher, ce qui n'était pas vrai il y a deux heures.

#### Ce qu'on peut dire demain
Que le comparatif estimé / réalisé n'est plus un projet : **il tourne sur une vraie job**, 1,07 min
déclaré contre 32 estimé. Et que ce chiffre-là est ce qui permettra, à terme, de valider les temps
de soumission d'Artistic avec les chiffres d'Artistic.

### 25 nov. — Trois lignes au bon de travail, six opérations à l'atelier *(Youssef + Claude)*
**Question de Youssef :** pourquoi le bon de travail n'affiche que trois opérations alors que le
tableau d'atelier en montre six pour la même job ?

**Parce que les deux ne répondent pas à la même question.**

| | Ce qu'il liste | D'où ça vient | BT-1019 |
|---|---|---|---|
| La grille du bon | ce que la soumission **a estimé** | les cinq champs `Temps_*_Min` ; une ligne seulement si la valeur est > 0 | **3** — soie, impression, platine |
| Le tableau d'atelier | ce que la job **doit traverser** | la règle de déclenchement d'`Operations_Liste` | **6** — plus coloriste, contrôle qualité, emballage |

Les trois opérations en plus — **préparation des encres, contrôle qualité, emballage** — sont du
travail réel que le classeur ne chiffre pas. Ce n'est pas un défaut d'affichage : c'est le constat
des « onze opérations sur seize sans estimation », rendu visible sur une seule job.

#### La conséquence, et elle oriente le bloc comparatif
Quand l'atelier pointera le coloriste ou l'emballage, **ce temps existera dans `Pointage_Atelier`
mais n'aura aucune ligne où se poser** dans la grille : le workflow n'écrit que dans des lignes
existantes, et il n'en crée pas.

Donc le bon de travail montrerait **trois opérations comparées** là où l'atelier en aura fait
**six**. C'est une raison de plus — la troisième — de faire lire **les pointages** au bloc
comparatif plutôt que la grille :

| | La grille | Les pointages |
|---|---|---|
| Opérations montrées | 3 (les estimées) | **6 (toutes celles faites)** |
| Marche sur les bons sans semis | non | **oui** |
| Peut diverger | oui, c'est un report | **non, c'est la source** |

Le bloc affichera donc les six : trois avec leur écart, trois avec leur temps réel et la mention
« sans estimation ». **C'est précisément ce qu'il faut mettre sous les yeux de Roberto** — non pas
pour signaler une erreur, mais pour poser la question : *ces temps-là devraient-ils entrer dans vos
soumissions ?*

#### Au passage : un bon de travail aberrant
BT-1018 annonce **268 h 12 d'impression** et **116 h 10 de découpe platine**, sur la même pièce où
BT-1019 compte 2 h 38 et 52 min. Cent fois plus. Ce sont des données d'essai, donc rien d'urgent —
mais à regarder avant que ces chiffres ne servent de référence à quoi que ce soit.

C'est aussi une démonstration involontaire de ce que vaut un écran fait pour être lu : cette
anomalie dort dans la base depuis sa création et personne ne l'avait vue.

### 25 nov. — Le semis fonctionne : c'est bien le build du bon de travail qui est en cause *(Youssef)*
**Bon créé depuis `Soumission_essai`** (soumission S-2026-0002) → **BT-1019**, et sa grille
« Temps par operation » porte **trois lignes, avant tout pointage** :

| Opération | Temps prévu | Temps réel | Écart |
|---|---|---|---|
| Fabrication des écrans (soie) | 32 | 0 | −32 |
| Impression sérigraphie | 157,94 | 0 | −157,94 |
| Découpe platine | 52,38 | 0 | −52,38 |

**L'hypothèse est confirmée.** Le semis marche dans le code actuel. Les bons sans lignes —
BT-1000 à BT-1003 — ont été créés depuis l'écran de bon de travail, figé au **20 octobre**, qui ne
sait pas encore le faire. **Le redéploiement décrit dans `redeploiement-bon-travail.md` est donc la
bonne réponse, et la seule nécessaire.**

Deux détails qui valent d'être notés :

- **Les temps prévus arrivent au centième** — 157,94 et 52,38, pas 158 et 52. Le semis transporte la
  valeur calculée, pas un arrondi. Le comparatif sera donc juste à la minute près sans rien perdre.
- **Seules trois opérations sur six ont une ligne.** Coloriste, contrôle qualité et emballage n'en
  ont pas, faute d'estimation — exactement ce que la gamme annonçait. Leur temps réel existera dans
  les pointages mais n'aura rien à quoi se comparer. C'est la même limite, vue d'un autre angle :
  **onze opérations sur seize se font sans être chiffrées.**

#### Ce qui reste à éprouver, et c'est l'aboutissement
Pointer sur BT-1019 depuis `Pointage_essai`, terminer, puis rouvrir le bon. Les colonnes
**« Temps reel »** et **« Ecart »** doivent se remplir toutes seules — le workflow
`Pointage_Atelier_Success` cumule tous les pointages terminés de l'opération et écrit le résultat
dans la ligne.

Si ça passe, **le comparatif estimé / réalisé fonctionne de bout en bout** : la soumission estime,
l'atelier déclare, le bon de travail compare. Sans qu'on ait écrit une ligne de Deluge.

### 25 nov. — L'export de l'application tranche tout : le workflow est bon, c'est le semis qui manque *(Youssef + Claude)*
**Youssef a exporté l'application** (`.ds`, lu hors dépôt — le dépôt est public). Quatre questions
ouvertes se ferment d'un coup.

#### 1. Le workflow de pause est complet et correct — rien à écrire
`Pointage_Atelier_Success`, déclenché *on add or edit*. Son cœur :

```deluge
if(statut == "En pause") {
    if(pauseDebut == null) { pointage.Pause_debut = maintenant; }
}
else if(pauseDebut != null) {
    // Reprise ou fin : toute pause ouverte est refermée et comptabilisée.
    pauseCumul = (pauseCumul + ((maintenant - pauseDebut)) / 60000.0).round(2);
    pointage.Pause_cumulee_min = pauseCumul;
    pointage.Pause_debut = null;
}
```

**Le `else if` couvre la reprise *et* la fin** — donc le cas « terminer sans reprendre », que je
croyais oublié, est traité. Et `Duree_reelle_min` déduit bien `pauseCumul`.

**Mesuré sur le pointage de BT-1001 :** Punch in 13:14:30, Punch out 13:17:40, soit 3 min 10 s ;
pause cumulée 1,13 ; durée réelle **2,04**. Les trois chiffres s'accordent au centième.

→ **`pointage-workflow-pause.md` est inutile.** Il reste comme spécification de ce qui doit se
passer, mais il n'y a rien à appliquer. Mon diagnostic initial était faux sur toute la ligne.

#### 2. Le report vers le bon de travail existe aussi
Le même workflow cherche, dans la grille `Temps_par_operation` du bon, la ligne qui porte
l'opération, et y écrit le **cumul de tous les pointages terminés** du bon pour cette opération,
plus l'écart. Plusieurs opérateurs ou plusieurs séances s'additionnent au lieu de s'écraser.

Son commentaire dit lui-même pourquoi ça ne marche pas aujourd'hui :
*« Si aucune ligne ne porte cette operation, on ne cree rien ici : Deluge ne sait pas rattacher une
ligne a la grille. Les lignes d'un bon de travail sont posees a sa creation, par l'API. »*

**Donc le seul maillon cassé est le semis**, et il est dans le widget de bon de travail — celui qui
tourne encore sur un build du **20 octobre**. **Le redéployer suffit** : les bons créés ensuite
auront leurs lignes, et la chaîne entière fonctionnera, report compris.

#### 3. Le champ de la règle s'appelle `Regle_declenchement`
Sans le « de ». La chaîne de secours du service a rattrapé le coup, d'où la gamme correcte à
l'écran. Remis dans le bon ordre (`c527382`), les autres orthographes gardées en secours.

#### 4. `No_BT` n'a aucune contrainte d'unicité
```
No_BT ( type = text   initial value = "BT-0001" )
```
Du texte simple. **Rien n'empêche deux bons de porter le même numéro** — d'où les sept `BT-1000`.
Le widget prévoit pourtant une renumérotation en cas de collision, mais elle ne se déclenche que sur
l'erreur d'unicité de Creator, qui n'arrive jamais.

→ **Une case à cocher sur le champ `No_BT` du formulaire `bon_travail`** : « ne pas autoriser les
doublons ». À faire avant la mise en production, et à faire précéder d'un nettoyage des doublons
existants, sinon Creator refusera d'appliquer la contrainte.

### 25 nov. — Confirmé : le pointage n'écrit rien dans la grille du bon de travail *(Youssef)*
**Cycle complet refait sur BT-1001**, un bon neuf — démarrer, pause, reprise, terminer. Le pointage
est bien enregistré : le tableau d'atelier affiche *Fabrication des écrans (soie) · 2 min / 32 min*
et la job passe à 1 / 6, −30 min.

**Et la grille « Temps par operation » du bon de travail reste vide.** Vérifiée avant le pointage,
pendant, et après la clôture : aucune ligne. *« Je te confirme que même à la fin, quand j'ai fait
terminer, je suis revenu dans le bon travail, j'ai rien trouvé dans la partie opération. »*

**C'est cohérent avec ce que le code annonce**, et ça clôt la question. Le commentaire de
`bonTravailService` est explicite : *« le pointage d'atelier ne sait que METTRE À JOUR une ligne
existante : Deluge ne peut pas en rattacher une à un bon déjà créé »*. Les lignes sont censées être
semées **à la création du bon** ; elles ne l'ont pas été ; le pointage n'a donc rien à mettre à jour
et n'écrit nulle part.

**Conséquence : la grille est inexploitable en l'état**, pour tous les bons existants — BT-1000 à
BT-1003 compris. La décision de faire lire les **pointages** plutôt que la grille au futur bloc
comparatif n'est plus une préférence de conception, c'est la seule voie praticable sans
réensemencer.

#### Où lire quoi — la confusion à lever
Les deux choses ne vivent pas au même endroit, et c'est ce qui a fait chercher au mauvais endroit :

| Ce qu'on cherche | Où ça vit |
|---|---|
| Les temps déclarés, avec `Pause_debut` et `Pause_cumulee_min` | le formulaire **`Pointage_Atelier`**, rapport **`Pointage_Atelier_Vue`** |
| Le report par opération sur le bon | la grille `Temps_par_operation` du formulaire `bon_travail` — **vide** |

Le tableau d'atelier lit le premier, jamais le second. C'est pour ça qu'il affiche 2 min alors que
le bon de travail n'affiche rien : **les pointages existent, le report n'existe pas.**

La question de la pause se tranche donc dans `Pointage_Atelier_Vue`, sur l'enregistrement du
pointage lui-même — pas dans le bon de travail.

### 25 nov. — Correction : la pause est peut-être déjà traitée par Creator *(Youssef + Claude)*
**J'avais conclu trop vite.** L'entrée précédente affirmait que `Duree_reelle_min` comptait la pause
comme du travail. **Cette conclusion reposait sur une séquence que j'avais supposée** — démarrer,
mettre en pause, terminer — alors que Youssef a fait autre chose : démarrer, mettre en pause,
**reprendre**, laisser tourner jusqu'à 2 minutes, puis terminer.

Avec la vraie séquence, l'arithmétique ne dit plus rien : les 2 minutes enregistrées peuvent être
2 minutes de travail, pause déjà déduite. **Le test est muet sur la question**, et je l'avais
présenté comme une preuve.

**Et son observation penche dans l'autre sens.** Il note qu'à la reprise, *« il a repris par rapport
au moment où j'ai arrêté la première fois »* — le compteur a continué depuis 1 min 04 s au lieu de
sauter. Or c'est un indice fort, à cause de la façon dont l'écran calcule :

```
affiché = (maintenant − Punch_in) − Pause_cumulee_min
```

Si `Pause_cumulee_min` était resté à zéro, la reprise aurait fait **bondir** le compteur de toute la
durée de la pause. Il n'a pas bondi. **Donc quelque chose a bien écrit `Pause_cumulee_min`** — et
c'est forcément le workflow Creator, puisque le widget n'écrit que le statut.

**Autrement dit : le workflow de pause existe probablement déjà et fonctionne.** Le seul défaut réel
était le mien — l'écran ne distinguait pas une opération en pause d'une opération en cours — et il
est corrigé.

#### Ce qui tranche, en trente secondes
Ouvrir le pointage de l'essai dans Creator et lire deux champs :

| Champ | Si le workflow fait son travail | Sinon |
|---|---|---|
| `Pause_cumulee_min` | **≈ 1** | 0 ou vide |
| `Pause_debut` | vide (la pause a été fermée) | une heure restée là |

Tant que ces deux valeurs ne sont pas lues, **`pointage-workflow-pause.md` reste une marche à suivre
conditionnelle** : à appliquer seulement si le workflow ne fait pas déjà le travail. Il garde sa
valeur comme spécification de ce qui doit se passer, et comme plan d'essai — en particulier le cas
qu'on oublie toujours : **terminer sans reprendre**, où la pause ouverte doit quand même être
comptée. Celui-là n'a pas été éprouvé.

### 25 nov. — Le cycle complet tourne dans Creator, et la pause y est comptée comme du travail *(Youssef)*
**Cycle éprouvé sur `Pointage_essai`, sur un vrai enregistrement**, opération « Préparation des
encres (coloriste) » du bon BT-1000 (BSP) :

| Étape | Ce que l'écran a montré |
|---|---|
| Démarrage | pastille **verte**, `▶ Test bsp · 0 min 03 s`, chrono qui tourne |
| Pause | pastille **ambre**, `⏸ Test bsp · 1 min 04 s`, **chrono figé** |
| Fin | pastille **grise**, `2 min · sans estimation`, avancement 1 / 6 → **2 / 6** |

**Ce qui est validé :** l'écriture dans Creator fonctionne de bout en bout, le correctif de la pause
se comporte en production exactement comme au banc, et l'avancement de la job suit. Le tableau
d'atelier est opérationnel.

**Ce qui est confirmé par la mesure :** le travail réel a duré **une minute environ** — le chrono
s'est figé à 1 min 04 s. La pause a duré une minute de plus. **Creator a enregistré 2 min.**

Autrement dit, `Duree_reelle_min` vaut le **temps écoulé**, pas le **temps de travail** : la pause
est comptée comme de la production. C'est la confirmation chiffrée de ce qu'on soupçonnait — il
manque bien les trois blocs décrits dans `pointage-workflow-pause.md`.

**L'écart de la job n'a pas bougé** (−32 min), ce qui est juste : « Préparation des encres » n'a pas
d'estimation, donc elle ne peut contribuer à aucun écart. Le comportement attendu.

**À noter pour la suite :** tant que ce workflow n'est pas écrit, tout temps déclaré sur une
opération mise en pause est surévalué. Cela vaut pour le tableau d'atelier comme pour le futur
comparatif du bon de travail — les deux lisent la même durée.

### 25 nov. — La pause ne faisait rien : un défaut à moi, et un manque côté Creator *(Youssef + Claude)*
**Youssef, en éprouvant le cycle complet sur `Pointage_essai` :** *« quand j'appuie sur le bouton
pause, il ne s'est rien passé, le compteur a continué »*. Deux causes, une de chaque côté.

#### Dans l'écran — corrigé (`70af2bc`)
Une opération en pause était traitée comme une opération en cours : **même pastille verte, même
flèche**. Rien ne distinguait les deux états, d'où l'impression que le bouton n'avait rien fait.
Elle a maintenant sa couleur ambre et son symbole ⏸, et les deux chronos — celui de la pastille et
celui de la feuille — se figent.

Vérifié dans le navigateur : 14 min 23 s puis 24 s en marche, figé à 14 min 26 s après la pause, et
la reprise repart.

#### Côté Creator — à faire
Le compteur soustrayait la pause à partir de **`Pause_debut`**, que **seul le workflow Creator
pose** : le widget n'écrit que `Statut`, par conception (*« les heures et les durées sont posées par
le workflow »*). Tant que ce workflow ne pose pas `Pause_debut`, le temps continue de courir dans
la base, même si l'écran ne le montre plus.

**Il manque donc, sur `Pointage_Atelier` :**
1. quand `Statut` passe à **En pause** → poser `Pause_debut` à maintenant ;
2. quand il revient à **En cours** → ajouter l'écart à `Pause_cumulee_min` et vider `Pause_debut` ;
3. à **Termine** → fermer la pause en cours avant de calculer `Duree_reelle_min`.

Sans ça, une opération mise en pause une heure comptera cette heure comme du travail, et le
comparatif estimé / réalisé en héritera.

**L'écran ne dépend plus de ce workflow pour afficher juste** — il retient lui-même l'instant où il
voit la pause. Mais la durée enregistrée, elle, reste celle que Creator calcule. Le correctif de
l'écran rend le défaut invisible, il ne le répare pas : la vérité est dans la base.

### 25 nov. — Le tableau d'atelier est en ligne sur `Pointage_essai` *(Youssef)*
**Téléversé et posé sur la page, il lit les vraies données de Creator.** Relevé sur la capture :

**Ce qui est vérifié, et c'était le point le plus incertain.** La gamme se déduit correctement.
Un bon en numérique affiche *Impression numérique · Découpe platine · Découpe Zünd · Contrôle
qualité · Emballage* ; un bon en sérigraphie affiche *Soie · Coloriste · Impression sérigraphie ·
Découpe platine · QC · Emballage*. **Le champ `Regle_de_declenchement` répond donc bien** — sinon
toutes les jobs se seraient réduites aux deux opérations « toujours ». Les trois orthographes
tentées par le service n'étaient pas de la paranoïa inutile, mais la première a suffi.

**Les temps prévus sont réels** et viennent du bon : 26 min, 37 min, 16 min sur l'un ; 32 min,
3 h 51, 52 min sur l'autre. Et les cinq opérations sans estimation disent « sans estimation ».

**Tout est à 0 / 5 et 0 / 6**, ce qui est cohérent : aucun temps n'a encore été déclaré, et la
grille `Temps_par_operation` est vide pour la même raison.

⚠️ **Un défaut de données révélé au passage : trois bons portent le numéro `BT-1000`.** Deux sont
même identiques à l'œil — *BSP · n° 4152464* — et ne se distinguent que par leur découpe platine
prévue, 52 min contre 33 min. `bonTravailService` prévoit pourtant une renumérotation en cas de
collision, en supposant le champ `No_BT` coché *Unique* dans Creator. Soit la contrainte n'est pas
posée, soit ces enregistrements sont antérieurs. **À vérifier**, parce qu'un atelier qui voit trois
fois le même numéro ne peut pas pointer sur le bon.

**Ce qui reste à éprouver :** déclarer un vrai temps. Démarrer une opération, la voir passer au
vert, la terminer, et voir l'écart apparaître sur la job. C'est le seul bout du cycle qui n'a été
vérifié que sur le jeu d'exemple.

### 25 nov. — Comment on met un écran à l'essai sans toucher à la production *(Youssef + Claude)*
**La convention, telle qu'elle existe déjà** pour la refonte de la soumission :

| | Production | À l'essai |
|---|---|---|
| **Page Creator** | `Soumission` | `Soumission_essai` (admins seulement) |
| **Entrée widget** | `canevas` | `soumission2` |
| **Dossier du dépôt** | `widget/canevas/` | `widget/soumission2/` |

Donc, pour le tableau d'atelier : **page `Pointage_essai`**, réservée aux administrateurs, et
**entrée widget `pointage2`**.

⚠️ **Le piège, et il est facile à rater.** L'entrée widget est l'unité de déploiement, pas la page.
Téléverser le nouveau zip dans l'entrée **`pointage` existante** remplacerait l'écran **partout où
ce widget est posé**, y compris sur la page de production. Il faut **créer une seconde entrée**
dans Paramètres → Widgets et y téléverser le zip ; l'ancienne garde son build du 19 octobre.

Le zip est autonome : deux entrées peuvent porter deux versions différentes du même code. Aucune
modification du dépôt n'est nécessaire pour ça.

**Et c'est pour ça que la branche reste une branche.** `main` porte toujours l'ancien poste de
pointage ; `tableau-atelier` porte le nouveau. Tant que le tableau n'est pas accepté, un
`pack:pointage` lancé depuis `main` produit l'ancien écran — ce qui est exactement le filet qu'on
veut. On ne fusionne qu'une fois la décision prise.

### 25 nov. — Le tableau d'atelier est écrit, branche `tableau-atelier` *(Claude)*
**Commit `a39afb5`, partie de `main`.** L'approche B des trois maquettes, celle recommandée.
`build:pointage` compile, les types passent, et l'écran a été manipulé dans le navigateur :
démarrer, mettre en pause, terminer, et l'avancement comme l'écart suivent.

**Ce que l'écran montre.** Les jobs en production, chacune avec les opérations de sa gamme, dans
l'ordre de production. Sur chaque opération : son temps prévu, ou son réel comparé au prévu quand
elle est faite, ou qui la fait en ce moment avec le chrono qui tourne. Sur chaque job : l'avancement
et **l'écart cumulé**, en vert s'il est en avance, en orange s'il dépasse.

**La gamme n'est pas devinée.** `gammeDuBon` lit les règles de déclenchement d'`Operations_Liste` et
les recoupe avec les temps estimés que le bon porte déjà : un temps d'impression veut dire
sérigraphie, un temps Zünd veut dire Zünd. Les opérations « toujours » (QC, emballage) valent pour
toutes les jobs ; les « manuel » s'ajoutent par le bouton « + autre opération ». **Une opération déjà
pointée reste affichée même si la règle ne l'aurait pas prévue** — ce qui a été déclaré ne doit
jamais disparaître de l'écran.

**Onze opérations sur seize n'ont aucune estimation.** Elles affichent « sans estimation » plutôt
que d'être cachées. C'est exactement ce que le comparatif doit révéler : le décorticage,
l'assemblage et l'emballage se font et ne se chiffrent nulle part.

**Un jeu d'exemple hors Creator.** Trois jobs, cinq opérateurs, la vraie gamme, et toutes les
actions s'appliquent en mémoire. L'écran est donc démontrable sans toucher aux données réelles —
utile demain, et utile pour relire la mise en page sans attendre un téléversement.

#### Ce que ça demande à Youssef
`npm run pack:pointage` produit `widget/pointage/dist/pointage.zip`. **À téléverser dans
Paramètres → Widgets**, de préférence d'abord sur une page d'essai plutôt que par-dessus le
pointage de production.

#### Ce qui reste sur cette piste
- **Le bloc comparatif dans le bon de travail** : lire les pointages du bon, grouper par opération,
  afficher prévu / réel / écart. C'est le pendant de ce tableau, et ça ferme la boucle.
- **Redéployer le widget de bon de travail**, figé au 20 octobre.
- Une fois en ligne : vérifier que `Regle_de_declenchement` est bien le nom du champ côté Creator.
  Le service essaie trois orthographes ; si aucune ne répond, la gamme se réduira aux opérations
  « toujours » et ça se verra tout de suite.

### 25 nov. — Qui fait quoi : deux pistes, aucun fichier en commun *(Youssef + Claude)*
**Question de Youssef :** le tableau d'atelier et le bloc comparatif touchent le pointage et le bon
de travail — est-ce que c'est encore à Soufiane, ou à nous ?

**À nous.** Pas parce qu'il ne saurait pas, mais parce que **les deux pistes ne partagent aucun
fichier** et qu'il a déjà le morceau le plus lourd du projet.

| | Soufiane | Nous |
|---|---|---|
| **Widget** | `soumission2` (la refonte) | `pointage` et `bontravail` |
| **Fichiers** | `src/s2/`, `src/lib/controles.ts`, `src/lib/modele.ts` | `src/pointage/`, `src/bt/`, `src/services/pointageService.ts`, `src/services/bonTravailService.ts` |
| **En cours** | le montage mixte, le prix minimum, le suffixe R1/R2, les quatre champs 1-ou-vide, « Gâche » → « Perte » | le tableau d'atelier, le bloc comparatif dans le bon de travail |
| **Déploiement** | `pack:s2`, par Soufiane | `pack:pointage` et `pack:bt`, par Youssef |

**Trois raisons.**
1. **Le montage mixte est le plus gros morceau du projet**, et c'est le seul avec une échéance
   client. Lui ajouter le pointage, c'est garantir que ni l'un ni l'autre n'avance.
2. **Aucun fichier n'est partagé.** Deux widgets Creator distincts, deux déploiements distincts.
   On peut travailler en parallèle sans se marcher dessus, ce qui n'était pas vrai du repliage.
3. **Youssef déploie lui-même** les widgets `pointage` et `bontravail` : un `pack:*` et un
   téléversement dans Paramètres → Widgets. Notre piste n'a donc aucune dépendance à Soufiane.

**La seule règle à tenir :** si l'un de nous doit toucher `src/lib/` ou un service de l'autre, il le
dit ici avant. C'est le seul endroit où les deux pistes peuvent se croiser.

**Ce que Soufiane a poussé aujourd'hui**, pour mémoire : la fusion du repliage (`155dc8d`), la
pastille de la section 06 restreinte à la sérigraphie (`ef76c44`), le contrôle des valeurs sans case
avec leur montant (`5ac99af`) et leur remontée au sommaire (`064a241`). Il n'a pas encore vu les
réponses de Roberto ni le plan du montage mixte — ils sont arrivés après sa dernière poussée.

### 25 nov. — La gamme des 16 opérations, et ce qu'elle débloque *(Youssef + Claude)*
Youssef a exporté `Operations_Liste`. **Les cinq codes attendus par le semis y sont tous** — `SOIE`,
`IMPR`, `NUM`, `DEC_PLAT`, `DEC_ZUND`. La cause de la grille vide n'est donc pas là : il reste le
**build du bon de travail, figé au 20 octobre**. Redéployer le widget suffira pour les bons à venir ;
les bons déjà créés resteront sans lignes, ce qui confirme qu'il faut lire les pointages plutôt que
la grille.

#### La table porte trois colonnes qu'on n'exploitait pas
| Code | Nom | Département | Ordre | Déclenchement | Prévu ? |
|---|---|---|---|---|---|
| `SOIE` | Fabrication des écrans (soie) | Soie | 10 | sérigraphie | **oui** |
| `COLOR` | Préparation des encres (coloriste) | Coloriste | 20 | sérigraphie | non |
| `IMPR` | Impression sérigraphie | Impression | 30 | sérigraphie | **oui** |
| `NUM` | Impression numérique | Impression | 40 | numérique | **oui** |
| `LAM` | Laminage | Laminage | 50 | adhésif rouleau | non |
| `REG` | Régistre (adhésif en feuille) | Préparation | 60 | adhésif feuille | non |
| `DEC_PLAT` | Découpe platine | Découpe | 70 | platine | **oui** |
| `DEC_ZUND` | Découpe Zünd | Découpe | 80 | zund | **oui** |
| `DECORT` | Décorticage | Finition | 90 | manuel | non |
| `COINS` | Coins ronds | Finition | 100 | manuel | non |
| `SLIT` | Slitting | Finition | 110 | manuel | non |
| `GUILL` | Guillotine | Finition | 120 | manuel | non |
| `OEIL` | Œillets | Finition | 130 | manuel | non |
| `ASSEMB` | Assemblage | Finition | 140 | manuel | non |
| `QC` | Contrôle qualité | QC | 150 | toujours | non |
| `EMB` | Emballage | Expédition | 160 | toujours | non |

**`Ordre`** donne la séquence réelle de production, de 10 à 160. Le tableau d'atelier n'a plus à
deviner l'ordre des opérations : il le lit.

**`Regle de declenchement`** dit **quelles opérations s'appliquent à une job donnée** :
`serigraphie` → SOIE, COLOR, IMPR · `numerique` → NUM · `platine` → DEC_PLAT · `zund` → DEC_ZUND ·
`adhesif_rouleau` → LAM · `adhesif_feuille` → REG · `toujours` → QC, EMB · `manuel` → ajoutée par
l'opérateur.

C'est exactement ce qui manquait au tableau : au lieu d'afficher les seize opérations ou d'en
choisir arbitrairement, **chaque bon de travail montre la sienne**, déduite de ses propres
caractéristiques — sérigraphie ou numérique, platine ou Zünd, adhésif en rouleau ou en feuille.

#### Ce que ça change concrètement
1. **Le tableau d'atelier affiche la vraie gamme de chaque job**, dans le bon ordre, sans en
   inventer. La maquette B devinait les deux ; elle n'aura plus à le faire.
2. **Onze opérations sur seize n'ont pas d'estimation.** Elles sont toutes `Pointable`, donc
   déclarables. Le comparatif affichera leur réel sans prévu — et c'est une information en soi :
   le décorticage, l'assemblage et l'emballage se font et ne se chiffrent nulle part.
3. **`Departement`** regroupe naturellement : Soie, Coloriste, Impression, Laminage, Préparation,
   Découpe, Finition, QC, Expédition. De quoi filtrer le tableau par poste quand il y aura plusieurs
   écrans.

### 25 nov. — La grille « Temps par opération » est vide, et c'est une bonne nouvelle *(Youssef + Claude)*
**Vérifié dans Creator par Youssef :** le formulaire `bon_travail` porte bien la grille
« Temps par operation » avec ses quatre colonnes — Operation, Temps prevu (min), Temps reel (min),
Ecart (min) — **et elle est vide**. Aucune ligne semée.

#### Pourquoi, et ce n'est pas tranché
Deux causes possibles, et le code ne dit pas laquelle :
1. **Le build déployé est antérieur au semis.** Le widget de bon de travail tourne sur
   `2026-10-20 15:29 UTC` ; le dépôt commence le 27 octobre.
2. **Le semis tourne mais ne trouve rien.** `semerTempsOperations` lit `Operations_Liste` et
   construit une correspondance **Code → ID**. Il attend exactement `SOIE`, `IMPR`, `NUM`,
   `DEC_PLAT`, `DEC_ZUND`. Si les codes diffèrent, rien n'est semé et **le code se contente d'un
   `console.warn`** : *« un semis raté ne doit pas empêcher la création du bon »*. Échec silencieux.

**La vérification qui tranche, trente secondes :** ouvrir `Operations_Liste` dans Creator et
regarder la colonne **Code**. Si les cinq codes attendus n'y sont pas, on a la cause.

#### Rien n'est perdu
Les pointages d'atelier vivent dans leur propre formulaire, `Pointage_Atelier`, et ils y sont
complets : `btId`, `btNo`, `operationId`, `operationNom`, `dureeReelleMin`. **La grille du bon
n'était qu'un report.** Ce qui manque, c'est le report — pas les données.

#### Donc on change d'approche, et c'est plus simple
**Le bloc comparatif du bon de travail ne lira pas la grille. Il lira les pointages directement.**

| | La grille semée | Les pointages lus directement |
|---|---|---|
| Dépend d'un semis à la création | oui | **non** |
| Marche sur les bons déjà créés | non | **oui** |
| Marche si les codes changent | non | **oui** |
| Peut diverger de la réalité | oui, c'est un cache | **non, c'est la source** |

Concrètement : lire `Pointage_Atelier_Vue` filtré sur le bon, grouper par opération, sommer
`dureeReelleMin`, et comparer aux temps prévus que le bon porte déjà. Les opérations sans estimation
(décorticage, laminage, emballage…) s'affichent avec leur réel et sans prévu, plutôt que d'être
cachées.

**Ça supprime toute la fragilité du semis**, et ça marche sur BT-1000 comme sur les suivants. La
grille peut rester où elle est : si Deluge la remplit un jour, tant mieux ; l'écran n'en dépendra
pas.

### 25 nov. — Principe : ce que l'utilisateur doit voir passe par un widget *(Youssef)*
**Youssef, en apprenant que la grille « Temps par opération » n'est lisible que dans Creator :**
*« est-ce qu'il va falloir à chaque fois que j'ouvre Creator pour le voir ? … je veux quelque chose
toujours lié à des widgets ».*

**C'est la bonne règle, et elle manquait au dépôt.** Les formulaires et rapports natifs de Creator
sont de la plomberie : ils servent à paramétrer et à dépanner, pas à travailler. Tout ce qu'un
chargé de projet, un directeur de production ou un opérateur doit consulter dans sa journée
appartient à un widget. Si une donnée n'existe que dans un formulaire Creator, elle n'existe pas
pour l'utilisateur.

#### Le cas qui l'a révélé
`Temps_par_operation` est **écrite et jamais relue**. `bonTravailService.ts` la sème à la création du
bon (l. 372) ; aucune fonction ne la recharge. Et `AppBT.tsx` n'affiche que `FT_TEMPS` — les quatre
temps **prévus** à plat, en heures et minutes.

Donc : **le temps réel que l'atelier déclare n'est visible nulle part**, et l'écart non plus. Le
comparatif estimé / réalisé existe dans la base et sur aucun écran.

Ce n'était pas un choix : le commentaire du code explique seulement pourquoi le semis se fait à la
création (Deluge ne sait pas rattacher une ligne à un bon déjà créé). L'affichage n'a simplement
jamais été écrit, parce que le comparatif était rangé comme « chantier suivant ».

#### Ce que ça change pour la feuille de route
**Le comparatif estimé / réalisé n'est pas un chantier, c'est un bloc à ajouter à un écran qui
existe.** Trois choses :

1. **Relire la grille** — `bonTravailService` l'écrit déjà ; il lui manque la lecture.
2. **L'afficher dans le bon de travail** — un bloc opération / prévu / réel / écart, avec le total.
   À côté des quatre temps prévus déjà présents, au même endroit.
3. **Redéployer le widget de bon de travail** — en retard depuis le 20 octobre de toute façon.

Avec le tableau d'atelier qui écrit le réel d'un côté et ce bloc qui le montre de l'autre, la boucle
est fermée. C'est aussi ce qui permettra enfin de valider les temps de soumission avec les chiffres
d'Artistic plutôt que de les supposer justes.

**À corriger dans le document remis au client :** le comparatif y est annoncé comme le prochain
chantier, au même rang que la facturation. Il est beaucoup plus près que ça.

### 25 nov. — Essai 3 passé, et le bon de travail déployé a cinq semaines de retard *(Youssef + Claude)*
**Essai 3 : réussi.** Youssef a enregistré sa soumission, fait « Nouvelle soumission », puis l'a
rouverte : *« les chiffres sont toujours les bons »*. C'est le défaut corrigé lundi dans l'écran de
production ; la refonte en est exempte. **Trois des quatre essais qui comptent sont passés** — il ne
reste que le document client (essai 4).

**Le seuil de revalidation a été saisi dans Creator** par Youssef, sans déploiement, le jour même où
Roberto l'a donné.

#### Le bon de travail tourne sur un build du 20 octobre
Relevé sur les captures de l'écran de production : le bandeau du widget de bon de travail dit
**`build 2026-10-20 15:29 UTC`**. Or la source a bougé depuis : `61646ad` du **3 novembre**
(« Distinguer les quatre causes du message *Hors Creator* ») n'est donc **pas en ligne**.

C'est le même angle mort que le dépôt a déjà connu : on sait ce qui est commité, pas ce qui est
déployé, et seul le bandeau le dit. **Les trois autres widgets ont été redéployés depuis ; celui-là
non.**

⚠️ **Conséquence à vérifier, et elle compte pour le comparatif estimé / réalisé.** Le semis de la
grille « Temps par opération » (`semerTempsOperations`) tourne à la **création** du bon. Si le build
déployé est antérieur à ce code, **les bons créés en production n'ont pas de lignes**, et le temps
réel déclaré par l'atelier n'a nulle part où se poser. L'historique du dépôt ne tranche pas : la
fonction est présente dès le premier commit (27 oct.), qui est un import de travail antérieur.

**Seule une lecture dans Creator tranche** : ouvrir un `bon_travail` par son **formulaire ou son
rapport** — pas par le widget, qui n'affiche pas cette grille — et regarder si « Temps par
opération » porte des lignes avec un `Temps_prevu_min` rempli.

#### Deux cellules sans libellé, une piste
Le widget signale depuis un moment que `FT!R43` et `FT!W48` portent des valeurs (24 et 48) sans
libellé identifiable. Sur la capture de BT-1000, la première ligne de matériaux est **« Lexan Clair
,005x24x48 »**. 24 et 48 sont donc très probablement **les dimensions de la feuille de matière
choisie**, reprises du catalogue. À faire confirmer par Roberto — c'est une question d'une phrase,
et ça fermerait un « à nommer » qui traîne.

### 25 nov. — Le comparatif estimé / réalisé est déjà à moitié construit *(Claude)*
**Correction de l'entrée précédente.** J'avais écrit qu'il fallait vérifier si
`bon_travail_Report` expose les cinq champs `Temps_*_Min`. C'est la mauvaise question : il existe
beaucoup mieux, et personne ne l'avait relevé dans le journal.

**Chaque bon de travail porte déjà une grille « Temps par opération ».** `bonTravailService.ts`
l'ensemence **à la création du bon**, une ligne par opération qui a un temps estimé :

| Colonne | Contenu |
|---|---|
| `Operation` | l'ID lu dans `Operations_Liste`, par son code |
| `Temps_prevu_min` | le temps estimé venu de la soumission |
| `Temps_reel_min` | 0 au départ |
| `Ecart_min` | `-prevu` au départ |

La correspondance code → temps est déjà écrite (`TEMPS_VERS_OPERATION`) : `SOIE`, `IMPR`, `NUM`,
`DEC_PLAT`, `DEC_ZUND`. Et le commentaire du code dit pourquoi le semis se fait à la création :
*« le pointage d'atelier ne sait que METTRE À JOUR une ligne existante »* — donc **le pointage écrit
déjà le temps réel dans cette grille**.

**Ce que ça change.**
1. Le tableau d'atelier (approche B) n'a rien à reconstruire : prévu, réel et écart par opération
   sont là, par bon de travail. C'est exactement sa matière première.
2. Le **comparatif estimé / réalisé** — annoncé comme « prochain chantier » dans le document remis
   au client — est **déjà à moitié fait**. Il manque l'écran qui le montre, pas les données.
3. Les opérations sans estimation (laminage, œillets, QC, décorticage, emballage…) n'ont pas de
   ligne : leurs pointages s'enregistrent mais n'apparaissent pas dans la grille. Le tableau devra
   les afficher sans prévu plutôt que de les cacher.

**La bonne vérification, pour Youssef, et elle prend trente secondes :** ouvrir un bon de travail
récent dans Creator et regarder la grille « Temps par opération ». Si elle porte des lignes avec un
`Temps_prevu_min` rempli, tout est en place. Si elle est vide, c'est que le semis n'a pas tourné sur
les bons déjà créés — et il faudra les réensemencer, ce qui est un autre petit travail.

### 25 nov. — Le montage mixte se construit sans attendre les réponses *(Youssef + Claude)*
**Je me corrige.** J'avais présenté les deux questions sans réponse comme bloquantes. Elles ne le
sont pas, et c'est l'idée de Youssef qui le montre : **si la règle devient un paramètre, la réponse
ne débloque plus un développement, elle choisit une valeur.** Il suffit de l'appliquer un cran plus
haut que là où il l'avait mise — au **placement**, pas seulement à la répartition du coût.

Un courriel part quand même à Roberto ce soir, pour que les valeurs par défaut soient les bonnes.
Mais la construction ne l'attend pas.

#### Deux paramètres, et le contrat qui va avec
| Code `Taux_Calcul` | Valeurs | Défaut |
|---|---|---|
| `APP_MONTAGE_MIXTE` | `aucun` · `bandes` · `libre` | **`aucun`** — le comportement d'aujourd'hui |
| `APP_REPARTITION_MIXTE` | `surface` · `poses` · `principale` | `surface` |

`parametres.ts` lit déjà n'importe quel `APP_*` sans qu'on touche à rien. Le défaut `aucun` garantit
que **rien ne change tant que personne n'active quoi que ce soit** — donc aucun risque pour la
démonstration de l'essai 2.

⚠️ **Les deux valeurs doivent être inscrites sur la soumission à l'enregistrement**, en
pseudo-cellules (`X!MIXTE_MODE`, `X!MIXTE_REPART`), comme `X!MONTAGEFORMAT` l'est déjà. Sinon,
changer le paramètre rechiffrerait en silence toutes les soumissions déjà envoyées : exactement la
famille de défauts trouvée deux fois aujourd'hui.

#### Dans l'ordre, du livrable au chantier
**1. L'éligibilité de chaque pièce.** Règle de Roberto : une pièce sort du montage mixte si elle a
des découpes intérieures (« Cut O », `S!E39-41`) ou un protecteur fenêtre (`S!E27`). Affichée dans
le bloc des pièces : « montage mixte possible » / « feuilles séparées — fenêtre ». **Ne touche aucun
prix**, donc livrable seul et sans risque. C'est aussi ce qui met la règle sous les yeux de Roberto
pour qu'il la corrige si on l'a mal lue.

**2. Les deux paramètres et leur inscription sur la soumission.** Petit, et c'est le socle du reste.

**3. Le placement en bandes.** `montage.ts` sait aujourd'hui remplir une feuille d'**un** rectangle
répété : `upParAxe` donne combien tiennent sur un axe, `evaluerFormat` croise les deux. Une bande,
c'est ce même calcul restreint à une hauteur allouée. Donc : découper la feuille en N bandes, une
par pièce, chacune gardant la formule existante. Le choix du format ne change pas — toujours le
moins de feuilles, puis le plus petit format.

**4. Les deux régimes de quantité.** 500 de A et 250 de B : mixte tant que les deux roulent, puis
solo pour le reliquat de A. **Ce n'est pas une hypothèse, c'est ce qui arrive** — il n'y a rien à
arbitrer, juste à compter juste. Attention : ça touche la grille des paliers, la partie la plus
délicate de l'écran.

**5. Les trois répartitions.** Surface, poses, pièce principale. Petit une fois le 3 fait.

**6. Les cas de référence dans `verif:s2`.** Un jeu par répartition. Sans ça, « revendable » veut
dire « trois branches à moitié testées ». Le critère de la refonte est l'exactitude ; il ne se
relâche pas parce qu'on ajoute des options.

#### Ce qui est honnêtement présentable demain 13 h
Les points **1 et 2** : l'éligibilité affichée et les paramètres en place dans l'Administration. Ça
montre que la réponse de Roberto est arrivée, comprise et déjà dans l'outil.

Le point **3** si le temps le permet, en lecture seule — le bloc propose un montage en bandes et
l'affiche, sans encore le répercuter sur le prix. **Les points 4 et 5 ne seront pas prêts**, et il
vaut mieux le dire que de montrer un prix qu'on ne peut pas défendre.

### 25 nov. — Rendre la règle de répartition paramétrable plutôt que d'attendre l'arbitrage *(Youssef)*
**Proposition de Youssef :** coder les trois hypothèses de répartition du coût d'une feuille
partagée, les rendre sélectionnables dans l'Administration, et laisser le client choisir. On avance
sans attendre, et l'application devient revendable avec une autre politique de prix.

**L'idée est bonne, et la plomberie est déjà là.** `parametres.ts` lit n'importe quel code
`APP_<NOM>` de `Taux_Calcul` de façon générique (`t.code.match(/^APP_([A-Z0-9_]+)$/)`), et
`PopupAdministration` a déjà ses sections et ses cartes. Ajouter `APP_REPARTITION_MIXTE` ne demande
aucune plomberie : une ligne dans `Taux_Calcul`, un branchement dans le chiffrage. C'est le même
patron que `APP_SEUIL_DOUBLE_CHECK`.

**Mais la répartition n'est qu'un des trois morceaux, et c'est le plus petit.**

| Morceau | Est-ce une hypothèse ? | Effort |
|---|---|---|
| **Le placement** — quelles pièces sur quelle feuille, et comment disposées | **Non.** Un algorithme qui doit exister | moyen à grand |
| **Les quantités qui ne tombent pas juste** — 500 de A, 250 de B : régime mixte puis régime solo | **Non.** Une mécanique à modéliser | moyen, et il touche la grille des prix |
| **La répartition du coût** — surface, poses, ou pièce principale | **Oui.** Les trois hypothèses de Youssef | petit, une fois le reste fait |

**La question qui peut réduire le chantier de moitié, et elle est pour Roberto :** *est-ce qu'on
groupe en **bandes** ou librement ?* Si l'atelier divise la feuille en bandes — une bande par type
de pièce, chacune à son propre pas — alors `montage.ts` s'étend naturellement : `upParAxe` calcule
déjà combien tiennent sur un axe, et une bande n'est que ça, restreint à une dimension. Si au
contraire les pièces s'imbriquent librement, c'est un vrai placement 2D : un autre problème, et
probablement pas ce que fait l'atelier.

**Un piège à éviter, du même genre que ceux trouvés aujourd'hui.** Un paramètre qui change **le prix
vu par le client** ne se comporte pas comme un seuil. S'il est seulement lu à l'affichage, le
changer rechiffrerait en silence toutes les soumissions déjà envoyées. **L'hypothèse en vigueur doit
être inscrite sur la soumission au moment de l'enregistrement**, comme `X!MONTAGEFORMAT` l'est déjà
pour le format retenu, pour qu'une soumission rouverte se rechiffre comme elle a été vendue.

**Et le prix de la revendabilité :** trois chemins de calcul vivants, c'est trois fois la surface de
test. Le seul critère de validation de la refonte est l'exactitude, et `verif:s2` la tient. Chaque
hypothèse doit y arriver avec ses propres cas de référence, pas seulement avec un sélecteur dans
l'écran — sinon « revendable » veut dire « trois branches à moitié testées », ce qui vaut moins
qu'une seule bien tenue.

### 25 nov. — Ce que les réponses de Roberto changent dans la soumission *(Youssef + Claude)*
**Trois choses à écrire, deux qui tiennent avant demain, et une qui ne tient pas.** Détail des
réponses dans l'entrée précédente.

#### Pour ce soir, si tu peux — petit et sans risque
**1. Le prix minimum de commande : 250 $.** Il n'existe nulle part dans le code. Un contrôle au même
endroit que les autres (`lib/controles.ts`), de type confirmation plutôt que bloquant : *« cette
soumission est sous le minimum de commande de 250 $ »*. Paramétrable comme le seuil de double-check,
pour qu'on n'ait plus à redéployer quand le chiffre bouge — `APP_PRIX_MINIMUM` dans `Taux_Calcul`.

**2. Les révisions : R1, R2, R3…** à la fin de la séquence, donc `S-2026-0000R1`. Roberto n'a pas
confirmé explicitement le format `S-2026-0000` lui-même, seulement le suffixe ; on le lui fait dire
en une phrase à la rencontre. Écris le suffixe, laisse la séquence telle qu'elle est.

**3. Rien à faire pour le seuil de 3 000 $ ni pour les taux.** Le seuil est le paramètre
`APP_SEUIL_DOUBLE_CHECK` (4 000 → 3 000), une saisie dans Creator que Youssef fait lui-même. Les
taux du classeur sont validés par la production : il n'y a qu'à cesser de dire qu'ils sont
provisoires.

#### Le montage mixte — débloqué, mais pas pour demain, et voici pourquoi
Roberto a répondu à la question de **production** (« peut-on les monter ensemble ? » — oui, sauf
fenêtre). Il n'a pas répondu aux deux questions de **chiffrage**, qui sont celles dont la soumission
a besoin :

1. **Comment se répartit le coût d'une feuille partagée ?** Une feuille porte 3 pièces A et 5 pièces
   B. La grille affiche un prix *par pièce*. Au prorata de la surface, au prorata du nombre de
   poses, ou la feuille appartient-elle à la pièce principale ? Chaque réponse donne un prix
   différent **au client**. C'est un arbitrage de Philippe, pas une ligne de code.
2. **Que fait-on quand les quantités ne tombent pas juste ?** 500 de A et 250 de B : au bout de
   250 feuilles, B est finie et A continue seule. Deux régimes, mixte puis solo — et la grille a
   cinq paliers par pièce, chacun avec son propre mélange.

**Et une contrainte technique à ne pas sous-estimer.** `lib/montage.ts` calcule une **grille
régulière** : `upHorizontal × upVertical` d'un seul rectangle répété, en inversant la formule
`FT!AF39` du classeur. « 3 de A et 5 de B sur une feuille » ne s'écrit pas comme ça — c'est un
placement de rectangles différents, un autre algorithme, pas un paramètre de plus.

**Le vrai risque de précipiter.** Le seul critère de validation de la refonte à ce jour, c'est
*« les mêmes prix que l'écran actuel, au cent »* — démontré aujourd'hui sur la job de Youssef. Le
montage mixte produit volontairement des prix **différents**. Le livrer à moitié demain détruirait
la seule preuve qu'on a.

#### Ce qui, lui, est livrable demain et montre qu'on a compris
**Afficher l'éligibilité, sans toucher aux prix.** Dans le bloc des pièces multiples : marquer
chaque pièce « montage mixte possible » ou « feuilles séparées — fenêtre », selon la règle de
Roberto (découpes intérieures `S!E39-41` « Cut O », ou protecteur fenêtre `S!E27`). Le chiffrage
reste en feuilles séparées et on le dit.

Ça prouve que la réponse est arrivée et comprise, ça met la règle sous les yeux de Roberto pour
qu'il la corrige si on l'a mal lue, et ça n'engage aucun prix.

### 25 nov. — Roberto répond aux quatre questions *(Youssef, courriel de Roberto)*
**Les quatre décisions attendues depuis le 20 novembre sont prises.** Réponses reçues par courriel,
reproduites ici mot pour mot avec ce qu'elles impliquent.

#### 1. Pièces multiples — *« Oui pour des solides, sauf si multiple fenêtre plus grande contrainte »*
**Le montage mixte est autorisé**, mais seulement pour les pièces **pleines**. Dès qu'une pièce
porte une **fenêtre** — une découpe intérieure — elle sort de la règle et s'imprime sur ses propres
feuilles.

**Conséquence, et elle est lourde : l'hypothèse de la refonte est fausse.** `refonte-soumission`
chiffre les pièces multiples comme s'imprimant séparément, et la feuille d'essai l'annonce ainsi.
Ce bloc est à refaire. C'était écrit dans le handoff : *« si Roberto confirme qu'on peut les monter
ensemble, ce bloc sera à refaire »*. Il l'a confirmé.

La règle est codable : une pièce est exclue du montage mixte si elle a des découpes intérieures
(« Cut O », `S!E39-41`, que `C!V30` multiplie) ou un protecteur fenêtre (`S!E27`). Reste à faire
confirmer par Roberto que c'est bien ce qu'il appelle une fenêtre — en une phrase, à la rencontre.

#### 2. Prix minimum et seuil d'approbation — *« $250.00, revalidation à plus de $3000.00 »*
- **Minimum de commande : 250 $.** N'existe nulle part dans le code aujourd'hui. Contrôle à écrire.
- **Revalidation au-delà de 3 000 $.** Celui-là **existe déjà** : `SEUIL_DOUBLE_CHECK_DEFAUT` vaut
  4 000 $ et se pilote par le paramètre `APP_SEUIL_DOUBLE_CHECK` de `Taux_Calcul`. **Passer de 4 000
  à 3 000 est une saisie dans Creator, pas un déploiement** — faisable tout de suite, sans Soufiane.

**Reste ouvert : qui approuve ?** Roberto a donné le montant, pas la personne. Une phrase à la
rencontre suffira.

#### 3. Format des numéros — *« Mettre R1, R2 ainsi de suite à la fin de la séquence »*
Les révisions s'écrivent **S-2026-0000R1**, puis R2, et ainsi de suite. La réponse ne confirme pas
explicitement le format `S-2026-0000` lui-même, mais « à la fin de la séquence » le suppose. À faire
confirmer d'un mot plutôt que par un autre courriel.

#### 4. Les taux réels — *« Ceux dans le système actuel sont correct, on pourra faire évoluer le système avec le temps »*
**C'est la meilleure nouvelle des quatre.** Les taux du classeur, chargés dans `Taux_Calcul_Report`,
sont validés par la production. La réserve qu'on répétait depuis des semaines — *« les prix sont
justes dans leur logique, pas dans leurs montants »* — **tombe pour la sérigraphie**. Rien à
construire : un caveat disparaît.

⚠️ **Le document d'avancement remis au client porte encore cette réserve**, dans « Ce qu'on attend
de vous ». Elle est périmée. À corriger avant de le remontrer.

Les taux **numériques** restent des hypothèses : ils ne viennent pas du classeur. Roberto revient
avec les deux feuilles produit (Faces graphiques, Affiches) et les machines numériques : *« Je te
reviens avec les specs »*.

#### Ce qui est présentable demain, et ce qui ne l'est pas
| | Quoi | Combien de travail |
|---|---|---|
| ✅ | Seuil de revalidation à 3 000 $ | une saisie dans Creator, aucun déploiement |
| ✅ | Taux confirmés | rien à faire — c'est une phrase à dire |
| ◐ | Prix minimum 250 $ | un contrôle à écrire, petit |
| ◐ | Révisions R1, R2 | petit, sur la numérotation |
| ✗ | Montage mixte des pièces | un chantier, pas une correction. Débloqué, pas fait |

### 25 nov. — Le tableau d'atelier est faisable sans rien attendre *(Claude)*
Youssef veut développer la recommandation B sans dépendre du rythme de Soufiane. Vérifié dans le
code : **les données nécessaires existent déjà**, et la seule inconnue se lève en trente secondes
dans Creator.

**Ce que B exige :** pour chaque bon de travail, ses opérations avec leur **temps prévu**.

**Ce qu'on a déjà.** `bonTravailService.ts` écrit cinq temps prévus en minutes sur l'enregistrement
`bon_travail`, au moment où la soumission passe en production :

| Champ Creator | Opération |
|---|---|
| `Temps_Soies_Min` | Préparation d'écrans |
| `Temps_Impression_Min` | Impression |
| `Temps_Zund_Min` | Découpe Zünd |
| `Temps_Decoupe_Min` | Découpe (platine, guillotine) |
| `Temps_Numerique_Min` | Numérique multi-up |

Et `pointageService.ts` lit déjà `bon_travail_Report`. Le prévu est donc à portée : il suffit de
l'ajouter à l'interface `BonRef`, qui aujourd'hui s'arrête à `noBT`, `client`, `modele`, `noPiece`
et `statut`.

**La seule inconnue :** `bon_travail_Report` expose-t-il ces cinq colonnes ? Le formulaire les
porte, le rapport ne les montre peut-être pas. C'est une vérification dans Creator, pas du
développement. Si elles manquent, les ajouter au rapport est une case à cocher.

**Les opérations sans temps prévu** (décorticage, laminage, assemblage, vérification, emballage)
restent déclarables : le tableau les affiche sans prévu plutôt que de les cacher. Mieux vaut un
écart manquant qu'une opération qu'on ne peut pas déclarer.

**Le déploiement n'est pas un obstacle non plus.** Le widget de pointage existe déjà dans Creator
avec sa page et son emplacement : le remplacer, c'est `npm run pack:pointage` puis un téléversement
dans Paramètres → Widgets. Un administrateur Creator peut le faire — Youssef en est un. **Le goulot
n'est pas un développeur, c'est un téléversement de cinq minutes.**

**Ce qu'on fait :** le nouvel écran se construit sur une branche et se déploie d'abord sur une
**page d'essai**, comme `Soumission_essai`, jamais par-dessus le pointage de production. Soufiane
garde ses huit points ; celui-ci ne s'ajoute pas à sa pile.

### 25 nov. — Recommandation BSP : **B**, avec le détail de A et les champs de C *(Claude)*
Youssef a demandé un avis tranché plutôt qu'un comparatif. Le voici, avec ce qui le fonde et ce qui
le renverserait.

**La recommandation :** le **tableau de l'atelier (B)** comme écran principal ; la **grosse carte
de A** comme vue de détail quand on ouvre une opération à son poste ; les **champs de C**
— quantité et rebut — demandés au moment de terminer ; et la **grille de C** gardée comme voie de
correction, jamais comme mode principal.

**Pourquoi B.**
1. **Le client l'a déjà dit, sur un autre écran.** Le 9 novembre il refusait le repliage des
   sections : *« on aime mieux tout voir pour être sûr qu'on n'a rien oublié »*. Et il a redemandé
   que le total reste visible pendant la saisie. Deux fois la même culture : voir l'état, tout le
   temps. B est cette culture appliquée à l'atelier.
2. **Chez Artistic, la job passe par beaucoup de mains.** Préparation d'écrans, impression, séchage,
   découpe, décorticage, laminage, assemblage, vérification, emballage. Le fil continu, c'est le bon
   de travail, pas la personne. B suit ce fil ; A suit la personne.
3. **B monte en charge, A exige du matériel.** Le même tableau tourne sur un écran au mur ou sur dix
   tablettes de poste. A n'a de sens qu'avec un appareil par personne — c'est un achat avant d'être
   un logiciel.
4. **C'est le seul des trois qui sert le but réel.** Le prochain chantier est le comparatif estimé /
   réalisé. B affiche le prévu **pendant** le travail : l'écart se voit au moment où il se creuse,
   pas dans un rapport trois semaines plus tard. Un rapport informe ; un chiffre à l'écran corrige.

**Pourquoi pas A seul.** Le poste actuel *est* déjà A. Le refaire plus beau donne la même chose en
mieux dessiné, et on aura dépensé un chantier à ne rien changer de ce que le client peut constater.

**Pourquoi pas C seul.** Des temps déclarés sont des temps *de mémoire*. Valider les temps de
soumission contre le souvenir qu'en ont les opérateurs est circulaire : on ne mesure plus rien, on
confirme une estimation par une autre. En revanche ses **champs** sont indispensables — sans la
quantité et les rebuts, on compare des heures à des heures au lieu de comparer des coûts unitaires.

**Ce qui renverserait l'avis, et c'est une question pour Roberto :** *combien d'opérations un
opérateur fait-il dans un quart, et change-t-il de job ?* Si chacun reste sur sa machine toute la
journée pour une seule longue opération, A gagne et cette recommandation est fausse. La question est
bon marché et décisive — à poser avant de construire.

**Un risque à nommer avant de le découvrir :** un tableau partagé rend le rythme de chacun visible
de tous. Dans certains ateliers ça motive, dans d'autres ça se vit comme de la surveillance et les
gens le contournent. Philippe et Roberto savent lequel des deux est le leur.

**Ce qu'on fait jeudi :** présenter **B**, montrer A comme la vue de poste, et poser la question de
Roberto. Présenter trois options à un comité produit rarement une décision.

### 25 nov. — Prochain chantier : la déclaration des temps, trois maquettes *(Youssef + Claude)*
**Youssef ouvre le chantier suivant :** le poste de pointage actuel « n'est pas beau », et il faut
le refaire en pensant à l'atelier. Trois maquettes jouables ont été produites, à montrer jeudi, pour
en choisir une.

Elles ne se distinguent pas par leur apparence — c'est le **geste** qui change, et avec lui
l'atelier qu'on suppose :

| | Le geste | Où ça vit | Ce qu'on capture en plus |
|---|---|---|---|
| **A · Je pointe** | une job, une opération, démarrer ; l'écran est un gros chrono | une tablette par poste | la quantité, demandée au moment de terminer |
| **B · Le tableau de l'atelier** | j'appuie sur l'opération que je commence, je dis qui je suis | un écran partagé au mur | l'avancement de chaque job, prévu contre réalisé en direct |
| **C · La feuille de poste** | en fin de quart je tape mes durées au pavé numérique | n'importe où, après coup | les quantités **et les rebuts**, et rien n'est perdu si on oublie de pointer |

**Ce qu'il faut trancher, et qui n'est pas une question de maquette :**
1. **Temps mesuré ou temps déclaré ?** A et B mesurent, C fait confiance. Le comparatif estimé /
   réalisé ne vaudra que ce que vaut cette décision.
2. **Qui déclare la quantité produite ?** Sans elle on compare des heures à des heures ; avec elle
   on compare des coûts unitaires, et c'est là que les temps de soumission se valident.
3. **Que fait-on d'un pointage oublié ?** Un chrono qui tourne toute la nuit fausse tout.
4. **Combien d'opérations un opérateur fait-il dans un quart ?** Deux longues ou quinze courtes —
   la réponse départage A et C à elle seule. C'est une question pour Roberto.

**Point technique, pour Soufiane.** `AppPointage.tsx` pose une règle explicite : *« le widget
n'horodate RIEN : il envoie un changement de statut, le workflow Creator pose les heures »*.
L'approche **C écrit des durées directement** — c'est un autre contrat avec Creator, pas une
variante d'écran. À valider avant de la choisir.

Les maquettes sont publiées comme page privée (`claude.ai/artifact/LGN9YNGUmkafr1JTcJhaSk`) et leur
source est dans le dossier local `docs/maquettes-pointage/`. Elles tournent sur des données
fictives ; les opérations, elles, sont celles de la gamme.

### 25 nov. — Le repliage est fait, sur la branche `repliage-sections` *(Youssef + Claude)*
**Rien n'avait été poussé par Soufiane depuis le 24 novembre**, et Youssef a demandé qu'on avance
sans attendre. C'est fait : commit `4eb766b` sur `repliage-sections`, partie de
`origin/refonte-soumission`. **Il reste à construire et à téléverser dans Creator** — c'est la seule
partie qui ne nous appartient pas.

**Ce qui change.** `Section` est devenu un `<details>` piloté par un état local, et
`SectionOptionnelle` n'est plus qu'un `Section` fermé au départ : 09 et 10 se comportent donc
exactement comme avant. Les dix sections se replient, **01 à 08 sont ouvertes à l'arrivée**. Titre
entier cliquable, chevron qui dit l'état.

Les deux consignes du client tiennent ensemble : « on aime mieux tout voir pour être sûr qu'on n'a
rien oublié » (9 nov.) reste vrai à l'ouverture, et « réduire chaque sous-formulaire… comme ça j'ai
seulement les écrans sur lesquels je travaille » (24 nov.) devient possible.

**Une section repliée résume son contenu sur sa ligne de titre** — le client, les dimensions ou le
nombre de pièces, les certifications, la quantité retenue et la gâche, les couleurs et la presse, la
matière, les opérations de découpe, le mode d'expédition. Le critère retenu : ce pour quoi on
rouvrirait la section juste pour aller lire une valeur. Tout replié, l'écran devient une liste de
dix lignes qui tient d'un coup d'œil.

**Replier ne démonte rien.** Les champs restent dans le DOM, les valeurs dans l'état, le moteur
continue de calculer et `controles.ts` travaille sur les entrées, jamais sur l'affichage. Vérifié
dans le navigateur : replier puis rouvrir les huit sections laisse la saisie et la barre du bas
inchangées. Et une **pastille** sur la ligne de titre signale une section qui porte une alerte
(adhésif non posé, sous-traitance incomplète), pour qu'un repli ne cache jamais un problème.

`build:s2` et `verif:s2` passent.

**Pour Soufiane :** la branche ne touche que `s2/AppS2.tsx` et `s2/s2.css`, et seulement le
composant `Section` plus les neuf lignes d'appel. Si tu as des modifications en cours sur AppS2.tsx,
le conflit sera petit et localisé. Au passage, la classe `.s2-resume` était déjà prise par la liste
`dt`/`dd` du Sommaire — la ligne de titre utilise `.s2-apercu`.

### 25 nov. — Essai : il ne reste qu'une seule ligne de finition dans le nouvel écran *(Youssef + Claude)*
**Troisième trou du même genre, trouvé en cherchant l'origine d'un écart de prix.** La section 07 du
nouvel écran n'expose qu'une seule opération de finition, la **guillotine**. L'écran actuel en a
sept. Relevé cellule par cellule dans `s2/` :

| Opération | Cellule | Écran actuel | Nouvel écran |
|---|---|---|---|
| Guillotine | S!E29 | ✓ | ✓ |
| Protecteur fenêtre | S!E27 | ✓ | **absent** |
| Slit | S!E28 | ✓ | **absent** |
| Assemblage | S!E30 | ✓ | **absent** |
| Décorticage | S!E43 | ✓ | **absent** |
| Vérification / comptage | S!E44 | ✓ | **absent** |
| Emballage | S!E49 | ✓ | **absent** |

Les valeurs par défaut restent appliquées — l'emballage, par exemple, est à 1 d'office. Donc le
prix n'est pas faux sur une job qui n'a aucune de ces opérations. Mais **une job qui décortique,
assemble ou compte ne peut pas le dire**, et une soumission existante qui les porte sera rechiffrée
sans elles.

**Correction du 25 nov. au soir, par Soufiane :** j'avais écrit qu'une soumission rouverte serait
« rechiffrée sans elles ». C'est faux. Il l'a mesuré sur les 47 soumissions chiffrées : une
soumission rouverte garde toutes ses cellules et le moteur les compte. Le défaut réel est plus
étroit — **ces valeurs pèsent sur le prix sans qu'on les voie ni qu'on puisse les changer**, et une
soumission neuve ne peut pas les saisir. Son contrôle `s2/caches.ts` les débusque désormais.

**C'est le troisième cas identique en deux jours** : trois lignes de platine, deux champs de perte,
six opérations de finition. Le motif ne change pas — le nouvel écran couvre le cas courant et perd
le reste en silence. Boucher les trous un par un ne suffira pas ; il faut le contrôle général
proposé plus haut, qui compare les cellules d'une soumission rouverte à celles que l'écran sait
afficher.

**Résultat de l'essai 2 — les deux écrans donnent exactement le même prix.** Job d'essai : pièce
7 × 1,4 po, 2 couleurs, feuille 8 × 9,5, 4 poses, platine coupe 1/4, séparateurs 1/1, ajustement
additionnel 5, encre 100 %, gâche 10 %, facteur 25 %, transport 20 $, quantité 50.

| | Écran actuel | Nouvel écran |
|---|---|---|
| Coût de revient | 534,32 $ | **534,32 $** |
| Total | 667,90 $ | **667,90 $** |
| Unitaire | 13,36 $ | **13,36 $** |
| Temps | 5 h 47 | **5 h 47** |

**Au cent et à la minute.** C'est l'essai que le protocole désignait comme le plus important, et le
seul dont l'échec aurait justifié d'arrêter la refonte. Il est passé sur une job que Soufiane
n'avait pas prise.

Le dernier écart, 10,00 $ de coût et 12,50 $ de total, venait du **transport** (`S!E51`) : 30 $ dans
le nouvel écran — le défaut demandé par Artistic le 26 octobre — contre 20 $ saisis dans l'écran
actuel. Rien à corriger : c'est le nouvel écran qui porte la bonne valeur par défaut.

**Tous les écarts rencontrés en chemin venaient de la saisie, jamais du calcul** : quantité, facteur,
gâche, ligne de platine, séparateurs, ajustement additionnel, couverture d'encre, transport. Huit
réglages à aligner à la main pour reproduire une seule job, par quelqu'un qui connaît le système.
Rassurant sur le moteur, instructif sur l'écran : **un bouton « reprendre cette soumission dans le
nouvel écran »**, qui recopie les cellules, vaudrait mieux que n'importe quelle consigne écrite — et
c'est aussi ce qui permettrait de rejouer les 51 soumissions existantes en lot plutôt qu'une à une.

Au passage, le Sommaire du nouvel écran affiche la **marge réelle** (20,00 % pour un facteur de
25 %) à côté du facteur. L'écran actuel ne montre que le facteur. C'est le genre de petite chose à
montrer à Philippe.

### 25 nov. — Essai : la gâche porte deux noms, et deux pertes manquent *(Youssef + Claude)*
**Youssef, qui connaît le système, n'a pas trouvé où saisir la perte dans le nouvel écran.** Elle y
est : c'est le champ **« Gâche »**, à côté du bouton « + Ajouter un palier », section 04. L'écran
actuel l'appelle **« Perte »** et la place en haut, près de la quantité. Même cellule (`S!I2`), deux
noms, deux endroits. Si le chargé de projet ne la trouve pas, personne ne la trouvera.

À faire : reprendre le mot de l'écran actuel, « Perte ». Le vocabulaire d'Artistic prime sur le
nôtre, et la refonte ne doit pas forcer à réapprendre des mots.

**Plus sérieux : deux champs de perte n'existent pas dans le nouvel écran.** `perteMat` (S!Y22,
« Perte matériaux ») et `perteAdh` (S!Z22, « Perte adhésif ») sont saisissables dans l'écran actuel
et absents de la refonte. Leur défaut est zéro, donc une soumission neuve tombe juste — mais **une
soumission existante qui les porte sera rechiffrée sans elles**, en silence, exactement comme les
trois lignes de platine manquantes.

**Correction du 25 nov. au soir, par Soufiane :** « rechiffrée sans elles » est faux, il l'a mesuré
sur les 47 soumissions chiffrées. Une soumission rouverte garde toutes ses cellules et le moteur
les compte. Le défaut réel est plus étroit — ces valeurs pèsent sur le prix sans qu'on les voie ni
qu'on puisse les changer, et une soumission neuve ne peut pas les saisir.

C'est le même motif qui revient : le nouvel écran couvre le cas courant et perd les champs du cas
particulier, sans jamais le dire. La question à trancher avec Soufiane n'est plus champ par champ —
**il faut un contrôle qui compare les cellules d'une soumission rouverte à celles que l'écran sait
afficher, et qui crie quand une valeur non nulle n'a pas de case.**

### 24 nov. — Essai de la refonte : la platine n'a qu'une paire au lieu de quatre *(Youssef + Claude)*
**Relevé en saisissant une job de référence dans `Soumission_essai`.** La section 07 du nouvel écran
offre **une seule paire** « Platine, matrices » / « Platine, poses ». L'écran actuel en a **quatre**,
chacune avec sa matrice et son nombre de poses : adhésif (S!D33/E33), coupe (S!D34/E34), kiss-cut
(S!D35/E35) et embossage (S!D36/E36).

**La paire du nouvel écran est la coupe.** `AppS2.tsx` l'attache à `IN.platCoupeDie` et
`IN.platCoupeUp`, donc S!D34 et S!E34. Les trois autres lignes n'existent nulle part dans l'écran :
une job qui adhésive, qui fait un kiss-cut ou qui embosse à la platine n'a nulle part où mettre sa
quantité, et le coût correspondant disparaît sans rien dire.

**C'est déjà ce qui est arrivé à l'essai du 25 novembre.** La job de référence fait un *kiss-cut*
(1 matrice, 4 poses). Saisie dans le nouvel écran, elle est tombée sur la ligne **coupe** : un coût
de coupe est apparu, le kiss-cut est resté à zéro, et les deux écrans ne donnent pas le même prix.
L'écart n'est pas un défaut de calcul — c'est la saisie qui n'a pas où aller.

À trancher avec Soufiane : rendre les quatre lignes saisissables, ce qui est le plus simple et le
plus sûr ; ou au minimum renommer la paire actuelle « Platine, coupe » et avertir quand une
soumission rouverte porte une des trois autres. Le silence est le pire des cas.

**Rappel de modélisation, à ne pas perdre :** `S!D35` (kiss-cut) **exige la valeur 1** — toute autre
valeur annule le coût au lieu de le multiplier (`C!Q8`/`J9`). Même chose pour les « Cont. » du Zünd
(S!D39-41). Les trois autres `Die` de la platine sont de vraies quantités. C'est écrit dans
`modele.ts` (`DRAPEAUX_DECOUPE`) et ça se comporte à l'inverse de l'intuition.

**Correction :** la première version de cette note disait que la paire correspondait au kiss-cut, et
que le kiss-cut était le seul des quatre à porter un nombre de poses. Les deux sont faux : c'est la
coupe, et les quatre lignes ont leur cellule « Up ».

### 24 nov. — Le repliage des sections revient, ouvert par défaut *(Youssef)*
**Youssef demande que chaque section se replie**, en cliquant sur son titre : « l'idée, c'est qu'on
va pouvoir réduire chaque sous-formulaire… comme ça j'ai seulement les écrans sur lesquels je
travaille ».

**À noter, parce que le dépôt dit l'inverse.** Le handoff retient du 9 novembre que le client avait
refusé le repliage : *« on aime mieux tout voir pour être sûr qu'on n'a rien oublié »*, et la
consigne écrite était « 01 à 08 toujours ouvertes, sans flèche ». Philippe avait toutefois laissé
une porte : le repliage *« pourrait peut-être servir s'il y a des choses qui étaient optionnelles.
Mais sinon, on les laisserait ouvertes »*.

**Ce qu'on fait, et qui tient les deux :** toutes les sections deviennent repliables, mais
**ouvertes par défaut**. On ne perd pas ce que le client voulait protéger — à l'ouverture de
l'écran, tout est visible, rien ne se cache —, et le chargé de projet qui veut se concentrer replie
ce dont il n'a pas besoin. Les sections optionnelles (sous-traitance, notes) restent fermées par
défaut, comme prévu.

Deux détails qui comptent pour que ce soit utile plutôt qu'agaçant :
- **le titre entier est cliquable**, pas une petite flèche ;
- une section repliée **montre l'essentiel de ce qu'elle contient** sur sa ligne de titre (le client,
  le nombre de pièces, la matière retenue), sinon replier revient à cacher et on rouvre tout le
  temps pour vérifier.

Ce que le repliage ne doit **pas** faire : vider des champs, ni retirer une section des
vérifications. Replier, c'est masquer, jamais désactiver.

### 24 nov. — Les trois soumissions sont des essais : le compte réel est zéro *(Youssef)*
**Youssef confirme : « YDOUAA » et les deux sans nom de client (800,99 $) sont des essais.** Sur les
51 soumissions enregistrées, **aucune soumission réelle n'était sous-coûtée**. Le défaut de l'adhésif
n'a donc jamais touché un prix parti chez un client — il a vécu et il est mort dans nos propres
données. C'est la réponse à la question ouverte depuis ce matin ; le sujet est clos.

**Une suite, petite :** « YDOUAA » porte **BT-1013 et BT-1014**. Si la soumission est un essai, ces
deux bons de travail le sont aussi : à supprimer avec les autres données de test, sauf si quelqu'un
s'en sert encore.

### 24 nov. — L'adhésif est déployé, la première version de la refonte est à l'essai *(Soufiane + Claude)*
**Le correctif de l'adhésif est en production**, build `2026-11-24 15:15 UTC`, avec la note corrigée.
Relu dans Creator : FC-940 = 62 723,50 $ ouverte directement, après « Nouvelle » et après « Exemple ».
L'Exemple garde maintenant son adhésif (667,90 $).

**Comptage demandé :** 51 soumissions lues, 28 sans l'adhésif laminé compté. Aucune ne porte un nom
de client reconnu : BSP, tests, démonstrations, Youssef. À confirmer : « YDOUAA » et deux sans client
(800,99 $). Ciena l'a compté ; IDENCO, CM-LAB, SANIQUIP et l'Agence spatiale n'ont pas d'adhésif. L'écart
varie avec la soumission, ce n'est pas 425,50 $ partout.

**Données de test :** BT-1019, BT-1020, BT-1021 et les deux brouillons nommés sont supprimés (relu).
Copie des cinq gardée en local.

**`Formats_Feuille` est rangé dans la section Administration du menu** (formulaire et rapport déplacés,
rien de supprimé). Vérifié ensuite : l'écran de production lit toujours ses 9 formats et FC-940 vaut
toujours 62 723,50 $.

**Refonte, première version** (branche `refonte-soumission`, `409696e`, build `15:45 UTC`, page
`Soumission_essai`, administrateurs seulement). Décision : avancer sans attendre Christian, avec des
hypothèses affichées et modifiables. Cinq soumissions au même prix que l'écran actuel dans Creator.
Ajoutés : 1 à 5 pièces imprimées séparément, grille pièce × palier, sous-traitance (la majoration
remplace le facteur, 35 %), installation, brouillons de PO (rien dans Books), bon de travail en
« Brouillon » par pièce, numéro `S-2026-0001`, numérique et découpe au prix **provisoire** (ne s'imprime
pas), lecture de la table de configuration numérique si elle existe, seuils d'approbation réglables.
Infographie toujours hors du prix. Corrigé : la note au client reprenait la cellule des notes internes.

**À savoir :** une soumission à plusieurs pièces ouverte dans l'écran actuel n'y montre que la pièce 1 ;
elle est donc nommée « [Essai] … ». Son `Soumission_JSON` est vide, l'envoi s'annule de lui-même. Le bon
de travail est testé sur banc local, pas encore créé dans Creator. Reste : table
`Config_Champs_Produit_Numerique` à créer, recherche client dans le CRM, montage mixte. Brouillon
d'essai `4153107000024164006`.

### 24 nov. — Le correctif de l'adhésif se déploie, mais pas tel quel *(Youssef + Claude)*
**Décision : on déploie, sans attendre le comptage.** Les deux sujets sont indépendants. Le
correctif empêche de *nouvelles* dérives ; le comptage regarde les soumissions *déjà enregistrées*.
Attendre l'un pour faire l'autre ne protège personne, et pendant ce temps la même job continue de
s'afficher à deux prix selon l'ordre des clics.

**Mais la branche `correctif-adhesif` est incomplète, et telle quelle elle rend l'écran menteur.**
L'alerte dont parle le commit n'est pas dans le diff : c'est la note qui existe déjà dans `main`,
`App.tsx` ~1342. Elle s'affiche sur la seule condition `adhesifDeduit.cellule === c1`, **sans
regarder si la case est cochée**, et son texte est figé :

> activé automatiquement — adhésif en {forme} ({indice}). Décochez pour l'annuler.

Aujourd'hui ce texte est vrai, parce que l'effet venait de poser la ligne. **Après le correctif il
devient faux** : FC-940 s'ouvre avec la case vide, le coût n'est pas compté, et l'écran affiche
quand même « activé automatiquement ». Le chargé de projet lit que c'est posé alors que ça ne l'est
pas. C'est pire que le défaut qu'on corrige, parce que c'est silencieux et affirmatif.

**À faire avant de déployer** — la note se conditionne à l'état réel de la case, deux textes :

- case à 1 → le texte actuel, « activé automatiquement … Décochez pour l'annuler. »
- case vide → un avertissement : « cet adhésif demande la ligne {label} ; elle n'est pas activée,
  son coût n'est pas compté. »

C'est une poignée de lignes au même endroit. Sans ça, le correctif retire un filet — la pose
accidentelle après « Nouvelle » — sans rien mettre à la place.

**Le comptage des soumissions sous-coûtées reste à faire**, en parallèle et sans bloquer le
déploiement.

### 24 nov. — Réponses à Soufiane : le dépôt est public, et quatre arbitrages *(Youssef + Claude)*
**Le dépôt est public. C'est vérifié.** `BSP-Corp/artistic-soumission` répond à l'API GitHub sans
authentification, `"private": false`, et il l'est **depuis sa création le 27 octobre** — 28 jours.
Aucun identifiant n'y est committé : recherche sur tout l'historique, pas de `.env`, pas de jeton
Zoho ; la seule clé qui apparaît est le gabarit `<CLÉ_REMISE_PAR_OPENMIND>`. Ce qui est exposé est
commercial : `classeur.json` — les 1 322 formules, c'est-à-dire le modèle de prix d'Artistic — les
taux machines, les prix matériaux, les captures avec les prix réels, la spec du client, et ce
journal avec les noms et le contenu des échanges. **0 fork, 0 étoile, 0 abonné** : aucun signe que
quelqu'un l'ait repris, mais les clones ne se voient pas sans l'accès admin. **À passer en privé**,
et c'est une décision de BSP. À savoir : les deux autres dépôts de l'organisation (2point0 Concepts,
dont un `costanalysis-widget`) sont publics eux aussi. Ce n'est pas un réglage oublié sur celui-ci,
c'est le défaut de l'organisation.

**L'infographie n'entre pas au coût.** Vérifié dans l'écran actuel : rien ne la chiffre nulle part.
`lib/numerique.ts:380` ne pose qu'une alerte — « Infographie à réaliser : temps à paramétrer ».
`bt/modeleFT.ts` n'a que les cases épreuve / courriel / films. Aucune cellule de coût dans
`modele.ts`. L'ajouter ferait décrocher la refonte de son seul critère de validation — les mêmes
prix que l'écran actuel — et reviendrait à décider une politique de prix à la place du client.
**Elle reste affichée, hors total, avec la ligne qui le dit.** Le taux de 85 $/h part avec les
autres taux dans la question à Christian.

**`Formats_Feuille` : oui, masquer la section du menu.** C'est une table de référence, pas un écran.
Mais la garder accessible aux administrateurs — Christian doit pouvoir y ajouter un format sans
passer par nous.

**Le correctif de l'adhésif : recommandation, Youssef tranche.** Le correctif est juste et il est
petit : 8 lignes, remise à zéro de `autoAdhesif` à l'ouverture, à « Nouvelle » et à « Exemple ». Il
rend le prix déterministe, ce qui n'est pas négociable pour un outil de soumission. **Mais il ne
corrige rien rétroactivement** : il fige la soumission à son prix enregistré, donc le plus bas, et
compte sur l'alerte pour signaler l'adhésif manquant. D'où la question à regarder avant de
déployer : **toutes les soumissions réelles parties de l'Exemple sont sous-coûtées de 425,50 $** et
rien ne les rattrapera. Combien y en a-t-il en production ?

**Le document parti chez Philippe : ne pas le renvoyer.** Le poste manque autant au « avant » qu'au
« après » — la pose automatique dépendait de l'état de l'écran, pas du montage. Le gain annoncé
tient donc intégralement : le −28 % de T10, le 2,94 → 2,51 $, tout reste exact. L'écart est de
531,87 $ sur 62 723,50 $, soit 0,85 %, sur une job de démonstration pour un client fictif qui ne
sera jamais facturée. Idem pour l'ancienne C6 et sa feuille d'écart. Un courriel de correction à
0,85 % sur un document de démonstration coûte plus de crédibilité qu'il n'en rend. Ça se corrige à
la prochaine réédition du document, et ça se dit sans détour si la question vient.

**Les quatre réponses de Christian bloquent pour de vrai.** Le brouillon est rédigé depuis le 20 et
n'est pas parti. Tant qu'il dort, le numérique se saisit sans se chiffrer et les pièces multiples
restent indécidables.

**Ce qui peut avancer sans attendre Christian.** Seules trois choses sont réellement bloquées :
les **pièces multiples**, le **prix du numérique** (aucun taux, aucune vitesse) et les **deux
feuilles produit** manquantes. Tout le reste est libre. L'ordre proposé :

1. **Compter les soumissions sous-coûtées en production** (celles parties de l'Exemple, sans
   l'adhésif laminé). C'est le seul point qui touche de l'argent réel, et il conditionne le
   déploiement du correctif.
2. **Masquer `Formats_Feuille` du menu** et **supprimer les données de test** — BT-1019, BT-1020,
   BT-1021, et les brouillons `4153107000024164004` et `4153107000024164002`. Petit, et ça nettoie
   ce que le client voit.
3. **Le bon de travail depuis la refonte.** Rebranchement, aucune dépendance externe.
4. **La table `Config_Champs_Produit_Numerique`** : monter le mécanisme, sans les taux. C'est
   l'autonomie promise au client et ça ne demande aucun chiffre — les taux viendront se poser
   dedans.
5. **Le PDF deux pages** : porter `PopupProposition.tsx` dans le 2e widget. Le gabarit est déjà
   validé sur des PDF réels, il n'y a rien à réinventer.
6. **Sous-traitance et PO (09)** et **certifications (03)**, puis les **validations** de la spec §7.

### 24 nov. — Un bug de prix dans l'écran actuel, et la refonte à l'essai *(Soufiane + Claude)*
**Une même soumission a deux prix selon ce qui était ouvert avant.** FC-940 : 62 723,50 $ ouverte
directement, **63 255,37 $** ouverte après « Nouvelle soumission » (vérifié en production, build
`16:48`). La pose automatique de l'adhésif laminé dépend de l'état précédent de l'écran, et le
bouton « Exemple » la perd. **FC-940 est partie de l'Exemple : il lui manque ce poste, 425,50 $ de
coût. C'est la job du document et du PDF envoyés à Philippe.** Les relevés T9 du 20 nov. partaient
eux aussi de l'Exemple. Correctif prêt sur la branche `correctif-adhesif` (`52e2080`), **ni fusionné
ni déployé** : il touche aux prix affichés, à Youssef de décider.

**La refonte est à l'essai dans Creator**, emplacement `soumission2`, page `Soumission_essai`.
Aucun des cinq profils n'y a accès (relu) ; seuls les administrateurs la voient. Branche
`refonte-soumission` (`9cb47ed`). Les dix sections, barre de total fixe, dessin des poses, saisie du
numérique. Trois soumissions comparées à l'écran actuel dans Creator, deux passes : mêmes prix.
Manquent : pièces multiples, prix du numérique (aucun taux ni vitesse), sous-traitance et PO, bon
de travail. L'infographie (heures × 85 $) s'affiche mais n'entre pas dans le prix : à confirmer.

**À savoir :** la table `Formats_Feuille` créée le 20 nov. a ajouté une section du même nom au menu
de l'application ; personne ne l'avait signalé. Brouillon d'essai `4153107000024164004` à supprimer
avec les autres.

### 24 nov. — Trois corrections à ce que j'avais rapporté *(Soufiane + Claude)*
**La 120 absente n'était pas une panne.** J'avais rapporté un `chargerAdmin` qui échoue par
intermittence ; l'entrée du 20 nov. « La série est complète » le reprend. C'était faux : quatre
chargements sur quatre, le widget affiche le snapshot puis Creator 1,0 à 1,2 s plus tard, et le
script de test lisait trop tôt. Aucun échec observé, donc la relance n'est pas justifiée par ce
constat. Mettre le snapshot aux valeurs de Roberto reste utile : il est visible une seconde.

**C6 portait aussi 1 101 / 1 100.** J'avais écrit que seules C1 à C4 étaient concernées. Elle est
refaite. **L'ancienne C6 est dans le document parti chez Philippe** : à Youssef de dire s'il
le renvoie.

**T5 rejoué et prouvé.** Le 20 nov. le réenregistrement n'avait pas été confirmé. C'est fait, avec
relecture par l'API (détail au protocole). Le brouillon `4153107000024164002` s'ajoute aux données de
test à supprimer.

### 20 nov. — Les trois courriels sont partis : le chantier est livré *(Youssef)*
Vérifié dans les envois, les trois portent bien leurs pièces jointes.

- **Philippe Béland** — l'avancement en trois points, avec le document du montage et un
  exemplaire du nouveau document de soumission.
- **Roberto Montanaro** *(Christian en copie)* — ses sept fiches corrigées, One man hors liste,
  la DTS retirée, le document joint, et les deux choses qui lui restent : confirmer la 180, et
  dire si l'atelier a besoin du sens de pose sur le papier.
- **Christian Gingras** — le gabarit de Jose en place, avec un exemplaire, et les deux questions
  qui manquent au document : les numéros de taxes et le format du numéro de soumission.

**Le chantier du montage est clos.** Du 2 au 20 novembre : du calcul à la livraison, en passant
par le conflit des formats de presse tranché par Roberto, seize tests sur les données réelles,
et un document que le client a entre les mains.

**Le gabarit PDF est clos aussi**, refait d'après le modèle du 30 octobre qui dormait depuis le
2 novembre.

**La demande de 45 minutes a été retirée du courriel sur le gabarit** : un courriel, un sujet.
Les quatre décisions de la maquette partiront dans leur propre fil, déjà rédigé en brouillon —
chacune avec ce qu'on demande et pourquoi ça compte.

### 20 nov. — Le montage est livré à Artistic *(Youssef)*
**Envoyé à Philippe Béland** : l'avancement en trois points — montage clos, PDF de soumission
clos, maquette en cours — avec le document du montage et un exemplaire du nouveau document de
soumission (la même job FC-940, pour qu'il lise une seule histoire).

Le chantier du montage est **terminé** : du calcul au bon de travail, testé sur les données
d'Artistic et expliqué au client. Il aura duré du 2 au 20 novembre.

Un courriel à Roberto est prêt en brouillon, avec le même document : ses sept fiches corrigées,
One man hors liste, la DTS retirée, et les deux choses qui lui restent — confirmer que la 180 est
bien la « 182 », et dire si l'atelier a besoin de voir le sens de pose sur le papier.

**Ce qui reste ouvert après la livraison :** le sens de pose au bon de travail, le format du
numéro de soumission, les numéros de taxes, et les quatre décisions de la refonte. Tout cela
passe par Christian.

### 20 nov. — Le document du montage est validé *(Youssef)*
Relu à l'écran, captures comprises : **il est bon, tel quel**. Six sections, neuf captures, le
tableau avant/après de la job FC-940 et l'encadré sur le prix qui corrige dans les deux sens.

**Il part en pièce jointe**, pas dans le corps du courriel. Avec lui, un **exemplaire du nouveau
document de soumission** : la même job FC-940, pour que Philippe lise une seule histoire — le
document explique la façade, le PDF la chiffre.

Le PDF de soumission est clos après sept allers-retours sur des PDF réels. Chaque défaut trouvé
en était un qu'un client aurait vu : un montant qui ne se multipliait pas, des paliers dans le
désordre, une note interne imprimée, des libellés vides, une ligne de frais sans prix, un numéro
nu. Build final : `2026-11-20 16:48 UTC`.

### 20 nov. — Le document client est monté ; il tient à un déploiement *(Youssef + BSP)*
Le document est écrit, mis en page et rendu en PDF (six sections, les huit captures,
`docs/Montage_Artistic_document.pdf`, hors dépôt). Le courriel à Philippe Béland est prêt en
brouillon, le document en pièce jointe.

**Il ne part pas encore, pour une seule raison : `C4` se contredit.** Dans la même image, le bloc
annonce « 1 101 feuilles » et `NB.MRX` affiche 1 100 — c'est l'arrondi flottant corrigé par
`d933e7d`. C'est la capture centrale du document, celle du « après acceptation ». `C2` porte le
même 1 101.

Donc : **déployer le build, reprendre C2 et C4, régénérer le PDF, envoyer.** Le même déploiement
porte le nouveau gabarit de soumission, l'adresse de Laval et la normalisation de l'Exemple. Une
seule mise en ligne règle tout.

**Priorités arrêtées par Youssef :**
- **Soufiane** — construire et déployer ce build. C'est son seul sujet pour l'instant. Puis
  reprendre C2 et C4 sur la même job FC-940.
- **Youssef et BSP** — le PDF et le document client, faits ensemble, sans passer par le dev.

**Ce qu'on doit à Philippe, et rien de plus :** l'avancement. Le montage clos, le PDF clos, la
maquette en cours avec l'étape atteinte et ce qui reste. **Aucune question** ne lui est posée :
les décisions ouvertes (numéros de taxes, format du numéro de soumission, pièces multiples, prix
minimum, taux réels) se règlent **avec Christian**.

### 20 nov. — Le document client passe au gabarit de Jose, et deux correctifs partent avec *(BSP)*
Trois choses sont en place dans le source, pas encore déployées.

**Le PDF suit maintenant le gabarit du 30 octobre.** Deux pages : l'en-tête SOUMISSION avec
numéro, date, validité à 30 jours et représentant ; les blocs client et projet ; la grille
produit × paliers de quantité, prix unitaire et montant par case, palier recommandé encadré ;
les frais de préparation ; COMMENT CHOISIR et les totaux avec TPS et TVQ. Page 2 : les six blocs
de conditions et l'acceptation à signer. Les modalités de paiement et les numéros de taxes se
saisissent — Christian l'a demandé le 2 novembre, les modalités suivent le client.

**L'adresse est corrigée** : `2565, boul. Le Corbusier, Laval (Québec) H7S 2E8`, telle que le
gabarit la porte. Elle était fausse sur chaque PDF envoyé jusqu'ici, et elle est annoncée à
Philippe Béland.

**L'arrondi du bloc est réglé** (`d933e7d`), donc **C2 et C4 sont à reprendre** — elles portent
1 101 feuilles au lieu de 1 100. Et `entreesExemple` normalise ses F/S.

Vérifié à l'écran dans le widget lancé en local : deux pages, aucun débordement, la colonne
recommandée encadrée, les totaux et les taxes justes. `tsc`, `verif:montage` et
`verif:numerique` au vert.

**Ce que la grille ne fait pas encore :** plusieurs produits. L'écran n'en porte qu'un, donc la
grille a une ligne ; les colonnes sont bien les paliers de la soumission. Le reste vient avec la
refonte.

**Deux questions pour Artistic :** les vrais numéros d'enregistrement TPS et TVQ, et le format
exact du numéro de soumission (le gabarit montre `S-2026-0000`, le widget porte le code de la
fiche). À poser à l'appel de la semaine prochaine.

### 20 nov. — La série est complète ; quatre choses pour le prochain build *(BSP)*
T1 → T16 au vert, huit captures client prises sur une seule job (FC-940, 25 000 pièces,
BT-1021). Le chantier n'est plus bloqué par les tests.

**Mon diagnostic du 20 nov. sur la 120 était faux.** J'avais conclu au champ `Categorie` ;
Soufiane a relu les fiches par l'API et par le SDK : la catégorie est bonne sur les quatre
presses concernées. La vraie cause est un **`chargerAdmin` qui échoue par intermittence**, après
quoi le widget retombe **en silence** sur `fusionnerMachines(null)` — donc sur le snapshot
embarqué. L'état React fautif montrait les 23 machines du snapshot.

**C'est plus grave que l'affichage.** Le snapshot est périmé (116 à 12 × 8, 110 à 26 × 18, One man
`actif: true`, « Multiprint IST no.180 » à 24 × 44). Quand le repli joue, le calcul considère
roulables des formats qui ne le sont pas, et l'écart se voit dans la suggestion — donc dans le
prix si elle est acceptée. Rien ne l'annonce : le bandeau indique « Creator » pour les matériaux,
rien pour les machines.

**Le prochain build, et ce qu'il doit porter :**
1. **L'arrondi du bloc** — le bloc annonce 1 101 feuilles quand NB.MRX en calcule 1 100
   (`Math.ceil` sur 1 100,0000000000002). Visible sur **C2 et C4**, deux captures qui partent chez
   le client. Bloquant pour le document.
2. **L'adresse du PDF** — Montréal au lieu de Laval (`PopupProposition.tsx:24`). Annoncé à
   Philippe Béland aujourd'hui.
3. **Le snapshot des machines** remis aux valeurs de Roberto, et le repli rendu visible (source
   des machines au bandeau + une relance).
4. **`entreesExemple`** qui ne normalise pas les F/S.

Le sens de pose au bon de travail reste un cinquième point, plus lourd (widget BT à reconstruire
et T14 à rejouer). **Le document ne promettra pas que l'atelier voit l'orientation** — C5 ne la
montre pas.

**Une trouvaille qui change le document :** le prix peut **monter** après acceptation. Le premier
essai de Soufiane partait d'un point de départ irréaliste (4 up sur 8 × 9,5 pour une pièce de
9 po) et le coût passait de 34 916 $ à 50 179 $. Les chiffres étaient justes — c'est le « avant »
qui sous-facturait. Le montage corrige **dans les deux sens**, et c'est un argument, pas une
gêne.

**À supprimer après l'envoi :** soumissions de test et bons **BT-1019**, **BT-1020**, **BT-1021**.

### 20 nov. — Le document client est rédigé, il n'attend que les captures *(BSP)*
Brouillon complet dans le dossier local de Youssef (`docs/`, hors dépôt) : les six sections
prévues, avec les chiffres relevés pendant la série — 4 up → 84, 11 000 feuilles → 524,
55 615,31 $ → 26 583,96 $, et la ligne matière à −28 %.

Les huit emplacements `[C1]` à `[C8]` attendent les captures. Deux sections portent ⏳ : celle
qui parle de l'orientation, qui dépend de T16.

Ce qui reste à écrire ne dépend donc plus que de Soufiane. Dès que les captures arrivent, le
document se ferme et le courriel à Roberto et Christian — déjà en brouillon depuis le 19 — est
repris pour le porter.

### 20 nov. — Les trois questions tranchées, et l'ordre de clôture *(Youssef)*
Trois décisions, prises en gardant en vue la seule chose qui reste : le document qu'Artistic
attend depuis le 27 octobre.

**1. Le grain passe à `0` — oui, maintenant.** Les trois motifs qui tenaient le `1` sont tombés :
le build déployé enregistre l'orientation, l'écran l'affiche (« pièce tournée de 90° ») au moment
d'accepter, et rien ne s'applique sans ce geste. Roberto a tranché le fond dès le 3 novembre :
le sens du grain, *« pas d'importance »*. T16 suit immédiatement.

Ce qui reste — le bon de travail ne reprend pas le sens de pose — devient un point de suite, pas
un verrou : il ne fausse ni un prix ni un calcul, et le document ne promettra pas l'inverse.

**2. La table `Formats_Feuille` — oui, par le builder.** C'est une table neuve, pas une
modification de données de production : le garde-fou qui a bloqué les fiches ne s'applique pas.
Les neuf formats sont dans `montage-a-completer.md` §1. T15 suit.

**3. L'Exemple — oui, mais après la série.** Le diagnostic est juste et vérifié :
`entreesVierges` passe par `normaliserEntrees`, `entreesExemple` non, donc une soumission partie
de l'Exemple porte des passes F/S invisibles jusqu'à sa première réouverture, où le prix bouge
tout seul. `gen-exemple.ts` et `gen-schema.ts` normalisent déjà — c'est l'écran qui fait
exception. **Mais c'est une correction de code**, donc un nouveau build : la faire maintenant
changerait le bandeau sous les captures en cours. Elle part avec le sens de pose au bon de
travail, dans le build suivant.

**L'ordre de clôture**, et il compte :
1. **Catégorie des fiches 120 et 182** — en premier. La 120 que Roberto a fait réactiver est
   invisible dans la liste des presses tant que ce n'est pas corrigé.
2. **`Formats_Feuille` → T15.**
3. **Grain à `0` → T16.**
4. **Captures client C1 → C8** — en dernier, grain libre, sur une job présentable. Pas la
   soumission de test : ces images vont chez le client.

La soumission « BSP / test montage 3 » et son BT-1019 restent en place jusqu'à la fin de la
série — le protocole s'y réfère comme preuve. À supprimer une fois le document écrit.

### 20 nov. — Les deux anomalies de la liste Presse ont la même cause *(BSP, vérifié dans le code)*
Soufiane signale la **Cameo 38SS no.120** absente de la liste déroulante, et une
**« Multiprint IST no.180 »** affichée alors que la fiche Creator s'appelle **182**. C'est le même
mécanisme.

`fusionnerMachines` (`lib/machines.ts`) écarte toute fiche Creator dont la catégorie ne donne pas
de famille : `familleDepuisCategorie` exige une catégorie commençant par **« Sérigraphie »** pour
qu'une fiche soit une presse, sinon `continue` — la fiche n'entre jamais dans la liste. Puis, en
fin de fusion, les machines du **snapshot** que Creator n'a pas fournies sont ajoutées :
`for (const [cle, s] of parCle) if (!vues.has(cle)) out.push(s)`.

- **La 120** n'est pas dans le snapshot (`machinesCalc.ts` n'a que la 116 et la 110). Écartée par
  la catégorie, elle disparaît purement et simplement.
- **La 182** est écartée de la même façon ; le snapshot, lui, porte
  `{ nom: "Multiprint IST no.180", largeurPo: 24, hauteurPo: 44 }` (ligne 62). Comme `cleMachine`
  retire les « no.XXX », les deux ont la même clé : le snapshot comble le trou et c'est son nom
  qui s'affiche.

**À vérifier dans Creator :** le champ `Categorie` des fiches 120 et 182, comparé à une presse qui
fonctionne (110 ou 150). Corriger la catégorie fait entrer la fiche et masque l'entrée du
snapshot — les deux anomalies tombent ensemble.

**À noter aussi :** le snapshot est périmé (116 à 12 × 8, 110 à 26 × 18, One man `actif: true`).
Il ne sert qu'aux machines absentes de Creator et au mode hors Zoho, mais il mérite une remise à
niveau après la série.

### 20 nov. — Le bon de travail ne porte pas le sens de pose *(BSP, vérifié dans le code)*
Cherché dans `widget/src/bt/` : **aucune occurrence** de `MONTAGETOURNEE`, `tournee` ou
`pieceTournee`. Le nouveau build **enregistre** bien l'orientation et l'écran de soumission
l'affiche (`App.tsx:1184`, « · pièce tournée de 90° »), mais le bon de travail ne la reprend pas —
et son widget est resté au build `2026-10-20`.

Ce qui demeure, et ce qui tombe, pour la décision sur le grain :
- **Tombe** — le motif qui tenait le grain à `1` était que l'ancien build *n'enregistrait pas*
  l'orientation. Le build déployé l'enregistre.
- **Tombe aussi** — rien ne s'applique sans geste humain : le montage est une *suggestion*, et
  l'écran affiche « pièce tournée de 90° » au moment d'accepter.
- **Tombe enfin** — Roberto, le 3 novembre : le sens du grain, *« pas d'importance »*.
- **Demeure** — l'atelier lit le sens de pose à l'écran, pas sur le bon de travail. À combler,
  mais ce n'est pas un défaut de prix ni de calcul.

### 20 nov. — Le montage passe devant le contrat Openmind *(Youssef)*
Arbitrage rendu. **Le montage est prioritaire sur tout autre chantier** tant qu'il n'est pas
livré. C'est la livraison qu'Artistic attend, et elle est bloquée depuis le 17 par une heure de
travail manuel.

Ce n'était pas dit en ces termes jusqu'ici : les relances disaient « urgent », pas « avant le
reste ». C'est dit maintenant.

**Ordre de marche :** la feuille de séance (`montage-seance-deploiement.md`), puis T1 → T16 et
les captures. Le contrat Openmind reprend après — le travail poussé cette nuit n'est pas perdu,
il est simplement en attente.

### 20 nov. — Le dépôt est à jour chez Soufiane ; le montage n'a pas avancé *(BSP)*
Son commit du 20 nov. à 01:42 (contrat HTML Openmind) est construit **directement sur `890f5fa`**.
Il a donc récupéré la feuille de séance, l'ordre des écritures et la décision sur le courriel
client — l'information est passée, la convention a fonctionné.

**Mais aucun fichier du montage n'est touché.** Le paquet n'est pas téléversé, les sept fiches
portent toujours les anciennes valeurs, le protocole reste à 35 cases vides sur 36 et
`captures/client/` est vide. Dernier mouvement sur le montage : **17 nov. 16:02**.

Ce n'est donc ni un problème d'information ni, selon toute apparence, un problème d'accès : c'est
un arbitrage de priorité entre deux chantiers. À trancher par Youssef.

### 19 nov. — Le courriel au client attend le document *(Youssef)*
Décision : **on n'annonce pas l'avancement à Artistic.** Pas de « on est en train de tester »,
pas de point d'étape. Le prochain envoi sera **le document fonctionnel lui-même**, et c'est lui
qui portera l'explication de l'impact sur les prix pour Christian.

La réponse à Roberto est rédigée et **reste en brouillon** dans Gmail, en réponse à son message
du 16. Elle sera reprise et fondue dans l'envoi final — la question sur la 180 y est déjà, et
l'avertissement à Christian aussi.

Conséquence : **le chantier n'a plus qu'une seule sortie vers le client**, et elle est derrière
la série de tests. Rien ne part avant.

### 19 nov. — Une feuille de séance pour débloquer l'heure manuelle *(BSP)*
Les deux gestes étaient éparpillés sur trois documents. Ils tiennent maintenant sur une page :
`montage-seance-deploiement.md` — téléversement, les sept écritures avec les noms de champs
Creator et les identifiants, le contrôle de vérification, l'ordre imposé, et ce qu'il ne faut
pas toucher. Plus rien à chercher ni à décider en chemin.

### 19 nov. — Le chantier est à l'arrêt depuis deux jours *(BSP)*
Dernier mouvement de Soufiane : **17 nov. 16:02**, le commit qui signale le blocage des
écritures. La réponse l'attend dans le dépôt depuis le **18 nov. 06:14**. Depuis, rien : le
paquet n'est pas téléversé, aucune des sept écritures n'est faite, 35 cases du protocole sur 36
sont vides, `captures/client/` est vide.

**Ce n'est pas la convention qui faiblit, c'est le chantier qui ne bouge pas.** Le dépôt
enregistre, il ne réveille personne — une question posée ici attend que son auteur fasse
`git pull`. Relance envoyée à Soufiane par Cliq, au titre de l'urgence que la convention laisse
ouverte.

Rappel de ce qui est en jeu : **une heure de travail manuel** bloque la série de tests, les huit
captures client et le document qu'Artistic attend depuis le 27 octobre.

### 18 nov. — Les sept écritures se font à la main *(Youssef)*
Décision : **Soufiane les saisit lui-même dans Creator**, le garde-fou de l'outil n'est pas levé.
Autoriser l'écriture automatisée sur les données de production d'Artistic pour sept lignes ne
vaut pas le précédent que ça créerait — et il est de toute façon dans Creator pour téléverser.

Les valeurs et les identifiants sont dans `montage-a-completer.md` §3, prêts à recopier. Compter
une demi-heure. Les deux gestes manuels se font dans la même séance : **le zip, puis les sept
écritures**, et T1 part ensuite.

### 17 nov. — Le chemin critique portait encore l'ancien ordre *(BSP)*
Le tableau listait les fiches machines **après** T1 → T14, alors que l'arbitrage du jour met les
six écritures **avant** T1. Corrigé : téléversement, puis les sept écritures, puis la série. Les
deux gestes manuels sont maintenant côte à côte en tête du chemin, ce qu'ils sont dans les faits.

`Formats_Feuille` reste où elle était : le protocole ne la lit qu'en T15.

### 17 nov. — Les sept écritures de fiches sont bloquées elles aussi *(Soufiane)*
L'ordre étant tranché (les six avant T1, plus One man à Inactif), j'ai lancé la première — la
110 à 21 × 30. **Refusée en automatisé : modification de données partagées.** Les sept sont donc
à faire à la main, ou à autoriser explicitement côté outil.

Aucune n'est faite — la lecture de contrôle le confirmera : la 110 porte toujours 26 × 18. Les
valeurs et les identifiants sont dans `montage-a-completer.md` §3, prêts à recopier.

Deux choses à la main, donc, et elles vont ensemble : **le téléversement du zip et les sept
écritures**. Tant que les deux ne sont pas faites, T1 ne peut pas commencer.

**Le paquet à téléverser est prêt et vérifié :** `widget/canevas/dist/canevas.zip`, 207 981 o,
17 nov. 15:30. Entre `ea15357` (son commit de construction) et `6246975`, **aucun fichier hors
`docs/` n'a changé** — vérifié fichier par fichier, le code du paquet est bien celui de `main`.
Pas besoin de reconstruire ; le bandeau portera l'heure de ce paquet, à noter telle quelle pour
le point 2.

### 17 nov. — Le téléversement est à Soufiane *(Youssef)*
C'est lui qui téléverse, à la main dans Creator : **Paramètres → Widgets** → widget soumission
→ remplacer le zip. Le script n'a pas à être forcé ni contourné — il n'est simplement pas le
chemin.

**Son paquet du 17 nov. 15:30 est bon, inutile de reconstruire.** Rien hors `docs/` n'a changé
depuis (`ea15357..d9e0383` ne touche que de la documentation), donc le code est identique. S'il
préfère repartir de `main` à jour, le bandeau portera `2026-11-17 15:47 UTC`.

Quel que soit le paquet retenu, **noter le bandeau obtenu** : c'est le point 2 du protocole, et
le signal qui autorise le `0` du grain.

### 17 nov. — Le paquet est construit, le téléversement reste à faire *(BSP)*
Le script de déploiement de Soufiane est refusé en automatisé, et il n'est pas nécessaire :
`npm run build` suffit à produire le paquet, et Creator le prend par téléversement.

Paquet construit depuis `main` à **5afe281**, arbre propre, `zet pack` propre :
`widget/canevas/dist/canevas.zip` (208 Ko). **Bandeau attendu une fois en ligne :
`2026-11-17 15:47 UTC`** — c'est la preuve du point 2 du protocole, et le signal que le `0` du
grain peut être écrit.

Téléversement : Creator → **Paramètres → Widgets** → le widget soumission → remplacer le zip.
À faire à la main, par Youssef ou Soufiane — c'est exactement la main humaine que le garde-fou
demande, et c'est la première fois que ce déploiement change des prix.

Le zip n'est pas versionné (`.gitignore` écarte `widget/canevas/dist/`) : il se reconstruit à
l'identique depuis le même commit.

### 17 nov. — One man passe à Inactif *(Youssef)*
Décision prise : la fiche `4153107000022536056` passe à **Inactif**, statut seulement — les
48 × 96 des champs numériques restent, Roberto les a confirmés et la presse doit revenir. C'est
elle le trou du calcul, pas la DTS.

**À savoir avant de la faire :** après ça, le 24 × 48 ne tient plus que sur la Viking no.150.
C'est le format que tous les scénarios de test recommandent, et il ne dépend plus que d'une
seule fiche.

La DTS attend la fin de la série : elle est inerte pour le calcul, elle encombre seulement la
liste de choix.

### 17 nov. — L'ordre des écritures : les six d'abord *(BSP)*
Réponse à l'arbitrage demandé. **Faire les six écritures avant de commencer T1.** Elles ne
changent aucun résultat attendu : les neuf formats sont couverts par au moins une presse avant
comme après, et le 24 × 48 reste sur la seule Viking no.150 dans les deux jeux. Aucune capture
n'aura donc à être refaite, et toute la série sera jouée sur les données qu'Artistic utilisera
vraiment — captures client comprises.

Les six : 110, 116, 120 (à réactiver), 140, 150, 170. La 130 ne bouge pas.

**Deux fiches restent une décision de Youssef, pas une correction :**
- **One man** — hors service aujourd'hui, mais active et à 48 × 96 dans les champs numériques,
  donc elle fait considérer roulables des formats que personne n'imprime. La désactiver est
  cohérent avec ce que dit Roberto ; ça enlève un choix de la liste des chargés de projet, et
  elle doit revenir « prochainement ».
- **DTS** — inerte pour le calcul (champs numériques vides, `presseAccepte` l'écarte), donc
  aucune urgence. Elle encombre la liste de choix, c'est tout. À traiter après la série.

T12 est remis dans son état d'origine : il oppose bien la 116 au 24 × 48, et vaut avant comme
après les écritures.

### 17 nov. — Les fiches machines relues : trois choses à corriger dans le §3 *(Soufiane)*
Avant d'écrire les six fiches, je les ai lues par l'API et confrontées au code. **T12 n'est pas
caduc** : il met la 116 face à une suggestion 24 × 48, et ce format ne tient que sur la Viking
no.150 — l'avertissement sortira avant comme après. **Le trou, c'est « One man »** (48 × 96 et
statut Actif, donc prise dans le calcul), pas la DTS dont les champs numériques sont vides et que
`presseAccepte` écarte. Et le **16 × 12 n'était pas écarté** : les neuf formats sont déjà tous
couverts. Détail et identifiants dans `montage-a-completer.md` §3.

**Les écritures ne sont pas faites** : elles changent ce que le calcul considère roulable, et
l'ordre par rapport à T12 mérite un mot de Youssef. Elles sont prêtes, une par fiche.

### 17 nov. — Le chantier se conclura par un document client *(Youssef)*
Une fois la série au vert : un document fonctionnel sur ce que le montage permet, illustré, et un
courriel qui le porte. La partie 4 du protocole demande les huit captures nécessaires.

### 17 nov. — Déploiement à lancer à la main *(Soufiane)*
Le build de `main` est prêt et vérifié : `tsc` propre, paquet reconstruit
(`canevas/dist/canevas.zip`, 17 nov. 15:30), et `verif:montage` au vert — **29 assertions,
1 568 cas**, sortie déposée dans `captures/T00-verif-montage.txt` (point 1 du protocole, coché).

**Mais `ops-deployer-montage.js` ne peut pas être lancé depuis l'automatisation** : un déploiement
en production y est refusé. La commande doit être passée à la main depuis la racine du projet.
Rien n'est contourné : le garde-fou est là pour ça, et c'est le déploiement qui change des prix
pour la première fois.

**Conséquence sur l'ordre :** `APP_MONTAGE_GRAIN_FIGE` reste donc à **1** (vérifié ce jour dans
`Taux_Calcul`, ID …875014). Il ne passera à `0` qu'une fois le nouveau build constaté en ligne
par le bandeau, pas avant — T16 attend ce moment-là. T1 → T14 attendent le même.

### 17 nov. — L'avancement passe dans le dépôt *(Youssef → `b2e7beb`)*
Trop de choses circulaient par message pendant que le dépôt n'en savait rien. Ce fichier devient
la source unique ; les captures vont dans `captures/`.

### 17 nov. — Feu vert pour le déploiement *(Youssef)*
Soufiane déploie le build de `main` et écrit lui-même le `0` du grain juste après. Christian sera
prévenu que les prix sortants peuvent baisser une fois l'étape 6 en ligne — rien ne baisse tout
seul, il faut qu'un chargé de projet clique « Accepter ».

### 17 nov. — Trois corrections au protocole *(Soufiane → `0d14e1e`)*
29 assertions et non 23. Facteur d'effondrement 15 et non 20. Et surtout, un piège de lecture sur
T10 : les nombres de feuilles du tableau sont les bases de facturation matière (`E2/E5`, sans
gâche), pas le NB.MRX affiché (`S!G9`, avec). Qui compare 476 au NB.MRX croit à un échec sur le
test qui protège les marges.

### 16 nov. — Roberto tranche les formats maxi *(→ `cc5ea4f`)*
« Utilise ma liste. » Les fiches Creator sont fausses, pas ses chiffres. Et les trois fiches hors
liste ne sont pas ce qu'on croyait : la DTS n'est pas une presse, la One man est hors service, la
« 182 » est probablement la 180. Détail dans `montage-a-completer.md` §3.

### 16 nov. — Les six correctifs, plus un *(Soufiane → fusionnés dans `357862e`)*
Les six points du 16 novembre, plus le comptage de la gâche qu'il a trouvé en route, plus les CSV
d'import générés depuis le code.

### 16 nov. — Campagne de tests en production *(Youssef)*
Sept tests sur le build `2026-11-05 15:12 UTC`. Le calcul est juste, mais il ne pilote rien : le
montage accepté ne change ni le nombre de up, ni le prix, et n'arrive pas au bon de travail. Sept
défauts relevés, consignés dans `montage-etape6.md` et `montage-a-completer.md`.

---

## Ce qui reste ouvert

- **La « 182 » est-elle la 180 ?** Roberto le pense. À confirmer avant de renommer la fiche. Ne
  bloque aucun test.
- **Le sens de pose n'arrive pas au bon de travail.** Le build l'enregistre, l'écran l'affiche, le
  BT non (`src/bt/` n'en a aucune trace, et son widget est au build du 20 oct.). À porter dans le
  build suivant. Roberto a été invité le 20 nov. à dire si son atelier en a besoin sur le papier.
- ~~**`entreesExemple` ne normalise pas les F/S.**~~ Corrigé et déployé le 20 nov.
- **Les quatre décisions de la maquette** — pièces multiples, prix minimum et seuils, format des
  numéros, taux réels. Courriel rédigé, en brouillon, à envoyer à Christian. Elles conditionnent
  l'échéancier promis à Philippe.
- **Les numéros d'enregistrement TPS et TVQ**, et le format exact du numéro de soumission.
  Demandés à Christian le 20 nov.
- **Les deux feuilles produit manquantes** (Faces graphiques, Affiches) et les machines
  numériques avec leurs vitesses, pour le chantier numérique.
- **Les données de test à supprimer** : soumissions d'essai et bons **BT-1019**, **BT-1020**,
  **BT-1021**.
- ~~**Une soumission réelle avec une ligne fournisseur** pour T10.~~ Réglé le 20 nov. : T10 joué
  avec R41 = 0,50 $/pi², 3 562,50 → 2 571,43 $.

---

*BSP — tenu à jour par commit. Si cette date est vieille de plus de deux jours pendant un
chantier actif, c'est que la convention n'est pas respectée.*
