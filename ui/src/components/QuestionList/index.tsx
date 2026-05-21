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

import { FC, useEffect, useState } from 'react';
import { ListGroup, Dropdown, Badge, Card } from 'react-bootstrap';
import { NavLink, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import classnames from 'classnames';

import CommunityHomeFilter, {
  type CommunityHomeTab,
} from '@/components/community/CommunityHomeFilter';
import HomeIndexBanner from '@/components/community/HomeIndexBanner';
import QuestionPostCard from '@/components/community/QuestionPostCard';
import { useCommunityShellEnabled, useSkeletonControl } from '@/hooks';
import { pathFactory } from '@/router/pathFactory';
import {
  Tag,
  Pagination,
  FormatTime,
  Empty,
  BaseUserCard,
  QueryGroup,
  QuestionListLoader,
  Counts,
  PinList,
  Icon,
  SearchInput,
} from '@/components';
import * as Type from '@/common/interface';
import Storage from '@/utils/storage';
import { LIST_VIEW_STORAGE_KEY } from '@/common/constants';

import './index.scss';

export const QUESTION_ORDER_KEYS: Type.QuestionOrderBy[] = [
  'newest',
  'active',
  'unanswered',
  'recommend',
  'frequent',
  'score',
];
interface Props {
  source: 'questions' | 'tag' | 'linked';
  order?: Type.QuestionOrderBy | CommunityHomeTab;
  data;
  orderList?: readonly (Type.QuestionOrderBy | CommunityHomeTab)[];
  isLoading: boolean;
  /** Match ui/docs homepage: filter tabs + inline search, no list title. */
  communityHomeLayout?: boolean;
}

const QuestionList: FC<Props> = ({
  source,
  order,
  data,
  orderList,
  isLoading = false,
  communityHomeLayout = false,
}) => {
  const { t } = useTranslation('translation', { keyPrefix: 'question' });
  const { t: tQD } = useTranslation('translation', {
    keyPrefix: 'question_detail',
  });
  const navigate = useNavigate();
  const [urlSearchParams] = useSearchParams();
  const { isSkeletonShow } = useSkeletonControl(isLoading);
  const curOrder =
    order || urlSearchParams.get('order') || QUESTION_ORDER_KEYS[0];
  const curPage = Number(urlSearchParams.get('page')) || 1;
  const pageSize = 20;
  const count = data?.count || 0;
  const orderKeys = orderList || QUESTION_ORDER_KEYS;
  const pinData =
    source === 'questions'
      ? data?.list?.filter((v) => v.pin === 2).slice(0, 3)
      : [];
  const renderData = data?.list?.filter(
    (v) => pinData.findIndex((p) => p.id === v.id) === -1,
  );

  const [viewType, setViewType] = useState('card');

  const handleViewMode = (key) => {
    Storage.set(LIST_VIEW_STORAGE_KEY, key);
    setViewType(key);
  };

  const handleNavigate = (href) => {
    navigate(href);
  };

  useEffect(() => {
    const type = Storage.get(LIST_VIEW_STORAGE_KEY) || 'card';
    setViewType(type);
  }, []);

  const isCardView = viewType === 'card';
  const useDesignPostCard = useCommunityShellEnabled() && isCardView;

  return (
    <div
      className={classnames('question-list', {
        'question-list--card': isCardView,
        'question-list--post-design': useDesignPostCard,
      })}>
      {communityHomeLayout ? <HomeIndexBanner /> : null}
      {!isSkeletonShow && isCardView && pinData?.length > 0 ? (
        <PinList data={pinData} variant="card" />
      ) : null}
      <div
        className={classnames(
          'content-header-toolbar mb-3 d-flex flex-wrap align-items-md-center gap-2',
          communityHomeLayout
            ? 'justify-content-between community-home-content-header'
            : 'justify-content-between',
        )}>
        {!communityHomeLayout && (
          <h2 className="h5 mb-0 text-nowrap fw-semibold">
            {source === 'questions'
              ? t('all_questions')
              : source === 'linked'
                ? t('x_posts', { count })
                : t('x_questions', { count })}
          </h2>
        )}
        <div
          className={classnames(
            'd-flex flex-wrap align-items-center',
            communityHomeLayout && 'flex-grow-1 justify-content-between',
          )}>
          {communityHomeLayout ? (
            <CommunityHomeFilter
              orders={orderKeys as CommunityHomeTab[]}
              currentOrder={curOrder}
            />
          ) : (
            <QueryGroup
              data={orderKeys}
              currentSort={curOrder}
              pathname={source === 'questions' ? '/questions' : ''}
              i18nKeyPrefix="question"
              wrapClassName="me-2"
            />
          )}
          {communityHomeLayout ? (
            <SearchInput
              variant="header"
              className="community-home-search ms-md-2"
            />
          ) : (
            <Dropdown
              align="end"
              className="question-list__view-dropdown"
              onSelect={handleViewMode}>
              <Dropdown.Toggle
                variant="outline-secondary"
                size="sm"
                className="question-list__view-dropdown-toggle"
                id="question-list-view-mode">
                <Icon name={viewType === 'card' ? 'view-stacked' : 'list'} />
              </Dropdown.Toggle>

              <Dropdown.Menu className="question-list__view-dropdown-menu">
                <Dropdown.Header
                  as="h6"
                  className="question-list__view-dropdown-header">
                  {t('view', { keyPrefix: 'btns' })}
                </Dropdown.Header>
                <Dropdown.Item eventKey="card" active={viewType === 'card'}>
                  {t('card', { keyPrefix: 'btns' })}
                </Dropdown.Item>
                <Dropdown.Item
                  eventKey="compact"
                  active={viewType === 'compact'}>
                  {t('compact', { keyPrefix: 'btns' })}
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}
        </div>
      </div>
      {isSkeletonShow ? (
        <QuestionListLoader variant={isCardView ? 'card' : 'list'} />
      ) : isCardView ? (
        renderData?.map((li) => {
          const href = pathFactory.questionLanding(li.id, li.url_title);
          if (useDesignPostCard) {
            return (
              <QuestionPostCard
                key={li.id}
                item={li}
                href={href}
                time={li.created_at}
                onNavigate={handleNavigate}
              />
            );
          }
          return (
            <Card
              key={li.id}
              role="button"
              tabIndex={0}
              className="question-list__card rounded-3"
              onClick={() => handleNavigate(href)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNavigate(href);
                }
              }}>
              <Card.Body className="py-3 px-3 px-md-4">
                <div className="d-flex flex-wrap text-secondary small mb-12">
                  <BaseUserCard
                    data={li.author || li.operator}
                    className="me-1"
                    avatarClass="me-1"
                  />
                  •
                  <FormatTime
                    time={li.created_at}
                    className="text-secondary ms-1 flex-shrink-0"
                  />
                </div>
                <div className="text-wrap text-break question-list__title mb-1">
                  <NavLink
                    className="link-dark align-middle"
                    onClick={(e) => e.stopPropagation()}
                    to={href}>
                    {li.title}
                    {li.status === 2 ? ` [${t('closed')}]` : ''}
                  </NavLink>
                  {li.quality === 2 ? (
                    <Badge
                      bg="info"
                      className="ms-2 align-middle fw-normal text-nowrap">
                      {t('featured_badge')}
                    </Badge>
                  ) : null}
                  {li.post_type === 'poll' ? (
                    <Badge
                      bg="secondary"
                      className="ms-2 align-middle fw-normal text-nowrap">
                      {tQD('poll.badge')}
                    </Badge>
                  ) : null}
                </div>
                <div className="text-truncate-2 mb-2 question-list__excerpt">
                  <NavLink
                    to={href}
                    className="d-block small text-secondary"
                    dangerouslySetInnerHTML={{ __html: li.description }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <div className="question-tags mb-12">
                  {Array.isArray(li.tags)
                    ? li.tags.map((tag, index) => {
                        return (
                          <Tag
                            key={tag.slug_name}
                            className={`${
                              li.tags.length - 1 === index ? '' : 'me-1'
                            }`}
                            data={tag}
                          />
                        );
                      })
                    : null}
                </div>
                <div className="small text-secondary position-relative">
                  <Counts
                    data={{
                      votes: li.vote_count,
                      answers: li.answer_count,
                      views: li.view_count,
                    }}
                    isAccepted={li.accepted_answer_id >= 1}
                    className="mt-2 mt-md-0"
                  />
                </div>
              </Card.Body>
            </Card>
          );
        })
      ) : (
        <ListGroup className="feeds-list-shell rounded-3 border-0">
          <>
            <PinList data={pinData} variant="list" />
            {renderData?.map((li) => {
              const href = pathFactory.questionLanding(li.id, li.url_title);
              return (
                <ListGroup.Item
                  key={li.id}
                  action
                  as="li"
                  onClick={() => handleNavigate(href)}
                  className="question-list__row position-relative pointer">
                  <div className="d-flex flex-wrap text-secondary small mb-12">
                    <BaseUserCard
                      data={li.author || li.operator}
                      className="me-1"
                      avatarClass="me-1"
                    />
                    •
                    <FormatTime
                      time={li.created_at}
                      className="text-secondary ms-1 flex-shrink-0"
                    />
                  </div>
                  <h5 className="question-list__row-title text-wrap text-break mb-1">
                    <NavLink
                      className="link-dark align-middle"
                      onClick={(e) => e.stopPropagation()}
                      to={href}>
                      {li.title}
                      {li.status === 2 ? ` [${t('closed')}]` : ''}
                    </NavLink>
                    {li.quality === 2 ? (
                      <Badge
                        bg="info"
                        className="ms-2 align-middle fw-normal text-nowrap">
                        {t('featured_badge')}
                      </Badge>
                    ) : null}
                    {li.post_type === 'poll' ? (
                      <Badge
                        bg="secondary"
                        className="ms-2 align-middle fw-normal text-nowrap">
                        {tQD('poll.badge')}
                      </Badge>
                    ) : null}
                  </h5>

                  <div className="question-tags mb-12">
                    {Array.isArray(li.tags)
                      ? li.tags.map((tag, index) => {
                          return (
                            <Tag
                              key={tag.slug_name}
                              className={`${
                                li.tags.length - 1 === index ? '' : 'me-1'
                              }`}
                              data={tag}
                            />
                          );
                        })
                      : null}
                  </div>
                  <div className="small text-secondary">
                    <Counts
                      data={{
                        votes: li.vote_count,
                        answers: li.answer_count,
                        views: li.view_count,
                      }}
                      isAccepted={li.accepted_answer_id >= 1}
                      className="mt-2 mt-md-0"
                    />
                  </div>
                </ListGroup.Item>
              );
            })}
          </>
        </ListGroup>
      )}
      {count <= 0 && !isLoading && <Empty />}
      <div className="mt-4 mb-2 d-flex justify-content-center">
        <Pagination
          currentPage={curPage}
          totalSize={count}
          pageSize={pageSize}
          pathname={source === 'questions' ? '/questions' : ''}
        />
      </div>
    </div>
  );
};
export default QuestionList;
