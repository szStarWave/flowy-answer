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
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ElementRef,
} from 'react';
import { useTranslation } from 'react-i18next';

import classNames from 'classnames';
import {
  MDXEditor,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  codeBlockPlugin,
  codeMirrorPlugin,
  CreateLink,
  headingsPlugin,
  imagePlugin,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  Separator,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
  ListsToggle,
} from '@mdxeditor/editor';

import '@mdxeditor/editor/style.css';

import type { BaseEditorProps } from './types';
import { useMdxEditorTranslation } from './mdxEditorI18n';
import MdxPostImageDialog from './MdxPostImageDialog';
import { Help } from './ToolBars';

function subscribeHtmlTheme(cb: () => void) {
  const el = document.documentElement;
  const obs = new MutationObserver(cb);
  obs.observe(el, { attributes: true, attributeFilter: ['data-bs-theme'] });
  return () => obs.disconnect();
}

function getHtmlTheme(): 'light' | 'dark' {
  const t = document.documentElement.getAttribute('data-bs-theme');
  return t === 'dark' ? 'dark' : 'light';
}

export interface MdxVisualPostEditorProps extends BaseEditorProps {
  onImageUpload?: (file: File) => Promise<string>;
}

function PostToolbar() {
  return (
    <>
      <UndoRedo />
      <Separator />
      <BoldItalicUnderlineToggles />
      <Separator />
      <ListsToggle />
      <Separator />
      <BlockTypeSelect />
      <Separator />
      <CreateLink />
      <InsertImage />
      <Separator />
      <InsertTable />
      <InsertThematicBreak />
      <Separator />
      <InsertCodeBlock />
      <div className="community-md-editor__help">
        <Help />
      </div>
    </>
  );
}

const postToolbarContents = () => <PostToolbar />;

const MdxVisualPostEditor: FC<MdxVisualPostEditorProps> = ({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  autoFocus,
  onEditorReady,
  onImageUpload,
}) => {
  const editorRef = useRef<ElementRef<typeof MDXEditor>>(null);
  const lastEmittedRef = useRef<string | undefined>(undefined);
  const { t: tCodeLang } = useTranslation('translation', {
    keyPrefix: 'mdx_editor.code_languages',
  });
  const mdxTranslation = useMdxEditorTranslation();
  const htmlTheme = useSyncExternalStore(
    subscribeHtmlTheme,
    getHtmlTheme,
    () => 'light' as const,
  );

  const codeBlockLanguages = useMemo(
    () => ({
      text: tCodeLang('text', 'Plain text'),
      md: tCodeLang('md', 'Markdown'),
      mermaid: tCodeLang('mermaid', 'Mermaid'),
      math: tCodeLang('math', 'Math'),
      latex: tCodeLang('latex', 'LaTeX'),
      tex: tCodeLang('tex', 'TeX'),
      js: tCodeLang('js', 'JavaScript'),
      ts: tCodeLang('ts', 'TypeScript'),
      tsx: tCodeLang('tsx', 'TypeScript (React)'),
      jsx: tCodeLang('jsx', 'JavaScript (React)'),
      json: tCodeLang('json', 'JSON'),
      html: tCodeLang('html', 'HTML'),
      css: tCodeLang('css', 'CSS'),
      go: tCodeLang('go', 'Go'),
      python: tCodeLang('python', 'Python'),
      bash: tCodeLang('bash', 'Shell'),
      sql: tCodeLang('sql', 'SQL'),
      yaml: tCodeLang('yaml', 'YAML'),
      xml: tCodeLang('xml', 'XML'),
    }),
    [tCodeLang],
  );

  const plugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      markdownShortcutPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      imagePlugin(
        onImageUpload
          ? {
              imageUploadHandler: (file: File) => onImageUpload(file),
              ImageDialog: MdxPostImageDialog,
            }
          : { ImageDialog: MdxPostImageDialog },
      ),
      tablePlugin(),
      codeBlockPlugin({ defaultCodeBlockLanguage: 'text' }),
      codeMirrorPlugin({
        codeBlockLanguages,
      }),
      toolbarPlugin({ toolbarContents: postToolbarContents }),
    ],
    [codeBlockLanguages, mdxTranslation, onImageUpload],
  );

  const handleChange = useCallback(
    (md: string) => {
      lastEmittedRef.current = md;
      onChange?.(md);
    },
    [onChange],
  );

  useEffect(() => {
    if (lastEmittedRef.current === undefined) {
      lastEmittedRef.current = value;
      return;
    }
    if (value !== lastEmittedRef.current) {
      editorRef.current?.setMarkdown(value || '');
      lastEmittedRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    onEditorReady?.(null);
  }, [onEditorReady]);

  return (
    <div className="mdx-visual-post-editor" onFocusCapture={() => onFocus?.()}>
      <MDXEditor
        ref={editorRef}
        className={classNames(
          'mdx-visual-post-editor__root',
          htmlTheme === 'dark' && 'dark-theme',
        )}
        markdown={value || ''}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder ?? ''}
        autoFocus={autoFocus}
        translation={mdxTranslation}
        plugins={plugins}
      />
    </div>
  );
};

export default MdxVisualPostEditor;
