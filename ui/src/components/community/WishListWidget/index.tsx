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

import { FC, memo, useMemo, useState, MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Spinner } from 'react-bootstrap';

import type * as Type from '@/common/interface';
import { formatCount, guard, floppyNavigation } from '@/utils';
import { useQuestionList, postVote, useQueryTags } from '@/services';
import { toastStore, loggedUserInfoStore } from '@/stores';
import { pathFactory } from '@/router/pathFactory';
import type { QuestionPostCardItem } from '@/components/community/QuestionPostCard';
import {
  findWishFeatureTag,
  wishFeatureTagLandingPath,
  WISH_FEATURE_TAG_SLUG,
} from '@/config/communityNav';
import { CATEGORY_TAG_NAV_QUERY } from '@/hooks/useCategoryTagNavLinks';

import './index.scss';

const WIDGET_PAGE_SIZE = 5;

interface VoteOverride {
  voteCount: number;
  isVoted: boolean;
}

const WishListWidget: FC = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'wish' });
  const { t: tRoot } = useTranslation();
  const username = loggedUserInfoStore((state) => state.user.username);
  const { data: categoryTags } = useQueryTags(CATEGORY_TAG_NAV_QUERY);
  const wishTag = useMemo(
    () => findWishFeatureTag(categoryTags?.list as Type.TagInfo[] | undefined),
    [categoryTags],
  );
  const tagSlug = wishTag?.slug_name ?? WISH_FEATURE_TAG_SLUG;
  const tagAllUrl = wishFeatureTagLandingPath(wishTag);

  const reqParams = useMemo<Type.QueryQuestionsReq>(
    () => ({
      page: 1,
      page_size: WIDGET_PAGE_SIZE,
      order: 'score',
      tag: tagSlug,
    }),
    [tagSlug],
  );
  const { data, isLoading } = useQuestionList(reqParams);
  const [voteOverrides, setVoteOverrides] = useState<
    Record<string, VoteOverride>
  >({});

  const items = (data?.list ?? []) as QuestionPostCardItem[];

  const getVoteState = (item: QuestionPostCardItem) => {
    const override = voteOverrides[item.id];
    return {
      voteCount: override?.voteCount ?? item.vote_count,
      isVoted: override?.isVoted ?? false,
    };
  };

  const handleVote = async (
    event: MouseEvent<HTMLButtonElement>,
    item: QuestionPostCardItem,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!guard.tryNormalLogged(true)) {
      return;
    }

    const authorUsername = item.author?.username ?? item.operator?.username;
    if (authorUsername && authorUsername === username) {
      toastStore.getState().show({
        msg: tRoot('cannot_vote_for_self'),
        variant: 'danger',
      });
      return;
    }

    const { isVoted } = getVoteState(item);

    try {
      const res = await postVote(
        {
          object_id: item.id,
          is_cancel: isVoted,
        },
        'up',
      );
      setVoteOverrides((prev) => ({
        ...prev,
        [item.id]: {
          voteCount: res.votes,
          isVoted: res.vote_status === 'vote_up',
        },
      }));
    } catch (err: any) {
      toastStore.getState().show({
        msg: err?.msg || err?.value || t('vote_failed'),
        variant: 'danger',
      });
    }
  };

  return (
    <section className="community-wish-widget mb-4">
      <header className="community-wish-widget__header">
        <h6 className="community-wish-widget__title mb-0">{t('title')}</h6>
        <Link
          to={tagAllUrl}
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
          {items.map((item, index) => {
            const { voteCount, isVoted } = getVoteState(item);
            return (
              <li key={item.id} className="community-wish-widget__item">
                <span
                  className={`community-wish-widget__rank ${
                    index < 3 ? 'community-wish-widget__rank--top' : ''
                  }`}>
                  {index + 1}
                </span>
                <div className="community-wish-widget__content flex-grow-1 min-w-0">
                  <Link
                    to={pathFactory.questionLanding(item.id, item.url_title)}
                    className="community-wish-widget__wish-title text-truncate d-block"
                    title={item.title}
                    onClick={floppyNavigation.handleRouteLinkClick}>
                    {item.title}
                  </Link>
                  <div className="community-wish-widget__meta">
                    {t('meta', {
                      discussions: item.answer_count,
                      views: formatCount(item.view_count),
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  className={`community-wish-widget__vote ${
                    isVoted ? 'is-voted' : ''
                  }`}
                  onClick={(event) => handleVote(event, item)}>
                  <span aria-hidden>▲</span>
                  <span>{formatCount(voteCount)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="community-wish-widget__empty mb-0">{t('widget_empty')}</p>
      )}
    </section>
  );
};

export default memo(WishListWidget);
