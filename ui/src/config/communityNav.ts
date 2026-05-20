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

import type { TFunction } from 'i18next';

import type {
  AdminSettingBranding,
  BrandingCommunityNavItem,
  BrandingQuickAccessItem,
} from '@/common/interface';
import { UI_FEATURE_FLAGS } from '@/common/featureFlags';
import { pathFactory } from '@/router/pathFactory';
import {
  getOfficialAnnouncementsPath,
  getQualityCasesPath,
  HEADER_ANNOUNCEMENTS_TAG_SLUG,
  HEADER_SHOWCASE_TAG_SLUG,
  isHeaderAnnouncementsTabActive,
  isHeaderHomeTabActive,
  isHeaderQualityCasesTabActive,
  isTagSlugActive,
} from '@/components/Header/headerNav';

export type CommunityNavLink = {
  label: string;
  to: string;
  icon?: string;
  isActive?: (pathname: string) => boolean;
};

function tagLandingPath(tagSlug: string): string {
  const slug = tagSlug?.trim();
  if (!slug) {
    return '/';
  }
  return pathFactory.tagLanding(slug);
}

function resolveNavTarget(item: BrandingCommunityNavItem): string {
  const path = item.path?.trim();
  if (path) {
    return path.startsWith('/') ? path : `/${path}`;
  }
  return tagLandingPath(item.tag_slug);
}

function isHomeNavItem(item: BrandingCommunityNavItem): boolean {
  return !item.tag_slug?.trim() && !item.path?.trim();
}

/** Top bar: home uses `/`; other items always link to a tag (ignore custom path). */
function topNavItemFromBranding(
  item: BrandingCommunityNavItem,
): CommunityNavLink {
  if (isHomeNavItem(item)) {
    return {
      label: item.label,
      to: '/',
      icon: item.icon,
      isActive: isHeaderHomeTabActive,
    };
  }
  const slug = item.tag_slug?.trim();
  if (!slug) {
    return {
      label: item.label,
      to: '/',
      isActive: isHeaderHomeTabActive,
    };
  }
  const to = tagLandingPath(slug);
  return {
    label: item.label,
    to,
    icon: item.icon,
    isActive: (pathname) => isTagSlugActive(pathname, slug),
  };
}

function navItemFromBranding(item: BrandingCommunityNavItem): CommunityNavLink {
  const to = resolveNavTarget(item);
  const path = item.path?.trim();
  const slug = item.tag_slug?.trim();

  return {
    label: item.label,
    to,
    icon: item.icon,
    isActive: (pathname) => {
      if (path) {
        return pathname === to || pathname.startsWith(`${to}/`);
      }
      if (!slug) {
        return isHeaderHomeTabActive(pathname);
      }
      const prefix = '/tags/';
      if (!pathname.startsWith(prefix)) {
        return false;
      }
      const segment = pathname.slice(prefix.length).split('/')[0];
      try {
        return decodeURIComponent(segment) === slug;
      } catch {
        return segment === slug;
      }
    },
  };
}

/** Default top tabs when Admin branding has no `top_nav` (home + tag channels). */
export function getDefaultTopNavLinks(t: TFunction): CommunityNavLink[] {
  return [
    {
      label: t('header.tabs.home'),
      to: '/',
      isActive: isHeaderHomeTabActive,
    },
    {
      label: t('header.tabs.official_announcements'),
      to: getOfficialAnnouncementsPath(),
      isActive: isHeaderAnnouncementsTabActive,
    },
    {
      label: t('header.tabs.quality_cases'),
      to: getQualityCasesPath(),
      isActive: isHeaderQualityCasesTabActive,
    },
  ];
}

export function getTopNavLinks(
  branding: AdminSettingBranding,
  t: TFunction,
): CommunityNavLink[] {
  const items = branding.top_nav?.filter((row) => row.label?.trim());
  if (!items?.length) {
    return getDefaultTopNavLinks(t);
  }
  return items.map((row) => {
    if (!row.path?.trim() && !row.tag_slug?.trim()) {
      return {
        label: row.label,
        to: '/',
        isActive: isHeaderHomeTabActive,
      };
    }
    return topNavItemFromBranding(row);
  });
}

export function getLeftNavUserLinks(
  branding: AdminSettingBranding,
  t: TFunction,
): CommunityNavLink[] {
  const items = branding.left_nav_user?.filter((row) => row.label?.trim());
  if (items?.length) {
    return items.map(navItemFromBranding);
  }
  return [
    {
      label: t('header.tabs.home'),
      to: '/',
      icon: 'house-fill',
      isActive: (pathname) => pathname === '/' || pathname === '/questions',
    },
    {
      label: t('wish.title'),
      to: '/wishes',
      icon: 'stars',
      isActive: (pathname) =>
        pathname === '/wishes' || pathname.startsWith('/wishes/'),
    },
    ...(UI_FEATURE_FLAGS.showBadges
      ? [
          {
            label: t('header.nav.badges'),
            to: '/badges',
            icon: 'award-fill',
          },
        ]
      : []),
  ];
}

export function getLeftNavCommunityLinks(
  branding: AdminSettingBranding,
): CommunityNavLink[] {
  const items = branding.left_nav_community?.filter((row) => row.label?.trim());
  return items?.length ? items.map(navItemFromBranding) : [];
}

export function resolveQuickAccessTo(item: BrandingQuickAccessItem): string {
  const path = item.path?.trim();
  if (path) {
    return path.startsWith('/') ? path : `/${path}`;
  }
  return tagLandingPath(item.tag_slug);
}

export function getQuickAccessItems(
  branding: AdminSettingBranding,
): BrandingQuickAccessItem[] {
  return branding.quick_access?.filter((row) => row.title?.trim()) ?? [];
}

export function hasConfiguredCommunitySidebar(branding: AdminSettingBranding) {
  return (branding.left_nav_community?.length ?? 0) > 0;
}

/** Site-wide community chrome (header, backgrounds) — not only SideNavLayout routes. */
export function isCommunityShellEnabled(): boolean {
  return true;
}

export const DEFAULT_TAG_SLUG_HINTS = {
  announcements: HEADER_ANNOUNCEMENTS_TAG_SLUG,
  showcase: HEADER_SHOWCASE_TAG_SLUG,
};
