'use client';

import { useId } from 'react';
import {
  SOCIAL_AGENT_NAMES,
  SOCIAL_METHOD_LABELS,
  socialEncounter,
} from '@/game/social-data';
import { listSocialOptions, resolvedSocialOption } from '@/game/social';
import type { SaveData } from '@/game/types';
import type {
  SocialCost,
  SocialEncounterId,
  SocialOptionId,
  SocialOptionPreview,
} from '@/game/social-types';

export interface SocialEncounterPanelProps {
  save: SaveData;
  encounterId: SocialEncounterId;
  onResolve: (encounterId: SocialEncounterId, optionId: SocialOptionId) => void;
  onClose?: () => void;
}

function costLabel(cost: SocialCost): string | null {
  const parts = [
    cost.credits ? `${cost.credits} crédits` : null,
    cost.data ? `${cost.data} données` : null,
    cost.influence ? `${cost.influence} influence` : null,
  ].filter((part): part is string => part !== null);
  return parts.length ? parts.join(' · ') : null;
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function reactionLabel(preview: SocialOptionPreview): string[] {
  return preview.reactions.map(
    (reaction) =>
      `${SOCIAL_AGENT_NAMES[reaction.agent]} ${signed(reaction.trustDelta)} confiance — ${reaction.text}`,
  );
}

export function SocialEncounterPanel({
  save,
  encounterId,
  onResolve,
  onClose,
}: SocialEncounterPanelProps) {
  const generatedId = useId();
  const encounter = socialEncounter(encounterId);
  if (!encounter)
    return (
      <section role="alert" aria-label="Rencontre sociale indisponible">
        Cette rencontre sociale est inconnue.
      </section>
    );

  const titleId = `${generatedId}-title`;
  const resolved = resolvedSocialOption(save, encounterId);
  const previews = listSocialOptions(save, encounterId);
  return (
    <section
      className="social-encounter-panel"
      aria-labelledby={titleId}
      data-encounter={encounterId}
    >
      {onClose && (
        <div className="social-encounter-toolbar">
          <button
            type="button"
            aria-label="Fermer la rencontre sociale"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
      )}
      <header>
        <p className="eyebrow">Interaction sociale déterministe</p>
        <h2 id={titleId}>{encounter.title}</h2>
        <p>
          <strong>{encounter.speaker}</strong> — {encounter.introduction}
        </p>
        <p className="muted">
          Aucun jet aléatoire. Les coûts et conséquences connus sont affichés
          avant confirmation. Une couverture ne remplace jamais le consentement.
        </p>
      </header>

      {resolved && (
        <p className="continuity-feedback" role="status" aria-live="polite">
          Rencontre résolue :{' '}
          {encounter.options.find((option) => option.id === resolved)?.label ??
            resolved}
          .
        </p>
      )}

      <fieldset disabled={resolved !== null}>
        <legend>Choisir une réponse</legend>
        <div className="social-option-list">
          {previews.map((preview) => {
            const option = preview.option;
            const descriptionId = `${generatedId}-${option.id}-description`;
            const cost = costLabel(preview.cost);
            const reactions = reactionLabel(preview);
            return (
              <article
                className="social-option"
                key={option.id}
                data-method={option.method}
                data-available={preview.available}
              >
                <p className="eyebrow">
                  {SOCIAL_METHOD_LABELS[option.method]}
                  {cost ? ` · coût ${cost}` : ' · sans coût'}
                </p>
                <h3>{option.label}</h3>
                <div id={descriptionId}>
                  <p>{option.description}</p>

                  {preview.requirements.length > 0 && (
                    <div>
                      <h4>Prérequis</h4>
                      <ul>
                        {preview.requirements.map((requirement) => (
                          <li key={requirement.label}>
                            <span aria-hidden="true">
                              {requirement.met ? '✓' : '—'}{' '}
                            </span>
                            <span className="sr-only">
                              {requirement.met ? 'Rempli : ' : 'Non rempli : '}
                            </span>
                            {requirement.met
                              ? requirement.label
                              : requirement.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {preview.effects.length > 0 && (
                    <div>
                      <h4>Conséquences connues</h4>
                      <ul>
                        {preview.effects
                          .filter((effect) => effect.kind !== 'journal')
                          .map((effect, index) => (
                            <li key={`${effect.kind}-${index}`}>
                              {effect.text}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {reactions.length > 0 && (
                    <div>
                      <h4>Réactions probables</h4>
                      <ul>
                        {reactions.map((reaction) => (
                          <li key={reaction}>{reaction}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {preview.notes.map((note) => (
                    <p className="muted" key={note}>
                      {note}
                    </p>
                  ))}

                  {preview.blockedReasons.length > 0 && (
                    <div role="note" aria-label="Option indisponible">
                      <h4>Indisponible</h4>
                      <ul>
                        {preview.blockedReasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  aria-describedby={descriptionId}
                  aria-label={
                    option.method === 'withdraw'
                      ? 'Se retirer sans engager la décision'
                      : preview.available
                        ? `Confirmer : ${option.label}`
                        : `Indisponible : ${option.label}`
                  }
                  disabled={!preview.available || resolved !== null}
                  onClick={() => {
                    if (preview.available && resolved === null)
                      onResolve(encounterId, option.id);
                  }}
                >
                  {option.method === 'withdraw'
                    ? 'Se retirer sans engager la décision'
                    : preview.available
                      ? 'Confirmer cette réponse'
                      : 'Conditions non remplies'}
                </button>
              </article>
            );
          })}
        </div>
      </fieldset>
    </section>
  );
}
