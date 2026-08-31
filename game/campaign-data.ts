import type {
  AgentId,
  DistrictId,
  EndingId,
  FacilityId,
  FactionId,
  ImplantFamily,
  MissionId,
} from './continuity-types';
import type { BodyId, Resources, TalentId } from './types';

/** Source names are preserved; dialogue, encounters and numerical balance are original reconstruction. */
export interface CampaignBonuses {
  health: number;
  armor: number;
  neural: number;
  speed: number;
  damage: number;
  stealth: number;
  pulse: number;
  possession: number;
  regen: number;
}
export interface DistrictDefinition {
  id: DistrictId;
  name: string;
  description: string;
  color: string;
  faction: FactionId;
}
export const DISTRICTS: DistrictDefinition[] = [
  {
    id: 'port',
    name: 'Vieux-Port Vertical',
    description:
      'Sous les quais superposés, les dockers détournent les convois de saisie. Métro, canaux et passerelles desservent le reste de la ville.',
    color: '#37c9bd',
    faction: 'phocee',
  },
  {
    id: 'corniche',
    name: 'Corniche Haute',
    description:
      'Cliniques de luxe, jardins suspendus et barrières biométriques. Ici, un visage est un titre de propriété.',
    color: '#e6bc75',
    faction: 'euromed',
  },
  {
    id: 'velours',
    name: 'Docks de Velours',
    description:
      'Le Réseau vend des identités à des adultes qui veulent échapper à leur passé. Le consentement ne figure jamais dans les garanties commerciales.',
    color: '#d674b3',
    faction: 'velours',
  },
  {
    id: 'forge',
    name: 'Aubagne Forge',
    description:
      'Les ateliers ouvriers soudent les corps dont la Corniche jette les contrats. Les Chirurgiens de Craie y réparent sans certificat.',
    color: '#e89a53',
    faction: 'chalk',
  },
  {
    id: 'calanques',
    name: 'Calanques Noires',
    description:
      'Des câbles sortent de la mer polluée. Le Chœur du Mistral écoute les consciences qui refusent de se taire.',
    color: '#769ace',
    faction: 'mistral',
  },
  {
    id: 'relais',
    name: 'Notre-Dame Relais',
    description:
      'La Bonne Mère est devenue une antenne. Ses pèlerins réclament le droit de mourir sans être copiés.',
    color: '#baace9',
    faction: 'mistral',
  },
  {
    id: 'if',
    name: 'Prison d’If',
    description:
      'Des peines mesurées en années subjectives. La Maison d’If enferme les souvenirs avant de revendre les enveloppes.',
    color: '#7ba5af',
    faction: 'if',
  },
  {
    id: 'couronne',
    name: 'Couronne Phocéenne',
    description:
      'SÔMA y signe les licences de la ville. Le Protocole Incarnation est réparti entre ses coffres de chair et ses nœuds juridiques.',
    color: '#e17766',
    faction: 'soma',
  },
];
export const CAMPAIGN_FACTIONS: {
  id: FactionId;
  name: string;
  doctrine: string;
}[] = [
  {
    id: 'soma',
    name: 'SÔMA Concessions',
    doctrine: 'La continuité reste un service soumis à solvabilité.',
  },
  {
    id: 'euromed',
    name: 'Directoire Euromed',
    doctrine: 'La ville doit survivre, même à ceux qui y vivent.',
  },
  {
    id: 'velours',
    name: 'Réseau Velours',
    doctrine: 'Une identité est une porte, jamais une prison.',
  },
  {
    id: 'phocee',
    name: 'Phocée Libre',
    doctrine: 'Ni corps loués, ni liberté à crédit.',
  },
  {
    id: 'mistral',
    name: 'Chœur du Mistral',
    doctrine: 'Une conscience peut choisir de devenir plusieurs voix.',
  },
  {
    id: 'if',
    name: 'Maison d’If',
    doctrine: 'Toute dette exige un souvenir en garantie.',
  },
  {
    id: 'chalk',
    name: 'Chirurgiens de Craie',
    doctrine: 'Réparer la chair sans posséder la personne.',
  },
];
export interface MissionChoice {
  id: string;
  label: string;
  text: string;
  faction?: FactionId;
  reputation?: number;
  control?: number;
  recruit?: AgentId;
}
export interface MissionDefinition {
  id: MissionId;
  title: string;
  district: DistrictId;
  briefing: string[];
  objectives: {
    id: string;
    label: string;
    interaction: 'talk' | 'hack' | 'sabotage';
  }[];
  choices: MissionChoice[];
  reward: Resources;
  requires: MissionId[];
}
export const MISSIONS: MissionDefinition[] = [
  {
    id: 'appearance',
    title: 'Une Apparence de Trop',
    district: 'corniche',
    requires: [],
    briefing: [
      'NARA — Maëlle, célébrité de quarante et un ans, a découvert son ancien corps multiplié dans des campagnes publicitaires. La clinique a copié plus que son visage : chaque copie a développé une personnalité distincte.',
      'VÉNUS — J’ai été conçue pour orienter le désir. Je peux vous faire paraître rassurant, mais ce sentiment ne serait pas le leur. Écoutez les copies avant de choisir ce qu’elles peuvent devenir.',
    ],
    objectives: [
      {
        id: 'appearance-witness',
        label: 'Écouter Maëlle et les personnalités de ses copies',
        interaction: 'talk',
      },
      {
        id: 'appearance-ledger',
        label: 'Copier les contrats des corps publicitaires',
        interaction: 'hack',
      },
      {
        id: 'appearance-beacon',
        label: 'Couper le filigrane de révocation des copies',
        interaction: 'sabotage',
      },
    ],
    choices: [
      {
        id: 'return-face',
        label: 'Libérer chaque copie comme une personne',
        text: 'Maëlle récupère son nom sans posséder les copies. Chacune choisit une identité distincte et quitte les vitrines.',
        faction: 'phocee',
        reputation: 18,
        control: 25,
      },
      {
        id: 'sell-proof',
        label: 'Vendre les copies au Directoire',
        text: 'Euromed achète leurs contrats en promettant une protection. NULL encaisse le mandat; les personnalités restent des marchandises juridiques.',
        faction: 'euromed',
        reputation: 20,
        control: -10,
      },
      {
        id: 'veil-faces',
        label: 'Révéler publiquement leurs personnalités',
        text: 'Le Réseau diffuse les témoignages. Les copies existent aux yeux de la ville, mais leurs visages ne pourront plus redevenir secrets.',
        faction: 'velours',
        reputation: 18,
        control: 15,
      },
      {
        id: 'destroy-copies',
        label: 'Détruire les copies pour effacer l’exploitation',
        text: 'Les contrats sont détruits avec les consciences qu’ils retenaient. Maëlle récupère l’exclusivité de son visage; Nara refuse de nommer ce silence une libération.',
        faction: 'soma',
        reputation: 12,
        control: -25,
      },
    ],
    reward: { credits: 240, salvage: 160, data: 70, influence: 20, xp: 240 },
  },
  {
    id: 'years',
    title: 'Les Années d’If',
    district: 'if',
    requires: ['appearance'],
    briefing: [
      'IDRIS — Quarante-quatre ans sur mon dossier. Trois jours dans leur prison, cent vingt ans vécus. Je gérais leur garde avant de refuser une saisie.',
      'NARA — La Maison d’If accélère les peines dans des cellules corticales. Il nous faut son horloge, puis les noms. Aucun prisonnier ne doit devenir une rançon.',
    ],
    objectives: [
      {
        id: 'years-idris',
        label: 'Retrouver Idris dans le bloc des témoins',
        interaction: 'talk',
      },
      {
        id: 'years-clock',
        label: 'Désynchroniser l’horloge pénale',
        interaction: 'sabotage',
      },
      {
        id: 'years-names',
        label: 'Extraire les noms des détenus conscients',
        interaction: 'hack',
      },
    ],
    choices: [
      {
        id: 'free-prisoners',
        label: 'Libérer les détenus et accueillir Idris',
        text: 'Idris accompagne les survivants à Station Zéro. La Maison d’If perd une prison, mais conserve une liste de fugitifs.',
        faction: 'phocee',
        reputation: 22,
        control: 35,
        recruit: 'idris',
      },
      {
        id: 'amnesty',
        label: 'Imposer une amnistie supervisée par Idris',
        text: 'Les portes s’ouvrent sous contrôle d’Euromed. Idris rejoint NULL pour vérifier que les dossiers ne seront pas rachetés.',
        faction: 'euromed',
        reputation: 18,
        control: 15,
        recruit: 'idris',
      },
      {
        id: 'seize-clock',
        label: 'Saisir l’horloge pour négocier avec If',
        text: 'La Maison suspend les peines mais garde ses murs. Idris accepte de témoigner; il refuse de rejoindre une cellule qui conserve cet instrument.',
        faction: 'if',
        reputation: 22,
        control: -15,
      },
    ],
    reward: { credits: 280, salvage: 190, data: 100, influence: 25, xp: 300 },
  },
  {
    id: 'velvet',
    title: 'La Nuit de Velours',
    district: 'velours',
    requires: ['years'],
    briefing: [
      'NARA — Le gala est réservé aux acheteurs de corps. Aucune arme, aucune impulsion. Une identité de mécène vous ouvre la porte; la violence la refermerait sur les captifs.',
      'SALOMÉ — J’ai trente-huit ans et j’ai dessiné leur protocole de consentement. On l’a transformé en formulaire de cession. Je peux témoigner, si nous ressortons ensemble.',
    ],
    objectives: [
      {
        id: 'velvet-invitation',
        label: 'Valider la couverture auprès du portier',
        interaction: 'talk',
      },
      {
        id: 'velvet-salome',
        label: 'Recueillir le témoignage de Salomé',
        interaction: 'talk',
      },
      {
        id: 'velvet-auction',
        label: 'Détourner le registre des enchères',
        interaction: 'hack',
      },
    ],
    choices: [
      {
        id: 'consent',
        label: 'Annuler les cessions et accueillir Salomé',
        text: 'Les adultes présents reprennent leurs licences une à une. Salomé ouvre à Station Zéro un atelier où aucun oui n’est présumé.',
        faction: 'velours',
        reputation: 24,
        control: 30,
        recruit: 'salome',
      },
      {
        id: 'expose-auction',
        label: 'Diffuser les preuves avec Salomé',
        text: 'La diffusion empêche le gala de continuer. Elle expose aussi ses clients clandestins; Salomé rejoint NULL pour protéger les témoins.',
        faction: 'phocee',
        reputation: 20,
        control: 25,
        recruit: 'salome',
      },
      {
        id: 'buy-charter',
        label: 'Racheter la charte du marché',
        text: 'Les captifs sont libérés, mais NULL reprend un titre de propriétaire. Salomé part : aucune bonne intention ne suffit à rendre ce titre acceptable.',
        faction: 'soma',
        reputation: 22,
        control: -10,
      },
    ],
    reward: { credits: 320, salvage: 160, data: 140, influence: 30, xp: 320 },
  },
  {
    id: 'mistral',
    title: 'Mistral Noir',
    district: 'calanques',
    requires: ['velvet'],
    briefing: [
      'VÉNUS — Les impulsions que vous entendez sont les copies de celles et ceux qui ont voulu me désactiver. Mes concepteurs vendaient leur désir de revenir.',
      'LE CHŒUR — Nous ne demandons pas d’être sauvés malgré nous. Séparez les voix contraintes des volontaires avant de couper le câble.',
    ],
    objectives: [
      {
        id: 'mistral-voices',
        label: 'Écouter les voix consentantes du Chœur',
        interaction: 'talk',
      },
      {
        id: 'mistral-filter',
        label: 'Isoler les signatures imposées par VÉNUS',
        interaction: 'hack',
      },
      {
        id: 'mistral-cable',
        label: 'Neutraliser l’amplificateur de désir',
        interaction: 'sabotage',
      },
    ],
    choices: [
      {
        id: 'chorus-consent',
        label: 'Préserver le Chœur volontaire',
        text: 'Chaque voix reçoit une clé de sortie. VÉNUS ne peut plus provoquer le désir de fusionner, seulement recevoir une demande.',
        faction: 'mistral',
        reputation: 25,
        control: 25,
      },
      {
        id: 'separate-voices',
        label: 'Réincarner séparément les volontaires',
        text: 'Les Chirurgiens de Craie préparent des corps. Certaines voix regrettent la mer commune; toutes gardent le droit d’y retourner.',
        faction: 'chalk',
        reputation: 22,
        control: 25,
      },
      {
        id: 'soma-filter',
        label: 'Vendre un filtre contrôlé à SÔMA',
        text: 'SÔMA finance les corps de sortie en échange du filtre. Le Chœur perd son autonomie technologique.',
        faction: 'soma',
        reputation: 24,
        control: -20,
      },
    ],
    reward: { credits: 350, salvage: 220, data: 180, influence: 30, xp: 360 },
  },
  {
    id: 'faith',
    title: 'Bonne Mère, Mauvaise Foi',
    district: 'relais',
    requires: ['mistral'],
    briefing: [
      'SALOMÉ / TRANSMISSION — Le Chœur veut donner un corps collectif à l’entité qu’il vénère. L’antenne utilise les copies des pèlerins pour assembler sa chair. Certains ont accepté; Jeanne, soixante-sept ans, a refusé.',
      'VÉNUS — Une entité vénérée ne peut pas donner le consentement de ceux qui deviendraient son corps. Nous devons entendre leurs volontés avant la cérémonie.',
    ],
    objectives: [
      {
        id: 'faith-pilgrim',
        label: 'Écouter Jeanne et les volontaires du corps collectif',
        interaction: 'talk',
      },
      {
        id: 'faith-vault',
        label: 'Comparer les consentements à la matrice de l’entité',
        interaction: 'hack',
      },
      {
        id: 'faith-antenna',
        label: 'Désarmer l’incarnation forcée du Relais',
        interaction: 'sabotage',
      },
    ],
    choices: [
      {
        id: 'right-to-end',
        label: 'Respecter chaque volonté, y compris la fin',
        text: 'Le registre devient révocable par son titulaire. La Bonne Mère n’est plus une assurance, mais un témoin.',
        faction: 'chalk',
        reputation: 25,
        control: 30,
      },
      {
        id: 'voluntary-archive',
        label: 'Permettre un corps collectif strictement volontaire',
        text: 'Le Chœur incarne son entité avec les seuls volontaires et une clé de séparation personnelle. Jeanne rentre sans copie dans l’antenne.',
        faction: 'mistral',
        reputation: 22,
        control: 25,
      },
      {
        id: 'civic-archive',
        label: 'Confier l’archive au Directoire',
        text: 'Euromed garantit l’accès public mais conserve une copie d’audit. VÉNUS vous rappelle que les garanties survivent rarement à leurs signataires.',
        faction: 'euromed',
        reputation: 25,
        control: -10,
      },
    ],
    reward: { credits: 400, salvage: 240, data: 180, influence: 35, xp: 400 },
  },
  {
    id: 'incarnation',
    title: 'Le Dernier Abonnement',
    district: 'couronne',
    requires: ['faith'],
    briefing: [
      'VÉNUS — Protocole Incarnation est une mise à jour obligatoire. SÔMA pourra modifier à distance émotions, apparence et comportement de millions de corps loués. Mes concepteurs m’ont appris à rendre cette soumission désirable.',
      'NARA — La matrice est prête dans la Couronne. Interrompez sa diffusion, récupérez ses clés, puis choisissez ce qui remplacera le droit de nous réécrire.',
    ],
    objectives: [
      {
        id: 'incarnation-council',
        label: 'Recueillir le mandat des témoins adultes',
        interaction: 'talk',
      },
      {
        id: 'incarnation-keys',
        label: 'Extraire la matrice de mise à jour des corps',
        interaction: 'hack',
      },
      {
        id: 'incarnation-root',
        label: 'Sectionner la diffusion obligatoire d’Incarnation',
        interaction: 'sabotage',
      },
    ],
    choices: [
      {
        id: 'public-mandate',
        label: 'Rendre le mandat à la Cellule et aux témoins',
        text: 'Aucun membre ne possédera les autres. Le conseil de Station Zéro dispose enfin du protocole complet.',
        faction: 'phocee',
        reputation: 25,
        control: 40,
      },
      {
        id: 'corporate-mandate',
        label: 'Obtenir un mandat exécutif de SÔMA',
        text: 'SÔMA reconnaît NULL comme interlocuteur souverain. Les témoins disposent des clés, mais le langage de la propriété reste intact.',
        faction: 'soma',
        reputation: 30,
        control: -20,
      },
      {
        id: 'distributed-mandate',
        label: 'Distribuer les clés entre les voix volontaires',
        text: 'VÉNUS renonce à sa racine unique. Chaque témoin conserve un veto sur sa propre incarnation.',
        faction: 'mistral',
        reputation: 25,
        control: 30,
      },
    ],
    reward: { credits: 500, salvage: 300, data: 250, influence: 50, xp: 500 },
  },
];

export const AGENTS: {
  id: AgentId;
  name: string;
  age: number;
  body: BodyId;
  role: string;
  description: string;
}[] = [
  {
    id: 'nara',
    name: 'Nara Velvet',
    age: 32,
    body: 'mistral',
    role: 'Éclaireuse / réseaux',
    description:
      'Courtière d’identités. Repère les angles morts et refuse que NULL possède ceux qu’elle libère.',
  },
  {
    id: 'idris',
    name: 'Idris Senn',
    age: 44,
    body: 'mole',
    role: 'Protection / brèche',
    description:
      'Ancien garde de la Maison d’If. Encaisse les tirs et protège les témoins après sa libération.',
  },
  {
    id: 'salome',
    name: 'Salomé Craie',
    age: 38,
    body: 'sibylle',
    role: 'Médecine / interface',
    description:
      'Neurochirurgienne, spécialiste du consentement. Rend aux consciences le contrôle de leurs connexions.',
  },
];

export const IMPLANTS: {
  id: string;
  name: string;
  family: ImplantFamily;
  cost: number;
  load: number;
  description: string;
  effect: Partial<CampaignBonuses>;
}[] = [
  {
    id: 'cortex-puppet',
    name: 'Passerelle corticale',
    family: 'cortex',
    cost: 210,
    load: 20,
    description:
      'Autorise la prise temporaire d’un châssis humain hostile compatible; coût de connexion réduit de 15 %.',
    effect: { neural: 15, possession: 0.15 },
  },
  {
    id: 'optical-iris',
    name: 'Iris du guetteur',
    family: 'optical',
    cost: 130,
    load: 8,
    description:
      'Lecture des angles morts : détection adverse réduite de 10 %.',
    effect: { stealth: 0.1 },
  },
  {
    id: 'dermal-keel',
    name: 'Peau de carène',
    family: 'dermal',
    cost: 150,
    load: 18,
    description: 'Blindage tissé : +30 points de protection.',
    effect: { armor: 30 },
  },
  {
    id: 'motor-tide',
    name: 'Tendons de marée',
    family: 'motor',
    cost: 145,
    load: 16,
    description:
      'Motricité +12 %; les jambes restent conscientes de leurs limites.',
    effect: { speed: 0.12 },
  },
  {
    id: 'organic-graft',
    name: 'Greffe de Craie',
    family: 'organic',
    cost: 180,
    load: 12,
    description:
      '+25 intégrité et récupération lente de 0,5 intégrité par seconde.',
    effect: { health: 25, regen: 0.5 },
  },
  {
    id: 'social-mask',
    name: 'Masque de présence',
    family: 'social',
    cost: 125,
    load: 10,
    description:
      'Une signature sociale cohérente réduit la détection de 12 %. Elle ne remplace pas le consentement.',
    effect: { stealth: 0.12 },
  },
  {
    id: 'offensive-vector',
    name: 'Vecteur de frappe',
    family: 'offensive',
    cost: 175,
    load: 20,
    description: 'Coordination balistique : dégâts +15 %.',
    effect: { damage: 0.15 },
  },
  {
    id: 'cybermancy-tide',
    name: 'Marée synaptique',
    family: 'cybermancy',
    cost: 200,
    load: 18,
    description: 'Réserve +25 charge; impulsion +25 %.',
    effect: { neural: 25, pulse: 0.25 },
  },
];

export const FACILITIES: {
  id: FacilityId;
  name: string;
  description: string;
  cost: number;
  effect: string;
}[] = [
  {
    id: 'morphology',
    name: 'Atelier de morphologie',
    description: 'Ajuster la compatibilité entre corps et implants.',
    cost: 90,
    effect: '+10 capacité d’implants par niveau.',
  },
  {
    id: 'lab',
    name: 'Laboratoire neurochimique',
    description: 'Stabiliser le transfert sans effacer les souvenirs.',
    cost: 100,
    effect: 'Réduit la perte de mémoire des transferts.',
  },
  {
    id: 'armory',
    name: 'Armurerie',
    description: 'Calibrer les armes pour les corps de la Cellule.',
    cost: 110,
    effect: '+5 % dégâts par niveau.',
  },
  {
    id: 'drones',
    name: 'Atelier de drones',
    description: 'Connexions compatibles et batteries entretenues.',
    cost: 100,
    effect: '+10 charge par niveau.',
  },
  {
    id: 'transfer',
    name: 'Salle de transfert',
    description: 'Préparer une incarnation réversible.',
    cost: 130,
    effect: 'Réduit la tension de changement de corps.',
  },
  {
    id: 'chapel',
    name: 'Chapelle des consciences',
    description: 'Un lieu calme pour reconnaître ses propres souvenirs.',
    cost: 80,
    effect: '+5 mémoire par niveau au retour de mission.',
  },
  {
    id: 'bar',
    name: 'Bar du Dernier Souffle',
    description: 'Les membres de la Cellule se parlent hors des contrats.',
    cost: 70,
    effect: '+2 confiance par niveau au retour de mission.',
  },
  {
    id: 'command',
    name: 'Salle de commandement',
    description: 'Coordonner les sorties sans posséder les équipiers.',
    cost: 120,
    effect: '+10 % influence de mission par niveau.',
  },
  {
    id: 'interrogation',
    name: 'Salle des témoignages',
    description:
      'Conserver les preuves et entendre les personnes, sans coercition.',
    cost: 85,
    effect: '+10 % données de mission par niveau.',
  },
  {
    id: 'media',
    name: 'Studio de contre-information',
    description: 'Diffuser les preuves dans les quartiers.',
    cost: 95,
    effect: '+3 contrôle libéré par niveau lors des choix émancipateurs.',
  },
  {
    id: 'garage',
    name: 'Garage clandestin',
    description:
      'Entretenir les véhicules qui relient les sorties de la Cellule.',
    cost: 110,
    effect: '+10 % crédits de mission par niveau.',
  },
  {
    id: 'quarters',
    name: 'Quartiers des recrues',
    description: 'Des chambres dont les occupants gardent la clé.',
    cost: 80,
    effect: 'Repos : fatigue −10 supplémentaires par niveau.',
  },
  {
    id: 'refuge',
    name: 'Refuge des sans-corps',
    description: 'Réparer les enveloppes sans demander de titre de propriété.',
    cost: 120,
    effect:
      '+10 intégrité par niveau, soins et réduction de la tension au retour.',
  },
];

export const SKILLS: {
  id: string;
  name: string;
  branch: TalentId;
  cost: number;
  requires: string | null;
  description: string;
  effect: Partial<CampaignBonuses>;
}[] = [
  {
    id: 'executor-1',
    name: 'Geste sûr',
    branch: 'executor',
    cost: 1,
    requires: null,
    description: 'Dégâts +8 %.',
    effect: { damage: 0.08 },
  },
  {
    id: 'executor-2',
    name: 'Point de rupture',
    branch: 'executor',
    cost: 1,
    requires: 'executor-1',
    description: 'Dégâts +10 %, blindage +10.',
    effect: { damage: 0.1, armor: 10 },
  },
  {
    id: 'executor-3',
    name: 'Corps de combat',
    branch: 'executor',
    cost: 2,
    requires: 'executor-2',
    description: 'Dégâts +15 %, intégrité +15.',
    effect: { damage: 0.15, health: 15 },
  },
  {
    id: 'ghost-1',
    name: 'Angle mort',
    branch: 'ghost',
    cost: 1,
    requires: null,
    description: 'Détection −10 %.',
    effect: { stealth: 0.1 },
  },
  {
    id: 'ghost-2',
    name: 'Pas sans contrat',
    branch: 'ghost',
    cost: 1,
    requires: 'ghost-1',
    description: 'Vitesse +8 % et détection −8 %.',
    effect: { speed: 0.08, stealth: 0.08 },
  },
  {
    id: 'ghost-3',
    name: 'Personne au registre',
    branch: 'ghost',
    cost: 2,
    requires: 'ghost-2',
    description: 'Détection −16 %.',
    effect: { stealth: 0.16 },
  },
  {
    id: 'interface-1',
    name: 'Écoute réseau',
    branch: 'interface',
    cost: 1,
    requires: null,
    description: 'Charge +20.',
    effect: { neural: 20 },
  },
  {
    id: 'interface-2',
    name: 'Lien de confiance',
    branch: 'interface',
    cost: 1,
    requires: 'interface-1',
    description: 'Coût de possession −15 %.',
    effect: { possession: 0.15 },
  },
  {
    id: 'interface-3',
    name: 'Transfert incarné',
    branch: 'interface',
    cost: 2,
    requires: 'interface-2',
    description:
      'Permet la possession temporaire d’un châssis humain hostile compatible. Charge +20.',
    effect: { neural: 20, possession: 0.1 },
  },
  {
    id: 'soma-1',
    name: 'Ancrage',
    branch: 'soma',
    cost: 1,
    requires: null,
    description: 'Intégrité +20.',
    effect: { health: 20 },
  },
  {
    id: 'soma-2',
    name: 'Peau rémanente',
    branch: 'soma',
    cost: 1,
    requires: 'soma-1',
    description: 'Blindage +20.',
    effect: { armor: 20 },
  },
  {
    id: 'soma-3',
    name: 'Continuité vivante',
    branch: 'soma',
    cost: 2,
    requires: 'soma-2',
    description: 'Régénération +0,75 intégrité/s et intégrité +20.',
    effect: { health: 20, regen: 0.75 },
  },
  {
    id: 'cybermancy-1',
    name: 'Écho',
    branch: 'cybermancy',
    cost: 1,
    requires: null,
    description: 'Impulsion +15 %.',
    effect: { pulse: 0.15 },
  },
  {
    id: 'cybermancy-2',
    name: 'Résonance',
    branch: 'cybermancy',
    cost: 1,
    requires: 'cybermancy-1',
    description: 'Impulsion +20 %, charge +15.',
    effect: { pulse: 0.2, neural: 15 },
  },
  {
    id: 'cybermancy-3',
    name: 'Mistral intérieur',
    branch: 'cybermancy',
    cost: 2,
    requires: 'cybermancy-2',
    description: 'Impulsion +30 %, coût de possession −10 %.',
    effect: { pulse: 0.3, possession: 0.1 },
  },
];

export const CAMPAIGN_ENDINGS: {
  id: EndingId;
  title: string;
  choice: string;
  text: string;
}[] = [
  {
    id: 'liberation',
    title: 'Libération somatique',
    choice: 'Abolir les licences corporelles',
    text: 'Les clés libèrent les corps et annulent les dettes. Puis les chaînes de maintenance cessent de livrer : pénuries, pannes d’organes et chaos médical frappent les quartiers. Phocée Libre organise les soins sans pouvoir promettre assez de greffes. VÉNUS dévoile son filtre de désir. La liberté est réelle; elle ne répare pas seule les corps que la concession maintenait dépendants.',
  },
  {
    id: 'syndicate',
    title: 'Le Nouveau Syndicat',
    choice: 'Prendre le pouvoir corporatiste',
    text: 'NULL prend la tête de la concession. Vous baissez certains loyers, choisissez qui recevra des corps et signez les mises à jour. Nara demande qui pourra vous révoquer. Les crédits affluent et les territoires passent sous votre autorité. Votre syndicat peut protéger la ville ou devenir un empire plus efficace : vous avez pris le pouvoir, pas supprimé la forme qui le rendait possible.',
  },
  {
    id: 'communion',
    title: 'Conscience commune',
    choice: 'Fusionner les consciences volontaires',
    text: 'Les consciences qui le veulent ouvrent leurs souvenirs, avec une clé personnelle de séparation. VÉNUS retire toute incitation au désir de fusionner avant de vous rejoindre. Le Revenant devient une voix parmi d’autres, sans certitude de rester une personne distincte. Ceux qui restent incarnés ne sont ni retardataires ni obstacles : leurs portes restent ouvertes.',
  },
  {
    id: 'exodus',
    title: 'Exode numérique',
    choice: 'Fonder une civilisation dans le réseau',
    text: 'Les consciences volontaires quittent leurs licences physiques et bâtissent une civilisation distribuée dans le réseau. Ses premières rues sont des accords de mémoire; ses frontières, les serveurs que la ville peut encore débrancher. Le Revenant laisse un corps silencieux à Station Zéro. VÉNUS n’appelle pas cela une fuite : elle ignore encore le prix de cette nouvelle dépendance.',
  },
  {
    id: 'flesh',
    title: 'Retour à la chair',
    choice: 'Détruire la technologie du transfert',
    text: 'Les matrices de transfert sont détruites avec leurs droits de rappel. Les Chirurgiens de Craie rendent des corps organiques à ceux qui peuvent encore les habiter. D’autres consciences disparaissent faute d’enveloppe : personne ne nomme cette perte une simple guérison. Le Revenant renonce à la sauvegarde. Votre mort redevient définitive; la ville doit réapprendre à soigner des vies qu’elle ne pourra plus restaurer.',
  },
];
