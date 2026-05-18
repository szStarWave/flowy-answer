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

import useSWR from 'swr';

import request from '@/utils/request';
import type * as Type from '@/common/interface';

const PAGE_SIZE = 20;

export const useQuerySensitiveWords = (page: number) => {
  const apiUrl = `/answer/admin/api/sensitive-words/page?page=${page}&page_size=${PAGE_SIZE}`;
  const { data, error, mutate } = useSWR<
    { count: number; list: Type.AdminSensitiveWordItem[] },
    Error
  >(apiUrl, request.instance.get);
  return {
    data,
    isLoading: !data && !error,
    error,
    mutate,
  };
};

export const addSensitiveWord = (word: string) => {
  return request.post('/answer/admin/api/sensitive-word', { word });
};

export const setSensitiveWordStatus = (id: number, status: number) => {
  return request.put('/answer/admin/api/sensitive-word/status', { id, status });
};

export const deleteSensitiveWord = (id: number) => {
  return request.delete('/answer/admin/api/sensitive-word', { id });
};
