// Les deux recettes de référence du cahier des charges, telles qu'on les colle
// dans l'appli. Elles sont préchargées au premier lancement (et servent aux tests).

/** Recette partagée depuis Pizza App (5 boules de 285 g, 20 h au frigo). */
export const TEXTE_PIZZA_APP = `Style de pizza: Napolitaine
N. boule de pâte: 5
Poids boule de pâte: 285 g
Eau: 70%
Sel: 2.5%
Levage à TA: 2 h
TA: 25°C
Levage à CT: 20 h
CT: 4°C

-------------------------

Doses de pâte principales
Farine: 824 g
Eau: 576 g
Sel: 21 g
LBF: 4,34 g`;

/** Napolitaine 48 h au frigo, grille par température de la pièce (levure à compléter). */
export const JSON_48H = `{
  "name": "Napolitaine 48h CT – Caputo Cuoco",
  "style": "neapolitan",
  "oven": {"type": "Ooni", "stone": "biscotto", "temp_c": [430, 450], "bake_seconds": [60, 90]},
  "flour": "Caputo Cuoco",
  "balls": 4,
  "ball_weight_g": 280,
  "hydration_pct": 70,
  "salt_pct": 3,
  "yeast_type": "fresh",
  "target_dough_temp_c": [23, 24],
  "cold_ferment": {"hours": 48, "temp_c": [4, 5]},
  "room_temp_variants": [
    {"room_temp_c": 19, "yeast_pct": null, "water_temp_c": 24, "bulk_hours": 3.0, "final_proof_hours": [4, 5]},
    {"room_temp_c": 22, "yeast_pct": null, "water_temp_c": 20, "bulk_hours": 2.0, "final_proof_hours": [3, 4]},
    {"room_temp_c": 25, "yeast_pct": null, "water_temp_c": 15, "bulk_hours": 1.5, "final_proof_hours": [2, 3]},
    {"room_temp_c": 29, "yeast_pct": null, "water_temp_c": 8, "bulk_hours": 1.0, "final_proof_hours": [1.5, 2]}
  ],
  "steps": ["mix", "bulk_ferment", "divide_and_ball", "cold_ferment", "final_proof", "bake"],
  "notes": "Pourcentages exprimés par rapport à la farine. La remise à température se juge à l'aspect du pâton. yeast_pct = null : valeur à compléter via PizzApp."
}`;
