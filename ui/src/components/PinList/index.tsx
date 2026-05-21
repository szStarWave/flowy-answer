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

import { FC } from 'react';
import { ListGroup } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import classNames from 'classnames';

import { Counts } from '@/components';
import { pathFactory } from '@/router/pathFactory';
import { escapeRemove } from '@/utils';

import './index.scss';

export const MAX_PINNED_QUESTIONS = 3;

const PIN_EXCERPT_MAX_LEN = 15;

function pinExcerpt(description?: string): string {
  const plain = (escapeRemove(description || '') || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) {
    return '';
  }
  if (plain.length <= PIN_EXCERPT_MAX_LEN) {
    return plain;
  }
  return `${plain.slice(0, PIN_EXCERPT_MAX_LEN)}…`;
}

interface IProps {
  data: any[];
  /** `card`: grid on homepage; `list`: legacy row inside ListGroup */
  variant?: 'list' | 'card';
}

const PinList: FC<IProps> = ({ data, variant = 'list' }) => {
  const { t } = useTranslation('translation', { keyPrefix: 'question' });
  if (!data?.length) return null;

  const pinItems = data.slice(0, MAX_PINNED_QUESTIONS);

  const renderItemBody = (item) => {
    const excerpt = pinExcerpt(item.description);
    const linkClass =
      variant === 'card'
        ? 'community-pin-list__card question-list__card card border-0 h-100 d-flex flex-column p-3'
        : 'question-list__card card border-0 rounded-3 h-100 d-flex flex-column justify-content-between p-3';

    return (
      <NavLink
        to={pathFactory.questionLanding(item.id, item.url_title)}
        className={linkClass}>
        <h6 className="text-wrap link-dark text-break text-truncate-2 question-list__pin-title mb-0">
          {item.title}
          {item.status === 2 ? ` [${t('closed')}]` : ''}
        </h6>
        {variant === 'card' ? (
          excerpt ? (
            <p className="community-pin-list__excerpt mb-0 mt-2">{excerpt}</p>
          ) : null
        ) : (
          <Counts
            data={{
              votes: item.vote_count,
              answers: item.answer_count,
              views: item.view_count,
            }}
            isAccepted={item.accepted_answer_id >= 1}
            showViews={false}
            className="mt-2 mt-md-0"
          />
        )}
      </NavLink>
    );
  };

  if (variant === 'card') {
    return (
      <div
        className={classNames(
          'community-pin-list',
          `community-pin-list--count-${Math.min(pinItems.length, MAX_PINNED_QUESTIONS)}`,
        )}>
        {pinItems.map((item) => (
          <div key={item.id} className="community-pin-list__item">
            {renderItemBody(item)}
          </div>
        ))}
      </div>
    );
  }

  const itemShellClass = 'border-0 p-0';
  const itemShellStyle = {
    minWidth: '238px',
    width: `${100 / pinItems.length}%`,
  };

  return (
    <ListGroup.Item className="feeds-list-shell__pin-row">
      <div className="d-flex flex-wrap align-items-stretch gap-3">
        {pinItems.map((item) => (
          <ListGroup.Item
            action
            as="li"
            key={item.id}
            className={itemShellClass}
            style={itemShellStyle}>
            {renderItemBody(item)}
          </ListGroup.Item>
        ))}
      </div>
    </ListGroup.Item>
  );
};

export default PinList;
