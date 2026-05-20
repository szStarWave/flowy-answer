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
import { Row, Col, Card, Button, Nav } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { usePageTags } from '@/hooks';
import { useWishPeriods, useWishes, voteWish } from '@/services/wish';
import { formatCount, guard, floppyNavigation } from '@/utils';
import { toastStore, loggedUserInfoStore } from '@/stores';

import './index.scss';

const Wishes: FC = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'wish' });
  const user = loggedUserInfoStore((s) => s.user);
  const { data: periodsData } = useWishPeriods();
  const periods = periodsData?.list || [];
  const [periodId, setPeriodId] = useState(0);
  const [page, setPage] = useState(1);
  const { data, mutate, isValidating } = useWishes(periodId, page, 20);

  usePageTags({ title: t('page_title') });

  useEffect(() => {
    if (!periodId && periods.length) {
      const current = periods.find((p) => p.is_current) || periods[0];
      setPeriodId(current.id);
    }
  }, [periods, periodId]);

  const handleVote = async (wishId: number) => {
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

  const canManage = user?.is_admin || user?.role_id === 2;

  return (
    <Row className="community-wishes-page pt-4 mb-5">
      <Col className="page-main">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <div>
            <h3 className="mb-1">{t('title')}</h3>
            <p className="text-secondary small mb-0">{t('page_intro')}</p>
          </div>
          {canManage && (
            <Link
              to="/admin/wishes"
              className="btn btn-outline-primary btn-sm"
              onClick={floppyNavigation.handleRouteLinkClick}>
              {t('manage_link')}
            </Link>
          )}
        </div>

        {periods.length > 1 && (
          <Nav variant="pills" className="wish-period-tabs mb-4 flex-nowrap">
            {periods.map((p) => (
              <Nav.Item key={p.id}>
                <Nav.Link
                  active={periodId === p.id}
                  onClick={() => {
                    setPeriodId(p.id);
                    setPage(1);
                  }}
                  className="text-nowrap">
                  {p.title}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
        )}

        {isValidating && !data?.list?.length ? (
          <div className="text-secondary">
            {t('loading', { keyPrefix: 'btns' })}
          </div>
        ) : null}

        <div className="d-flex flex-column gap-3">
          {data?.list?.map((item, index) => (
            <Card key={item.id} className="wish-item-card">
              <Card.Body className="d-flex align-items-start gap-3">
                <span className="wish-item-card__rank">#{index + 1}</span>
                <div className="flex-grow-1">
                  <h5 className="mb-1">{item.title}</h5>
                  {item.description ? (
                    <p className="text-secondary small mb-2">
                      {item.description}
                    </p>
                  ) : null}
                  <div className="small text-secondary">
                    {t('meta', {
                      discussions: item.discussion_count,
                      views: formatCount(item.view_count),
                    })}
                  </div>
                </div>
                <Button
                  variant={item.voted ? 'primary' : 'outline-primary'}
                  className="wish-item-card__vote"
                  onClick={() => handleVote(item.id)}>
                  ▲ {formatCount(item.vote_count)}
                </Button>
              </Card.Body>
            </Card>
          ))}
        </div>

        {!isValidating && !data?.list?.length && (
          <p className="text-secondary">{t('empty')}</p>
        )}

        {data && data.count > 20 ? (
          <div className="d-flex gap-2 mt-3">
            <Button
              variant="outline-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}>
              {t('prev', { keyPrefix: 'btns' })}
            </Button>
            <Button
              variant="outline-secondary"
              disabled={page * 20 >= data.count}
              onClick={() => setPage((p) => p + 1)}>
              {t('next', { keyPrefix: 'btns' })}
            </Button>
          </div>
        ) : null}
      </Col>
    </Row>
  );
};

export default Wishes;
