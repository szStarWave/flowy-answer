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

import { FC, memo, useCallback, useSyncExternalStore } from 'react';
import { Button } from 'react-bootstrap';

import { changeTheme, isDarkTheme } from '@/utils';
import { loggedUserInfoStore } from '@/stores';
import { updateUserInterface } from '@/services';
import { Icon } from '@/components';

const GUEST_THEME_KEY = 'flowy_guest_color_scheme';

function subscribeHtmlTheme(cb: () => void) {
  const el = document.documentElement;
  const obs = new MutationObserver(cb);
  obs.observe(el, { attributes: true, attributeFilter: ['data-bs-theme'] });
  return () => obs.disconnect();
}

const ThemeToggle: FC = () => {
  const user = loggedUserInfoStore((s) => s.user);
  const updateUser = loggedUserInfoStore((s) => s.update);
  const dark = useSyncExternalStore(
    subscribeHtmlTheme,
    () => isDarkTheme(),
    () => false,
  );

  const applyTheme = useCallback(
    (scheme: 'light' | 'dark') => {
      changeTheme(scheme);
      if (user?.access_token) {
        updateUser({ ...user, color_scheme: scheme });
        updateUserInterface({ color_scheme: scheme }).catch(() => undefined);
      } else {
        localStorage.setItem(GUEST_THEME_KEY, scheme);
      }
    },
    [updateUser, user],
  );

  const handleToggle = () => {
    applyTheme(isDarkTheme() ? 'light' : 'dark');
  };

  return (
    <Button
      variant="link"
      className="p-0 btn-no-border nav-link d-flex align-items-center justify-content-center theme-toggle-btn"
      title="theme"
      aria-label="theme"
      onClick={handleToggle}>
      <Icon name={dark ? 'sun-fill' : 'moon-fill'} className="fs-5" />
    </Button>
  );
};

export default memo(ThemeToggle);
