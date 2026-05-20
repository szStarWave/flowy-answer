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
  useRef,
  useState,
  ForwardRefRenderFunction,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useEffect,
} from 'react';
import { Spinner } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';

import classNames from 'classnames';

import {
  PluginType,
  useRenderPlugin,
  getReplacementPlugin,
} from '@/utils/pluginKit';
import { writeSettingStore } from '@/stores';

import { useImageUpload } from './hooks/useImageUpload';
import { htmlRender } from './utils';
import Viewer from './Viewer';
import MdxVisualPostEditor from './MdxVisualPostEditor';

import './index.scss';

export interface EditorRef {
  getHtml: () => string;
}

interface EventRef {
  onChange?(value: string): void;
  onFocus?(): void;
  onBlur?(): void;
}

interface Props extends EventRef {
  editorPlaceholder?;
  className?;
  value;
  autoFocus?: boolean;
}

const MDEditor: ForwardRefRenderFunction<EditorRef, Props> = (
  {
    editorPlaceholder = '',
    className = '',
    value,
    onChange,
    onFocus,
    onBlur,
    autoFocus = false,
  },
  ref,
) => {
  const location = useLocation();
  const previewRef = useRef<{ getHtml; element } | null>(null);
  const [fullEditorPlugin, setFullEditorPlugin] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { verifyImageSize, uploadSingleFile } = useImageUpload();
  const {
    max_image_size = 4,
    authorized_image_extensions = [],
    authorized_attachment_extensions = [],
  } = writeSettingStore((state) => state.write);

  useEffect(() => {
    let mounted = true;

    const loadPlugin = async () => {
      const plugin = await getReplacementPlugin(PluginType.EditorReplacement);
      if (mounted) {
        setFullEditorPlugin(plugin);
        setIsLoading(false);
      }
    };

    loadPlugin();

    return () => {
      mounted = false;
    };
  }, []);

  useRenderPlugin(previewRef.current?.element);

  const getHtml = useCallback(() => {
    return previewRef.current?.getHtml();
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      getHtml,
    }),
    [getHtml],
  );

  const handleVisualEditorImageUpload = useCallback(
    async (file: File) => {
      if (!verifyImageSize([file])) {
        throw new Error('File validation failed');
      }
      return uploadSingleFile(file);
    },
    [uploadSingleFile, verifyImageSize],
  );

  if (isLoading) {
    return (
      <div className={classNames('md-editor-wrap rounded', className)}>
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ minHeight: '200px' }}>
          <Spinner animation="border" variant="secondary" />
        </div>
      </div>
    );
  }

  if (fullEditorPlugin) {
    const FullEditorComponent = fullEditorPlugin.component;

    const handleImageUpload = async (file: File | string): Promise<string> => {
      if (typeof file === 'string') {
        return file;
      }

      if (!verifyImageSize([file])) {
        throw new Error('File validation failed');
      }

      return uploadSingleFile(file);
    };

    return (
      <FullEditorComponent
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={editorPlaceholder}
        autoFocus={autoFocus}
        imageUploadHandler={handleImageUpload}
        uploadConfig={{
          maxImageSizeMiB: max_image_size,
          allowedExtensions: [
            ...authorized_image_extensions,
            ...authorized_attachment_extensions,
          ],
        }}
      />
    );
  }

  const editorInstanceKey = location.pathname;

  return (
    <div className="md-editor-with-preview">
      <div
        className={classNames(
          'md-editor-wrap community-md-editor rounded',
          className,
        )}>
        <MdxVisualPostEditor
          key={editorInstanceKey}
          value={value}
          onChange={(markdown) => {
            onChange?.(markdown);
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={editorPlaceholder}
          autoFocus={autoFocus}
          onImageUpload={handleVisualEditorImageUpload}
          onEditorReady={() => {}}
        />
      </div>
      <div className="md-editor-preview-outer">
        <Viewer ref={previewRef} value={value} />
      </div>
    </div>
  );
};
export { htmlRender };
export default forwardRef(MDEditor);
