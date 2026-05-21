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

import { useMemo } from 'react';

import type { TFunction } from 'i18next';

import type { TagInfo } from '@/common/interface';
import {
  getHomeNavLink,
  tagInfoToNavLink,
  type CommunityNavLink,
} from '@/config/communityNav';
import { useQueryTags } from '@/services';

/** Same query as sidebar category tags — keeps top tabs and side nav in sync. */
export const CATEGORY_TAG_NAV_QUERY = {
  page: 1,
  page_size: 200,
  query_cond: 'category',
} as const;

export function useCategoryTagNavLinks() {
  const { data, error, isLoading } = useQueryTags(CATEGORY_TAG_NAV_QUERY);

  const tagLinks = useMemo(() => {
    if (!data?.list?.length) {
      return [] as CommunityNavLink[];
    }
    const seen = new Set<string>();
    return (data.list as TagInfo[]).reduce<CommunityNavLink[]>((links, row) => {
      if (!row?.slug_name || seen.has(row.slug_name)) {
        return links;
      }
      seen.add(row.slug_name);
      links.push(tagInfoToNavLink(row));
      return links;
    }, []);
  }, [data]);

  return {
    tagLinks,
    isLoading,
    error,
    total: data?.count ?? tagLinks.length,
  };
}

export function useTopNavLinks(t: TFunction) {
  const { tagLinks, isLoading } = useCategoryTagNavLinks();
  const tabs = useMemo(() => [getHomeNavLink(t), ...tagLinks], [t, tagLinks]);
  return { tabs, isLoading };
}
