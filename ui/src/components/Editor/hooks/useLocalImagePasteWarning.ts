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

import { toastStore } from '@/stores';
import { findLocalImagePathsInClipboard } from '../utils/localImagePaths';

export const useLocalImagePasteWarning = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'editor' });

  const warnOnPaste = useCallback(
    (event: React.ClipboardEvent | ClipboardEvent) => {
      const clipboard = 'clipboardData' in event ? event.clipboardData : null;
      const paths = findLocalImagePathsInClipboard(clipboard);
      if (paths.length === 0) {
        return;
      }
      toastStore.getState().show({
        msg: t('image.local_path_paste_warning', { count: paths.length }),
        variant: 'warning',
      });
    },
    [t],
  );

  return { warnOnPaste };
};
