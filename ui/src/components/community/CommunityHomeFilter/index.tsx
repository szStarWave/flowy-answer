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

import { FC, memo, MouseEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import classNames from 'classnames';

import { REACT_BASE_PATH } from '@/router/alias';
import { floppyNavigation } from '@/utils';

import './index.scss';

/** Design: 默认 / 最新 / 优质 */
export type CommunityHomeTab = 'active' | 'newest' | 'featured';

export const COMMUNITY_HOME_TABS: CommunityHomeTab[] = [
  'active',
  'newest',
  'featured',
];

const LABEL_KEYS: Record<CommunityHomeTab, string> = {
  active: 'home_default',
  newest: 'newest',
  featured: 'home_featured',
};

interface Props {
  orders: CommunityHomeTab[];
  currentOrder: string;
}

const CommunityHomeFilter: FC<Props> = ({ orders, currentOrder }) => {
  const { t } = useTranslation('translation', { keyPrefix: 'question' });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const buildSearch = (order: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete('page');
    next.set('order', order);
    return `?${next.toString()}`;
  };

  const handleClick = (e: MouseEvent<HTMLAnchorElement>, order: string) => {
    if (floppyNavigation.shouldProcessLinkClick(e)) {
      e.preventDefault();
      navigate(buildSearch(order));
    }
  };

  return (
    <div className="community-home-filter-tabs">
      {orders.map((order) => {
        const search = buildSearch(order);
        const labelKey = LABEL_KEYS[order];
        return (
          <a
            key={order}
            href={`${REACT_BASE_PATH}${search}`}
            className={classNames('community-home-filter-tab', {
              active: currentOrder === order,
            })}
            onClick={(e) => handleClick(e, order)}>
            {t(labelKey)}
          </a>
        );
      })}
    </div>
  );
};

export default memo(CommunityHomeFilter);
