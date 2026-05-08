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
 * "AS IS" BASIS, WITHOUT WARRANTIES OR ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { Button, Form, Modal, Tab, Tabs } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import {
  allowSetImageDimensions$,
  closeImageDialog$,
  imageDialogState$,
  saveImage$,
  useCellValues,
  usePublisher,
} from '@mdxeditor/editor';

import { useImageUpload } from './hooks/useImageUpload';

/** Bootstrap modal replacement for MDXEditor's default Radix image dialog; matches legacy CodeMirror image flow. */
const MdxPostImageDialog: FC = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'editor' });
  const { t: tForm } = useTranslation('translation', { keyPrefix: 'form' });
  const [state, allowSetImageDimensions] = useCellValues(
    imageDialogState$,
    allowSetImageDimensions$,
  );
  const saveImage = usePublisher(saveImage$);
  const closeDialog = usePublisher(closeImageDialog$);
  const { verifyImageSize, uploadSingleFile } = useImageUpload();

  const [currentTab, setCurrentTab] = useState<string>('localImage');
  const [srcUrl, setSrcUrl] = useState('');
  const [altText, setAltText] = useState('');
  /** HTML image title; legacy CodeMirror dialog only had alt, not title. */
  const [titleAttr, setTitleAttr] = useState('');
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [srcInvalid, setSrcInvalid] = useState(false);
  const [fileInvalid, setFileInvalid] = useState(false);
  const wasInactiveRef = useRef(true);

  const resetForm = useCallback(() => {
    setCurrentTab('localImage');
    setSrcUrl('');
    setAltText('');
    setTitleAttr('');
    setWidth('');
    setHeight('');
    setSelectedFile(null);
    setSrcInvalid(false);
    setFileInvalid(false);
  }, []);

  useEffect(() => {
    if (state.type === 'inactive') {
      wasInactiveRef.current = true;
      resetForm();
      return;
    }
    const justOpened = wasInactiveRef.current;
    wasInactiveRef.current = false;
    if (!justOpened) {
      return;
    }
    if (state.type === 'editing' && state.initialValues) {
      const iv = state.initialValues;
      setSrcUrl(iv.src ?? '');
      setAltText(iv.altText ?? '');
      setTitleAttr(iv.title ?? '');
      setWidth(iv.width != null ? String(iv.width) : '');
      setHeight(iv.height != null ? String(iv.height) : '');
      setSelectedFile(null);
      setCurrentTab('remoteImage');
      setSrcInvalid(false);
      setFileInvalid(false);
      return;
    }
    if (state.type === 'new') {
      resetForm();
    }
  }, [state, resetForm]);

  const handleHide = () => {
    closeDialog();
    resetForm();
  };

  const savePayloadForSrc = (src: string) => ({
    src,
    altText,
    title: titleAttr,
    file: undefined as undefined,
    ...(allowSetImageDimensions
      ? {
          width: width === '' ? undefined : Number(width),
          height: height === '' ? undefined : Number(height),
        }
      : {}),
  });

  const handleSubmit = () => {
    setSrcInvalid(false);
    setFileInvalid(false);

    if (currentTab === 'localImage') {
      if (!selectedFile) {
        setFileInvalid(true);
        return;
      }
      if (!verifyImageSize([selectedFile])) {
        return;
      }
      // 与旧 CodeMirror 弹窗一致：先 uploadImage 拿 URL，再插入；避免经 MDX saveImage+FileList 时 multipart 异常导致 400 与 reject(false)
      uploadSingleFile(selectedFile)
        .then((url) => {
          saveImage(savePayloadForSrc(url));
        })
        .catch(() => {
          /* 错误提示由 request 拦截器处理；吞掉 false 避免 Uncaught (in promise) */
        });
      return;
    }

    const url = srcUrl.trim();
    if (!url) {
      setSrcInvalid(true);
      return;
    }
    saveImage(savePayloadForSrc(url));
  };

  if (state.type === 'inactive') {
    return null;
  }

  const isEditing = state.type === 'editing';
  const modalTitle = isEditing
    ? t('image.edit_image', 'Edit image')
    : t('image.add_image', 'Add image');

  return (
    <Modal show onHide={handleHide} centered size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title as="h5" className="mb-0">
          {modalTitle}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tabs
          activeKey={currentTab}
          onSelect={(k) => k && setCurrentTab(k)}
          className="mb-0">
          <Tab eventKey="localImage" title={t('image.tab_image')}>
            <Form className="mt-3">
              <Form.Group className="mb-3" controlId="mdx-post-img-file">
                <Form.Label>
                  {t('image.form_image.fields.file.label')}
                </Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  isInvalid={fileInvalid}
                  onChange={(e) => {
                    setFileInvalid(false);
                    const input = e.currentTarget as HTMLInputElement;
                    const f = input.files?.[0] ?? null;
                    setSelectedFile(f);
                    if (f?.name) {
                      setAltText((prev) => prev || f.name);
                    }
                  }}
                />
                <Form.Control.Feedback type="invalid">
                  {t('image.form_image.fields.file.msg.empty')}
                </Form.Control.Feedback>
              </Form.Group>
              <Form.Group className="mb-3" controlId="mdx-post-img-desc">
                <Form.Label>
                  {`${t('image.form_image.fields.desc.label')} ${tForm('optional')}`}
                </Form.Label>
                <Form.Control
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                />
              </Form.Group>
            </Form>
          </Tab>
          <Tab eventKey="remoteImage" title={t('image.tab_url')}>
            <Form className="mt-3">
              <Form.Group className="mb-3" controlId="mdx-post-img-url">
                <Form.Label>{t('image.form_url.fields.url.label')}</Form.Label>
                <Form.Control
                  type="text"
                  value={srcUrl}
                  isInvalid={srcInvalid}
                  onChange={(e) => {
                    setSrcInvalid(false);
                    setSrcUrl(e.target.value);
                  }}
                />
                <Form.Control.Feedback type="invalid">
                  {t('image.form_url.fields.url.msg.empty')}
                </Form.Control.Feedback>
              </Form.Group>
              <Form.Group className="mb-3" controlId="mdx-post-img-url-alt">
                <Form.Label>
                  {`${t('image.form_url.fields.name.label')} ${tForm('optional')}`}
                </Form.Label>
                <Form.Control
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                />
              </Form.Group>
            </Form>
          </Tab>
        </Tabs>
        {isEditing && (
          <Form.Group className="mb-2" controlId="mdx-post-img-title-attr">
            <Form.Label className="small text-secondary">
              {`${t('image.html_title', 'Image title')} ${tForm('optional')}`}
            </Form.Label>
            <Form.Control
              type="text"
              value={titleAttr}
              onChange={(e) => setTitleAttr(e.target.value)}
            />
          </Form.Group>
        )}
        {allowSetImageDimensions && (
          <div className="row g-2 mt-2">
            <div className="col-6">
              <Form.Group controlId="mdx-post-img-w">
                <Form.Label className="small text-secondary">
                  {t('image.width', 'Width')}
                </Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                />
              </Form.Group>
            </div>
            <div className="col-6">
              <Form.Group controlId="mdx-post-img-h">
                <Form.Label className="small text-secondary">
                  {t('image.height', 'Height')}
                </Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </Form.Group>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0">
        <Button variant="outline-secondary" onClick={handleHide}>
          {t('image.btn_cancel')}
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          {t('image.btn_confirm')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MdxPostImageDialog;
