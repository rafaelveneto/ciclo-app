/**
 * Short, responsible educational content about the menstrual cycle.
 * Written in plain Portuguese, medically grounded (FIGO/Sensiplan/Billings),
 * and always pointing to a professional for anything concerning.
 */
export interface Article {
  id: string
  emoji: string
  titulo: string
  resumo: string
  conteudo: string[]
}

export const articles: Article[] = [
  {
    id: 'fases',
    emoji: '🔄',
    titulo: 'As 4 fases do seu ciclo',
    resumo: 'Menstrual, folicular, ovulatória e lútea — o que acontece em cada uma.',
    conteudo: [
      'O ciclo menstrual é contado a partir do 1º dia de menstruação e tem, em média, 24 a 38 dias. Ele se divide em quatro fases, comandadas pelos hormônios estrogênio e progesterona.',
      'Menstrual: o revestimento do útero (endométrio) descama, gerando o sangramento. Os hormônios estão baixos, e é comum sentir cansaço e cólicas.',
      'Folicular: vai do fim da menstruação até a ovulação. O estrogênio sobe, os folículos amadurecem no ovário e a energia tende a aumentar. É a fase de duração mais variável.',
      'Ovulatória: o folículo libera o óvulo (ovulação). Há um pico de estrogênio e do hormônio LH, o muco fica tipo clara de ovo e é a janela mais fértil.',
      'Lútea: da ovulação até a próxima menstruação. A progesterona sobe e essa fase dura cerca de 12 a 14 dias — é a parte mais estável do ciclo. Sem gravidez, os hormônios caem e a menstruação volta. A TPM pode aparecer no fim.',
    ],
  },
  {
    id: 'janela-fertil',
    emoji: '🌸',
    titulo: 'Janela fértil e ovulação',
    resumo: 'Por que a fertilidade dura vários dias, não só o dia da ovulação.',
    conteudo: [
      'A ovulação é a liberação do óvulo, que sobrevive cerca de 12 a 24 horas.',
      'Os espermatozoides, porém, podem viver até cerca de 5 dias dentro do corpo. Por isso a janela fértil vai de aproximadamente 5 dias antes da ovulação até 1 dia depois.',
      'A ovulação costuma acontecer cerca de 12 a 14 dias antes da próxima menstruação — e não necessariamente no "meio" do ciclo. Em ciclos irregulares, esse momento varia bastante.',
      'Importante: estimar a janela fértil ajuda a entender o corpo e a planejar uma gravidez, mas sozinha não é um método contraceptivo confiável.',
    ],
  },
  {
    id: 'muco',
    emoji: '💧',
    titulo: 'Muco cervical: o que ele diz',
    resumo: 'Como a secreção muda ao longo do ciclo e sinaliza a fertilidade.',
    conteudo: [
      'O muco cervical muda conforme os hormônios. Logo após a menstruação ele costuma ser seco ou pegajoso.',
      'À medida que o estrogênio sobe, fica cremoso, depois aquoso e, no pico da fertilidade, transparente e elástico — parecido com clara de ovo.',
      'Esse "muco tipo clara de ovo" indica alta fertilidade. O último dia em que ele aparece (o "pico") costuma ficar bem próximo da ovulação.',
      'Observar o muco diariamente é a base do método Billings de percepção da fertilidade.',
    ],
  },
  {
    id: 'tbc',
    emoji: '🌡️',
    titulo: 'Temperatura basal (TBC)',
    resumo: 'Como medir e por que ela confirma a ovulação.',
    conteudo: [
      'A temperatura basal é a do corpo em repouso. Meça ao acordar, antes de levantar da cama, todos os dias no mesmo horário e com o mesmo termômetro.',
      'Depois da ovulação, a progesterona eleva a TBC em cerca de 0,2 a 0,5 °C, e ela permanece mais alta até a menstruação.',
      'Essa subida confirma que a ovulação já ocorreu — ela não prevê a ovulação antes de acontecer. Por isso a TBC é mais útil combinada com a observação do muco.',
      'Muco + temperatura juntos formam o método sintotérmico (como o Sensiplan), o mais completo de percepção da fertilidade.',
    ],
  },
  {
    id: 'tpm',
    emoji: '🌙',
    titulo: 'TPM e TDPM',
    resumo: 'A diferença entre o normal e o que merece ajuda.',
    conteudo: [
      'A TPM (tensão pré-menstrual) reúne sintomas físicos e emocionais que aparecem na fase lútea, nos dias antes da menstruação, e melhoram quando ela chega. Inchaço, irritabilidade, seios sensíveis e desejos por comida são comuns.',
      'O TDPM (transtorno disfórico pré-menstrual) é uma forma grave, com sintomas emocionais intensos — tristeza profunda, ansiedade, irritabilidade — que atrapalham o trabalho, os estudos ou as relações. Não é "frescura".',
      'Se a TPM afeta de verdade a sua vida, procure um profissional de saúde. Há tratamentos que ajudam — você não precisa só "aguentar".',
    ],
  },
  {
    id: 'quando-procurar',
    emoji: '🩺',
    titulo: 'O que é "normal" e quando procurar ajuda',
    resumo: 'Faixas de referência e sinais de alerta.',
    conteudo: [
      'Segundo a FIGO, um ciclo normal dura de 24 a 38 dias, a menstruação dura até 8 dias e a variação entre os ciclos costuma ser de até cerca de 7 a 9 dias.',
      'Vale conversar com um ginecologista se você notar: ciclos muito curtos (menos de 24 dias) ou muito longos (mais de 38), sangramento por mais de 8 dias ou muito intenso (trocar o absorvente a cada 1–2 horas), dor que te impede de fazer as coisas, sangramento fora do período ou ausência de menstruação.',
      'Esses sinais não significam, sozinhos, que há uma doença — mas merecem uma avaliação. Conhecer o seu padrão ajuda você e o seu médico.',
      'Este app é informativo e não substitui a consulta com um profissional de saúde.',
    ],
  },
]
