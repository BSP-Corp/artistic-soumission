# Handoff dév — Refonte de la soumission (2e widget)

> Pour Soufiane. Objectif : refaire l'écran de soumission en **formulaire intelligent** (sections
> empilées, champs pilotés par le type de production et le produit, sommaire de prix fixe en bas,
> visuel de disposition). **Le backend de calcul ne bouge pas** : on refait la présentation et on
> rebranche les appels existants.
>
> **Approche : un 2e widget.** Le widget actuel (`widget/canevas`) reste en production comme filet
> le temps que le nouveau soit accepté. Les deux sortent du même dépôt et partagent `lib/`,
> `data/` et `services/`.
>
> **À lire d'abord :** `specifications-soumission-zoho.md`, à côté de ce fichier — la spec de
> Josemaria Teixeira du 9 novembre, c'est la référence. Ce document-ci dit **comment**, **dans quel
> ordre**, et **où la spec se trompe**.
>
> BSP — 16 novembre 2026.

---

## 0. Le principe en trois phrases

La spec décrit surtout **comment présenter et guider la saisie**. Les calculs existent déjà et sont
validés : prix, gâche, impression sérigraphie, découpe, conversion US, et le calcul des poses que tu
as livré. Le travail, c'est l'ossature du formulaire, quelques sections neuves, les validations, et
le rebranchement sur ce qui tourne déjà.

**Règle absolue, reprise du README :** on ne touche pas à `lib/moteur.ts` ni à
`data/classeur.json`. Ce sont la copie conforme du classeur Excel d'Artistic (1 322 formules). Une
« correction » pour faire tomber un chiffre juste casse la correspondance avec l'Excel sans
prévenir.

---

## 1. Ce que tu réutilises tel quel

| Brique | Où | Ce qu'elle fait |
|---|---|---|
| Moteur de formules | `src/lib/moteur.ts` + `src/data/classeur.json` | Exécute les 1 322 formules du classeur. **Ne pas modifier.** |
| Cartographie champ ↔ cellule | `src/lib/modele.ts` | Dit quelle cellule écrit quel champ. C'est ici que tu ajoutes les champs neufs. |
| État + simulation des quantités | `src/hooks/useSoumission.ts` | `set` / `unset` / `saisie` / `num` / `simulerQuantite`. Réutilisable **tel quel** par le 2e widget. |
| Lecture/écriture Creator | `src/services/zohoService.ts` | `Materiaux_Report`, `Taux_Calcul_Report`, `Taux_Change`, chargement et enregistrement des soumissions. |
| Calcul des poses | `src/lib/montage.ts` (branche `montage-imposition`) | `choisirMontage` → format, up/feuille, nb de feuilles, candidats écartés. Alimente la section « Calcul des poses » de la spec **et** le visuel de disposition. |
| Règles matériaux | `src/lib/reglesMateriaux.ts` | Base des alertes de la section 7 de la spec. |
| Proposition client | `src/components/PopupProposition.tsx` | Gabarit PDF actuel, à faire évoluer vers les 2 pages de la spec §8. |

**Les pseudo-cellules `X!`** (`src/lib/modele.ts`) sont le mécanisme pour toute donnée qui n'existe
pas dans le classeur : `X!VENDU`, `X!CONTRAT`, `X!TAUXINV`, `X!MONTAGEFORMAT`… Elles voyagent et
s'enregistrent avec la soumission, et aucune formule ne les lit. **La refonte ajoute beaucoup de
champs de ce type** (certifications, livraison, sous-traitance, notes) : c'est la voie à prendre,
pas une colonne de plus dans le classeur.

---

## 2. Monter le 4e build (30 minutes)

Le dépôt produit déjà trois widgets depuis une source commune. En ajouter un quatrième se calque
exactement sur le bon de travail. Prends `vite.bt.config.ts` comme modèle :

1. `index-soumission2.html` — copie de `index-bt.html`, titre « Soumission — BSP », entrée
   `/src/s2/main.tsx`. **Garde la balise `<script src="https://js.zohostatic.com/.../widgetsdk-min.js">`** :
   sans elle, pas de SDK Creator.
2. `src/s2/` — `main.tsx` + `AppS2.tsx`. C'est le seul dossier neuf ; tout le reste s'importe
   depuis `@/lib`, `@/data`, `@/services`, `@/hooks`.
3. `vite.soumission2.config.ts` — copie de `vite.bt.config.ts`, avec `outDir: "soumission2/app"` et
   le plugin de renommage `index-soumission2.html` → `index.html` (zet exige `index.html` à la
   racine de `app/`).
4. `soumission2/plugin-manifest.json` — copie de `canevas/plugin-manifest.json`.
5. `package.json` — ajouter :
   ```
   "build:s2": "vite build --config vite.soumission2.config.ts",
   "pack:s2":  "vite build --config vite.soumission2.config.ts && cd soumission2 && zet pack"
   ```

Le widget se téléverse ensuite dans Creator à **son propre emplacement** : les quatre se mettent à
jour indépendamment. Le widget actuel n'est jamais touché.

> **Le bandeau de build est ton ami.** `vite.bt.config.ts` injecte `__BUILD__` (horodatage) dans le
> bundle, affiché en haut de l'écran. Reprends-le : c'est ce qui permet de savoir, depuis Creator,
> quelle version est réellement déployée. Ça a déjà évité des heures de débogage à l'aveugle.

---

## 3. Phase 0 — le squelette (à livrer en premier)

**L'objectif de la phase 0 est d'avoir quelque chose de testable vite**, pas d'avoir toutes les
sections. Youssef teste au fur et à mesure.

### Ce qu'il faut

**Les 10 sections empilées**, dans l'ordre de la spec §4. Les sections que tu n'as pas encore
remplies affichent leur titre et restent vides — c'est voulu, ça montre la structure.

> ⚠️ **Le repliage : la spec et le client ne disent pas la même chose.** La spec §1 annonce « toutes
> les sections sont repliables ». En réunion le 9 novembre, le client a explicitement refusé :
> *« ça, on a dit qu'on ne le ferait pas, parce qu'on aime mieux tout voir pour être sûr qu'on n'a
> rien oublié. »* Philippe précise que le repliage *« pourrait peut-être servir s'il y a des choses
> qui étaient optionnelles. Mais sinon, on les laisserait ouvertes. »*
>
> **À faire : sections 01 à 08 toujours ouvertes, sans flèche de repliage.** Le repliage est réservé
> aux deux sections optionnelles, 09 (Sous-traitance et installation) et 10 (Notes), fermées par
> défaut. C'est la parole du client qui prime sur la spec générée.

**L'ordre des sections n'est pas arbitraire** : il suit l'ordre des opérations de production.
Identification du client → production → finition → matériel → livraison → sous-traitance → notes.
*« Ça y va en ordre d'opération que la job va être faite, dans la séquence logique. »* Ne le
réarrange pas.

**La colonne de droite** (spec §5) avec les trois blocs : Prix par quantité, Calcul des poses,
Sommaire.

**La barre de sommaire fixe en bas**, toujours visible, total live. Ordre de la spec §3 pour la
barre d'actions : Nouvelle soumission · Dupliquer · Ouvrir · Imprimer · Envoyer, puis à droite
Enregistrer (secondaire) et Envoyer vers le bon de travail (principal, orange).

> **La barre fixe est le point à ne pas rater.** La maquette générée l'avait manquée et c'est la
> première chose que le client a redemandée, en toutes lettres : *« toujours le prix en bas,
> toujours la variation dès qu'il change quelque chose, de pouvoir le voir immédiatement, tout le
> temps — plutôt que d'avoir un sommaire qui apparaît juste quand tu scrolles. »* Le chargé de
> projet doit voir le total bouger pendant qu'il saisit, sans scroller.

**Branché sur l'existant** : les sections 04 (Quantités) et 05 (Sérigraphie) rebranchées sur
`useSoumission`, pour que le sommaire affiche de vrais chiffres dès la phase 0. Le reste peut
attendre.

### Ce qui n'est PAS dans la phase 0

Les sections neuves (03, 08, 09, 10), le numérique, le visuel de disposition, les validations, le
PDF 2 pages. Ils arrivent aux phases suivantes.

---

## 4. Les phases suivantes

| Phase | Contenu | Référence |
|---|---|---|
| **1** | Production : sérigraphie (réutilisation) + **numérique** + découpe numérique seule | `Handoff_Soufiane_production_numerique.md` — déjà écrit, 4 produits détaillés |
| **2** | Matériel et laminage (06) + Finition et découpe (07) + Livraison (08) | spec §4 |
| **3** | Certifications (03) + Sous-traitance / PO / Installation (09) + validations (spec §7) | spec §4 et §7 |
| **4** | Colonne droite complète : poses + **visuel de disposition**, et PDF 2 pages | spec §5 et §8 |

**Les trois gros morceaux**, où part le temps : la production numérique (beaucoup de cas), la
sous-traitance avec émission de PO dans Books/Inventory, et le formulaire intelligent lui-même.

### Le numérique : attention, deux listes de produits

La spec §4-05 liste **6 types** de produits avec des options génériques. Le handoff numérique
s'appuie sur les **vraies feuilles produit du client** (`Formulaires_soumission_Artistic.docx`) et
ne couvre que **4 types**, mais avec leurs options exactes.

**Les vraies feuilles font foi** pour les 4 produits qu'elles couvrent (Autocollants, Panneaux,
Bannières, Roll-up). Les 2 autres (Faces graphiques, Affiches / matières souples) n'ont pas encore
de feuille : laisse les encadrés E et F en placeholder d'après la spec, on les remplira à réception.

Et surtout : **pilote l'affichage par une table de config Creator** (`Config_Champs_Produit_Numerique`,
détaillée dans le handoff numérique), pas par du code en dur. Ajouter une option doit être une
ligne à saisir, pas un redéploiement. C'est l'autonomie qu'on a promise au client.

**Ce que le client attend du « formulaire intelligent », dans ses mots :** *« Si tu fais une
bannière, voici les questions auxquelles tu dois répondre. »* Son exemple de référence, c'est les
œillets : ils doivent apparaître sur une bannière et **jamais** sur une face graphique. Et l'effet
recherché n'est pas seulement de gagner du temps — c'est que la question posée au chargé de projet
le force à la poser au client : *« ça me prend-tu des œillets ? »*. Une option qu'on n'affiche pas
est une option qu'on oublie de vendre.

> **Attention au filtrage des matériaux.** Ne pars pas du principe que sérigraphie et numérique ont
> des matériaux disjoints. Le client a été clair : *« c'est les mêmes machines... le matériel de
> laminage, on s'en sert aussi pour la sérigraphie. Même des fois, c'est la même matière première
> qui est bonne pour les deux départements. »* Le filtre restreint, il ne partitionne pas.
>
> L'usage **Intérieur / Extérieur** filtre lui aussi les matériaux (une bannière extérieure ne
> propose que des matériaux d'extérieur) **et** doit se reporter sur le bon de travail.

---

## 5. Ce qui est tranché, et ce qui ne l'est pas

### Tranché — tu peux coder dessus

| Paramètre | Valeur |
|---|---|
| Taux infographie | 85,00 $/h |
| Facteur (marge) | 40 % |
| Gâche | 10 % |
| Paliers par défaut | 100 / 250 / 500 / 1 000 / 2 500 |
| Validité de la soumission | 30 jours |
| TPS / TVQ | 5 % / 9,975 % (clients du Québec) |
| Encres / Transport (défauts) | 150 % / 30 $ |
| Pièces par soumission | 1 à 5 |

**Tous ces paramètres doivent être modifiables en Administration**, pas écrits dans le code (spec,
dernière ligne de §9). Le mécanisme existe : `Taux_Calcul_Report` + `src/lib/parametres.ts`, comme
pour `APP_MONTAGE_*`.

### Pas tranché — ne bloque pas, mais ne devine pas

1. **Taux réels** : presse, Zünd, échenillage, pose de transfert, matériaux, encres.
2. **Pièces multiples** : imprimées séparément ou en montage mixte sur la même feuille ? Ça change
   le calcul des poses et le prix.
3. **Prix minimum de commande** et **seuils d'approbation** (marge, montant).
4. **Format exact** du n° de soumission et des n° de révision. La spec dit `S-AAAA-NNNN`, à confirmer.
5. **Import de fichiers externes** (anciennes fiches Excel / PDF) — phase ultérieure, hors scope.
6. **Machines numériques + vitesses**, et **coûts unitaires des finitions**.
7. **Qui a le droit de modifier le widget.** Youssef a promis à Josemaria qu'Artistic pourrait
   ajouter des champs en autonomie. Philippe a aussitôt soulevé la question : *« faudrait voir qui
   a des droits là-dessus, parce que si tout le monde se met à jouer avec, on perd le contrôle. »*
   Non tranché. Ça n'empêche pas de coder, mais ça oriente ce qui passe par la table de config
   (modifiable par le client) et ce qui reste dans le code (modifiable par nous).

Quand un de ces points te bloque : code le champ, mets une valeur par défaut paramétrable, et
signale-le. On ne fige rien dans le code.

---

## 6. Pièges connus

**Les correctifs vont dans le SOURCE, jamais dans le build.** Un patch appliqué au bundle est écrasé
au prochain `npm run build`. Ça s'est déjà produit.

**Le piège `Taux_Calcul`.** Un paramètre `S_<cellule>` présent dans `Taux_Calcul_Report` **écrase**
la valeur par défaut embarquée dans le code. Si une valeur par défaut ne « prend » pas, regarde ce
rapport avant de chercher dans le code.

**Vider les champs au changement de contexte.** Quand l'utilisateur change de type de produit, les
champs de l'ancien produit doivent être **vidés**, pas laissés en place. C'est exactement l'anomalie
du Lot A où décocher la case US laissait les montants US figés : une valeur orpheline se lit comme
encore valide. Même règle partout dans le formulaire intelligent.

**Le SDK Creator arrive en retard.** Tu l'as déjà corrigé sur la branche `montage-imposition`
(`attendreSdk`, init mémoïsée et attendable). **Reprends cette correction dans le 2e widget dès le
départ** — sans elle, le widget annonce « Hors Creator » en tournant dans Creator, de façon
intermittente selon la latence du CDN.

**Les listes de prix ne sont pas synchronisées entre l'ancien et le nouveau système.** Johan a
comparé des soumissions début novembre : les prix du nouveau système sont bons, et *« s'il y a des
écarts, c'est parce que les listes de prix sont un peu différentes — on a mis à jour celles dans le
nouveau système, mais elles ne sont pas nécessairement à jour dans l'ancien. »* Donc si quelqu'un
te signale un écart de quelques sous pendant les tests, regarde `Materiaux_Report` avant de
soupçonner le calcul.

---

## 7. Deux choses à régler avant ou pendant

**La branche `montage-imposition` n'est pas fusionnée dans `main`.** Elle porte le calcul des poses
(validé sur 1 568 cas) et le correctif « Hors Creator » que Christian a confirmé fonctionner le
4 novembre. Le 2e widget a besoin des deux. À voir avec Youssef : fusionner d'abord, ou brancher la
refonte sur `montage-imposition`.

**Le paramètre du grain est à l'envers.** `APP_MONTAGE_GRAIN_FIGE` vaut 1 (pas de rotation), d'après
l'onglet « Paramètres » du gabarit Excel. Mais Roberto a répondu par courriel le 3 novembre à 12 h 44 :
**« non pas d'importance »** — le grain n'impose pas l'orientation, la pièce peut tourner de 90°. Le
commit du montage est de 8 h 57 le même jour, donc antérieur à la réponse. Correction : passer le
paramètre à **0** dans `Taux_Calcul`, pas de redéploiement nécessaire. Le code sait déjà tourner la
pièce.

---

## 8. Ordre de travail proposé

1. Monter le 4e build (§2) et vérifier qu'un écran vide se déploie dans Creator.
2. **Phase 0** (§3) : sections empilées, colonne droite, barre fixe, sections 04 et 05 branchées.
   → **livrer ici pour que Youssef teste.**
3. Phase 1 : le numérique, piloté par la table de config.
4. Phases 2 et 3 : les sections restantes et les validations.
5. Phase 4 : visuel de disposition et PDF 2 pages.

Livre **par morceaux**. La phase 0 testable d'abord, c'est ce qui permet de réajuster tôt.

---

## 9. Fichiers de référence

**Dans le dépôt**, à côté de ce fichier :

| Fichier | Contenu |
|---|---|
| `specifications-soumission-zoho.md` | **La spec.** 10 sections, colonne droite, calculs, validations, PDF 2 pages. |
| `montage-imposition.md` | Ton propre document sur le calcul des poses — alimente le visuel de disposition. |
| `champs-zoho.md`, `plan-parametrage-creator.md`, `parametres-machines.md` | Les champs, le paramétrage Creator, les machines. |
| `api/CONTRAT-SOUMISSION.md`, `api/ARCHITECTURE-API.md` | Le contrat de la soumission et l'architecture API. |
| `../../README.md` | Architecture du dépôt, moteur, rapports Creator, build des widgets. |

**Hors dépôt** — Youssef te les envoie, ils ne sont pas versionnés (`docs/` est exclu par la liste
blanche du `.gitignore`) :

| Fichier | Contenu |
|---|---|
| `Plan_adaptation_refonte_soumission.md` | Mapping section par section : ce qui existe, ce qui est neuf, l'effort. |
| `Handoff_Soufiane_production_numerique.md` | Le numérique en détail : 4 produits, options exactes, table de config. |
| `Formulaires_soumission_Artistic.docx` | Les vraies feuilles produit du client (source du handoff numérique). |
| `Retours_test_LotA_soumission_a_completer_2.md` | Les comportements validés au Lot A, à ne pas perdre dans la refonte. |
| `Recap_global_reprise_2026-11-16.md` | Où en sont les 6 chantiers du projet. |

**Les deux réunions qui fondent ce chantier** (transcriptions chez Youssef) : **27 octobre**, où
Christian demande le calcul automatique du format de feuille ; **9 novembre**, où Josemaria présente
la maquette et où le client tranche le repliage, le sommaire fixe et le formulaire intelligent.
Quand la spec et la réunion divergent, **c'est la réunion qui fait foi** — la spec a été générée à
partir de la maquette, pas à partir des décisions prises en séance.

La maquette de référence est un artifact Claude dont le lien est en tête de la spec. Josemaria a
indiqué le 9 novembre qu'Artistic ne peut pas partager de liens à l'extérieur du Groupe Canva : si
le lien ne s'ouvre pas, **la spec seule fait foi** — elle est complète.

---

*BSP — 16 novembre 2026. Backend conservé, 2e widget incrémental, phase 0 testable d'abord.*
