# Captures client C1–C8 — note du 20 novembre 2026

Prises dans Creator, build `2026-11-17 15:30 UTC`, **grain libre** (`APP_MONTAGE_GRAIN_FIGE = 0`).

## La job

C1 à C5 suivent une seule job, de la suggestion jusqu'à l'atelier :

- Client « Démonstration », modèle « Façade de commande FC-940 — Lexan ».
- Pièce de 9 × 4 po, 25 000 pièces, matériaux du catalogue (Lexan Clair, Vinyle Blanc Opaque, Foil 7942, Adhésif 467).
- Point de départ saisi comme le ferait un chargé de projet : **6 up sur une feuille de 12 × 24**.

Soumission `4153107000024137022`, bon de travail **BT-1021**.

| | Avant « Accepter » | Après |
|---|---|---|
| Montage | 6 up · 12 × 24 · 4 584 feuilles | 25 up · 24 × 48 · 1 100 feuilles, pièce tournée de 90° |
| Prix unitaire | 2,94 $ | 2,51 $ |
| Temps | 158 h 37 | 68 h 46 |

C6 et C7 sont prises sur la même job. C6 sélectionne la Cameo 18 no.116, C7 change la pièce
en 10 × 5. Rien n'est enregistré dans ces deux cas. C8 est un panneau de 50 × 70 po (2 000
pièces) qui ne tient sur aucune feuille ; il n'est pas enregistré non plus.

`C5b` montre la seconde moitié du même bon de travail, avec la section Quantités et feuilles.

## Ce qui m'a surpris

1. **Le prix peut monter après « Accepter ».** Mon premier essai partait du point de départ
   de l'Exemple : 4 up sur une feuille de 8 × 9,5, où une pièce de 9 po de large ne tient
   pas. Le coût passait alors de 34 916 $ à 50 179 $. Les chiffres étaient justes : c'était
   le « avant » qui était faux et sous-facturé. Le document doit le dire : **le montage corrige
   le prix dans les deux sens**. Si le point de départ était irréaliste, accepter le montage
   peut faire monter le prix, et c'est une bonne nouvelle. Ce premier essai a laissé une
   soumission et le bon **BT-1020** (soumission `4153107000024137012`) : ils sont à supprimer
   avec les autres données de test.
2. **Une feuille d'écart entre le bloc et NB.MRX.** Le bloc annonce 1 101 feuilles, NB.MRX en
   affiche 1 100. Or 25 000 × 1,1 ÷ 25 = 1 100 exactement. Le bloc arrondit à l'unité
   supérieure un résultat en virgule flottante (1 100,0000000000002). C'est un petit défaut
   réel, visible sur C2 et C4. Il est à corriger avant d'envoyer C2 et C4 au client, ou à
   recadrer.
3. **Le bon de travail ne dit pas que la pièce est tournée.** C4 affiche « pièce tournée de
   90° », mais C5 n'en dit rien : le widget bon de travail ne lit pas encore
   `MONTAGETOURNEE`. Le document ne doit donc pas promettre que l'atelier voit le sens de
   pose, ou bien la correction doit être faite d'ici là.
4. **« Vérifier (1) »** est allumé dans la barre de la job FC-940, sur C1, C3 et C4. Un
   lecteur client posera la question.
