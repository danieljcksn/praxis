export const EXTREME_MODE = {
  title: "Modo extremo",
  intro:
    "O máximo que dá para espremer naturalmente neste prazo. Ele não aumenta o teto biológico: ele te coloca no topo da faixa em vez do meio. Comer mais do que o plano manda não entra aqui, porque acima do superávit prescrito o excedente vira gordura.",
  ceiling:
    "Melhor cenário realista em 20 semanas, para quem já é magro o bastante para comer acima da manutenção: 2,5 a 3,5 kg de massa livre de gordura na balança, incluindo 0,5 a 1 kg de água e glicogênio. O impacto visual vem da soma: músculo concentrado em ombros, costas e braços, com a cintura menor.",
  entry: [
    "Entra só depois de 4 semanas seguidas sem nenhuma sessão perdida.",
    "A semana nunca passa de 105 séries, ou 100 em déficit. Quando o mesociclo já tiver somado séries, corte da sessão de domingo até caber.",
    "Nenhum músculo passa do teto semanal da tabela de séries.",
  ],
  rules: [
    "Zero sessão perdida. Uma semana inteira parada custa mais do que qualquer ajuste aqui consegue devolver.",
    "8 horas na cama todas as noites.",
    "Zero álcool até a data.",
    "Toda comida pesada e registrada, todos os dias, inclusive fim de semana.",
    "Proteína batida 7 dias por semana.",
    "Última série de todo exercício seguro levada até a falha técnica. Agachamento, dobradiças e remadas livres continuam fora disso.",
  ],
  stop: [
    "Sono médio abaixo de 7 horas, energia em 2 ou menos por 7 dias, ou duas âncoras caindo: a sessão de domingo sai primeiro.",
    "Dor em lombar ou ombro: a sessão sai, e a dor é avaliada antes de voltar.",
  ],
  session: {
    name: "Domingo: ombro, peito alto e braços",
    minutes: 40,
    note: "A corrida de domingo fica opcional. Quinta continua sem musculação.",
    exercises: [
      { name: "Elevação lateral no cabo", hevyName: "Lateral Raise (Cable)", sets: 4, reps: "12-20", rir: "0-1", rest: 75 },
      { name: "Supino inclinado na máquina", hevyName: "Incline Chest Press (Machine)", sets: 3, reps: "8-12", rir: "1", rest: 120 },
      { name: "Crucifixo inverso na máquina", hevyName: "Rear Delt Reverse Fly (Machine)", sets: 2, reps: "12-20", rir: "0-1", rest: 75 },
      { name: "Rosca inclinada sentado", hevyName: "Seated Incline Curl (Dumbbell)", sets: 3, reps: "10-15", rir: "1", rest: 90 },
      { name: "Extensão de tríceps acima da cabeça no cabo", hevyName: "Overhead Triceps Extension (Cable)", sets: 3, reps: "10-15", rir: "1", rest: 90 },
    ],
  },
};
