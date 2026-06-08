/**
 * Educational, forward-looking content per cycle phase — "what to expect".
 *
 * This is general, responsibly-worded information (not a diagnosis). The luteal
 * note intentionally points to seeking a professional for severe symptoms (PMDD).
 */

export type Phase = 'menstrual' | 'folicular' | 'ovulatoria' | 'lutea'

export interface PhaseInfo {
  nome: string
  emoji: string
  resumo: string
  /** Warm, best-friend guidance line for the day. */
  guia: string
  fisicos: string[]
  emocionais: string[]
  alimentacao: string
  movimento: string
  dica: string
}

export const phaseInfo: Record<Phase, PhaseInfo> = {
  menstrual: {
    nome: 'Menstrual',
    emoji: '🩸',
    resumo: 'Seu útero está se renovando. É natural o corpo pedir mais descanso agora.',
    guia: 'Seu corpo está se renovando — vá com calma e capriche no descanso hoje.',
    fisicos: ['Cólicas', 'Cansaço', 'Dor lombar', 'Dor de cabeça', 'Inchaço'],
    emocionais: ['Introspecção', 'Vontade de recolher', 'Sensibilidade', 'Humor mais baixo'],
    alimentacao: 'Alimentos ricos em ferro (folhas verdes, feijão, carne) repõem o que se perde no sangramento. Beba bastante água.',
    movimento: 'Movimentos leves: caminhada, alongamento ou yoga. Respeite seu cansaço.',
    dica: 'Priorize descanso, hidratação e alimentos ricos em ferro. Calor na barriga alivia as cólicas.',
  },
  folicular: {
    nome: 'Folicular',
    emoji: '🌱',
    resumo: 'Os hormônios começam a subir. Energia e disposição tendem a aumentar a cada dia.',
    guia: 'Sua energia está voltando. Ótimo momento pra se movimentar e começar algo novo.',
    fisicos: ['Mais energia', 'Pele mais viçosa', 'Disposição física', 'Libido crescente'],
    emocionais: ['Otimismo', 'Motivação', 'Foco', 'Mais sociável'],
    alimentacao: 'Aposte em proteínas e vegetais frescos para acompanhar a energia que sobe.',
    movimento: 'Boa fase para treinos mais intensos: corrida, musculação, dança.',
    dica: 'Boa fase para exercícios intensos, começar projetos e tomar decisões importantes.',
  },
  ovulatoria: {
    nome: 'Ovulatória',
    emoji: '✨',
    resumo: 'Seu corpo libera o óvulo. É o pico de energia — e o período mais fértil do ciclo.',
    guia: 'Você está no seu auge. Aproveite pra se conectar e fazer o que ama.',
    fisicos: ['Muco tipo clara de ovo', 'Leve dor pélvica de um lado', 'Seios sensíveis', 'Libido alta'],
    emocionais: ['Confiança', 'Energia no auge', 'Comunicativa', 'Bem-estar'],
    alimentacao: 'Fibras e antioxidantes (frutas e vegetais coloridos) ajudam o corpo neste pico hormonal.',
    movimento: 'Energia no auge — aproveite atividades em grupo ou de alta intensidade.',
    dica: 'Tentando engravidar? Esta é a melhor janela. Evitando? Redobre a atenção nestes dias.',
  },
  lutea: {
    nome: 'Lútea',
    emoji: '🌙',
    resumo: 'Depois da ovulação, o corpo se prepara para a menstruação. A TPM pode surgir no fim.',
    guia: 'Hora de desacelerar. Se a TPM aparecer, seja gentil com você mesma.',
    fisicos: ['Inchaço', 'Seios sensíveis', 'Espinhas', 'Desejo por doce ou sal', 'Cansaço'],
    emocionais: ['Irritabilidade', 'Ansiedade', 'Oscilações de humor', 'Vontade de chorar'],
    alimentacao: 'Reduza sal, açúcar e cafeína para aliviar inchaço e TPM. Magnésio (castanhas, banana, cacau) ajuda.',
    movimento: 'Prefira intensidade moderada: pilates, natação, caminhada. Aos poucos, desacelere.',
    dica: 'Reduzir sal, cafeína e açúcar ajuda na TPM, assim como sono regular e magnésio. Se os sintomas forem intensos a ponto de atrapalhar sua rotina, vale conversar com um profissional (pode ser TDPM).',
  },
}

export type PregnancyChance = 'alta' | 'media' | 'baixa'

/** Likelihood of conception today, derived from the fertile window. */
export function pregnancyChance(
  phase: Phase,
  isFertileToday: boolean,
  daysToOvulation: number | null,
): PregnancyChance {
  if (phase === 'ovulatoria') return 'alta'
  if (isFertileToday) {
    if (daysToOvulation != null && Math.abs(daysToOvulation) <= 1) return 'alta'
    return 'media'
  }
  return 'baixa'
}

export const pregnancyChanceLabel: Record<PregnancyChance, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
}
