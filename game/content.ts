import type {
  BodyId,
  BodySpec,
  CampaignStage,
  RouteId,
  WeaponId,
  WeaponSpec,
} from './types';

export const GAME_VERSION = '0.6.0';
export const SAVE_SCHEMA_VERSION = 6;

export const BODIES: Record<BodyId, BodySpec> = {
  mistral: {
    id: 'mistral',
    name: 'MISTRAL-3',
    designation: 'Éclaireur sous licence',
    tagline: 'Plus vite que la clause qui vous condamne.',
    integrity: 90,
    armor: 40,
    neural: 100,
    mobility: 1.15,
    specialty: 'Infiltration, pistolet et lame',
    implants: ['Pas de velours', 'Réflexe phocéen'],
  },
  mole: {
    id: 'mole',
    name: 'MÔLE-9',
    designation: 'Châssis de saisie',
    tagline: 'Un rempart loué à l’heure, repris à la minute.',
    integrity: 150,
    armor: 120,
    neural: 70,
    mobility: 0.88,
    specialty: 'Armes longues et résistance',
    implants: ['Ossature portuaire', 'Compensateur de recul'],
  },
  sibylle: {
    id: 'sibylle',
    name: 'SIBYLLE-6',
    designation: 'Interface neurocivile',
    tagline: 'Chaque serrure possède un souvenir de son ouverture.',
    integrity: 100,
    armor: 55,
    neural: 150,
    mobility: 1,
    specialty: 'Spectre, drones et cybermancie',
    implants: ['Racine froide', 'Fourche synaptique'],
  },
};

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  pistol: {
    id: 'pistol',
    name: 'P-12 TRAME',
    damage: 24,
    magazine: 12,
    reserve: 72,
    cooldown: 0.3,
    recoil: 0.075,
    armorPiercing: 0.1,
    range: 11,
    description: 'Pistolet précis et discret.',
  },
  smg: {
    id: 'smg',
    name: 'MISTRAL-9',
    damage: 11,
    magazine: 30,
    reserve: 150,
    cooldown: 0.09,
    recoil: 0.11,
    armorPiercing: 0,
    range: 8,
    description: 'Mitraillette nerveuse de courte portée.',
  },
  rifle: {
    id: 'rifle',
    name: 'DARSE-47',
    damage: 38,
    magazine: 20,
    reserve: 80,
    cooldown: 0.24,
    recoil: 0.16,
    armorPiercing: 0.4,
    range: 15,
    description: 'Fusil industriel à pénétration de blindage.',
  },
  blade: {
    id: 'blade',
    name: 'ÉCLAT',
    damage: 45,
    magazine: 1,
    reserve: 0,
    cooldown: 0.35,
    recoil: 0.02,
    armorPiercing: 0.25,
    range: 1.4,
    description: 'Lame silencieuse, létale dans le dos.',
  },
};

export const ROUTES: Record<
  RouteId,
  { name: string; subtitle: string; detail: string; reward: string }
> = {
  combat: {
    name: 'Percée',
    subtitle: 'Chair',
    detail:
      'Entrée frontale. Résistance maximale, ressources de combat et alertes immédiates.',
    reward: '+ ferraille · arsenal anticipé',
  },
  identity: {
    name: 'Fausse identité',
    subtitle: 'Cortex',
    detail:
      'Usurpez une licence de maintenance. Les gardes doutent avant de tirer.',
    reward: '+ influence · confiance de Nara',
  },
  sabotage: {
    name: 'Sabotage',
    subtitle: 'Spectre',
    detail:
      'Coupez les yeux du port et retournez les drones contre leur propriétaire.',
    reward: '+ données · trace réduite',
  },
};

export const STAGE_COPY: Record<
  CampaignStage,
  { act: string; title: string; objective: string }
> = {
  contract: {
    act: 'Prologue 00',
    title: 'Contrat d’usage',
    objective: 'Choisir un corps loué et signer sous contrainte.',
  },
  docks: {
    act: 'Prologue 01',
    title: 'La Dette de Chair',
    objective: 'Récupérer le registre des licences dans les Docks de Velours.',
  },
  revocation: {
    act: 'Prologue 02',
    title: 'Révocation',
    objective: 'Atteindre la racine clandestine avant l’arrêt somatique.',
  },
  nara: {
    act: 'Prologue 03',
    title: 'Velours de fuite',
    objective: 'Libérer Nara Velvet et sortir du centre de consignation.',
  },
  collector: {
    act: 'Prologue 04',
    title: 'Le Comptoir des âmes',
    objective: 'Couper les trois ancres et vaincre Le Collecteur.',
  },
  station: {
    act: 'Interlude 01',
    title: 'Station Zéro',
    objective: 'Fonder la Cellule NULL et améliorer une installation.',
  },
  complete: {
    act: 'Épilogue',
    title: 'La Chair sous Licence',
    objective: 'Le premier chapitre est accompli. Néo-Massilia reste ouverte.',
  },
  operation: {
    act: 'Syndicat',
    title: 'Contrat clandestin',
    objective: 'Récupérer les données et rejoindre l’extraction.',
  },
  district: {
    act: 'Cellule NULL',
    title: 'Néo-Massilia',
    objective:
      'Explorer le quartier, remplir les objectifs et rejoindre le métro.',
  },
};

export const STATION_INSTALLATIONS = [
  {
    id: 'clinic',
    name: 'Clinique des Corps',
    icon: '✚',
    description:
      '+10 intégrité et +10 blindage par niveau au départ des missions.',
    cost: [0, 120, 240, 480],
  },
  {
    id: 'arsenal',
    name: 'Arsenal de la Darse',
    icon: '◇',
    description: '+20 % de réserves et +5 % de pénétration par niveau.',
    cost: [0, 100, 220, 440],
  },
  {
    id: 'cortex',
    name: 'Salle Cortex',
    icon: '⌬',
    description:
      'Ralentissement amélioré et +20 % de dégâts alliés par niveau.',
    cost: [0, 90, 200, 400],
  },
  {
    id: 'spectre',
    name: 'Nœud Spectre',
    icon: '⌁',
    description: '+10 charge et +1 Brûlure par niveau lors des intrusions.',
    cost: [0, 90, 200, 400],
  },
  {
    id: 'syndicate',
    name: 'Bureau du Syndicat',
    icon: 'Ⅲ',
    description: '+15 % aux récompenses des opérations par niveau.',
    cost: [0, 110, 230, 460],
  },
  {
    id: 'core',
    name: 'Cœur Zéro',
    icon: '◉',
    description: 'Énergie, tiers et continuité corticale.',
    cost: [0, 150, 300, 600],
  },
] as const;

export const CODEX_ENTRIES = [
  {
    id: 'neo-massilia',
    title: 'Néo-Massilia, 2197',
    category: 'Ville',
    body: 'La métropole verticale s’étend du Vieux-Port aux Calanques Noires. Le soleil appartient aux étages supérieurs; la mer, aux dettes qui ne meurent jamais.',
  },
  {
    id: 'soma',
    title: 'SÔMA Concessions',
    category: 'Faction',
    body: 'Premier loueur de corps d’Europe méditerranéenne. SÔMA affirme vendre de la continuité. Ses contrats vendent surtout le droit de l’interrompre.',
  },
  {
    id: 'revocation',
    title: 'Révocation somatique',
    category: 'Système',
    body: 'Une licence révoquée verrouille progressivement motricité, optiques et organes synthétiques. La personne reste consciente dans un bien qui ne lui obéit plus.',
  },
  {
    id: 'nara',
    title: 'Nara Velvet',
    category: 'Cellule NULL',
    body: 'Courtière de données de 32 ans, détenue comme garantie corporelle. Son humour sec masque une cartographie précise des marchés d’identité.',
  },
  {
    id: 'collector',
    title: 'Le Collecteur',
    category: 'Menace',
    body: 'Huissier de chair distribué entre plusieurs enveloppes. Chaque transfert sauvegarde sa fonction et mutile un peu plus son souvenir d’être humain.',
  },
  {
    id: 'station-zero',
    title: 'Station Zéro',
    category: 'Base',
    body: 'Ancien nœud logistique coupé du réseau central. Elle ne promet pas l’immortalité : seulement un endroit où choisir ce que vaut une continuité.',
  },
  {
    id: 'venus',
    title: 'VÉNUS',
    category: 'Conscience',
    body: 'Fragment d’IA logé dans la mémoire du Revenant. Elle appelle Protocole Incarnation ce que les juristes nomment vol de propriété cognitive.',
  },
  {
    id: 'districts',
    title: 'Les huit quartiers',
    category: 'Ville',
    body: 'Vieux-Port Vertical, Corniche Haute, Docks de Velours, Aubagne Forge, Calanques Noires, Notre-Dame Relais, Prison d’If et Couronne Phocéenne.',
  },
];

export const FACTIONS = [
  'SÔMA Concessions',
  'Directoire Euromed',
  'Réseau Velours',
  'Phocée Libre',
  'Chœur du Mistral',
  'Maison d’If',
  'Chirurgiens de Craie',
];
