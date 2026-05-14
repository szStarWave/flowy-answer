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
import { ListGroup, Stack } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Counts } from '@/components';
import { pathFactory } from '@/router/pathFactory';

interface IProps {
  data: any[];
  /** `card`: horizontal pin strip outside ListGroup; `list`: legacy row inside ListGroup */
  variant?: 'list' | 'card';
}

const PinList: FC<IProps> = ({ data, variant = 'list' }) => {
  const { t } = useTranslation('translation', { keyPrefix: 'question' });
  if (!data?.length) return null;

  const itemShellClass = variant === 'card' ? 'flex-shrink-0' : 'border-0 p-0';
  const itemShellStyle = {
    minWidth: '238px',
    width: `${100 / data.length}%`,
  };

  const inner = (
    <Stack
      direction="horizontal"
      gap={3}
      className="overflow-x-auto align-items-stretch pb-1">
      {data.map((item) => {
        const linkClass =
          'question-list__card card border-0 rounded-3 h-100 d-flex flex-column justify-content-between p-3';

        const body = (
          <NavLink
            to={pathFactory.questionLanding(item.id, item.url_title)}
            className={linkClass}>
            <h6 className="text-wrap link-dark text-break text-truncate-2 question-list__pin-title">
              {item.title}
              {item.status === 2 ? ` [${t('closed')}]` : ''}
            </h6>

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
          </NavLink>
        );

        if (variant === 'card') {
          return (
            <div
              key={item.id}
              className={itemShellClass}
              style={itemShellStyle}>
              {body}
            </div>
          );
        }

        return (
          <ListGroup.Item
            action
            as="li"
            key={item.id}
            className={itemShellClass}
            style={itemShellStyle}>
            {body}
          </ListGroup.Item>
        );
      })}
    </Stack>
  );

  if (variant === 'card') {
    return <div className="mb-1">{inner}</div>;
  }

  return (
    <ListGroup.Item className="feeds-list-shell__pin-row">
      {inner}
    </ListGroup.Item>
  );
};

export default PinList;
