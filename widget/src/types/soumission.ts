// Types métier du widget Canevas.

/** Matériau du catalogue (extrait d'InventaireA — servira à la future table Zoho Matériaux). */
export interface Materiau {
  nom: string;
  categorie: string;
  epaisseur: number;
  largeur: number;
  longueur: number;
  prixPi2: number;
  unite?: string;
  stock?: number;
  actif?: boolean;
}
