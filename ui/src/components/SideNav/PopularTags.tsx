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
 * "AS IS" BASIS, WITHOUT WARRANTIES OR ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useMemo, memo, type FC, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Spinner } from 'react-bootstrap';

import { pathFactory } from '@/router/pathFactory';
import type { TagInfo } from '@/common/interface';
import { useQueryTags } from '@/services';

const MAX_DISPLAY_TAGS = 60;
const SIDEBAR_TAG_PAGE_SIZE = Math.min(30, MAX_DISPLAY_TAGS);

const Index: FC = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'header.nav' });

  const {
    data: result,
    error,
    isLoading,
  } = useQueryTags({
    page: 1,
    page_size: SIDEBAR_TAG_PAGE_SIZE,
    query_cond: 'category',
  });

  const { tags, total } = useMemo(() => {
    if (!result?.list) {
      return { tags: [] as TagInfo[], total: 0 };
    }
    const list = result.list.slice(0, MAX_DISPLAY_TAGS);
    return { tags: list, total: result.count };
  }, [result]);

  let body: ReactNode;
  if (isLoading) {
    body = (
      <div className="side-nav-popular-tags--loading d-flex align-items-center gap-2">
        <Spinner animation="border" size="sm" role="status" />
        <span className="small text-secondary">
          {t('popular_tags_loading')}
        </span>
      </div>
    );
  } else if (error && !result) {
    body = (
      <>
        <div className="small text-secondary mb-1">
          {t('popular_tags_error')}
        </div>
        <div className="small">
          <Link className="link-secondary text-decoration-none" to="/tags">
            {t('view_all_tags')}
          </Link>
        </div>
      </>
    );
  } else if (!tags.length) {
    body = (
      <>
        <div className="small text-secondary mb-1">
          {t('popular_tags_none')}
        </div>
        <div className="small">
          <Link className="link-secondary text-decoration-none" to="/tags">
            {t('view_all_tags')}
          </Link>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <div className="side-nav-popular-tags__list d-flex flex-column gap-1 px-1">
          {tags.map((item) => (
            <Link
              key={item.slug_name}
              className="side-nav-popular-tags__link small text-decoration-none text-body text-truncate"
              to={pathFactory.tagLanding(item.slug_name)}
              title={item.display_name}>
              {item.display_name || item.slug_name}
            </Link>
          ))}
        </div>
        {total > tags.length ? (
          <div className="pt-1 small">
            <Link className="link-secondary text-decoration-none" to="/tags">
              {t('view_all_tags')}
            </Link>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div
      className="side-nav-popular-tags side-nav-popular-tags--slot px-0"
      data-sidebar-slot="popular-tags">
      <div className="side-nav-popular-tags__title small text-secondary text-uppercase px-2">
        {t('popular_tags')}
      </div>
      <div className="side-nav-popular-tags__body py-1">{body}</div>
    </div>
  );
};

export default memo(Index);
