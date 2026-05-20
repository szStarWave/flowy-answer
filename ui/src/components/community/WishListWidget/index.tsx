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
import { Spinner } from 'react-bootstrap';

import { formatCount, guard, floppyNavigation } from '@/utils';
import { useHomeWishWidget, voteWish } from '@/services/wish';
import { toastStore } from '@/stores';

import './index.scss';

const WishListWidget: FC = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'wish' });
  const { period, items, isLoading, canVote, mutate } = useHomeWishWidget();
  const periodTitle = period?.title;

  const handleVote = async (wishId: number) => {
    if (!canVote) {
      toastStore.getState().show({
        msg: t('vote_closed'),
        variant: 'warning',
      });
      return;
    }
    if (!guard.tryNormalLogged(true)) {
      return;
    }
    try {
      await voteWish(wishId);
      mutate();
    } catch (err: any) {
      toastStore.getState().show({
        msg: err?.msg || t('vote_failed'),
        variant: 'danger',
      });
    }
  };

  return (
    <section className="community-wish-widget mb-4">
      <header className="community-wish-widget__header">
        <h6 className="community-wish-widget__title mb-0">
          {periodTitle ? `${t('title')} · ${periodTitle}` : t('title')}
        </h6>
        <Link
          to="/wishes"
          className="community-wish-widget__more"
          onClick={floppyNavigation.handleRouteLinkClick}>
          {t('view_all')}
        </Link>
      </header>

      {isLoading ? (
        <div className="text-center py-4">
          <Spinner animation="border" size="sm" variant="secondary" />
        </div>
      ) : items.length > 0 ? (
        <ul className="list-unstyled mb-0 community-wish-widget__list">
          {items.map((item, index) => (
            <li key={item.id} className="community-wish-widget__item">
              <span
                className={`community-wish-widget__rank ${
                  index < 3 ? 'community-wish-widget__rank--top' : ''
                }`}>
                {index + 1}
              </span>
              <div className="community-wish-widget__content flex-grow-1 min-w-0">
                <div className="community-wish-widget__wish-title text-truncate">
                  {item.title}
                </div>
                <div className="community-wish-widget__meta">
                  {t('meta', {
                    discussions: item.discussion_count,
                    views: formatCount(item.view_count),
                  })}
                </div>
              </div>
              <button
                type="button"
                className={`community-wish-widget__vote ${
                  item.voted ? 'is-voted' : ''
                }`}
                disabled={!canVote}
                onClick={() => handleVote(item.id)}
                title={canVote ? undefined : t('vote_closed')}>
                <span aria-hidden>▲</span>
                <span>{formatCount(item.vote_count)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="community-wish-widget__empty mb-0">
          {period ? t('empty') : t('widget_no_period')}
        </p>
      )}
    </section>
  );
};

export default memo(WishListWidget);
