/* Āyus kitchen — simple Ayurvedic recipes (educational, home kitchen) */
(function (global) {
  'use strict';

  global.AYUS_RECIPES = [
    {
      id: 'ginger-lemon-tea',
      name: 'Ginger–lemon warm water',
      sanskrit: 'Ārdraka pāna',
      time: '5 min',
      serves: '1 cup',
      dosha: ['vata', 'kapha'],
      tags: ['digestion', 'morning', 'daily'],
      emoji: '🍋',
      summary: 'Classic morning kindler for agni — warm, light, and simple.',
      ingredients: [
        '1 cup warm (not boiling) water',
        '3–4 thin slices fresh ginger',
        'Squeeze of lemon (optional)',
        'Pinch of rock salt or honey after cooling slightly (optional)'
      ],
      steps: [
        'Warm the water until comfortably hot.',
        'Add ginger slices and steep 3–5 minutes.',
        'Add lemon if you like; honey only when the drink is warm, not scalding.',
        'Sip slowly on rising or 15 minutes before breakfast.'
      ],
      tip: 'Skip honey for pure Kapha-reducing mornings; use dry ginger powder if fresh is unavailable.'
    },
    {
      id: 'kitchari',
      name: 'Simple kitchari',
      sanskrit: 'Kṛsara',
      time: '35 min',
      serves: '2 bowls',
      dosha: ['vata', 'pitta', 'kapha'],
      tags: ['digestion', 'comfort', 'reset'],
      emoji: '🥣',
      summary: 'The classic reset meal — light, warm, and easy on digestion.',
      ingredients: [
        '½ cup basmati rice, rinsed',
        '½ cup split mung dal, rinsed',
        '4 cups water (adjust for consistency)',
        '1 tsp ghee or oil',
        '½ tsp cumin seeds',
        '½ tsp turmeric',
        'Pinch of hing (asafoetida), optional',
        'Salt to taste',
        'Optional: chopped ginger, carrot, zucchini'
      ],
      steps: [
        'Warm ghee; bloom cumin (and hing) until fragrant.',
        'Add rice, dal, turmeric, salt, optional veggies, and water.',
        'Simmer covered 25–30 minutes until soft and porridge-like.',
        'Rest 5 minutes. Serve warm with a squeeze of lime if desired.'
      ],
      tip: 'For Vāta, keep it moist with more ghee. For Kapha, use less ghee and more spices.'
    },
    {
      id: 'golden-milk',
      name: 'Golden milk (haldi doodh)',
      sanskrit: 'Haridrā dugdha',
      time: '10 min',
      serves: '1 mug',
      dosha: ['vata', 'kapha'],
      tags: ['evening', 'sleep', 'joints'],
      emoji: '🥛',
      summary: 'Evening comfort drink with turmeric — traditional wind-down support.',
      ingredients: [
        '1 cup milk or plant milk',
        '½ tsp turmeric',
        'Pinch black pepper',
        'Pinch ginger powder or fresh grated ginger',
        '½ tsp ghee (optional)',
        'Honey or jaggery to taste (optional, off-heat)'
      ],
      steps: [
        'Warm milk gently — do not boil hard.',
        'Whisk in turmeric, pepper, and ginger.',
        'Simmer 3–5 minutes, stirring.',
        'Finish with ghee; sweeten only after it cools slightly.'
      ],
      tip: 'Pitta types: use less turmeric/pepper and prefer cooler evenings, or skip if heat is high.'
    },
    {
      id: 'cumin-fennel-tea',
      name: 'Cumin–coriander–fennel tea',
      sanskrit: 'CCF tea',
      time: '10 min',
      serves: '2 cups',
      dosha: ['vata', 'pitta', 'kapha'],
      tags: ['digestion', 'bloat', 'after meals'],
      emoji: '🌿',
      summary: 'Gentle three-seed tea for bloating and post-meal ease.',
      ingredients: [
        '½ tsp cumin seeds',
        '½ tsp coriander seeds',
        '½ tsp fennel seeds',
        '2 cups water'
      ],
      steps: [
        'Lightly crush seeds (optional) and add to water.',
        'Bring to a boil, then simmer 5–8 minutes.',
        'Strain and sip warm after meals or mid-afternoon.'
      ],
      tip: 'Brew once and keep in a thermos for the day.'
    },
    {
      id: 'spiced-oats',
      name: 'Cardamom spiced oats',
      sanskrit: 'Yava-odana style',
      time: '15 min',
      serves: '1 bowl',
      dosha: ['vata', 'pitta'],
      tags: ['breakfast', 'energy', 'grounding'],
      emoji: '🌾',
      summary: 'Warm, grounding breakfast — better for Vāta than cold cereal.',
      ingredients: [
        '½ cup rolled oats',
        '1 cup water or milk',
        'Pinch cardamom',
        'Pinch cinnamon',
        '1 tsp ghee or nut butter',
        'Raisins or chopped dates (optional)',
        'Pinch salt'
      ],
      steps: [
        'Simmer oats with liquid, salt, and spices 8–10 minutes.',
        'Stir in ghee and dried fruit.',
        'Serve warm — not ice-cold from the fridge.'
      ],
      tip: 'Kapha mornings: use water, less sweet fruit, and a dash of dry ginger.'
    },
    {
      id: 'cooling-raita',
      name: 'Cucumber mint raita',
      sanskrit: 'Takra-style cooling',
      time: '10 min',
      serves: '2 sides',
      dosha: ['pitta'],
      tags: ['cooling', 'summer', 'side'],
      emoji: '🥒',
      summary: 'Cooling side for hot days and Pitta aggravation — keep portions modest.',
      ingredients: [
        '1 cup plain yogurt (or dairy-free alternative)',
        '½ cucumber, grated and squeezed',
        'Few mint leaves, chopped',
        'Pinch roasted cumin powder',
        'Pinch salt',
        'Optional: grated carrot'
      ],
      steps: [
        'Whisk yogurt until smooth.',
        'Fold in cucumber, mint, cumin, and salt.',
        'Serve cool (not ice-cold) with warm grains or kitchari.'
      ],
      tip: 'If yogurt feels heavy, thin with a splash of water into a lighter lassi.'
    },
    {
      id: 'tulsi-tea',
      name: 'Tulsi (holy basil) tea',
      sanskrit: 'Tulasī',
      time: '8 min',
      serves: '1–2 cups',
      dosha: ['vata', 'kapha'],
      tags: ['stress', 'immunity', 'breath'],
      emoji: '🍃',
      summary: 'Aromatic leaf tea traditionally used for calm focus and seasonal resilience.',
      ingredients: [
        '1 tsp dried tulsi leaves (or 4–5 fresh leaves)',
        '1½ cups water',
        'Optional: ginger slice, tulsi-honey after cooling'
      ],
      steps: [
        'Bring water to a boil with tulsi (and ginger if using).',
        'Simmer 5 minutes, cover, and steep 2 more.',
        'Strain and sip slowly.'
      ],
      tip: 'Evening: skip strong ginger if sleep is sensitive.'
    },
    {
      id: 'mung-soup',
      name: 'Light mung soup',
      sanskrit: 'Mudga yūṣa',
      time: '30 min',
      serves: '2 bowls',
      dosha: ['vata', 'pitta', 'kapha'],
      tags: ['digestion', 'recovery', 'light dinner'],
      emoji: '🍲',
      summary: 'Brothy mung soup when you want something warm and easy to digest.',
      ingredients: [
        '¾ cup split yellow mung dal, rinsed',
        '4 cups water',
        '1 tsp ghee',
        '½ tsp cumin seeds',
        '½ tsp turmeric',
        '1 tsp grated ginger',
        'Salt, black pepper',
        'Fresh cilantro to finish'
      ],
      steps: [
        'Cook mung in water with turmeric until soft (20–25 min); mash lightly.',
        'In a small pan, warm ghee, bloom cumin and ginger.',
        'Pour tempering into soup; season; finish with cilantro.',
        'Serve warm as a light dinner or recovery meal.'
      ],
      tip: 'Add a squeeze of lime at the table for brightness.'
    }
  ];
})(typeof window !== 'undefined' ? window : this);
