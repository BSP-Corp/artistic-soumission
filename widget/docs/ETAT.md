# Montage — état du chantier

> **Ce fichier est la source unique de l'avancement.** Il remplace les messages Cliq et les
> courriels entre nous. Chacun le met à jour **par un commit**, pas par un message : ce qui n'est
> pas ici n'existe pas, et personne n'a à demander « où on en est ».
>
> Mis à jour en dernier : **17 novembre 2026** — BSP.

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
  build suivant, avec le point ci-dessous.
- **`entreesExemple` ne normalise pas les F/S.** Une soumission partie de l'Exemple change de prix
  d'elle-même à sa première réouverture (≈ +140 $ sur le scénario testé). Correction d'une ligne,
  à faire après la série pour ne pas changer le bandeau sous les captures.
- ~~**Une soumission réelle avec une ligne fournisseur** pour T10.~~ Réglé le 20 nov. : T10 joué
  avec R41 = 0,50 $/pi², 3 562,50 → 2 571,43 $.
- **Christian n'est pas encore prévenu** de l'effet de l'étape 6 sur les prix. Décidé le 19 nov. :
  ça passera dans le document final, pas dans un point d'étape séparé.

---

*BSP — tenu à jour par commit. Si cette date est vieille de plus de deux jours pendant un
chantier actif, c'est que la convention n'est pas respectée.*
