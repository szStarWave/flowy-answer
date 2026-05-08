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
  forwardRef,
  useEffect,
  useRef,
  useState,
  memo,
  useImperativeHandle,
} from 'react';
import { useTranslation } from 'react-i18next';

import ImgViewer from '@/components/ImgViewer';
import ContentToc from '@/components/ContentToc';
import type { ContentHeading } from '@/common/interface';
import { renderPostMarkdown } from '@/services';

import { htmlRender } from './utils';

let scrollTop = 0;
let renderTimer: ReturnType<typeof setTimeout>;

const Index = ({ value }, ref) => {
  const [html, setHtml] = useState('');
  const [outline, setOutline] = useState<ContentHeading[]>([]);
  const [tocRoot, setTocRoot] = useState<HTMLElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation('translation', { keyPrefix: 'messages' });

  const renderMarkdown = (markdown: string) => {
    clearTimeout(renderTimer);
    const timeout = renderTimer ? 1000 : 0;
    renderTimer = setTimeout(() => {
      renderPostMarkdown(markdown)
        .then((resp) => {
          scrollTop = previewRef.current?.scrollTop || 0;
          if (typeof resp === 'string') {
            setHtml(resp);
            setOutline([]);
            return;
          }
          setHtml(resp.html);
          setOutline(resp.content_outline ?? []);
        })
        .catch(() => {
          setHtml('');
          setOutline([]);
        });
    }, timeout);
  };
  useEffect(() => {
    renderMarkdown(value);
  }, [value]);

  useEffect(() => {
    if (!html) {
      return;
    }

    previewRef.current?.scrollTo(0, scrollTop);

    htmlRender(previewRef.current, {
      copySuccessText: t('copied', { keyPrefix: 'messages' }),
      copyText: t('copy', { keyPrefix: 'messages' }),
    });
  }, [html, t]);

  useImperativeHandle(ref, () => {
    return {
      getHtml: () => html,
      element: previewRef.current,
    };
  });

  return (
    <ImgViewer className="md-editor-preview-stack">
      {outline.length > 0 && (
        <ContentToc
          className="d-xl-none mb-2 w-100"
          headings={outline}
          contentRoot={tocRoot}
        />
      )}
      <div className="d-flex flex-column flex-xl-row gap-2 align-items-start editor-preview-scroll-region">
        {outline.length > 0 && (
          <ContentToc
            className="flex-shrink-0 d-none d-xl-block"
            style={{ width: '12rem' }}
            headings={outline}
            contentRoot={tocRoot}
          />
        )}
        <div className="flex-grow-1 min-w-0 w-100 editor-preview-scroll-column">
          <div
            ref={(el: HTMLDivElement | null) => {
              previewRef.current = el;
              setTocRoot(el);
            }}
            className="preview-wrap position-relative p-3 rounded text-break text-wrap mt-2 fmt bg-body-tertiary bg-opacity-25"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </ImgViewer>
  );
};

export default memo(forwardRef(Index));
