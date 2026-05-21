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

import { FC, memo, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

import dayjs from 'dayjs';

import { Avatar, Tag } from '@/components';
import type { Tag as TagItem } from '@/common/interface';
import { formatCount } from '@/utils';

import './index.scss';

export interface QuestionPostCardItem {
  id: string;
  title: string;
  description?: string;
  url_title?: string;
  status?: number;
  quality?: number;
  post_type?: string;
  vote_count: number;
  answer_count: number;
  view_count: number;
  created_at: number;
  operated_at?: number;
  author?: {
    username?: string;
    display_name?: string;
    avatar?: string;
    status?: string;
    role_id?: number;
  };
  operator?: {
    username?: string;
    display_name?: string;
    avatar?: string;
    status?: string;
    role_id?: number;
  };
  tags?: TagItem[];
}

interface Props {
  item: QuestionPostCardItem;
  href: string;
  time: number;
  onNavigate: (href: string) => void;
}

function avatarInitial(name?: string): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return '?';
  }
  return trimmed.slice(0, 1);
}

const QuestionPostCard: FC<Props> = ({ item, href, time, onNavigate }) => {
  const { t } = useTranslation('translation', { keyPrefix: 'question' });
  const { t: tQD } = useTranslation('translation', {
    keyPrefix: 'question_detail',
  });
  const { t: tRoot } = useTranslation();

  const author = item.author ?? item.operator;
  const isStaff = author?.role_id === 2 || author?.role_id === 3;
  const showGoodBadge = item.quality === 2;
  const showPollBadge = item.post_type === 'poll';

  const handleClick = () => onNavigate(href);

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onNavigate(href);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="community-post-card question-list__card"
      onClick={handleClick}
      onKeyDown={handleKeyDown}>
      <header className="community-post-card__header">
        <div className="community-post-card__avatar" aria-hidden>
          {author?.status !== 'deleted' && author?.avatar ? (
            <Avatar
              avatar={author.avatar}
              size="40px"
              alt={author.display_name}
              searchStr="s=80"
            />
          ) : (
            avatarInitial(author?.display_name)
          )}
        </div>
        <div className="community-post-card__meta">
          <div className="community-post-card__author text-truncate">
            {author?.display_name || '—'}
          </div>
          <time
            className="community-post-card__time d-block"
            dateTime={dayjs.unix(time).toISOString()}>
            {dayjs.unix(time).tz().format(tRoot('dates.long_date_with_time'))}
          </time>
        </div>
        {showGoodBadge ? (
          <span className="community-post-card__badge">
            {t('home_featured')}
          </span>
        ) : null}
        {!showGoodBadge && isStaff ? (
          <span className="community-post-card__badge community-post-card__badge--official">
            {t('official_badge')}
          </span>
        ) : null}
        {showPollBadge ? (
          <span className="community-post-card__badge community-post-card__badge--poll">
            {tQD('poll.badge')}
          </span>
        ) : null}
      </header>

      <h3 className="community-post-card__title">
        {item.title}
        {item.status === 2 ? ` [${t('closed')}]` : ''}
      </h3>

      {item.description ? (
        <div
          className="community-post-card__excerpt"
          dangerouslySetInnerHTML={{ __html: item.description }}
        />
      ) : null}

      {Array.isArray(item.tags) && item.tags.length > 0 ? (
        <div
          className="community-post-card__tags"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}>
          {item.tags.map((tag) => (
            <Tag
              key={tag.slug_name}
              data={tag}
              className="community-post-card__tag"
            />
          ))}
        </div>
      ) : null}

      <footer className="community-post-card__footer">
        <span className="community-post-card__stat">
          <span className="community-post-card__stat-icon" aria-hidden>
            👍
          </span>
          {formatCount(item.vote_count)}
        </span>
        <span className="community-post-card__stat">
          <span className="community-post-card__stat-icon" aria-hidden>
            💬
          </span>
          {formatCount(item.answer_count)}
        </span>
        <span className="community-post-card__stat">
          <span className="community-post-card__stat-icon" aria-hidden>
            👁
          </span>
          {formatCount(item.view_count)}
        </span>
      </footer>
    </div>
  );
};

export default memo(QuestionPostCard);
