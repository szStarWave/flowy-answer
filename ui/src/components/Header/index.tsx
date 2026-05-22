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

import { FC, memo, useState, useEffect, useSyncExternalStore } from 'react';
import { Navbar, Nav } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

import classnames from 'classnames';

import { userCenter, floppyNavigation, isLight } from '@/utils';
import { useCommunityShellEnabled, useStaffSideNav } from '@/hooks';
import {
  loggedUserInfoStore,
  siteInfoStore,
  brandingStore,
  loginSettingStore,
  themeSettingStore,
  sideNavStore,
} from '@/stores';
import { logout, useQueryNotificationStatus } from '@/services';
import { MobileSideNav } from '@/components';

import NavItems from './components/NavItems';
import HeaderTopTabs from './components/HeaderTopTabs';
import ThemeToggle from './ThemeToggle';

import './index.scss';

function subscribeHtmlTheme(cb: () => void) {
  const el = document.documentElement;
  const obs = new MutationObserver(cb);
  obs.observe(el, { attributes: true, attributeFilter: ['data-bs-theme'] });
  return () => obs.disconnect();
}

function getHtmlTheme(): 'light' | 'dark' {
  const t = document.documentElement.getAttribute('data-bs-theme');
  return t === 'dark' ? 'dark' : 'light';
}

const Header: FC = () => {
  const location = useLocation();
  const htmlTheme = useSyncExternalStore(
    subscribeHtmlTheme,
    getHtmlTheme,
    () => 'light' as const,
  );
  const { user, clear: clearUserStore } = loggedUserInfoStore();
  const { t } = useTranslation();
  const siteInfo = siteInfoStore((state) => state.siteInfo);
  const brandingInfo = brandingStore((state) => state.branding);
  const loginSetting = loginSettingStore((state) => state.login);
  const { updateReview } = sideNavStore();
  const { data: redDot } = useQueryNotificationStatus();
  const [showMobileSideNav, setShowMobileSideNav] = useState(false);

  useEffect(() => {
    updateReview({
      can_revision: Boolean(redDot?.can_revision),
      revision: Number(redDot?.revision),
    });
  }, [redDot]);

  const handleLogout = async (evt) => {
    evt.preventDefault();
    await logout();
    clearUserStore();
    window.location.replace(window.location.href);
  };

  useEffect(() => {
    setShowMobileSideNav(false);
  }, [location.pathname]);

  let navbarStyle = 'theme-light';
  let themeMode = 'light';
  const { theme, theme_config, layout } = themeSettingStore((_) => _);
  const isCommunityShell = useCommunityShellEnabled();
  const showCommunitySideNav = useStaffSideNav();
  const isAdminRoute = location.pathname.includes('/admin');
  const showSideNavToggle =
    isAdminRoute || !isCommunityShell || showCommunitySideNav;
  if (isCommunityShell) {
    themeMode = htmlTheme;
    navbarStyle = `theme-${themeMode}`;
  } else if (theme_config?.[theme]?.navbar_style) {
    themeMode = isLight(theme_config[theme].navbar_style) ? 'light' : 'dark';
    navbarStyle = `theme-${themeMode}`;
  }

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1199.9) {
        setShowMobileSideNav(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <Navbar
      data-bs-theme={themeMode}
      expand="xl"
      className={classnames('sticky-top', navbarStyle)}
      style={
        isCommunityShell
          ? undefined
          : {
              backgroundColor: theme_config[theme]?.navbar_style,
            }
      }
      id="header">
      <div
        className={classnames(
          'w-100 d-flex align-items-center',
          layout === 'Fixed-width' && !isCommunityShell
            ? 'container-xxl fixed-width'
            : 'px-3',
        )}>
        {showSideNavToggle ? (
          <Navbar.Toggle
            className="answer-navBar me-2"
            onClick={() => {
              setShowMobileSideNav(!showMobileSideNav);
            }}
          />
        ) : null}

        <Navbar.Brand
          to="/"
          as={Link}
          className="lh-1 me-0 me-lg-3 p-0 nav-text flex-shrink-0"
          onClick={floppyNavigation.handleRouteLinkClick}>
          {brandingInfo.logo ? (
            <>
              <img
                className="d-none d-xl-block logo me-0"
                src={brandingInfo.logo}
                alt={siteInfo.name}
              />

              <img
                className="xl-none logo me-0"
                src={brandingInfo.mobile_logo || brandingInfo.logo}
                alt={siteInfo.name}
              />
            </>
          ) : (
            <span>{siteInfo.name}</span>
          )}
        </Navbar.Brand>

        <div className="header-toolbar-center d-none d-lg-flex align-items-center flex-grow-1 min-w-0 ms-lg-1 me-lg-2">
          <HeaderTopTabs />
        </div>

        <div className="d-flex align-items-center gap-1 me-2 ms-auto d-lg-none">
          <ThemeToggle />
        </div>
        {/* pc nav */}
        <div className="d-none d-lg-flex align-items-center me-2">
          <ThemeToggle />
        </div>

        {user?.username ? (
          <Nav className="d-flex align-items-center flex-nowrap flex-row">
            <NavItems redDot={redDot} userInfo={user} logOut={handleLogout} />
          </Nav>
        ) : (
          <>
            <Link
              className={classnames('me-2 btn btn-link', {
                'link-light': navbarStyle === 'theme-dark',
                'link-primary': navbarStyle !== 'theme-dark',
              })}
              onClick={() => floppyNavigation.storageLoginRedirect()}
              to={userCenter.getLoginUrl()}>
              {t('btns.login')}
            </Link>
            {loginSetting.allow_new_registrations && (
              <Link
                className={classnames(
                  'btn',
                  navbarStyle === 'theme-dark' ? 'btn-light' : 'btn-primary',
                )}
                to={userCenter.getSignUpUrl()}>
                {t('btns.signup')}
              </Link>
            )}
          </>
        )}
      </div>

      {showSideNavToggle ? (
        <MobileSideNav show={showMobileSideNav} onHide={setShowMobileSideNav} />
      ) : null}
    </Navbar>
  );
};

export default memo(Header);
