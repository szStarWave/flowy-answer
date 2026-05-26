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

import { FC, memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card } from 'react-bootstrap';

import classNames from 'classnames';

import { loggedUserInfoStore } from '@/stores';
import { usePersonalInfoByName } from '@/services/client/personal';
import { floppyNavigation, formatCount } from '@/utils';

import './index.scss';

interface Props {
  className?: string;
}

const UserStatsCard: FC<Props> = ({ className }) => {
  const { t } = useTranslation('translation', { keyPrefix: 'community_stats' });
  const user = loggedUserInfoStore((s) => s.user);
  const { data: profile } = usePersonalInfoByName(user.username);

  if (!user?.access_token) {
    return null;
  }

  const rank = profile?.rank ?? user.rank ?? 0;
  const answers = profile?.answer_count ?? 0;
  const questions = profile?.question_count ?? 0;
  let askUrl = '/questions/add';
  if (
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/tags/')
  ) {
    const slug = window.location.pathname.split('/tags/')[1]?.split('/')[0];
    if (slug) {
      askUrl = `${askUrl}?tags=${encodeURIComponent(slug)}`;
    }
  }

  return (
    <Card className={classNames('community-stats-card mb-4', className)}>
      <Card.Body>
        <div className="community-stats-card__grid">
          <div className="community-stats-card__stat">
            <div className="community-stats-card__value">
              {formatCount(rank)}
            </div>
            <div className="community-stats-card__label">{t('reputation')}</div>
          </div>
          <div className="community-stats-card__stat">
            <div className="community-stats-card__value">
              {formatCount(answers)}
            </div>
            <div className="community-stats-card__label">{t('answers')}</div>
          </div>
          <div className="community-stats-card__stat">
            <div className="community-stats-card__value">
              {formatCount(questions)}
            </div>
            <div className="community-stats-card__label">{t('questions')}</div>
          </div>
        </div>
        <Button
          as={Link}
          to={askUrl}
          className="community-stats-card__cta w-100 mt-3"
          onClick={floppyNavigation.handleRouteLinkClick}>
          {t('create_post')}
        </Button>
      </Card.Body>
    </Card>
  );
};

export default memo(UserStatsCard);
