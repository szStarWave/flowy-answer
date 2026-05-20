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

import useSWR from 'swr';

import type {
  WishListResp,
  WishPeriod,
  WishPeriodListResp,
  WishPeriodWithItems,
  WishItem,
} from '@/common/interface';
import request from '@/utils/request';

const WISH_PERIOD_OPEN = 2;

export const useWishPeriods = () => {
  return useSWR<WishPeriodListResp>(
    ['wish-periods'],
    () => request.get('/answer/api/v1/wish/periods'),
    { revalidateOnFocus: false },
  );
};

export const useCurrentWishPeriod = () => {
  return useSWR<WishPeriodWithItems>(
    ['wish-period-current'],
    () => request.get('/answer/api/v1/wish/period/current'),
    { revalidateOnFocus: true, shouldRetryOnError: false },
  );
};

export const useWishes = (periodId: number, page = 1, pageSize = 10) => {
  return useSWR<WishListResp>(
    periodId ? ['wishes', periodId, page, pageSize] : null,
    () =>
      request.get('/answer/api/v1/wishes', {
        params: { period_id: periodId, page, page_size: pageSize },
      }),
    { revalidateOnFocus: false },
  );
};

/** Homepage sidebar: current period widget with list fallback */
export const useHomeWishWidget = () => {
  const current = useCurrentWishPeriod();
  const periods = useWishPeriods();

  const fallbackPeriod = useMemo((): WishPeriod | undefined => {
    const list = periods.data?.list || [];
    if (!list.length) {
      return undefined;
    }
    return list.find((p) => p.is_current) || list[0];
  }, [periods.data?.list]);

  const period = current.data?.period || fallbackPeriod;
  const periodId = period?.id || 0;
  const needFallback =
    periodId > 0 && !(current.data?.items && current.data.items.length > 0);

  const fallbackWishes = useWishes(needFallback ? periodId : 0, 1, 5);

  const items: WishItem[] = useMemo(() => {
    if (current.data?.items?.length) {
      return current.data.items;
    }
    return fallbackWishes.data?.list?.slice(0, 5) || [];
  }, [current.data?.items, fallbackWishes.data?.list]);

  const isLoading =
    (current.isValidating || periods.isValidating) &&
    !period &&
    items.length === 0;

  const canVote = period?.status === WISH_PERIOD_OPEN;

  const mutate = async () => {
    await current.mutate();
    if (periodId) {
      await fallbackWishes.mutate();
    }
  };

  return {
    period,
    items,
    isLoading,
    canVote,
    mutate,
  };
};

export const voteWish = (wishId: number) => {
  return request.post<{ wish_id: number; vote_count: number; voted: boolean }>(
    '/answer/api/v1/wish/vote',
    { wish_id: wishId },
  );
};
