import { useEffect } from "react";

/** Ferme un popup à la touche Échap. Attendu de tout modal — les 4 popups du widget se
 *  fermaient uniquement au clic (bouton × ou fond), ce qui piège l'utilisateur au clavier. */
export function useEchap(onClose: () => void) {
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, [onClose]);
}
