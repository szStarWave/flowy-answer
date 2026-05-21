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

import { memo, type FC, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Spinner } from 'react-bootstrap';

import classnames from 'classnames';

import { floppyNavigation } from '@/utils';
import { useCategoryTagNavLinks } from '@/hooks/useCategoryTagNavLinks';

import './PopularTags.scss';

const Index: FC = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'header.nav' });
  const { pathname } = useLocation();
  const { tagLinks, isLoading, error, total } = useCategoryTagNavLinks();

  let body: ReactNode;
  if (isLoading) {
    body = (
      <div className="side-nav-popular-tags--loading d-flex align-items-center gap-2">
        <Spinner animation="border" size="sm" role="status" />
        <span className="small">{t('popular_tags_loading')}</span>
      </div>
    );
  } else if (error && !tagLinks.length) {
    body = (
      <div className="side-nav-popular-tags__empty">
        <div>{t('popular_tags_error')}</div>
        <NavLink
          end
          className="nav-link"
          to="/tags"
          onClick={floppyNavigation.handleRouteLinkClick}>
          {t('view_all_tags')}
        </NavLink>
      </div>
    );
  } else if (!tagLinks.length) {
    body = (
      <div className="side-nav-popular-tags__empty">
        <div>{t('popular_tags_none')}</div>
        <NavLink
          end
          className="nav-link"
          to="/tags"
          onClick={floppyNavigation.handleRouteLinkClick}>
          {t('view_all_tags')}
        </NavLink>
      </div>
    );
  } else {
    body = (
      <div className="side-nav-popular-tags__stack">
        <div className="side-nav-popular-tags__list">
          {tagLinks.map((item) => (
            <NavLink
              key={item.to}
              className={() =>
                classnames('nav-link text-truncate', {
                  active: item.isActive?.(pathname) ?? false,
                })
              }
              to={item.to}
              title={item.label}
              onClick={floppyNavigation.handleRouteLinkClick}>
              {item.label}
            </NavLink>
          ))}
        </div>
        {total > tagLinks.length ? (
          <NavLink
            end
            className={({ isActive }) =>
              classnames('nav-link', { active: isActive })
            }
            to="/tags"
            onClick={floppyNavigation.handleRouteLinkClick}>
            {t('view_all_tags')}
          </NavLink>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="side-nav-popular-tags side-nav-popular-tags--slot px-0"
      data-sidebar-slot="popular-tags">
      <div className="side-nav__section-label">{t('popular_tags')}</div>
      <div className="side-nav-popular-tags__body">{body}</div>
    </div>
  );
};

export default memo(Index);
