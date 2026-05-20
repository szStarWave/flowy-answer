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

import type { WishListResp, WishPeriodListResp } from '@/common/interface';
import request from '@/utils/request';

export const getAdminWishPeriods = () => {
  return request.get<WishPeriodListResp>('/answer/admin/api/wish/periods');
};

export const addAdminWishPeriod = (params: {
  title: string;
  description?: string;
  status?: number;
  sort_order?: number;
}) => {
  return request.post('/answer/admin/api/wish/period', params);
};

export const updateAdminWishPeriod = (params: {
  id: number;
  title: string;
  description?: string;
  status: number;
  sort_order?: number;
}) => {
  return request.put('/answer/admin/api/wish/period', params);
};

export const deleteAdminWishPeriod = (params: { id: number }) => {
  return request.delete('/answer/admin/api/wish/period', params);
};

export const setCurrentAdminWishPeriod = (params: { id: number }) => {
  return request.put('/answer/admin/api/wish/period/current', params);
};

export const getAdminWishPage = (params: {
  period_id?: number;
  page: number;
  page_size: number;
}) => {
  return request.get<WishListResp>('/answer/admin/api/wishes/page', { params });
};

export const addAdminWish = (params: {
  period_id: number;
  title: string;
  description?: string;
  discussion_count?: number;
  sort_order?: number;
}) => {
  return request.post('/answer/admin/api/wish', params);
};

export const updateAdminWish = (params: {
  id: number;
  title: string;
  description?: string;
  discussion_count?: number;
  status: number;
  sort_order?: number;
}) => {
  return request.put('/answer/admin/api/wish', params);
};

export const deleteAdminWish = (params: { id: number }) => {
  return request.delete('/answer/admin/api/wish', params);
};
