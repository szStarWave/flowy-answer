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

/** First path segment after `/tags/`, URI-decoded (handles `%E6%A1%88...` vs Unicode pathname). */
function decodedTagSlugFromPathname(pathname: string): string | null {
  const prefix = '/tags/';
  if (!pathname.startsWith(prefix)) {
    return null;
  }
  const rest = pathname.slice(prefix.length);
  const segment = rest.split('/')[0];
  if (!segment) {
    return null;
  }
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export function getHeaderHomePath(): string {
  return '/';
}

export function isHeaderHomeTabActive(pathname: string): boolean {
  return pathname === '/' || pathname === '/questions';
}

/** Whether pathname is the tag landing for the given slug. */
export function isTagSlugActive(pathname: string, tagSlug: string): boolean {
  const slug = decodedTagSlugFromPathname(pathname);
  return slug === tagSlug;
}
