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

import {
  CSSProperties,
  FC,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';

import classNames from 'classnames';

import type { ContentHeading } from '@/common/interface';

import { useSidebarSticky } from './useSidebarSticky';

import './index.scss';

type TocTreeNode = {
  heading: ContentHeading;
  children: TocTreeNode[];
};

/** Build nested TOC from flat heading list (goldmark order, levels 1–6). */
function buildTocTree(headings: ContentHeading[]): TocTreeNode[] {
  const root: TocTreeNode[] = [];
  const stack: TocTreeNode[] = [];

  headings.forEach((h) => {
    const node: TocTreeNode = { heading: h, children: [] };
    while (
      stack.length > 0 &&
      stack[stack.length - 1].heading.level >= h.level
    ) {
      stack.pop();
    }
    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  });
  return root;
}

export interface ContentTocProps {
  headings: ContentHeading[];
  contentRoot: HTMLElement | null;
  className?: string;
  style?: CSSProperties;
}

const ContentToc: FC<ContentTocProps> = ({
  headings,
  contentRoot,
  className,
  style,
}) => {
  const { t } = useTranslation('translation', { keyPrefix: 'question_detail' });
  const [activeId, setActiveId] = useState<string>('');
  const railRef = useRef<HTMLDivElement>(null);
  const isSidebar = className?.includes('content-toc--sidebar');
  const stickyStyle = useSidebarSticky(Boolean(isSidebar), railRef);

  const idList = useMemo(
    () => headings.map((h) => h.id).filter(Boolean),
    [headings],
  );

  const tocTree = useMemo(() => buildTocTree(headings), [headings]);

  const onLinkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault();
      if (!contentRoot || !id) {
        return;
      }
      const el = contentRoot.querySelector(`#${CSS.escape(id)}`);
      if (el && 'scrollIntoView' in el) {
        (el as HTMLElement).scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        try {
          window.history.replaceState(null, '', `#${encodeURIComponent(id)}`);
        } catch {
          /* ignore */
        }
        setActiveId(id);
      }
    },
    [contentRoot],
  );

  useEffect(() => {
    if (!contentRoot || idList.length === 0) {
      return undefined;
    }

    const elements = idList
      .map((id) => contentRoot.querySelector(`#${CSS.escape(id)}`))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((en) => en.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0 && visible[0].target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        root: null,
        rootMargin: '-15% 0px -70% 0px',
        threshold: [0, 0.25, 0.5, 1],
      },
    );

    elements.forEach((el) => {
      observer.observe(el);
    });
    return () => {
      observer.disconnect();
    };
  }, [contentRoot, idList]);

  if (!headings.length) {
    return null;
  }

  const renderBranch = (nodes: TocTreeNode[], depth: number): ReactNode => (
    <ul
      className={classNames(
        'list-unstyled mb-0',
        depth === 0 ? 'content-toc-list' : 'content-toc-sublist',
      )}>
      {nodes.map((n) => {
        const { heading: h } = n;
        return (
          <li
            key={`${h.id}-${h.level}-${h.text}`}
            className={classNames('content-toc-item', {
              'content-toc-item--active': activeId === h.id,
            })}>
            <a
              href={`#${encodeURIComponent(h.id)}`}
              className="content-toc-link link-secondary text-decoration-none"
              onClick={(e) => onLinkClick(e, h.id)}>
              {h.text}
            </a>
            {n.children.length > 0 ? renderBranch(n.children, depth + 1) : null}
          </li>
        );
      })}
    </ul>
  );

  const nav = (
    <nav
      className={classNames('content-toc small border rounded p-3', className, {
        'content-toc--floating': stickyStyle.position === 'fixed',
      })}
      style={{ ...style, ...stickyStyle }}
      aria-label={t('table_of_contents')}>
      <div className="content-toc-title fw-semibold mb-2 text-secondary">
        {t('table_of_contents')}
      </div>
      {renderBranch(tocTree, 0)}
    </nav>
  );

  if (isSidebar) {
    return (
      <div ref={railRef} className="content-toc-rail">
        {nav}
      </div>
    );
  }

  return nav;
};

export default memo(ContentToc);
