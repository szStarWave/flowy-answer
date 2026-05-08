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

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * MDXEditor `translation` callback: (key, defaultValue, interpolations?) => string.
 * Keys follow MDXEditor defaults (e.g. toolbar.bold, createLink.url).
 * Strings live under `translation.mdx_editor.*` in locale YAML.
 */
export function useMdxEditorTranslation(): (
  key: string,
  defaultValue: string,
  interpolations?: Record<string, unknown>,
) => string {
  const { t } = useTranslation('translation', { keyPrefix: 'mdx_editor' });

  return useCallback(
    (key, defaultValue, interpolations = {}) =>
      String(t(key, { defaultValue, ...interpolations })),
    [t],
  );
}
