# Artistic ERP — widget de soumission (Zoho Creator)

Application qui remplace le classeur Excel de soumission d'Artistic (`FT_Soumission
Matériaux Souples Rev.06`) par un widget intégré à Zoho Creator : même disposition,
mêmes formules, mêmes résultats au cent près.

Trois widgets sortent de ce même dépôt :

| Widget | Dossier de pack | À quoi il sert |
|--------|-----------------|----------------|
| **Soumission** | `widget/canevas` | Chiffrer un travail : matériaux, impression, découpe, finition, prix, proposition client |
| **Bon de travail** | `widget/bontravail` | Transformer une soumission validée en bon de travail |
| **Pointage** | `widget/pointage` | Pointage des heures sur les bons de travail |

## Le point le plus important : le moteur de calcul

Le widget **n'approxime pas** les formules du classeur. Il embarque un évaluateur de
formules Excel (`widget/src/lib/moteur.ts`) qui exécute les **1 322 formules extraites du
classeur** (`widget/src/data/classeur.json`, feuilles S, C, FT et le cache du lien externe
vers l'inventaire).

- 1257 formules sur 1258 reproduisent exactement les valeurs mises en cache par Excel ;
  le seul écart est un libellé de jour de semaine sur une date vide.
- Les références circulaires du classeur sont résolues par itération, comme dans Excel.

**Conséquence pour qui modifie le code : on ne touche pas aux formules.** `moteur.ts` et
`classeur.json` sont la copie conforme du classeur ; les corriger « pour que ça tombe
juste » casse la correspondance avec Excel sans prévenir. Ce qui change, ce sont les
valeurs : elles viennent de Creator (voir plus bas).

Chaque champ de l'écran écrit dans une cellule du classeur. La cartographie champ → cellule
est dans `widget/src/lib/modele.ts`.

## D'où viennent les prix et les taux

Au chargement dans Zoho, le widget lit deux rapports Creator et remplace les valeurs du
snapshot embarqué :

- **`Materiaux_Report`** — la liste des matériaux et leur coût au pi². Un matériau ajouté
  par le client apparaît dans les listes et son prix s'applique directement.
- **`Taux_Calcul_Report`** — les taux horaires, cadences machines et valeurs par défaut.
  Le code d'une ligne est sa position dans le classeur : `INV_8` = ligne 8 de l'inventaire,
  `S_F29` = cellule F29 de la feuille S.

Un taux modifié dans Creator change le calcul sans redéploiement. **Attention au piège :**
un paramètre `S_<cellule>` présent dans `Taux_Calcul` écrase la valeur par défaut embarquée
dans le code. Si une valeur par défaut ne « prend » pas, regarder d'abord ce rapport.

Un troisième rapport, **`Taux_Change`**, donne le taux de conversion US avec une cascade
jour → semaine → mois → standard.

## Démarrer

```bash
cd widget
npm install
npm run dev          # tourne hors Zoho : le service Zoho bascule en mode simulé
```

Hors Zoho, les données viennent des snapshots de `widget/src/data/`. C'est suffisant pour
travailler sur l'interface et le calcul.

## Construire et déployer

```bash
cd widget
npm run build        # tsc -b + vite build + zet pack → canevas/dist/canevas.zip
```

Puis dans Zoho Creator : **Paramètres → Widgets**, modifier le widget visé et téléverser le
zip. Les trois widgets ont chacun leur emplacement et se mettent à jour indépendamment,
même s'ils sortent du même dépôt.

Les deux autres :

```bash
npm run pack:bt         # bontravail/dist/bontravail.zip
npm run pack:pointage   # pointage/dist/pointage.zip
```

`zet` est la ligne de commande des widgets Zoho (`npm i -g zoho-extension-toolkit`).

## Organisation du code

```
widget/src
├── App.tsx              écran de la soumission (le gros morceau)
├── lib/moteur.ts        évaluateur de formules Excel — ne pas modifier
├── lib/modele.ts        cartographie champ ↔ cellule, pseudo-cellules X!
├── data/classeur.json   les 1 322 formules du classeur — ne pas modifier
├── data/                snapshots de repli : matériaux, taux, machines
├── services/            lecture et écriture dans Creator (SDK widget)
├── components/          popups : proposition client, taux, guide, vérifications
├── bt/                  bon de travail
└── pointage/            pointage des heures
```

Les **pseudo-cellules** `X!…` (`X!VENDU`, `X!CONTRAT`, `X!TAUXINV`…) sont des valeurs qui
voyagent avec la soumission sans qu'aucune formule ne les lise : prix vendu décidé à la
main, référence de contrat, champs du document client. C'est le mécanisme à reprendre pour
ajouter une donnée qui n'existe pas dans le classeur.

## Contribuer

```bash
git clone <url-du-dépôt>
git checkout -b ma-modification
# …
git commit
git push -u origin ma-modification
```

Puis ouvrir une pull request. Deux règles de fond :

1. **Ne pas modifier le moteur de calcul** (`moteur.ts`, `classeur.json`) sans en parler.
2. **Ne jamais committer de jeton, de clé ou de mot de passe.** Les secrets vivent dans
   Creator (`Parametres_Integration`), pas dans le code.

Le commentaire de code est en français, comme le reste du projet.
