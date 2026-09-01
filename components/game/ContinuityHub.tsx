'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FacilityActionsPanel } from '@/components/game/FacilityActionsPanel';
import { BODIES, ROUTES } from '@/game/content';
import {
  AGENTS,
  DISTRICTS,
  MISSIONS,
  IMPLANTS,
  FACILITIES,
  SKILLS,
  CAMPAIGN_ENDINGS,
} from '@/game/campaign-data';
import {
  availableMissions,
  availableSkillPoints,
  implantCapacity,
  implantLoad,
  restContinuity,
  buyImplant,
  toggleImplant,
  buySkill,
  upgradeFacility,
  changeBody,
  payLease,
  chooseEnding,
} from '@/game/campaign';
import { agentRelationLabel } from '@/game/social';
import type { SaveData, RouteId, BodyId } from '@/game/types';
import type { AgentId, DistrictId, MissionId } from '@/game/continuity-types';

type Tab =
  | 'campaign'
  | 'city'
  | 'body'
  | 'crew'
  | 'station'
  | 'skills'
  | 'journal';
const TABS: { id: Tab; label: string }[] = [
  { id: 'campaign', label: 'Opérations' },
  { id: 'city', label: 'Néo-Massilia' },
  { id: 'body', label: 'Chair & implants' },
  { id: 'crew', label: 'Cellule NULL' },
  { id: 'station', label: 'Station Zéro' },
  { id: 'skills', label: 'Compétences' },
  { id: 'journal', label: 'Journal' },
];
interface Props {
  save: SaveData;
  onChange: (fn: (current: SaveData) => SaveData) => void;
  onTravel: (
    district: DistrictId | 'station',
    mission: MissionId | null,
    approach: RouteId,
  ) => void;
  onLegacy: () => void;
}

export function AgentRelationsSummary({
  save,
  agentId,
}: {
  save: SaveData;
  agentId: AgentId;
}) {
  if (!save.continuity.agents[agentId].recruited) return null;
  const source = AGENTS.find((agent) => agent.id === agentId);
  if (!source) return null;
  const targets = AGENTS.filter(
    (agent) =>
      agent.id !== agentId && save.continuity.agents[agent.id].recruited,
  );
  const labelId = `agent-relations-${agentId}`;

  return (
    <section aria-labelledby={labelId}>
      <p className="muted" id={labelId}>
        Relations de {source.name} vers les autres agents
      </p>
      {targets.length > 0 ? (
        <ul>
          {targets.map((target) => {
            const value =
              save.continuity.agentRelations[agentId]?.[target.id] ?? 0;
            return (
              <li key={target.id}>
                {target.name} : {agentRelationLabel(value)} (
                {value > 0 ? '+' : ''}
                {value})
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">Aucun autre agent recruté.</p>
      )}
    </section>
  );
}

export function ContinuityHub({ save, onChange, onTravel, onLegacy }: Props) {
  const [tab, setTab] = useState<Tab>('campaign');
  const [route, setRoute] = useState<RouteId>('identity');
  const [feedback, setFeedback] = useState('');
  const c = save.continuity;
  const terminal = c.ending === 'flesh' || c.ending === 'exodus';
  const skillPoints = availableSkillPoints(save);
  const load = implantLoad(save);
  const capacity = implantCapacity(save);
  const leasePayment = Math.min(save.resources.credits, c.lease.debt);
  const restCost = c.facilities.refuge > 0 ? 0 : 35;
  const needsRest =
    c.memory < 100 ||
    c.somatic > 0 ||
    AGENTS.some((agent) => c.agents[agent.id].fatigue > 0);
  const available = availableMissions(save);
  const act = (fn: (s: SaveData) => SaveData) =>
    onChange((current) => {
      // A terminal choice cannot be bypassed by an identity field or a stale button.
      if (
        current.continuity.ending === 'flesh' ||
        current.continuity.ending === 'exodus'
      )
        return current;
      return fn(current);
    });
  const travel: Props['onTravel'] = (district, mission, approach) => {
    if (!terminal) onTravel(district, mission, approach);
  };
  const purchase = (fn: (s: SaveData) => SaveData) => {
    if (terminal) return;
    const result = fn(save);
    setFeedback(
      result === save
        ? 'Conditions non remplies : vérifiez les ressources, prérequis et la capacité neurale.'
        : 'Modification appliquée et sauvegardée.',
    );
    act(fn);
  };
  const completed = Object.keys(c.completed).length;
  const ending = CAMPAIGN_ENDINGS.find((e) => e.id === c.ending);
  return (
    <section className="continuity-hub" aria-label="Commandement Cellule NULL">
      <header className="continuity-header">
        <div>
          <p className="eyebrow">Station Zéro · cycle {c.cycle} · 2197</p>
          <h1>
            Votre corps.
            <br />
            <span>Votre décision.</span>
          </h1>
          <p className="muted">
            La dette de chair n’était que le commencement. VÉNUS prévoit nos
            désirs ; le Protocole Incarnation veut les imposer.
          </p>
        </div>
        <div className="continuity-ledger" aria-label="Ressources">
          <span>
            <b>{save.resources.credits}</b> crédits
          </span>
          <span>
            <b>{save.resources.data}</b> données
          </span>
          <span>
            <b>{save.resources.salvage}</b> ferraille
          </span>
          <span>
            <b>{save.resources.influence}</b> influence
          </span>
        </div>
      </header>
      <nav className="continuity-tabs" aria-label="Sections de Station Zéro">
        {TABS.map((t) => (
          <button
            key={t.id}
            aria-pressed={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setFeedback('');
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {feedback && (
        <p className="continuity-feedback" role="status">
          {feedback}
        </p>
      )}
      {terminal && (
        <p className="continuity-feedback" role="status">
          Campagne achevée — consultation uniquement.{' '}
          {c.ending === 'flesh'
            ? 'La technologie du transfert a été détruite : la vie organique choisie ne permet plus de reprendre les expéditions.'
            : 'Votre conscience a rejoint la civilisation numérique : les expéditions corporelles sont closes.'}{' '}
          Votre conclusion, les quartiers, la Cellule et le journal restent
          consultables. Les voyages, transferts et améliorations sont
          désactivés.
        </p>
      )}
      <div className="continuity-content">
        {tab === 'campaign' && (
          <>
            <div className="continuity-section-heading">
              <div>
                <p className="eyebrow">
                  Campagne / {completed} sur {MISSIONS.length} opérations
                </p>
                <h2>Le Protocole Incarnation</h2>
              </div>
              <Button
                variant="outline"
                disabled={terminal}
                onClick={() => travel('station', null, route)}
              >
                Explorer Station Zéro
              </Button>
            </div>
            <p>
              Une opération ne se termine qu’après ses objectifs, votre décision
              et l’extraction. Les choix modifient les alliances, le contrôle
              des quartiers et les recrutements.
            </p>
            <fieldset className="approach-choice" disabled={terminal}>
              <legend>Préparation de l’approche</legend>
              {(['combat', 'identity', 'sabotage'] as RouteId[]).map((id) => (
                <button
                  key={id}
                  aria-pressed={route === id}
                  onClick={() => setRoute(id)}
                >
                  {ROUTES[id].name}
                  <small>{ROUTES[id].detail}</small>
                </button>
              ))}
            </fieldset>
            {ending && (
              <article className="continuity-ending">
                <p className="eyebrow">Conclusion de campagne</p>
                <h2>{ending.title}</h2>
                <p>{ending.text}</p>
                <p className="muted">
                  {terminal
                    ? 'Cette conclusion est définitive. Consultation du parcours uniquement; aucun retour au combat ou au transfert.'
                    : 'L’exploration des quartiers et le développement de Station Zéro restent disponibles. Cette conclusion n’efface pas votre parcours.'}
                </p>
              </article>
            )}
            {c.completed.incarnation && !ending && (
              <article className="continuity-ending">
                <h2>Le dernier propriétaire</h2>
                <p>
                  Le cœur du Protocole est à vous. Personne, pas même VÉNUS, ne
                  choisira à votre place.
                </p>
                <div className="continuity-grid">
                  {CAMPAIGN_ENDINGS.map((e) => (
                    <button
                      className="ending-choice"
                      key={e.id}
                      onClick={() => purchase((s) => chooseEnding(s, e.id))}
                    >
                      <b>{e.title}</b>
                      <span>{e.choice}</span>
                    </button>
                  ))}
                </div>
              </article>
            )}
            <div className="continuity-grid">
              {MISSIONS.map((mission, i) => {
                const done = Boolean(c.completed[mission.id]);
                const unlocked = available.some((m) => m.id === mission.id);
                return (
                  <article
                    className={'continuity-card ' + (done ? 'is-done' : '')}
                    key={mission.id}
                  >
                    <p className="eyebrow">
                      Opération 0{i + 1} ·{' '}
                      {DISTRICTS.find((d) => d.id === mission.district)?.name}
                    </p>
                    <h3>{mission.title}</h3>
                    <p>{mission.briefing[0]}</p>
                    <ul>
                      {mission.objectives.map((o) => (
                        <li key={o.id}>{o.label}</li>
                      ))}
                    </ul>
                    <p className="muted">
                      {done
                        ? 'Terminée · ' +
                          mission.choices.find(
                            (v) => v.id === c.completed[mission.id],
                          )?.label
                        : unlocked
                          ? 'Prête à déployer'
                          : 'Accomplir les opérations précédentes.'}
                    </p>
                    <Button
                      disabled={!unlocked || done || Boolean(ending)}
                      onClick={() =>
                        travel(
                          mission.district,
                          mission.id,
                          mission.id === 'velvet' ? 'identity' : route,
                        )
                      }
                    >
                      {done
                        ? 'Archivée'
                        : mission.id === 'velvet'
                          ? 'Infiltrer sans arme'
                          : 'Préparer le déploiement'}
                    </Button>
                  </article>
                );
              })}
            </div>
          </>
        )}
        {tab === 'city' && (
          <>
            <p className="eyebrow">Réseau de métro clandestin</p>
            <h2>Huit quartiers. Une ville sous licence.</h2>
            <p>
              Déplacez-vous physiquement dans chaque secteur. Les relais de
              concession peuvent être libérés sur place ; leur contrôle soutient
              les opérations futures.
            </p>
            <div className="continuity-grid city-grid">
              {DISTRICTS.map((district, i) => {
                const state = c.territories[district.id];
                return (
                  <article
                    className="continuity-card district-card"
                    key={district.id}
                    style={
                      {
                        '--district-accent': district.color,
                      } as React.CSSProperties
                    }
                  >
                    <span className="district-number">0{i + 1}</span>
                    <h3>{district.name}</h3>
                    <p>{district.description}</p>
                    <label>
                      Contrôle NULL · {state.control}%
                      <progress max={100} value={Math.max(0, state.control)} />
                    </label>
                    <p className="muted">
                      Tension {state.unrest}% ·{' '}
                      {state.liberated
                        ? 'Relais libéré'
                        : c.visited.includes(district.id)
                          ? 'Secteur reconnu'
                          : 'À explorer'}
                    </p>
                    <Button
                      variant="outline"
                      disabled={terminal}
                      onClick={() => travel(district.id, null, route)}
                    >
                      Prendre le métro
                    </Button>
                  </article>
                );
              })}
            </div>
            <h3 className="mt-8">Relations politiques</h3>
            <div className="faction-relations">
              {Object.entries(c.factions).map(([id, value]) => (
                <p key={id}>
                  <span>
                    {
                      (
                        {
                          soma: 'SÔMA Concessions',
                          euromed: 'Directoire Euromed',
                          velours: 'Réseau Velours',
                          phocee: 'Phocée Libre',
                          mistral: 'Chœur du Mistral',
                          if: 'Maison d’If',
                          chalk: 'Chirurgiens de Craie',
                        } as Record<string, string>
                      )[id]
                    }
                  </span>
                  <b>
                    {value > 0 ? '+' : ''}
                    {value}
                  </b>
                </p>
              ))}
            </div>
          </>
        )}
        {tab === 'body' && (
          <>
            <p className="eyebrow">Clinique morphologique</p>
            <h2>La chair n’est pas votre identité.</h2>
            <div className="continuity-metrics">
              <p>
                Continuité mémorielle <b>{c.memory}%</b>
              </p>
              <p>
                Tension somatique <b>{c.somatic}%</b>
              </p>
              <p>
                Dette corporelle <b>{c.lease.debt} crédits</b>
              </p>
              <p>
                Échéance{' '}
                <b>
                  {c.lease.owned ? 'Corps libéré' : c.lease.due + ' sorties'}
                </b>
              </p>
            </div>
            <div className="identity-controls">
              <label>
                Nom choisi
                <input
                  value={c.identity.name}
                  maxLength={32}
                  disabled={terminal}
                  onChange={(e) =>
                    act((s) => ({
                      ...s,
                      continuity: {
                        ...s.continuity,
                        identity: {
                          ...s.continuity.identity,
                          name: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </label>
              <label>
                Présentation sociale
                <select
                  value={c.identity.presentation}
                  disabled={terminal}
                  onChange={(e) =>
                    act((s) => ({
                      ...s,
                      continuity: {
                        ...s.continuity,
                        identity: {
                          ...s.continuity.identity,
                          presentation: e.target
                            .value as typeof c.identity.presentation,
                        },
                      },
                    }))
                  }
                >
                  <option value="neutral">Neutre</option>
                  <option value="corporate">Corporatiste</option>
                  <option value="velours">Velours</option>
                  <option value="worker">Ouvrière</option>
                </select>
              </label>
              <Button
                disabled={terminal || leasePayment <= 0}
                onClick={() => purchase(payLease)}
              >
                {c.lease.debt <= 0
                  ? 'Dette soldée'
                  : `${leasePayment < c.lease.debt ? 'Paiement partiel' : 'Régler la dette'} · ${leasePayment} crédits`}
              </Button>
            </div>
            <div className="continuity-grid">
              {(Object.keys(BODIES) as BodyId[]).map((id) => {
                const targetCapacity = implantCapacity({
                  ...save,
                  campaign: { ...save.campaign, bodyId: id },
                });
                const active = id === save.campaign.bodyId;
                const locked = !save.bodies[id].unlocked;
                const incompatible = load > targetCapacity;
                return (
                  <article key={id} className="continuity-card">
                    <p className="eyebrow">
                      {active
                        ? 'Incarné'
                        : locked
                          ? 'Châssis verrouillé'
                          : 'Châssis disponible'}
                    </p>
                    <h3>{BODIES[id].name}</h3>
                    <p>{BODIES[id].specialty}</p>
                    <p>
                      {BODIES[id].integrity} intégrité · {BODIES[id].armor}{' '}
                      blindage · {BODIES[id].neural} charge
                    </p>
                    <p className="muted">
                      Capacité d’implants : {targetCapacity} · charge équipée :{' '}
                      {load}.
                      {incompatible &&
                        ' Retirez des implants avant ce transfert.'}
                    </p>
                    <Button
                      disabled={terminal || active || locked || incompatible}
                      variant="outline"
                      onClick={() => purchase((s) => changeBody(s, id))}
                    >
                      {active
                        ? 'Corps incarné'
                        : locked
                          ? 'Châssis verrouillé'
                          : incompatible
                            ? 'Capacité insuffisante'
                            : 'Transférer la conscience'}
                    </Button>
                  </article>
                );
              })}
            </div>
            <Button
              variant="outline"
              disabled={
                terminal || !needsRest || save.resources.credits < restCost
              }
              onClick={() => purchase(restContinuity)}
            >
              Soins & repos ·{' '}
              {!needsRest
                ? 'état stabilisé'
                : restCost === 0
                  ? 'offerts par le refuge'
                  : `${restCost} crédits`}
            </Button>
            <h3 className="mt-8">
              Implants / {load} sur {capacity} de capacité
            </h3>
            <p className="muted">
              Chaque implant occupe une famille et une capacité cognitive. Le
              châssis et la clinique limitent la charge équipée. Retirer un
              implant le conserve dans votre inventaire.
            </p>
            <div className="continuity-grid">
              {IMPLANTS.map((implant) => {
                const owned = c.ownedImplants.includes(implant.id),
                  equipped = c.implants.includes(implant.id);
                const capacityBlocked =
                  owned && !equipped && load + implant.load > capacity;
                const creditBlocked =
                  !owned && save.resources.credits < implant.cost;
                return (
                  <article
                    key={implant.id}
                    className={'continuity-card ' + (equipped ? 'is-done' : '')}
                  >
                    <p className="eyebrow">
                      {implant.family} · charge {implant.load}
                    </p>
                    <h3>{implant.name}</h3>
                    <p>{implant.description}</p>
                    {capacityBlocked && (
                      <p className="muted">
                        Capacité insuffisante : {load + implant.load} requis
                        pour {capacity} disponibles. Retirez un implant ou
                        améliorez la morphologie.
                      </p>
                    )}
                    {creditBlocked && (
                      <p className="muted">
                        Il manque {implant.cost - save.resources.credits}{' '}
                        crédits.
                      </p>
                    )}
                    <Button
                      variant={equipped ? 'default' : 'outline'}
                      disabled={terminal || capacityBlocked || creditBlocked}
                      onClick={() =>
                        purchase((s) =>
                          owned
                            ? toggleImplant(s, implant.id)
                            : buyImplant(s, implant.id),
                        )
                      }
                    >
                      {equipped
                        ? 'Retirer'
                        : owned
                          ? capacityBlocked
                            ? 'Capacité insuffisante'
                            : 'Équiper'
                          : 'Acquérir · ' + implant.cost + ' crédits'}
                    </Button>
                  </article>
                );
              })}
            </div>
          </>
        )}
        {tab === 'crew' && (
          <>
            <p className="eyebrow">
              Consciences distinctes / trois agents supplémentaires
            </p>
            <h2>Une cellule, pas des propriétés.</h2>
            <p>
              Les agents recrutés vous accompagnent en mission. En Cortex,
              choisissez un agent puis son ordre ; cliquez sur la carte pour son
              déplacement.
            </p>
            <div className="continuity-grid">
              {AGENTS.map((agent) => {
                const state = c.agents[agent.id];
                return (
                  <article className="continuity-card" key={agent.id}>
                    <p className="eyebrow">
                      {agent.role} · {agent.age} ans
                    </p>
                    <h3>{agent.name}</h3>
                    <p>{agent.description}</p>
                    <p>
                      {state.recruited
                        ? 'Recruté librement'
                        : 'À rencontrer dans la campagne'}
                    </p>
                    <p>
                      Confiance {state.trust} · fatigue {state.fatigue}%
                    </p>
                    <AgentRelationsSummary save={save} agentId={agent.id} />
                    <p>Corps actuel : {BODIES[state.body].name}</p>
                    <p className="muted">
                      La confiance et la fatigue influencent le soutien fourni
                      sur le terrain.
                    </p>
                  </article>
                );
              })}
            </div>
          </>
        )}
        {tab === 'station' && (
          <>
            <div className="continuity-section-heading">
              <div>
                <p className="eyebrow">Un refuge qui grandit</p>
                <h2>Treize installations</h2>
              </div>
              <Button
                disabled={terminal}
                onClick={() => travel('station', null, route)}
              >
                Entrer dans la station
              </Button>
            </div>
            <p>
              Les installations changent les capacités de la cellule, les coûts
              et sa récupération. Les équipements historiques du prologue
              restent accessibles.
            </p>
            <Button
              variant="outline"
              disabled={terminal}
              onClick={() => {
                if (!terminal) onLegacy();
              }}
            >
              Arsenal et équipements du prologue
            </Button>
            <div className="continuity-grid mt-6">
              {FACILITIES.map((f) => {
                const level = c.facilities[f.id];
                const cost = f.cost * (level + 1);
                const unaffordable = save.resources.salvage < cost;
                return (
                  <article className="continuity-card" key={f.id}>
                    <p className="eyebrow">Niveau {level}/3</p>
                    <h3>{f.name}</h3>
                    <p>{f.description}</p>
                    <p className="muted">{f.effect}</p>
                    {level > 0 && (
                      <FacilityActionsPanel
                        save={save}
                        facilityId={f.id}
                        onChange={onChange}
                      />
                    )}
                    {level < 3 && unaffordable && (
                      <p className="muted">
                        Il manque {cost - save.resources.salvage} ferraille.
                      </p>
                    )}
                    <Button
                      disabled={terminal || level >= 3 || unaffordable}
                      variant="outline"
                      onClick={() => purchase((s) => upgradeFacility(s, f.id))}
                    >
                      {level >= 3
                        ? 'Niveau maximal'
                        : `Améliorer · ${cost} ferraille`}
                    </Button>
                  </article>
                );
              })}
            </div>
          </>
        )}
        {tab === 'skills' && (
          <>
            <p className="eyebrow">
              Conscience persistante / {skillPoints} points disponibles
            </p>
            <h2>Apprendre au-delà du corps.</h2>
            <p>
              Un point tous les 200 XP. Les aptitudes restent acquises lors d’un
              transfert. Chaque branche possède des prérequis ; le budget est
              partagé avec les talents du prologue.
            </p>
            <div className="continuity-grid">
              {SKILLS.map((skill) => {
                const learned = c.skills.includes(skill.id),
                  ready = !skill.requires || c.skills.includes(skill.requires);
                return (
                  <article
                    className={'continuity-card ' + (learned ? 'is-done' : '')}
                    key={skill.id}
                  >
                    <p className="eyebrow">{skill.branch}</p>
                    <h3>{skill.name}</h3>
                    <p>{skill.description}</p>
                    {skill.requires && (
                      <p className="muted">
                        Prérequis :{' '}
                        {SKILLS.find((s) => s.id === skill.requires)?.name}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      disabled={
                        terminal ||
                        learned ||
                        !ready ||
                        skillPoints < skill.cost
                      }
                      onClick={() => purchase((s) => buySkill(s, skill.id))}
                    >
                      {learned
                        ? 'Acquis'
                        : `Apprendre · ${skill.cost} point${skill.cost > 1 ? 's' : ''}`}
                    </Button>
                    {!learned && ready && skillPoints < skill.cost && (
                      <p className="muted">
                        Il manque {skill.cost - skillPoints} point
                        {skill.cost - skillPoints > 1 ? 's' : ''}. Gagnez de
                        l’XP en mission.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}
        {tab === 'journal' && (
          <>
            <p className="eyebrow">Continuité mémorielle</p>
            <h2>Ce que nous avons choisi.</h2>
            <p>
              Les décisions et leurs conséquences restent consignées ici. Les
              souvenirs ne sont ni une monnaie ni une preuve de propriété.
            </p>
            <ol className="continuity-journal">
              {[...c.journal].reverse().map((entry, i) => (
                <li key={i}>
                  <span>{String(c.journal.length - i).padStart(2, '0')}</span>
                  <p>{entry}</p>
                </li>
              ))}
            </ol>
            {c.journal.length === 0 && (
              <p>Le journal commencera avec votre première décision.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
