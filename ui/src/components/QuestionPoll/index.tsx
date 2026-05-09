/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { FC, useMemo, useState, useEffect } from 'react';
import { Button, Form, ProgressBar } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import type { QuestionPollPublic } from '@/common/interface';
import { votePoll } from '@/services';
import { guard } from '@/utils';

import './index.scss';

interface Props {
  questionId: string;
  poll: QuestionPollPublic;
  onPollUpdate?: (p: QuestionPollPublic) => void;
}

const QuestionPoll: FC<Props> = ({ questionId, poll, onPollUpdate }) => {
  const { t } = useTranslation('translation', { keyPrefix: 'question_detail' });
  const [local, setLocal] = useState(poll);
  const [selected, setSelected] = useState<Set<string>>(() => {
    const s = new Set<string>();
    poll.viewer_option_ids?.forEach((id) => s.add(id));
    return s;
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLocal(poll);
    const s = new Set<string>();
    poll.viewer_option_ids?.forEach((id) => s.add(id));
    setSelected(s);
  }, [poll]);

  const maxSel = local.max_choices_per_user || 1;
  const multi = maxSel > 1;

  const toggle = (id: string) => {
    if (!local.can_vote) {
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (next.size >= maxSel) {
        if (!multi) {
          return new Set([id]);
        }
        return next;
      }
      next.add(id);
      return next;
    });
  };

  const handleSubmit = () => {
    if (!guard.tryNormalLogged(true)) {
      return;
    }
    const option_ids = Array.from(selected);
    if (option_ids.length === 0) {
      return;
    }
    setSubmitting(true);
    votePoll({ question_id: questionId, option_ids })
      .then((res) => {
        if (res?.poll) {
          setLocal(res.poll);
          onPollUpdate?.(res.poll);
        }
      })
      .finally(() => setSubmitting(false));
  };

  const showBars = useMemo(
    () => local.options.some((o) => !o.hide_counts),
    [local.options],
  );

  if (local.status === 'closed') {
    return (
      <div className="question-poll card border mb-4">
        <div className="card-body text-secondary small">{t('poll.closed')}</div>
      </div>
    );
  }

  return (
    <div className="question-poll card border mb-4">
      <div className="card-body">
        <div className="small text-secondary mb-3">
          {t('poll.participants', { count: local.total_participants })}
        </div>
        {!showBars && (
          <div className="small text-secondary mb-2">
            {t('poll.counts_hidden')}
          </div>
        )}
        <Form>
          {local.options
            .filter((o) => o.active || local.viewer_option_ids?.includes(o.id))
            .map((o) => (
              <div key={o.id} className="mb-3">
                {local.can_vote ? (
                  <Form.Check
                    type={multi ? 'checkbox' : 'radio'}
                    name={multi ? undefined : 'question-poll'}
                    id={`poll-opt-${o.id}`}
                    checked={selected.has(o.id)}
                    disabled={!o.active && !selected.has(o.id)}
                    onChange={() => toggle(o.id)}
                    label={o.label}
                  />
                ) : (
                  <div className="fw-medium">{o.label}</div>
                )}
                {showBars && !o.hide_counts ? (
                  <div className="mt-1">
                    <ProgressBar
                      now={o.pct}
                      label={`${o.vote_count}`}
                      className="poll-progress"
                    />
                  </div>
                ) : null}
              </div>
            ))}
        </Form>
        {local.can_vote ? (
          <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
            <span className="small text-secondary">
              {t('poll.select_up_to', { max: maxSel })}
            </span>
            <Button
              size="sm"
              variant="primary"
              disabled={submitting || selected.size === 0}
              onClick={handleSubmit}>
              {local.viewer_has_voted
                ? t('poll.update_vote')
                : t('poll.submit_vote')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default QuestionPoll;
