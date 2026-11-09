export const EXTREME_MODE = {
  title: "Modo extremo",
  intro:
    "Este é o plano que está valendo. Ele troca conforto por resultado: o déficit começa mais cedo, o volume sobe até o limite que você consegue recuperar e a rotina não tem folga. Comer além do prescrito continua fora, porque o excedente vira gordura e esconde o músculo que você construiu.",
  ceiling:
    "Com execução completa, em 20 semanas: 4 a 6,5 kg a menos de gordura (o caminho conservador tira 2 a 3,9), 4 a 8 cm a menos de cintura e 1 a 2,5 kg a mais de massa livre de gordura, incluindo 0,5 a 1 kg de água e glicogênio. A balança cai, e o corpo parece maior porque ombros e costas ganham peso visual enquanto a cintura some. O preço: nas semanas de déficit, o ganho de músculo fica perto de zero. A alternativa com prioridade em músculo é ficar em manutenção até o bloco final, com cerca de 2 kg de gordura e 2 cm de cintura a mais no dia.",
  entry: [
    "Começa na semana 1. Nas semanas 1 e 2, faça metade das séries da sessão de domingo, porque é quando o esforço real entra pela primeira vez.",
    "A semana nunca passa de 105 séries, ou 100 em déficit. Quando o mesociclo já tiver somado séries, corte da sessão de domingo até caber.",
    "Nenhum músculo passa do teto semanal da tabela de séries.",
    "O déficit segue a licença do plano: registro, proteína, sessões e sono em dia. Sem isso, coma manutenção e teste de novo no domingo seguinte.",
  ],
  rules: [
    "Zero sessão perdida. Uma semana inteira parada custa mais do que qualquer ajuste aqui consegue devolver.",
    "8 horas na cama todas as noites.",
    "Zero álcool até a data.",
    "Toda comida pesada e registrada, todos os dias, inclusive fim de semana.",
    "Proteína batida 7 dias por semana.",
    "Última série de todo exercício seguro levada até a falha técnica. Agachamento, dobradiças e remadas livres continuam fora disso.",
    "Em déficit, suba os passos até 12.000 antes de cortar comida.",
    "Pague uma sessão com um bom treinador na semana 1 para acertar agachamento e terra romeno. É o jeito mais barato de não perder semanas por dor.",
    "Roupa sob medida com ombro estruturado e cintura ajustada, com a última prova na data do plano.",
  ],
  stop: [
    "Sono médio abaixo de 7 horas, energia em 2 ou menos por 7 dias, ou duas âncoras caindo: a sessão de domingo sai primeiro.",
    "Dor em lombar ou ombro: a sessão sai, e a dor é avaliada antes de voltar.",
  ],
  session: {
    name: "Ombro, peito alto e braços",
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
