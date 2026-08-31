'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FACILITIES } from '@/game/campaign-data';
import {
  getFacilityActions,
  performFacilityAction,
  type FacilityActionCost,
  type FacilityActionId,
} from '@/game/facilities';
import type { FacilityId } from '@/game/continuity-types';
import type { Resources, SaveData } from '@/game/types';

export interface FacilityActionsPanelProps {
  save: SaveData;
  facilityId: FacilityId;
  onChange: (updater: (current: SaveData) => SaveData) => void;
}

const RESOURCE_LABELS: Record<keyof Resources, string> = {
  credits: 'crédits',
  influence: 'influence',
  salvage: 'ferraille',
  data: 'données',
  xp: 'XP',
};

function costLabel(cost: FacilityActionCost): string {
  const entries = (Object.keys(cost) as (keyof Resources)[]).map(
    (resource) => `${cost[resource]} ${RESOURCE_LABELS[resource]}`,
  );
  return entries.length ? entries.join(' · ') : 'Aucun coût';
}

export function FacilityActionsPanel({
  save,
  facilityId,
  onChange,
}: FacilityActionsPanelProps) {
  const headingId = useId();
  const [selections, setSelections] = useState<
    Partial<Record<FacilityActionId, string>>
  >({});
  const [feedback, setFeedback] = useState('');
  const facility = FACILITIES.find((item) => item.id === facilityId);
  const actions = getFacilityActions(save, facilityId);

  return (
    <section className="facility-actions" aria-labelledby={headingId}>
      <header className="facility-actions-heading">
        <p className="eyebrow">Service actif · cycle {save.continuity.cycle}</p>
        <h4 id={headingId}>Préparation opérationnelle</h4>
        <p className="muted">
          {facility?.name ?? 'Cette installation'} propose une action par cycle.
          Les ressources ne sont débitées qu’après confirmation.
        </p>
      </header>

      {feedback && (
        <p className="continuity-feedback" role="status" aria-live="polite">
          {feedback}
        </p>
      )}

      <div className="facility-action-list">
        {actions.map((action) => {
          const enabledOptions = action.options.filter(
            (option) => option.available,
          );
          const selected = selections[action.id] ?? enabledOptions[0]?.id ?? '';
          const choice = action.options.find(
            (option) => option.id === selected,
          );
          const selectionRequired = action.options.length > 0;
          const canPerform =
            action.available &&
            (!selectionRequired || Boolean(choice?.available));
          const selectId = `${headingId}-${action.id}`;
          const actionHeadingId = `${selectId}-heading`;
          const choiceDescriptionId = `${selectId}-description`;
          const reasonId = `${selectId}-reason`;
          const selectDescription = [
            choice?.description ? choiceDescriptionId : null,
            !canPerform ? reasonId : null,
          ]
            .filter((id): id is string => id !== null)
            .join(' ');

          return (
            <article
              className="facility-action-card"
              aria-labelledby={actionHeadingId}
              key={action.id}
            >
              <p className="eyebrow">
                Niveau {action.minLevel}+ · recharge : prochain cycle
              </p>
              <h5 id={actionHeadingId}>{action.label}</h5>
              <p>{action.description}</p>
              <p className="muted">Effet : {action.result}</p>
              <p>
                <b>Coût :</b> {costLabel(action.cost)}
              </p>

              {selectionRequired && (
                <label htmlFor={selectId}>
                  Préparation
                  <span className="sr-only"> pour {action.label}</span>
                  <select
                    id={selectId}
                    value={selected}
                    disabled={!action.available}
                    aria-describedby={selectDescription || undefined}
                    onChange={(event) => {
                      setSelections((current) => ({
                        ...current,
                        [action.id]: event.target.value,
                      }));
                      setFeedback('');
                    }}
                  >
                    {action.options.map((option) => (
                      <option
                        key={option.id}
                        value={option.id}
                        disabled={!option.available}
                      >
                        {option.label}
                        {option.reason ? ` — ${option.reason}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {choice?.description && (
                <p className="muted" id={choiceDescriptionId}>
                  {choice.description}
                </p>
              )}
              {!canPerform && (
                <p className="muted" id={reasonId}>
                  {action.reason ?? choice?.reason ?? 'Choix indisponible.'}
                </p>
              )}

              <Button
                type="button"
                variant="outline"
                disabled={!canPerform}
                aria-label={`Confirmer ${action.label} · ${costLabel(action.cost)}`}
                aria-describedby={!canPerform ? reasonId : undefined}
                onClick={() => {
                  const preview = performFacilityAction(
                    save,
                    action.id,
                    selectionRequired ? selected : undefined,
                  );
                  if (preview === save) {
                    setFeedback(
                      action.reason ??
                        choice?.reason ??
                        'Cette préparation ne peut pas être appliquée.',
                    );
                    return;
                  }
                  onChange((current) =>
                    current === save
                      ? preview
                      : performFacilityAction(
                          current,
                          action.id,
                          selectionRequired ? selected : undefined,
                        ),
                  );
                  setFeedback(`${action.label} : préparation enregistrée.`);
                }}
              >
                Confirmer · {costLabel(action.cost)}
              </Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
