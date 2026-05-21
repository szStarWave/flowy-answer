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

import { FC, memo, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Spinner } from 'react-bootstrap';

import { Icon } from '@/components';
import { brandingStore, loggedUserInfoStore } from '@/stores';
import { getLeftNavUserLinks } from '@/config/communityNav';
import { useCategoryTagNavLinks } from '@/hooks/useCategoryTagNavLinks';
import { floppyNavigation } from '@/utils';

type Props = {
  section: 'user' | 'community';
};

const CommunityNavSection: FC<Props> = ({ section }) => {
  const { t } = useTranslation('translation');
  const { pathname } = useLocation();
  const branding = brandingStore((s) => s.branding);
  const user = loggedUserInfoStore((s) => s.user);
  const { tagLinks, isLoading: tagsLoading } = useCategoryTagNavLinks();

  const links = useMemo(() => {
    if (section === 'user') {
      return getLeftNavUserLinks(branding, t, user);
    }
    return tagLinks;
  }, [branding, section, t, tagLinks, user]);

  if (section === 'community' && tagsLoading && !links.length) {
    return (
      <>
        <div className="side-nav__section-label">
          {t('community_nav.community_section')}
        </div>
        <div className="d-flex align-items-center gap-2 px-3 py-2 small text-secondary">
          <Spinner animation="border" size="sm" role="status" />
          {t('header.nav.popular_tags_loading')}
        </div>
      </>
    );
  }

  if (!links.length) {
    return null;
  }

  const sectionLabel =
    section === 'user'
      ? t('community_nav.user_section')
      : t('community_nav.community_section');

  return (
    <>
      <div className="side-nav__section-label">{sectionLabel}</div>
      {links.map((link) => (
        <NavLink
          key={`${section}-${link.to}-${link.label}`}
          to={link.to}
          className={() =>
            link.isActive && link.isActive(pathname)
              ? 'nav-link active'
              : 'nav-link'
          }
          onClick={floppyNavigation.handleRouteLinkClick}>
          {link.icon ? <Icon name={link.icon} className="me-2" /> : null}
          <span>{link.label}</span>
        </NavLink>
      ))}
    </>
  );
};

export default memo(CommunityNavSection);
