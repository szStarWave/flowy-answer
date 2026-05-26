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
  isHeaderHomeTabActive,
  isTagSlugActive,
} from '@/components/Header/headerNav';

export type CommunityNavLink = {
  label: string;
  to: string;
  icon?: string;
  isActive?: (pathname: string) => boolean;
};

type WishNavUser = {
  is_admin?: boolean;
  role_id?: number;
};

/** Admin or moderator — may see the community left sidebar. */
export function isStaffUser(user?: WishNavUser | null): boolean {
  if (!user) {
    return false;
  }
  return !!(user.is_admin || user.role_id === 2 || user.role_id === 3);
}

export function canAccessWishNav(user?: WishNavUser | null): boolean {
  return isStaffUser(user);
}

function isWishNavTarget(to: string): boolean {
  const path = to.split('?')[0];
  return path === '/wishes' || path.startsWith('/wishes/');
}

function isUsersNavTarget(to: string): boolean {
  const path = to.split('?')[0];
  return path === '/users' || path.startsWith('/users/');
}

function getUsersNavLink(t: TFunction): CommunityNavLink {
  return {
    label: t('header.nav.user'),
    to: '/users',
    icon: 'people-fill',
    isActive: (pathname) => isUsersNavTarget(pathname),
  };
}

/** Inserts the users link directly under home when missing from configured nav. */
function ensureUsersLinkAfterHome(
  links: CommunityNavLink[],
  usersLink: CommunityNavLink,
): CommunityNavLink[] {
  if (links.some((link) => isUsersNavTarget(link.to))) {
    return links;
  }
  const homeIdx = links.findIndex(
    (link) => link.to === '/' || link.to === '/questions',
  );
  const insertAt = homeIdx >= 0 ? homeIdx + 1 : 0;
  return [...links.slice(0, insertAt), usersLink, ...links.slice(insertAt)];
}

function tagLandingPath(tagSlug: string): string {
  const slug = tagSlug?.trim();
  if (!slug) {
    return '/';
  }
  return pathFactory.tagLanding(slug);
}

export function tagInfoToNavLink(tag: {
  slug_name: string;
  display_name?: string;
}): CommunityNavLink {
  const slug = tag.slug_name;
  return {
    label: tag.display_name?.trim() || slug,
    to: tagLandingPath(slug),
    isActive: (pathname) => isTagSlugActive(pathname, slug),
  };
}

/** Slug for the 许愿功能 category tag (matches top nav when slug_name is `wishfunction`). */
export const WISH_FEATURE_TAG_SLUG = 'wishfunction';

export function isWishFeatureTag(tag: {
  slug_name?: string;
  display_name?: string;
}): boolean {
  const slug = tag.slug_name?.trim().replace(/^\/+/, '') ?? '';
  return slug === WISH_FEATURE_TAG_SLUG;
}

export function findWishFeatureTag<
  T extends { slug_name?: string; display_name?: string },
>(tags: T[] | undefined): T | undefined {
  return tags?.find(isWishFeatureTag);
}

/** Tag landing path for 许愿功能 — same route as the top bar category tab. */
export function wishFeatureTagLandingPath(
  tag?: { slug_name?: string; display_name?: string } | null,
): string {
  if (tag?.slug_name?.trim()) {
    return tagInfoToNavLink({
      slug_name: tag.slug_name,
      display_name: tag.display_name,
    }).to;
  }
  return pathFactory.tagLanding(WISH_FEATURE_TAG_SLUG);
}

function resolveNavTarget(item: BrandingCommunityNavItem): string {
  const path = item.path?.trim();
  if (path) {
    return path.startsWith('/') ? path : `/${path}`;
  }
  return tagLandingPath(item.tag_slug);
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

export function getHomeNavLink(t: TFunction): CommunityNavLink {
  return {
    label: t('header.tabs.home'),
    to: '/',
    isActive: isHeaderHomeTabActive,
  };
}

/** @deprecated Top bar tabs are built from live tags via useTopNavLinks; home only for legacy callers. */
export function getTopNavLinks(
  _branding: AdminSettingBranding,
  t: TFunction,
): CommunityNavLink[] {
  return [getHomeNavLink(t)];
}

export function getLeftNavUserLinks(
  branding: AdminSettingBranding,
  t: TFunction,
  user?: WishNavUser | null,
): CommunityNavLink[] {
  const showWish = canAccessWishNav(user);
  const usersLink = getUsersNavLink(t);
  const items = branding.left_nav_user?.filter((row) => row.label?.trim());
  if (items?.length) {
    const links = items
      .map(navItemFromBranding)
      .filter((link) => showWish || !isWishNavTarget(link.to));
    return ensureUsersLinkAfterHome(links, usersLink);
  }
  const links: CommunityNavLink[] = [
    {
      label: t('header.tabs.home'),
      to: '/',
      icon: 'house-fill',
      isActive: (pathname) => pathname === '/' || pathname === '/questions',
    },
    usersLink,
  ];
  if (showWish) {
    links.push({
      label: t('wish.title'),
      to: '/wishes',
      icon: 'stars',
      isActive: (pathname) =>
        pathname === '/wishes' || pathname.startsWith('/wishes/'),
    });
  }
  if (UI_FEATURE_FLAGS.showBadges) {
    links.push({
      label: t('header.nav.badges'),
      to: '/badges',
      icon: 'award-fill',
    });
  }
  return links;
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

/** Question / answer detail pages that use the wide fluid main column. */
export function isQuestionDetailPath(pathname: string): boolean {
  if (!pathname.startsWith('/questions/')) {
    return false;
  }
  if (pathname.startsWith('/questions/linked/')) {
    return false;
  }
  const rest = pathname.slice('/questions/'.length);
  if (!rest || rest.includes('/edit')) {
    return false;
  }
  const segments = rest.split('/').filter(Boolean);
  return segments.length >= 1 && segments.length <= 3;
}
