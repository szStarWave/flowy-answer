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

import defaultHomeBanner from '@/assets/index.png';
import flowyHomeBanner from '@/assets/flowy.png';
import gmkHomeBanner from '@/assets/gmk.png';

/** 品牌横幅资源（按品牌区分，非按部署渠道） */
const BRAND_HOME_BANNERS: Record<string, string> = {
  flowy: flowyHomeBanner,
  gmk: gmkHomeBanner,
};

/**
 * 构建/部署渠道 -> 品牌横幅
 * international-* 与国际版镜像 tag 对应，横幅与同名品牌一致
 */
const CHANNEL_BANNER_ALIASES: Record<string, string> = {
  'international-flowy': 'flowy',
  'international-gmk': 'gmk',
};

function resolveBannerBrand(channel: string): string {
  return CHANNEL_BANNER_ALIASES[channel] ?? channel;
}

export function getActiveChannel(): string {
  return (process.env.REACT_APP_CHANNEL || 'flowy').trim().toLowerCase();
}

export function getChannelHomeBanner(channel = getActiveChannel()): string {
  const brand = resolveBannerBrand(channel);
  return BRAND_HOME_BANNERS[brand] ?? defaultHomeBanner;
}
