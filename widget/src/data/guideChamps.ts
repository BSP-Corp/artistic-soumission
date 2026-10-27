// Contenu du popup « Guide des paramètres » — explique en langage simple ce que chaque champ
// calculé représente et où changer un prix ou un taux (dans Administration). Aucun code Excel /
// Creator ici : ce guide s'adresse à qui remplit une soumission, pas à qui configure les taux.
export interface GuideEntree {
  titre: string;
  explication: string;
  exemple?: string;
}

export const GUIDE_ESSENTIEL = [
  {
    titre: "Changer un prix ou un taux",
    points: [
      "Tous les prix, taux horaires, cadences machines et valeurs par défaut se gèrent dans Administration (bouton en haut).",
      "« Paramètres de base » : taux horaires, multiplicateur matériaux, heures disponibles.",
      "« Fournitures de prod. » : coûts des soies, matrices, nettoyage, laser.",
      "« Transport » et « Amortissements » : coûts de livraison et d'équipement.",
      "« Configuration machines » : fiche de chaque machine (taux, cadences, capacités).",
    ],
  },
  {
    titre: "Ajouter ou modifier un matériau",
    points: [
      "Les matériaux (Lexan, Vinyle, Polyester…) viennent d'une liste centrale partagée par tous les utilisateurs.",
      "Si un matériau tapé n'apparaît pas dans la liste, il n'existe pas encore — il doit être ajouté au catalogue avant de pouvoir être choisi.",
      "Le prix affiché (coût au pied carré) vient de ce même catalogue.",
    ],
  },
] as const;

export const CATEGORIES_MATERIAUX = [
  ["Polycarbonate", "Lexan"],
  ["Vinyle", "Vinyle"],
  ["Polyester", "Polyester"],
  ["Aluminium (Foil)", "Alu. Foil"],
  ["ABS / Styrène / Coroplast", "Divers"],
  ["Adhésif / Espaceur", "Adhésif F/R"],
  ["Prémask / Protecteur", "Overlaminating"],
  ["N'importe quel matériau", "Lignes Xtra (catalogue complet)"],
] as const;

export const GUIDE_CHAMPS: GuideEntree[] = [
  {
    titre: "Nb. Mrx — nombre de matrices (feuilles) à produire",
    explication:
      "Combien de feuilles il faut imprimer pour obtenir la quantité demandée, en tenant compte du nombre de pièces par feuille (« Up ») et d'un pourcentage de perte pour les rebuts.",
    exemple: "50 pièces avec 10 % de perte et 4 pièces par feuille → 14 matrices",
  },
  {
    titre: "Coût pi² et Montant — les lignes matériaux (Lexan, Vinyle, Polyester…)",
    explication:
      "Le coût au pied carré vient du prix du matériau choisi. Le montant multiplie ce prix par la surface totale utilisée (matrices × dimensions), en ajoutant la perte de cette ligne et le multiplicateur matières standard.",
  },
  {
    titre: "Temps débitage matériaux",
    explication: "Le temps nécessaire pour découper les feuilles de matériau, basé sur la cadence de la guillotine.",
  },
  {
    titre: "Temps Impression & catégorie Sérigraphie",
    explication:
      "Le temps et le coût de l'impression sérigraphique : montage des soies, séparateurs de couleur, passes additionnelles et fournitures d'impression. Le temps de roulement se calcule à la vitesse de la presse choisie — feuilles × couleurs ÷ vitesse (une passe = une couleur sur une feuille). Sans presse choisie, le classeur applique 250 passes/h. Le montage des soies, le nettoyage et le set-up couleurs ne dépendent PAS de la presse : ils suivent le gabarit de la pièce.",
    exemple: "1375 feuilles, 2 couleurs, Cameo 18 à 220 fle/h → 12,5 h de roulement ; la même job sur la Multiprint (175) → 15,7 h (+25,7 %)",
  },
  {
    titre: "Découpe — hrs/min par opération (Adhésif laminé, Prémask, Slit, Guillotine…)",
    explication: "Chaque opération de découpe a un temps de mise en course fixe, plus un temps de roulage qui dépend de la quantité et de la cadence de la machine utilisée.",
  },
  {
    titre: "Platine & Zund (dies / kiss-cut / embossage)",
    explication:
      "Le temps combine un temps fixe par « die » (matrice de coupe) et un temps par pièce (« up »). L'ajustement Platine/Zund permet de doubler le temps si le travail est plus complexe qu'une passe simple.",
  },
  {
    titre: "Vérification / Comptage & Emballage",
    explication: "Un temps proportionnel à la quantité de pièces, multiplié par un taux par défaut (modifiable dans Administration).",
  },
  {
    titre: "Sous-contrat (Job / Pièces / Pied²)",
    explication: "Le montant payé à un fournisseur externe, majoré d'un pourcentage. Ce montant s'ajoute après la marge, dans le prix final.",
  },
  {
    titre: "Prix final — la cascade complète",
    explication:
      "Le coût de revient additionne toutes les catégories de coûts (matériaux, sérigraphie, découpe, etc.) — il reste visible dans la barre du bas (« Coût »). Le prix vendant applique le Facteur (marge) sur ce coût, puis ajoute le sous-contrat. Le Prix unitaire divise ce prix vendant par la Quantité : c'est la suggestion du moteur. Le Prix US divise le prix unitaire par le taux de change.",
  },
  {
    titre: "Prix vendu (saisie libre)",
    explication:
      "Le prix décidé par le chargé de projet : il peut être égal, supérieur ou inférieur au prix unitaire calculé, et il ne bouge jamais tout seul (changer la quantité ne le recalcule pas). Tant qu'il est vide, la suggestion du moteur s'affiche en grisé. C'est ce prix qui part vers la plateforme du client quand il est renseigné.",
  },
  {
    titre: "Table QTÉ (lignes ajoutables)",
    explication:
      "Chaque ligne recalcule toute la soumission pour une quantité différente, avec les mêmes taux et prix — utile pour comparer des volumes de commande sans changer la soumission principale. La colonne Vendu de chaque ligne est une saisie libre, comme le prix vendu principal.",
  },
  {
    titre: "Vérifier / Valider — les alertes",
    explication:
      "Le bouton « Vérifier » passe la soumission en revue : matériau manquant (adhésif, matériau, coupe, encre → question oui/non ; « Oui » pose le drapeau SANS correspondant et le prix unitaire apparaît), format (la pièce doit tenir dans la feuille, la feuille dans la machine — bloquant), prix à zéro (un fournisseur, un matériau ou une finition renseignés sans prix — bloquant). « Valider » refuse tant qu'il reste une alerte. Les drapeaux SANS ne se cochent plus à la main : ils se posent en répondant « Oui », et se révoquent d'un clic sur ✕.",
  },
  {
    titre: "Prix unitaire caché — « À vérifier avant d'obtenir le prix »",
    explication:
      "Le prix unitaire ne s'affiche qu'une fois toutes les vérifications traitées : on ne donne pas un prix au client sur une fiche incomplète. Cliquez « Vérifier » pour voir ce qui manque (survoler le message donne la raison). Le coût, le montant et le total restent visibles pendant ce temps.",
  },
  {
    titre: "Adhésif laminé / régistre — posés automatiquement",
    explication:
      "Dès qu'un adhésif est choisi, sa forme décide : un adhésif en rouleau active « Adhésif Laminé », un adhésif en feuille active « Adhésif Régistre ». Une ligne sous le champ dit pourquoi ; décocher annule. La forme vient du champ de la fiche matériau s'il existe, sinon des dimensions du nom (une 3e dimension au-delà de 200 po est un rouleau).",
  },
  {
    titre: "Rappel « double-checker » sur grosse soumission",
    explication:
      "Au-delà de 4 000 $ (seuil modifiable dans Taux_Calcul, code APP_SEUIL_DOUBLE_CHECK), la vérification affiche un rappel bleu invitant à faire relire la soumission par un collègue. C'est un rappel, pas un blocage : la validation passe quand même.",
  },
  {
    titre: "Règles matériaux (formulaire Regles_Materiaux dans Creator)",
    explication:
      "Deux tables, une ligne par matériau. « Alerte » pose la question oui/non à la validation ; « Prix » conditionne l'affichage du prix unitaire. Le widget les lit au chargement (bandeau « règles : Creator : n alertes · n prix ») ; sans formulaire, il applique les tables du client (Lexan = encre + adhésif ; les autres = encre ; côté prix, tous exigent encre + dim. pce + matériaux + coupe). Un adhésif = la ligne Adhésif F/R (un Vinyle ne compte pas comme adhésif, contrairement au classeur).",
  },
  {
    titre: "Scénarios de la table QTÉ (● / ○)",
    explication:
      "Chaque ligne est un scénario : une quantité + le prix vendu décidé pour elle. Cliquer ● active le scénario : sa quantité devient la quantité principale et tout se recalcule ; la case « Prix vendu » et le vendu de la ligne active sont la même valeur. Une quantité tapée à la main crée automatiquement sa ligne.",
  },
  {
    titre: "Cases à cocher Cont. (Zund) et Kiss-cut (platine)",
    explication:
      "Ce sont des interrupteurs, pas des quantités : coché = l'opération a lieu. (Avant, taper un nombre comme 4 multipliait la mise en train par 4 et annulait le roulement.) Le nombre de Up vient du champ « Nombre de Up » ; « Cut O » reste le nombre de découpes intérieures par feuille ; « Die » platine reste le nombre de matrices.",
  },
];

export const DEPANNAGE = [
  [
    "Bandeau « snapshot classeur (hors Zoho) »",
    "Le widget n'a pas pu se connecter à Creator — il affiche des valeurs de secours. Réessayer plus tard, ou contacter l'administrateur si ça persiste.",
  ],
  ["Un matériau tapé est refusé", "Le nom n'existe pas dans le catalogue — choisir un matériau existant dans la liste, ou demander à l'administrateur de l'ajouter."],
  ["Prix d'un matériau à 0,00 $", "Le prix de ce matériau n'a pas encore été renseigné — à faire dans le catalogue des matériaux."],
  [
    "Prix unitaire à 0,000",
    "Le classeur cache le prix unitaire tant qu'un élément manque (adhésif, matériau, coupe, encre) ou qu'un indicateur dépasse 1. Cliquer « Vérifier » : la liste dit exactement quoi, et répondre « Oui » aux questions débloque le prix.",
  ],
  [
    "Le bon de travail affiche « BSP » ou la pièce 4152464",
    "C'étaient les données du job d'exemple du classeur : le bon de travail démarrait dessus quand la soumission n'avait pas pu être relue. Corrigé — il démarre vierge et signale explicitement une soumission illisible.",
  ],
  ["Un taux modifié ne s'applique pas", "Vérifier que le paramètre a bien été enregistré dans Administration (message de confirmation affiché après modification)."],
  ["D'où vient ce chiffre ?", "Survoler le chiffre gris dans le widget → l'infobulle montre le détail du calcul."],
] as const;
