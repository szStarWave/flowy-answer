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

import { Icon } from '@/components';
import { brandingStore } from '@/stores';
import {
  getLeftNavCommunityLinks,
  getLeftNavUserLinks,
} from '@/config/communityNav';
import { floppyNavigation } from '@/utils';

type Props = {
  section: 'user' | 'community';
};

const CommunityNavSection: FC<Props> = ({ section }) => {
  const { t } = useTranslation('translation');
  const { pathname } = useLocation();
  const branding = brandingStore((s) => s.branding);

  const links = useMemo(() => {
    if (section === 'user') {
      return getLeftNavUserLinks(branding, t);
    }
    return getLeftNavCommunityLinks(branding);
  }, [branding, section, t]);

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
