import type { AgentId } from './continuity-types';
import type {
  SocialEncounterDefinition,
  SocialMethod,
  SocialOptionId,
} from './social-types';

export const SOCIAL_EVIDENCE = {
  detentionLedger: 'years-names',
  invitation: 'velvet-invitation',
  auctionRegistry: 'velvet-auction',
  salomeTestimony: 'velvet-salome-testimony',
} as const;

export const SOCIAL_METHOD_LABELS: Record<SocialMethod, string> = {
  cover: 'Couverture',
  negotiate: 'Négociation',
  corruption: 'Corruption',
  blackmail: 'Chantage',
  withdraw: 'Retrait',
};

export const SOCIAL_AGENT_NAMES: Record<AgentId, string> = {
  nara: 'Nara',
  idris: 'Idris',
  salome: 'Salomé',
};

const gateOutcomes: SocialOptionId[] = [
  'gate-cover',
  'gate-negotiate',
  'gate-corruption',
  'gate-blackmail',
];

const brokerOutcomes: SocialOptionId[] = [
  'broker-cover',
  'broker-negotiate',
  'broker-corruption',
  'broker-blackmail',
];

export const SOCIAL_ENCOUNTERS: SocialEncounterDefinition[] = [
  {
    id: 'velvet-gate',
    mission: 'velvet',
    title: 'Le seuil des apparences',
    speaker: 'Portier du gala',
    introduction:
      'Le portier compare votre enveloppe, votre tenue et votre signature sociale. Une couverture ouvre une porte ; elle ne vaut jamais consentement pour ce qui se trouve derrière.',
    options: [
      {
        id: 'gate-cover',
        encounterId: 'velvet-gate',
        method: 'cover',
        label: 'Présenter la couverture corporatiste',
        description:
          'Faire vérifier l’identité préparée. Un châssis militaire MÔLE-9 exige un Masque de présence actif.',
        outcome:
          'Le portier valide la signature et rend une invitation temporaire.',
        requirements: [
          {
            kind: 'profile',
            profile: 'credible-corporate-gala',
            label: 'Couverture corporatiste crédible pour cette enveloppe',
          },
        ],
        cost: {},
        effects: [
          {
            kind: 'evidence',
            evidenceId: SOCIAL_EVIDENCE.invitation,
            operation: 'add',
            text: 'Invitation du gala obtenue.',
          },
          {
            kind: 'faction',
            faction: 'euromed',
            delta: 1,
            text: 'Le Directoire reconnaît une identité conforme.',
          },
        ],
        reactions: [
          {
            agent: 'nara',
            trustDelta: 1,
            text: 'Nara apprécie une couverture qui n’engage aucun témoin.',
          },
        ],
        modifiers: [
          {
            requirements: [
              {
                kind: 'implant',
                id: 'social-mask',
                label: 'Masque de présence équipé',
              },
            ],
            notes: [
              'Le Masque de présence corrige la signature du corps, sans infléchir le consentement ni les décisions d’autrui.',
            ],
            reactions: [
              {
                agent: 'nara',
                trustDelta: -1,
                text: 'Nara exige que le masque reste une couverture, jamais un outil de consentement.',
              },
            ],
          },
        ],
        commits: true,
        consent: 'respected',
      },
      {
        id: 'gate-negotiate',
        encounterId: 'velvet-gate',
        method: 'negotiate',
        label: 'Demander le passage au nom du Réseau',
        description:
          'Nara expose le risque pour les personnes mises aux enchères et demande un accès révocable.',
        outcome:
          'Le portier ouvre le contrôle latéral et consigne que chaque invité peut repartir.',
        requirements: [
          {
            kind: 'trust',
            agent: 'nara',
            minimum: 10,
            label: 'Confiance de Nara : 10 minimum',
          },
        ],
        cost: {},
        effects: [
          {
            kind: 'evidence',
            evidenceId: SOCIAL_EVIDENCE.invitation,
            operation: 'add',
            text: 'Accès révocable au gala obtenu.',
          },
          {
            kind: 'faction',
            faction: 'velours',
            delta: 2,
            text: 'Le Réseau note que NULL a négocié sans acheter le passage.',
          },
        ],
        reactions: [
          {
            agent: 'nara',
            trustDelta: 2,
            relations: { idris: 1 },
            text: 'Nara soutient la demande transparente.',
          },
          {
            agent: 'idris',
            trustDelta: 1,
            text: 'Idris approuve une entrée qui ne met pas les témoins en dette.',
          },
        ],
        commits: true,
        consent: 'respected',
      },
      {
        id: 'gate-corruption',
        encounterId: 'velvet-gate',
        method: 'corruption',
        label: 'Glisser 80 crédits au contrôle',
        description:
          'Acheter le silence administratif du portier. Le paiement ne donne aucun droit sur les invités.',
        outcome:
          'Le contrôle oublie votre passage, mais le Réseau voit circuler l’argent.',
        requirements: [],
        cost: { credits: 80 },
        effects: [
          {
            kind: 'evidence',
            evidenceId: SOCIAL_EVIDENCE.invitation,
            operation: 'add',
            text: 'Invitation non enregistrée obtenue.',
          },
          {
            kind: 'faction',
            faction: 'velours',
            delta: -3,
            text: 'Le Réseau se méfie de la méthode.',
          },
          {
            kind: 'faction',
            faction: 'euromed',
            delta: 1,
            text: 'Un rouage du Directoire profite du paiement.',
          },
        ],
        reactions: [
          {
            agent: 'nara',
            trustDelta: -3,
            relations: { idris: -1 },
            text: 'Nara refuse que la Cellule normalise l’achat des personnes et des accès.',
          },
          {
            agent: 'idris',
            trustDelta: -1,
            text: 'Idris tolère l’urgence, pas l’absence de trace.',
          },
        ],
        commits: true,
        consent: 'respected',
      },
      {
        id: 'gate-blackmail',
        encounterId: 'velvet-gate',
        method: 'blackmail',
        label: 'Opposer le registre de la Maison d’If',
        description:
          'Prouver que le portier a validé des identités détenues illégalement et exiger un passage.',
        outcome:
          'Le portier cède et laisse une trace exploitable par les témoins.',
        requirements: [
          {
            kind: 'evidence',
            id: SOCIAL_EVIDENCE.detentionLedger,
            label: 'Registre des détenus conscients',
          },
        ],
        cost: {},
        effects: [
          {
            kind: 'evidence',
            evidenceId: SOCIAL_EVIDENCE.invitation,
            operation: 'add',
            text: 'Invitation obtenue sous contrainte documentaire.',
          },
          {
            kind: 'faction',
            faction: 'euromed',
            delta: -4,
            text: 'Le Directoire perd le contrôle du registre.',
          },
          {
            kind: 'faction',
            faction: 'velours',
            delta: 1,
            text: 'Le Réseau récupère une preuve supplémentaire.',
          },
        ],
        reactions: [
          {
            agent: 'nara',
            trustDelta: -1,
            text: 'Nara accepte la preuve, mais surveille l’usage de la contrainte.',
          },
          {
            agent: 'idris',
            trustDelta: -2,
            text: 'Idris connaît trop bien les dossiers utilisés comme armes.',
          },
        ],
        commits: true,
        consent: 'respected',
      },
      {
        id: 'gate-withdraw',
        encounterId: 'velvet-gate',
        method: 'withdraw',
        label: 'Reculer et revoir la couverture',
        description:
          'Quitter l’échange sans coût et sans verrouiller la rencontre.',
        outcome: 'La Cellule se retire du contrôle sans conséquence.',
        requirements: [],
        cost: {},
        effects: [],
        reactions: [],
        commits: false,
        consent: 'respected',
      },
    ],
  },
  {
    id: 'velvet-broker',
    mission: 'velvet',
    title: 'Le courtier des corps',
    speaker: 'Maître des enchères',
    introduction:
      'Le courtier détient le registre de cession. Il peut coopérer, être acheté ou être confronté à ses propres preuves ; aucune méthode ne rend les personnes vendues disponibles.',
    options: [
      {
        id: 'broker-cover',
        encounterId: 'velvet-broker',
        method: 'cover',
        label: 'Jouer l’acheteur accrédité',
        description:
          'Utiliser l’invitation pour obtenir une copie du catalogue sous prétexte d’audit.',
        outcome:
          'Le courtier remet le registre à une identité qu’il croit solvable.',
        requirements: [
          {
            kind: 'prior-resolution',
            encounterId: 'velvet-gate',
            optionIds: gateOutcomes,
            label: 'Accès au gala résolu',
          },
          {
            kind: 'evidence',
            id: SOCIAL_EVIDENCE.invitation,
            label: 'Invitation du gala',
          },
          {
            kind: 'profile',
            profile: 'credible-velours-buyer',
            label: 'Présentation crédible pour la salle des enchères',
          },
        ],
        cost: {},
        effects: [
          {
            kind: 'evidence',
            evidenceId: SOCIAL_EVIDENCE.auctionRegistry,
            operation: 'add',
            text: 'Registre des enchères copié.',
          },
          {
            kind: 'faction',
            faction: 'soma',
            delta: 2,
            text: 'SÔMA croit encore traiter avec un propriétaire potentiel.',
          },
          {
            kind: 'faction',
            faction: 'velours',
            delta: -1,
            text: 'Le Réseau reste prudent face à cette mise en scène.',
          },
        ],
        reactions: [
          {
            agent: 'nara',
            trustDelta: -2,
            text: 'Nara supporte la couverture, sans accepter son langage de propriété.',
          },
          {
            agent: 'idris',
            trustDelta: -1,
            text: 'Idris attend que les témoins voient la preuve complète.',
          },
        ],
        commits: true,
        consent: 'respected',
      },
      {
        id: 'broker-negotiate',
        encounterId: 'velvet-broker',
        method: 'negotiate',
        label: 'Proposer une déposition protégée',
        description:
          'Offrir au courtier une sortie vérifiable en échange du registre, sans lui promettre l’impunité.',
        outcome:
          'Le courtier remet une copie et accepte de répondre aux témoins sans être détenu.',
        requirements: [
          {
            kind: 'prior-resolution',
            encounterId: 'velvet-gate',
            optionIds: gateOutcomes,
            label: 'Accès au gala résolu',
          },
          {
            kind: 'faction',
            faction: 'velours',
            minimum: 5,
            label: 'Réputation Velours : 5 minimum',
          },
        ],
        cost: {},
        effects: [
          {
            kind: 'evidence',
            evidenceId: SOCIAL_EVIDENCE.auctionRegistry,
            operation: 'add',
            text: 'Registre remis volontairement.',
          },
          {
            kind: 'faction',
            faction: 'velours',
            delta: 3,
            text: 'Le Réseau obtient une déposition exploitable.',
          },
        ],
        reactions: [
          {
            agent: 'nara',
            trustDelta: 3,
            relations: { idris: 1 },
            text: 'Nara approuve une sortie qui ne fabrique pas une nouvelle dette.',
          },
          {
            agent: 'idris',
            trustDelta: 2,
            relations: { nara: 1 },
            text: 'Idris soutient la responsabilité sans disparition forcée.',
          },
        ],
        commits: true,
        consent: 'respected',
      },
      {
        id: 'broker-corruption',
        encounterId: 'velvet-broker',
        method: 'corruption',
        label: 'Acheter le registre pour 140 crédits',
        description:
          'Payer le courtier pour une copie silencieuse. Les personnes inscrites ne deviennent jamais la propriété de NULL.',
        outcome:
          'Le registre change de mains, tandis que le système des enchères reste intact.',
        requirements: [
          {
            kind: 'prior-resolution',
            encounterId: 'velvet-gate',
            optionIds: gateOutcomes,
            label: 'Accès au gala résolu',
          },
        ],
        cost: { credits: 140 },
        effects: [
          {
            kind: 'evidence',
            evidenceId: SOCIAL_EVIDENCE.auctionRegistry,
            operation: 'add',
            text: 'Registre acheté.',
          },
          {
            kind: 'faction',
            faction: 'soma',
            delta: 4,
            text: 'SÔMA enregistre NULL comme acheteur.',
          },
          {
            kind: 'faction',
            faction: 'velours',
            delta: -5,
            text: 'Le Réseau refuse de confondre achat et libération.',
          },
          {
            kind: 'territory',
            district: 'velours',
            controlDelta: -4,
            unrestDelta: 6,
            text: 'Les enchères continuent et la tension monte dans le quartier.',
          },
        ],
        reactions: [
          {
            agent: 'nara',
            trustDelta: -4,
            relations: { idris: -1 },
            text: 'Nara considère le paiement comme une validation du marché.',
          },
          {
            agent: 'idris',
            trustDelta: -2,
            text: 'Idris voit une preuve gagnée, mais aucun témoin protégé.',
          },
        ],
        commits: true,
        consent: 'respected',
      },
      {
        id: 'broker-blackmail',
        encounterId: 'velvet-broker',
        method: 'blackmail',
        label: 'Confronter le courtier au registre d’If',
        description:
          'Relier les enchères aux détentions corticales et exiger sa reddition non létale.',
        outcome:
          'Le courtier se rend. Il doit encore être capturé puis extrait physiquement.',
        requirements: [
          {
            kind: 'prior-resolution',
            encounterId: 'velvet-gate',
            optionIds: gateOutcomes,
            label: 'Accès au gala résolu',
          },
          {
            kind: 'evidence',
            id: SOCIAL_EVIDENCE.detentionLedger,
            label: 'Registre des détenus conscients',
          },
        ],
        cost: {},
        effects: [
          {
            kind: 'evidence',
            evidenceId: SOCIAL_EVIDENCE.auctionRegistry,
            operation: 'add',
            text: 'Registre des enchères saisi.',
          },
          {
            kind: 'capture',
            capture: {
              id: 'velvet-broker',
              label: 'Maître des enchères',
              source: 'velvet',
              status: 'surrendered',
            },
            text: 'Le courtier est rendu ; la capture reste à sécuriser.',
          },
          {
            kind: 'faction',
            faction: 'euromed',
            delta: -3,
            text: 'Le Directoire perd un intermédiaire.',
          },
          {
            kind: 'faction',
            faction: 'velours',
            delta: 2,
            text: 'Le Réseau obtient un responsable vivant.',
          },
        ],
        reactions: [
          {
            agent: 'nara',
            trustDelta: -2,
            text: 'Nara accepte la reddition et refuse toute humiliation du captif.',
          },
          {
            agent: 'idris',
            trustDelta: 1,
            relations: { nara: 1 },
            text: 'Idris approuve une capture vivante et documentée.',
          },
        ],
        commits: true,
        consent: 'respected',
      },
      {
        id: 'broker-withdraw',
        encounterId: 'velvet-broker',
        method: 'withdraw',
        label: 'Quitter la table des enchères',
        description:
          'Suspendre l’échange sans coût et sans choisir pour les témoins.',
        outcome: 'La Cellule reprend ses observations.',
        requirements: [],
        cost: {},
        effects: [],
        reactions: [],
        commits: false,
        consent: 'respected',
      },
    ],
  },
  {
    id: 'velvet-salome',
    mission: 'velvet',
    title: 'Le témoignage de Salomé',
    speaker: 'Salomé Craie',
    introduction:
      'Salomé peut témoigner et rejoindre la sortie. Son accord est révocable : argent, couverture et preuve ne peuvent jamais le remplacer.',
    presentAgents: ['salome'],
    options: [
      {
        id: 'salome-cover',
        encounterId: 'velvet-salome',
        method: 'cover',
        label: 'Révéler la couverture Velours',
        description:
          'Montrer l’identité préparée, puis demander explicitement si Salomé veut confier son témoignage.',
        outcome:
          'Salomé reconnaît la couverture et choisit de remettre une copie révocable.',
        requirements: [
          {
            kind: 'prior-resolution',
            encounterId: 'velvet-broker',
            optionIds: brokerOutcomes,
            label: 'Registre des enchères obtenu',
          },
          {
            kind: 'evidence',
            id: SOCIAL_EVIDENCE.auctionRegistry,
            label: 'Registre des enchères',
          },
          {
            kind: 'presentation',
            anyOf: ['velours'],
            label: 'Présentation Velours choisie',
          },
        ],
        cost: {},
        effects: [
          {
            kind: 'evidence',
            evidenceId: SOCIAL_EVIDENCE.salomeTestimony,
            operation: 'add',
            text: 'Témoignage révocable de Salomé obtenu.',
          },
          {
            kind: 'faction',
            faction: 'velours',
            delta: 3,
            text: 'Le Réseau reconnaît la protection de son protocole.',
          },
        ],
        reactions: [
          {
            agent: 'nara',
            trustDelta: 2,
            relations: { salome: 3 },
            text: 'Nara apprécie que la couverture soit abandonnée avant la demande.',
          },
          {
            agent: 'salome',
            trustDelta: 4,
            relations: { nara: 2 },
            text: 'Salomé choisit de faire confiance à une demande explicite.',
          },
        ],
        modifiers: [
          {
            requirements: [
              {
                kind: 'implant',
                id: 'offensive-vector',
                label: 'Vecteur de frappe équipé',
              },
            ],
            notes: [
              'Salomé remarque l’arme intégrée malgré les scellés du gala.',
            ],
            reactions: [
              {
                agent: 'salome',
                trustDelta: -1,
                text: 'Salomé reste volontaire, mais demande pourquoi une arme intégrée était nécessaire.',
              },
            ],
          },
        ],
        commits: true,
        consent: 'respected',
      },
      {
        id: 'salome-negotiate',
        encounterId: 'velvet-salome',
        method: 'negotiate',
        label: 'Demander un témoignage volontaire',
        description:
          'Présenter le registre, expliquer les risques et laisser Salomé choisir témoignage, silence ou départ.',
        outcome:
          'Salomé remet son protocole et rejoint la sortie de son plein gré.',
        requirements: [
          {
            kind: 'prior-resolution',
            encounterId: 'velvet-broker',
            optionIds: brokerOutcomes,
            label: 'Registre des enchères obtenu',
          },
          {
            kind: 'evidence',
            id: SOCIAL_EVIDENCE.auctionRegistry,
            label: 'Registre des enchères',
          },
        ],
        cost: {},
        effects: [
          {
            kind: 'evidence',
            evidenceId: SOCIAL_EVIDENCE.salomeTestimony,
            operation: 'add',
            text: 'Témoignage volontaire de Salomé obtenu.',
          },
          {
            kind: 'faction',
            faction: 'velours',
            delta: 5,
            text: 'Le Réseau soutient la procédure révocable.',
          },
          {
            kind: 'territory',
            district: 'velours',
            controlDelta: 4,
            unrestDelta: -4,
            text: 'Les témoins disposent d’une voie de sortie vérifiable.',
          },
        ],
        reactions: [
          {
            agent: 'nara',
            trustDelta: 3,
            relations: { salome: 4 },
            text: 'Nara reconnaît une alliance qui ne transforme personne en récompense.',
          },
          {
            agent: 'idris',
            trustDelta: 2,
            relations: { salome: 2 },
            text: 'Idris se porte garant de la sortie des témoins.',
          },
          {
            agent: 'salome',
            trustDelta: 7,
            relations: { nara: 3, idris: 2 },
            text: 'Salomé choisit de coopérer parce que son refus resterait possible.',
          },
        ],
        modifiers: [
          {
            requirements: [
              {
                kind: 'relation',
                from: 'nara',
                to: 'idris',
                minimum: 1,
                label: 'Nara fait confiance à Idris',
              },
              {
                kind: 'relation',
                from: 'idris',
                to: 'nara',
                minimum: 1,
                label: 'Idris fait confiance à Nara',
              },
            ],
            notes: [
              'Nara et Idris coordonnent ensemble la protection des témoins ; Salomé reconnaît une promesse portée par deux personnes.',
            ],
            reactions: [
              {
                agent: 'salome',
                trustDelta: 1,
                text: 'Salomé accorde davantage de confiance à leur engagement mutuel.',
              },
            ],
          },
          {
            requirements: [
              {
                kind: 'implant',
                id: 'offensive-vector',
                label: 'Vecteur de frappe équipé',
              },
            ],
            notes: [
              'L’arme intégrée est visible ; Salomé demande qu’elle demeure sous scellés.',
            ],
            reactions: [
              {
                agent: 'salome',
                trustDelta: -1,
                text: 'Salomé maintient son choix, avec une réserve sur le châssis armé.',
              },
            ],
          },
        ],
        commits: true,
        consent: 'respected',
      },
      {
        id: 'salome-corruption-refused',
        encounterId: 'velvet-salome',
        method: 'corruption',
        label: 'Proposer de payer son accord',
        description:
          'Cette option est affichée pour rendre la limite explicite : un paiement ne peut acheter ni témoignage ni relation.',
        outcome: 'Salomé refuse que son accord devienne une transaction.',
        requirements: [],
        cost: { credits: 1 },
        effects: [],
        reactions: [],
        commits: true,
        consent: 'refused',
        hardBlockedReason:
          'Limite de consentement : aucun montant ne rend cette option disponible.',
      },
      {
        id: 'salome-blackmail-refused',
        encounterId: 'velvet-salome',
        method: 'blackmail',
        label: 'Menacer de publier son identité',
        description:
          'Cette option reste indisponible même avec toutes les preuves : protéger un témoin exclut de retourner son identité contre lui.',
        outcome: 'La Cellule refuse d’utiliser Salomé comme levier.',
        requirements: [],
        cost: {},
        effects: [],
        reactions: [],
        commits: true,
        consent: 'refused',
        hardBlockedReason:
          'Limite de consentement : une preuve ne donne aucun droit sur Salomé.',
      },
      {
        id: 'salome-withdraw',
        encounterId: 'velvet-salome',
        method: 'withdraw',
        label: 'Laisser Salomé réfléchir',
        description:
          'Terminer l’échange sans coût et sans verrouiller sa réponse.',
        outcome:
          'Salomé conserve son témoignage et la Cellule peut revenir plus tard.',
        requirements: [],
        cost: {},
        effects: [],
        reactions: [],
        commits: false,
        consent: 'respected',
      },
    ],
  },
];

export function socialEncounter(id: string): SocialEncounterDefinition | null {
  return SOCIAL_ENCOUNTERS.find((encounter) => encounter.id === id) ?? null;
}
