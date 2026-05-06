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

import React, { useState, useRef, useEffect } from 'react';
import { Row, Col, Form, Button, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import classNames from 'classnames';

import { usePageTags, usePromptWithUnload } from '@/hooks';
import { Editor, EditorRef } from '@/components';
import { loggedUserInfoStore } from '@/stores';
import type * as Type from '@/common/interface';
import { createTag } from '@/services';
import { handleFormError, scrollToElementTop } from '@/utils';
import { TAG_SLUG_NAME_MAX_LENGTH } from '@/common/constants';

interface FormDataItem {
  displayName: Type.FormValue<string>;
  slugName: Type.FormValue<string>;
  displayOrder: Type.FormValue<string>;
  description: Type.FormValue<string>;
}

const Index = () => {
  const initFormData = {
    displayName: {
      value: '',
      isInvalid: false,
      errorMsg: '',
    },
    slugName: {
      value: '',
      isInvalid: false,
      errorMsg: '',
    },
    displayOrder: {
      value: '0',
      isInvalid: false,
      errorMsg: '',
    },
    description: {
      value: '',
      isInvalid: false,
      errorMsg: '',
    },
  };
  const { role_id = 1 } = loggedUserInfoStore((state) => state.user);
  const navigate = useNavigate();
  const { t } = useTranslation('translation', { keyPrefix: 'tag_modal' });
  const [focusType, setForceType] = useState('');

  const [formData, setFormData] = useState<FormDataItem>(initFormData);
  const [immData] = useState(initFormData);
  const [contentChanged, setContentChanged] = useState(false);

  const editorRef = useRef<EditorRef>({
    getHtml: () => '',
  });

  usePromptWithUnload({
    when: contentChanged,
  });

  useEffect(() => {
    const { displayName, slugName, displayOrder, description } = formData;
    const {
      displayName: display_name,
      slugName: slug_name,
      displayOrder: order_imm,
      description: original_text,
    } = immData;

    if (
      display_name.value !== displayName.value ||
      slug_name.value !== slugName.value ||
      order_imm.value !== displayOrder.value ||
      original_text.value !== description.value
    ) {
      setContentChanged(true);
    } else {
      setContentChanged(false);
    }
  }, [
    formData.displayName.value,
    formData.slugName.value,
    formData.displayOrder.value,
    formData.description.value,
  ]);

  const handleDescriptionChange = (value: string) =>
    setFormData((prev) => ({
      ...prev,
      description: { value, isInvalid: false, errorMsg: '' },
    }));

  const checkValidated = (): boolean => {
    let bol = true;
    let errObjKey = '';
    const { displayName, slugName } = formData;

    if (!displayName.value) {
      bol = false;
      errObjKey = 'display_name';
      formData.displayName = {
        value: '',
        isInvalid: true,
        errorMsg: t('form.fields.display_name.msg.empty'),
      };
    } else if (displayName.value.length > TAG_SLUG_NAME_MAX_LENGTH) {
      bol = false;
      errObjKey = 'display_name';
      formData.displayName = {
        value: displayName.value,
        isInvalid: true,
        errorMsg: t('form.fields.display_name.msg.range'),
      };
    } else {
      formData.displayName = {
        value: displayName.value,
        isInvalid: false,
        errorMsg: '',
      };
    }

    if (!slugName.value) {
      bol = false;
      errObjKey = 'slug_name';
      formData.slugName = {
        value: '',
        isInvalid: true,
        errorMsg: t('form.fields.slug_name.msg.empty'),
      };
    } else if (slugName.value.length > TAG_SLUG_NAME_MAX_LENGTH) {
      bol = false;
      errObjKey = 'slug_name';
      formData.slugName = {
        value: slugName.value,
        isInvalid: true,
        errorMsg: t('form.fields.slug_name.msg.range'),
      };
    } else {
      formData.slugName = {
        value: slugName.value,
        isInvalid: false,
        errorMsg: '',
      };
    }

    const orderRaw = formData.displayOrder.value.trim();
    if (orderRaw !== '' && !/^\d+$/.test(orderRaw)) {
      bol = false;
      errObjKey = 'display_order';
      formData.displayOrder = {
        value: formData.displayOrder.value,
        isInvalid: true,
        errorMsg: t('form.fields.display_order.msg.invalid'),
      };
    } else {
      formData.displayOrder = {
        value: orderRaw === '' ? '0' : orderRaw,
        isInvalid: false,
        errorMsg: '',
      };
    }

    setFormData({
      ...formData,
    });

    if (!bol) {
      const ele = document.getElementById(errObjKey);
      scrollToElementTop(ele);
    }

    return bol;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setContentChanged(false);

    if (!checkValidated()) {
      return;
    }

    const orderVal = formData.displayOrder.value.trim();
    const display_order = orderVal === '' ? 0 : parseInt(orderVal, 10);
    const params = {
      display_name: formData.displayName.value,
      slug_name: formData.slugName.value,
      original_text: formData.description.value,
      display_order,
    };
    createTag(params)
      .then((res) => {
        navigate(`/tags/${encodeURIComponent(res.slug_name)}/info`, {
          replace: true,
        });
      })
      .catch((err) => {
        if (err.isError) {
          const data = handleFormError(err, formData, [
            { from: 'display_name', to: 'displayName' },
            { from: 'slug_name', to: 'slugName' },
            { from: 'display_order', to: 'displayOrder' },
            { from: 'original_text', to: 'description' },
          ]);
          setFormData({ ...data });
          const ele = document.getElementById(err.list[0].error_field);
          scrollToElementTop(ele);
        }
      });
  };

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      displayName: {
        ...formData.displayName,
        value: e.currentTarget.value,
        isInvalid: false,
      },
    });
  };

  const handleSlugNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      slugName: {
        ...formData.slugName,
        value: e.currentTarget.value,
        isInvalid: false,
      },
    });
  };

  const handleDisplayOrderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      displayOrder: {
        ...formData.displayOrder,
        value: e.currentTarget.value,
        isInvalid: false,
        errorMsg: '',
      },
    });
  };

  usePageTags({
    title: t('create_tag', { keyPrefix: 'page_title' }),
  });

  return (
    <div className="pt-4 mb-5">
      <h3 className="mb-4">{t('title')}</h3>
      <Row>
        <Col className="page-main flex-auto">
          <Form noValidate onSubmit={handleSubmit}>
            <Form.Group controlId="display_name" className="mb-3">
              <Form.Label>{t('form.fields.display_name.label')}</Form.Label>
              <Form.Control
                type="text"
                value={formData.displayName.value}
                isInvalid={formData.displayName.isInvalid}
                disabled={role_id !== 2}
                onChange={handleDisplayNameChange}
              />

              <Form.Control.Feedback type="invalid">
                {formData.displayName.errorMsg}
              </Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="slug_name" className="mb-3">
              <Form.Label>{t('form.fields.slug_name.label')}</Form.Label>
              <Form.Control
                type="text"
                value={formData.slugName.value}
                isInvalid={formData.slugName.isInvalid}
                disabled={role_id !== 2}
                onChange={handleSlugNameChange}
              />
              <Form.Text as="div">{t('form.fields.slug_name.desc')}</Form.Text>
              <Form.Control.Feedback type="invalid">
                {formData.slugName.errorMsg}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group controlId="display_order" className="mb-3">
              <Form.Label>{t('form.fields.display_order.label')}</Form.Label>
              <Form.Control
                type="text"
                inputMode="numeric"
                value={formData.displayOrder.value}
                isInvalid={formData.displayOrder.isInvalid}
                disabled={role_id !== 2}
                onChange={handleDisplayOrderChange}
              />
              <Form.Text as="div">
                {t('form.fields.display_order.desc')}
              </Form.Text>
              <Form.Control.Feedback type="invalid">
                {formData.displayOrder.errorMsg}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group controlId="description" className="mt-4">
              <Form.Label>{t('form.fields.desc.label')}</Form.Label>
              <Editor
                value={formData.description.value}
                onChange={handleDescriptionChange}
                className={classNames(
                  'form-control p-0',
                  focusType === 'description' && 'focus',
                )}
                onFocus={() => {
                  setForceType('description');
                }}
                onBlur={() => {
                  setForceType('');
                }}
                ref={editorRef}
              />
              <Form.Control
                value={formData.description.value}
                type="text"
                isInvalid={formData.description.isInvalid}
                readOnly
                hidden
              />
              <Form.Control.Feedback type="invalid">
                {formData.description.errorMsg}
              </Form.Control.Feedback>
            </Form.Group>
            <div className="mt-3">
              <Button type="submit">{t('btn_post')}</Button>
            </div>
          </Form>
        </Col>
        <Col className="page-right-side mt-4 mt-xl-0">
          <Card>
            <Card.Header>
              {t('title', { keyPrefix: 'how_to_format' })}
            </Card.Header>
            <Card.Body
              className="fmt small"
              dangerouslySetInnerHTML={{
                __html: t('desc', { keyPrefix: 'how_to_format' }),
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Index;
