import type { CampaignStage, OperationId, TalentId } from './types';

export const BRIEFINGS: Partial<
  Record<
    CampaignStage,
    { speaker: string; title: string; lines: string[]; goal: string }
  >
> = {
  docks: {
    speaker: 'VÉNUS',
    title: 'La Dette de Chair',
    lines: [
      'Ton nom a été retiré du registre des vivants solvables. SÔMA garde ton corps en location et ta conscience en garantie.',
      'Aux Docks de Velours, une copie de ton contrat peut prouver que ta dette a été fabriquée. Ramène-la. Nous déciderons ensuite qui tu veux devenir.',
    ],
    goal: 'Rejoindre le registre des licences. E pour interagir. La carte Cortex indique les murs et les objectifs.',
  },
  revocation: {
    speaker: 'SÔMA / VÉNUS',
    title: 'Droit de reprise',
    lines: [
      '« Licence somatique révoquée. Merci de ne pas résister à la restitution de votre enveloppe. »',
      'Ils ont vu la copie. Ta motricité va être coupée. Ma racine clandestine peut rompre leur accès, mais elle doit être injectée depuis le relais au nord.',
    ],
    goal: 'Atteindre la racine avant la fin du compte à rebours. Les menus suspendent le temps.',
  },
  nara: {
    speaker: 'VÉNUS',
    title: 'Une personne, pas une clé',
    lines: [
      'Nara Velvet, trente-deux ans. Courtière du Réseau Velours. Retenue par la Maison d’If pour « dette de continuité ».',
      'Elle connaît les ancres du Collecteur. Elle ne te doit rien. Ouvre sa consignation, puis demande-lui ce qu’elle veut.',
    ],
    goal: 'Pirater la console. L’approche silencieuse et les angles morts évitent des combats.',
  },
  collector: {
    speaker: 'NARA VELVET',
    title: 'Le Comptoir des âmes',
    lines: [
      'Il s’appelle le Collecteur parce que son vrai nom figure encore parmi ses victimes. Chaque ancre conserve une version de lui.',
      'Je viens avec toi, pas derrière toi. Donne-moi une cible ou laisse-moi couper les ancres. On ne sortira pas de cette salle en lui ressemblant.',
    ],
    goal: 'Couper trois ancres puis vaincre Le Collecteur. Cortex : ordres de Nara. Spectre : prise de contrôle des drones.',
  },
  operation: {
    speaker: 'CELLULE NULL',
    title: 'Sortie de Station Zéro',
    lines: [
      'Une concession continue de vendre des consciences que nous pensions libres. Les archives doivent revenir au réseau.',
      'Votre corps a été réparé et ravitaillé. Les installations et les talents de Station Zéro sont actifs. Nara couvre la sortie.',
    ],
    goal: 'Copier les archives, puis revenir au point d’extraction. Une mission répétée renforce légèrement les gardes.',
  },
};

export const TALENTS: { id: TalentId; name: string; description: string }[] = [
  {
    id: 'executor',
    name: 'Exécuteur',
    description: '+8 % aux dégâts des armes par rang.',
  },
  {
    id: 'ghost',
    name: 'Fantôme',
    description: 'Portée de détection ennemie −12 % par rang.',
  },
  {
    id: 'interface',
    name: 'Interface',
    description: '+15 charge et +1 m de portée de possession par rang.',
  },
  { id: 'soma', name: 'Soma', description: '+15 intégrité maximale par rang.' },
  {
    id: 'cybermancy',
    name: 'Cybermancie',
    description: 'Impulsion : coût −3 charge et dégâts +20 % par rang.',
  },
];

export const OPERATIONS: {
  id: OperationId;
  faction: string;
  title: string;
  description: string;
  reward: string;
}[] = [
  {
    id: 'velours',
    faction: 'Réseau Velours',
    title: 'Le quai des copies',
    description:
      'Infiltrer un centre de consignation et extraire les identités mises aux enchères.',
    reward: '160 ferraille · 60 données · 90 crédits',
  },
  {
    id: 'mistral',
    faction: 'Chœur du Mistral',
    title: 'Éteindre les balises',
    description:
      'Récupérer la table des traqueurs somatiques dans un relais de révocation.',
    reward: '210 ferraille · 45 données · 60 crédits',
  },
  {
    id: 'phocee',
    faction: 'Phocée Libre',
    title: 'Convoi sous la Corniche',
    description:
      'Dérober les itinéraires de saisie aux gardes du port, puis regagner le quai.',
    reward: '180 ferraille · 25 données · 140 crédits',
  },
];

export const ENDINGS = {
  free: {
    title: 'Le droit de disparaître',
    choice: 'Publier les clés de révocation',
    text: 'Les clés circulent sur le réseau libre. Des inconnus quittent leurs contrats avant l’aube. SÔMA perd le contrôle des corps, mais personne ne pourra empêcher certains de vendre à nouveau leur liberté. Nara efface le fichier qui vous désigne comme propriétaires. La Cellule NULL ne possédera personne.',
  },
  shelter: {
    title: 'Un lieu pour rester',
    choice: 'Protéger les identités à Station Zéro',
    text: 'Vous refusez la publication qui exposerait les fugitifs. Station Zéro devient un refuge. Chaque arrivée reçoit un lit, un corps réparé et le droit de partir. Le Revenant n’est plus le nom d’une dette : c’est celui de la personne qui ouvre la porte.',
  },
  network: {
    title: 'Des voix sans maître',
    choice: 'Confier les clés à un réseau partagé',
    text: 'VÉNUS partage les clés entre les cellules du port. Aucune conscience ne peut révoquer les autres. Le réseau sera lent, fragile, traversé de disputes. Nara sourit : les désaccords sont enfin une preuve de vie, plutôt qu’un défaut de conformité.',
  },
} as const;
