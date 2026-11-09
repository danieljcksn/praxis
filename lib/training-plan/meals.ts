export interface MealTargets {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MealItem {
  food: string;
  amount: string;
}

export interface Meal {
  id: string;
  name: string;
  timing?: string;
  items: MealItem[];
  kcal: number;
  proteinG: number;
}

interface Food {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  source: string;
}

/** Per 100 g. Meat, rice and pasta are raw weights. */
export const FOODS = {
  bife: { name: "Bife", kcal: 157, protein: 24, carbs: 0, fat: 6, source: "TACO, contrafilé sem gordura" },
  frango: { name: "Peito de frango", kcal: 119, protein: 21.5, carbs: 0, fat: 3, source: "TACO" },
  moida: { name: "Carne moída", kcal: 137, protein: 19.4, carbs: 0, fat: 5.9, source: "TACO, acém" },
  // Brands range from about 200 to 460 kcal; this is a mid-range smoked sausage label.
  calabresa: { name: "Calabresa", kcal: 311, protein: 17, carbs: 1.5, fat: 27, source: "rótulo médio" },
  arroz: { name: "Arroz", kcal: 358, protein: 7.2, carbs: 78.8, fat: 0.3, source: "TACO" },
  macarrao: { name: "Macarrão", kcal: 371, protein: 10, carbs: 77.9, fat: 1.3, source: "TACO" },
  feijao: { name: "Feijão cozido", kcal: 76, protein: 4.8, carbs: 13.6, fat: 0.5, source: "TACO" },
  pao: { name: "Pão francês", kcal: 300, protein: 8, carbs: 58.6, fat: 3.1, source: "TACO" },
  banana: { name: "Banana", kcal: 98, protein: 1.3, carbs: 26, fat: 0.1, source: "TACO" },
  // Protein is counted at 80% of a typical label until the batch is trusted.
  whey: { name: "Whey", kcal: 400, protein: 64, carbs: 8, fat: 6, source: "80% do rótulo" },
  oleo: { name: "Óleo ou manteiga para cozinhar", kcal: 884, protein: 0, carbs: 0, fat: 100, source: "TACO" },
} satisfies Record<string, Food>;

type FoodId = keyof typeof FOODS;
type Portion = [FoodId, number];

const PAO_G = 50;
const BANANA_G = 90;
const WHEY_G = 40;
const FEIJAO_G = 150;
const OLEO_MIN_G = 10;
const OLEO_MAX_G = 20;
const MIN_STARCH_G = 50;
/** One 10 g step of rice is about 36 kcal, so a tighter band would never settle. */
const KCAL_TOLERANCE = 40;
/** Processed meat, so it gets a daily ceiling even when the fat budget has room. */
export const CALABRESA_MAX_G = 60;

const round5 = (value: number) => Math.round(value / 5) * 5;
const round10 = (value: number) => Math.round(value / 10) * 10;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const sum = (portions: Portion[], key: "kcal" | "protein" | "carbs" | "fat") =>
  portions.reduce((total, [id, grams]) => total + (FOODS[id][key] * grams) / 100, 0);

function amountOf(id: FoodId, grams: number): string {
  if (id === "pao") {
    const units = Math.round(grams / PAO_G);
    return units === 1 ? "1 unidade" : `${units} unidades`;
  }
  if (id === "banana") return "1 unidade";
  return `${grams} g`;
}

/** Bread, fruit, beans and whey stay in round household amounts; rice and pasta
 *  fill the carbohydrate, meat fills the protein, and calabresa plus cooking fat
 *  spend what is left of the fat budget. */
export function buildDayMenu(targets: MealTargets): Meal[] {
  const paoUnits = clamp(Math.round((targets.carbsG * 0.29) / (FOODS.pao.carbs * (PAO_G / 100))), 2, 4);
  const paoCafe = Math.ceil(paoUnits / 2) * PAO_G;
  const paoLanche = Math.floor(paoUnits / 2) * PAO_G;

  const fixed: Portion[] = [
    ["pao", paoCafe + paoLanche],
    ["banana", BANANA_G * 2],
    ["whey", WHEY_G],
    ["feijao", FEIJAO_G],
  ];
  const starchCarbs = Math.max(0, targets.carbsG - sum(fixed, "carbs"));
  let arroz = round10((starchCarbs * 0.5) / (FOODS.arroz.carbs / 100));
  let macarrao = round10((starchCarbs * 0.5) / (FOODS.macarrao.carbs / 100));
  const base: Portion[] = [...fixed, ["arroz", arroz], ["macarrao", macarrao]];

  const meatsFor = (calabresa: number): [number, number, number] => {
    const needed = Math.max(
      0,
      targets.proteinG - sum(base, "protein") - (FOODS.calabresa.protein * calabresa) / 100,
    );
    return [
      round10((needed * 0.38) / (FOODS.bife.protein / 100)),
      round10((needed * 0.3) / (FOODS.frango.protein / 100)),
      round10((needed * 0.32) / (FOODS.moida.protein / 100)),
    ];
  };

  let calabresa = CALABRESA_MAX_G;
  let oleo = OLEO_MIN_G;
  for (let pass = 0; pass < 2; pass += 1) {
    const [bife, frango, moida] = meatsFor(calabresa);
    const room =
      targets.fatG -
      sum([...base, ["bife", bife], ["frango", frango], ["moida", moida], ["oleo", OLEO_MIN_G]], "fat");
    calabresa = clamp(round10(room / (FOODS.calabresa.fat / 100)), 0, CALABRESA_MAX_G);
    oleo = clamp(
      OLEO_MIN_G + round5(room - (FOODS.calabresa.fat * calabresa) / 100),
      OLEO_MIN_G,
      OLEO_MAX_G,
    );
  }
  const [bife, frango, moida] = meatsFor(calabresa);

  const dayKcal = () =>
    sum(
      [
        ...fixed,
        ["arroz", arroz],
        ["macarrao", macarrao],
        ["bife", bife],
        ["frango", frango],
        ["moida", moida],
        ["calabresa", calabresa],
        ["oleo", oleo],
      ],
      "kcal",
    );
  while (dayKcal() > targets.kcal + KCAL_TOLERANCE && Math.max(arroz, macarrao) > MIN_STARCH_G) {
    if (arroz >= macarrao) arroz -= 10;
    else macarrao -= 10;
  }
  while (dayKcal() < targets.kcal - KCAL_TOLERANCE) {
    if (arroz <= macarrao) arroz += 10;
    else macarrao += 10;
  }

  const meals: { id: string; name: string; timing?: string; portions: Portion[] }[] = [
    {
      id: "cafe",
      name: "Café da manhã",
      portions: [
        ["pao", paoCafe],
        ["whey", WHEY_G],
        ["banana", BANANA_G],
      ],
    },
    {
      id: "almoco",
      name: "Almoço",
      portions: [
        ["bife", bife],
        ["arroz", arroz],
        ["feijao", FEIJAO_G],
        ["oleo", round5(oleo / 2)],
      ],
    },
    {
      id: "lanche",
      name: "Lanche",
      timing: "1 a 3 horas antes do treino",
      portions: [
        ["frango", frango],
        ["pao", paoLanche],
        ["banana", BANANA_G],
      ],
    },
    {
      id: "jantar",
      name: "Jantar",
      timing: "Depois do treino",
      portions: [
        ["moida", moida],
        ["calabresa", calabresa],
        ["macarrao", macarrao],
        ["oleo", oleo - round5(oleo / 2)],
      ],
    },
  ];

  return meals.map(({ portions, ...meal }) => {
    const served = portions.filter(([, grams]) => grams > 0);
    return {
      ...meal,
      items: served.map(([id, grams]) => ({ food: FOODS[id].name, amount: amountOf(id, grams) })),
      kcal: Math.round(sum(served, "kcal")),
      proteinG: Math.round(sum(served, "protein")),
    };
  });
}
