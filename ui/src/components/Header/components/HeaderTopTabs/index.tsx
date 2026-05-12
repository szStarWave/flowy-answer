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
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import classnames from 'classnames';

import { floppyNavigation } from '@/utils';
import {
  getHeaderHomePath,
  getOfficialAnnouncementsPath,
  getQualityCasesPath,
  isHeaderAnnouncementsTabActive,
  isHeaderHomeTabActive,
  isHeaderQualityCasesTabActive,
} from '@/components/Header/headerNav';

const HeaderTopTabs: FC = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'header.tabs' });
  const { pathname } = useLocation();

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    classnames('nav-link header-top-tabs__link py-2 px-2 px-xl-3', {
      active: isActive,
    });

  return (
    <nav
      className="header-top-tabs nav flex-nowrap align-items-center"
      aria-label={t('aria')}>
      <NavLink
        className={tabClass}
        end
        to={getHeaderHomePath()}
        isActive={() => isHeaderHomeTabActive(pathname)}
        onClick={floppyNavigation.handleRouteLinkClick}>
        {t('home')}
      </NavLink>
      <NavLink
        className={tabClass}
        to={getOfficialAnnouncementsPath()}
        isActive={() => isHeaderAnnouncementsTabActive(pathname)}
        onClick={floppyNavigation.handleRouteLinkClick}>
        {t('official_announcements')}
      </NavLink>
      <NavLink
        className={tabClass}
        to={getQualityCasesPath()}
        isActive={() => isHeaderQualityCasesTabActive(pathname)}
        onClick={floppyNavigation.handleRouteLinkClick}>
        {t('quality_cases')}
      </NavLink>
    </nav>
  );
};

export default memo(HeaderTopTabs);
