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

import { CSSProperties, RefObject, useEffect, useState } from 'react';

function getStickyTopOffset(): number {
  const shell = document.querySelector('.community-ui');
  const styles = shell
    ? getComputedStyle(shell)
    : getComputedStyle(document.documentElement);
  const headerH = parseFloat(styles.getPropertyValue('--cm-header-h'));
  return (Number.isFinite(headerH) ? headerH : 64) + 16;
}

export function useSidebarSticky(
  enabled: boolean,
  railRef: RefObject<HTMLDivElement | null>,
): CSSProperties {
  const [tocStyle, setTocStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (!enabled) {
      setTocStyle({});
      return undefined;
    }

    let frame = 0;

    const update = () => {
      const rail = railRef.current;
      if (!rail) {
        return;
      }

      const toc = rail.querySelector('.content-toc') as HTMLElement | null;
      const bounds = rail.closest('.post-body-with-toc') as HTMLElement | null;
      if (!toc || !bounds) {
        setTocStyle({});
        return;
      }

      const topOffset = getStickyTopOffset();
      const railRect = rail.getBoundingClientRect();
      const boundsRect = bounds.getBoundingClientRect();
      const tocHeight = toc.getBoundingClientRect().height;
      const maxTop = boundsRect.bottom - tocHeight;
      const shouldFix = railRect.top <= topOffset && maxTop >= topOffset;

      if (shouldFix) {
        setTocStyle({
          position: 'fixed',
          top: topOffset,
          left: railRect.left,
          width: railRect.width,
          zIndex: 20,
        });
      } else {
        setTocStyle({});
      }
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    scheduleUpdate();
    window.addEventListener('scroll', scheduleUpdate, {
      passive: true,
      capture: true,
    });
    window.addEventListener('resize', scheduleUpdate);

    const observer = new ResizeObserver(scheduleUpdate);
    const rail = railRef.current;
    if (rail) {
      observer.observe(rail);
      const bounds = rail.closest('.post-body-with-toc');
      if (bounds) {
        observer.observe(bounds);
      }
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleUpdate, { capture: true });
      window.removeEventListener('resize', scheduleUpdate);
      observer.disconnect();
    };
  }, [enabled, railRef]);

  return tocStyle;
}
