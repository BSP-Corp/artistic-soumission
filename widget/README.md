# Canevas — Widget Zoho Creator « Soumission Matériaux Souples »

Widget qui reproduit le classeur `FT_Soumission Matériaux Souples Rev.06 Master.xlsm` :
même disposition, même code de calcul, habillage Groupe Canva (charbon + orange).

## Comment le calcul fonctionne (important)

Le widget n'approxime PAS les formules : il embarque un **moteur d'évaluation Excel**
(`src/lib/moteur.ts`) qui exécute les **1 322 formules extraites du classeur**
(`src/data/classeur.json` — feuilles S, C, FT + le cache du lien externe `[1]INV`,
c.-à-d. la carte de taux d'InventaireA : 73 $/h, majoration 1,35, cadences machines, etc.).

- Validation : 1257/1258 formules reproduisent exactement les valeurs en cache du xlsm
  (l'unique écart est un libellé de jour de semaine sur une date vide).
- Job d'exemple : Quantité 50 → Montant 512,12 $ → Total 640,15 $ → unitaire 12,803 ✓
- Le calcul itératif (réfs circulaires du classeur) est géré comme dans Excel.

Chaque champ du formulaire écrit dans la cellule d'entrée correspondante
(`src/lib/modele.ts` = cartographie champ → cellule, décodée du xlsm).
La sélection d'un matériau se fait par NOM (comme dans le classeur) ; le prix
au pi² est retrouvé dans le cache INV par les chaînes de formules d'origine.

## Build & déploiement

```
npm install
npm run build        # tsc + vite → canevas/app + zet pack → canevas/dist/canevas.zip
```

Dans Zoho Creator : Paramètres → Widgets → Importer `canevas/dist/canevas.zip`,
puis ajouter le widget dans une Page.

`npm run dev` fonctionne hors Zoho (le service Zoho passe en mode mock).

## Bouton « Enregistrer »

`src/services/zohoService.ts` enregistre la soumission dans le formulaire Creator
`Soumissions` (constante `FORM_SOUMISSIONS` — à créer dans l'app avec les champs :
Client, No_Client, Modele, No_Pce, Quantite, Montant, Total, Prix_Unitaire,
Donnees [multi-ligne]). `Donnees` contient le JSON de toutes les entrées, ce qui
permettra de ré-ouvrir/modifier une soumission.

## Paramétrage vivant depuis Creator (fait — plus de valeurs en dur)

Au chargement dans Zoho, le widget lit deux rapports et écrase les valeurs du
snapshot embarqué (`src/services/zohoService.ts` → `chargerParametres`,
`src/lib/parametres.ts` → `construireParams`) :

- **Materiaux** (`Materiaux_Report`) — liens de champs = colonnes d'InventaireA :
  `BO_Nom`, `BV_Cout_pi2` (le prix lu par le calcul), `BP_Format`, `BQ/BR/BS_…`,
  `BT_Prix_feuille`, `BY_Qte_stock`, etc. Un matériau dont le nom correspond au
  classeur écrase `INV!BV<ligne>` (mapping `src/data/nomVersInv.ts`, généré des
  formules). Un matériau AJOUTÉ par le client apparaît dans les listes (par
  `Categorie`) et son prix s'applique directement à la cellule Coût pi² de la
  ligne où il est choisi.
- **Taux_Calcul** (`Taux_Calcul_Report`) — `Code` = position dans Excel :
  `INV_8` = ligne 8 d'InventaireA (CF = 73 $/h, CH = cadence, CI = temps) → écrase
  `INV!CF8/CH8/CI8`. `S_F29` = cellule F29 de la feuille S (taux guillotine 0,05)
  → valeur par défaut du champ dans « Nouvelle soumission ». Le client modifie
  un taux dans Creator → le calcul suit, sans re-déployer le widget.

Hors Zoho (dev), le widget retombe sur le snapshot embarqué — la barre du haut
affiche la source active. Import initial des données : `../import-api.js` +
CSV dans `../creator-import/`.

## Ce qui reste du classeur d'origine

- Les macros VBA (`vbaProject.bin`) ne participent pas au calcul du prix
  (les 1257 formules suffisent à reproduire tous les résultats) — elles servaient
  à la navigation/impression dans Excel.
- La feuille FT (fiche de travail atelier) est calculée par le moteur mais pas
  affichée ; elle pourra devenir un onglet « Fiche de travail » du widget.
