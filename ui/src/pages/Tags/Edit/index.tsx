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
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import dayjs from 'dayjs';
import classNames from 'classnames';

import { usePageTags, usePromptWithUnload } from '@/hooks';
import { Editor, EditorRef } from '@/components';
import { loggedUserInfoStore } from '@/stores';
import type * as Type from '@/common/interface';
import { TAG_SLUG_NAME_MAX_LENGTH } from '@/common/constants';
import { useTagInfo, modifyTag, useQueryRevisions } from '@/services';

interface FormDataItem {
  displayName: Type.FormValue<string>;
  slugName: Type.FormValue<string>;
  displayOrder: Type.FormValue<string>;
  description: Type.FormValue<string>;
  editSummary: Type.FormValue<string>;
}
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
  editSummary: {
    value: '',
    isInvalid: false,
    errorMsg: '',
  },
};

const Index = () => {
  const { role_id = 1 } = loggedUserInfoStore((state) => state.user);

  const { tagId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('translation', { keyPrefix: 'edit_tag' });
  const [focusType, setForceType] = useState('');

  const { data } = useTagInfo({ id: tagId });
  const { data: revisions = [] } = useQueryRevisions(data?.tag_id);
  const [formData, setFormData] = useState<FormDataItem>(initFormData);
  const [immData, setImmData] = useState(initFormData);
  const [contentChanged, setContentChanged] = useState(false);

  const editorRef = useRef<EditorRef>({
    getHtml: () => '',
  });

  usePromptWithUnload({
    when: contentChanged,
  });

  useEffect(() => {
    if (!data) {
      return;
    }
    const next: FormDataItem = {
      displayName: {
        value: data.display_name || '',
        isInvalid: false,
        errorMsg: '',
      },
      slugName: {
        value: data.slug_name || '',
        isInvalid: false,
        errorMsg: '',
      },
      displayOrder: {
        value: String(data.display_order ?? 0),
        isInvalid: false,
        errorMsg: '',
      },
      description: {
        value: data.original_text || '',
        isInvalid: false,
        errorMsg: '',
      },
      editSummary: {
        value: '',
        isInvalid: false,
        errorMsg: '',
      },
    };
    setFormData(next);
    setImmData(next);
  }, [data]);

  useEffect(() => {
    const { displayName, slugName, displayOrder, description, editSummary } =
      formData;
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
      original_text.value !== description.value ||
      editSummary.value
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
    formData.editSummary.value,
  ]);

  const handleDescriptionChange = (value: string) =>
    setFormData((prev) => ({
      ...prev,
      description: { value, isInvalid: false, errorMsg: '' },
    }));

  const checkValidated = (): boolean => {
    let bol = true;
    const { displayName, slugName, displayOrder } = formData;

    if (!displayName.value) {
      bol = false;
      formData.displayName = {
        value: '',
        isInvalid: true,
        errorMsg: t('form.fields.display_name.msg.empty', {
          keyPrefix: 'tag_modal',
        }),
      };
    } else if (displayName.value.length > TAG_SLUG_NAME_MAX_LENGTH) {
      bol = false;
      formData.displayName = {
        value: displayName.value,
        isInvalid: true,
        errorMsg: t('form.fields.display_name.msg.range', {
          keyPrefix: 'tag_modal',
        }),
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
      formData.slugName = {
        value: '',
        isInvalid: true,
        errorMsg: t('form.fields.slug_name.msg.empty', {
          keyPrefix: 'tag_modal',
        }),
      };
    } else if (slugName.value.length > TAG_SLUG_NAME_MAX_LENGTH) {
      bol = false;
      formData.slugName = {
        value: slugName.value,
        isInvalid: true,
        errorMsg: t('form.fields.slug_name.msg.range', {
          keyPrefix: 'tag_modal',
        }),
      };
    } else {
      formData.slugName = {
        value: slugName.value,
        isInvalid: false,
        errorMsg: '',
      };
    }

    const orderRaw = displayOrder.value.trim();
    if (orderRaw !== '' && !/^\d+$/.test(orderRaw)) {
      bol = false;
      formData.displayOrder = {
        value: displayOrder.value,
        isInvalid: true,
        errorMsg: t('form.fields.display_order.msg.invalid', {
          keyPrefix: 'tag_modal',
        }),
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
    return bol;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    setContentChanged(false);

    event.preventDefault();
    event.stopPropagation();
    if (!checkValidated()) {
      return;
    }

    const orderVal = formData.displayOrder.value.trim();
    const display_order = orderVal === '' ? 0 : parseInt(orderVal, 10);
    const params = {
      display_name: formData.displayName.value,
      slug_name: formData.slugName.value,
      display_order,
      original_text: formData.description.value,
      parsed_text: editorRef.current.getHtml(),
      tag_id: data?.tag_id,
      edit_summary: formData.editSummary.value,
    };
    modifyTag(params).then((res) => {
      navigate(`/tags/${encodeURIComponent(formData.slugName.value)}/info`, {
        replace: true,
        state: { isReview: res.wait_for_review },
      });
    });
  };

  const handleSelectedRevision = (e) => {
    const index = Number(e.target.value);
    const revision = revisions[index];
    if (!revision) {
      return;
    }
    const { content } = revision;
    setFormData((prev) => {
      const next: FormDataItem = {
        ...prev,
        description: {
          ...prev.description,
          value: content.original_text,
          isInvalid: false,
          errorMsg: '',
        },
        displayName: {
          ...prev.displayName,
          value: content.display_name,
          isInvalid: false,
          errorMsg: '',
        },
        slugName: {
          ...prev.slugName,
          value: content.slug_name,
          isInvalid: false,
          errorMsg: '',
        },
        displayOrder: {
          ...prev.displayOrder,
          value:
            content.display_order !== undefined &&
            content.display_order !== null
              ? String(content.display_order)
              : prev.displayOrder.value,
          isInvalid: false,
          errorMsg: '',
        },
      };
      queueMicrotask(() => setImmData(next));
      return next;
    });
  };

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      displayName: { ...formData.displayName, value: e.currentTarget.value },
    });
  };

  const handleEditSummaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      editSummary: { ...formData.editSummary, value: e.currentTarget.value },
    });
  };

  const handleSlugNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      slugName: { ...formData.slugName, value: e.currentTarget.value },
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

  const backPage = () => {
    navigate(-1);
  };
  usePageTags({
    title: t('edit_tag', { keyPrefix: 'page_title' }),
  });
  return (
    <div className="pt-4 mb-5">
      <h3 className="mb-4">{t('title')}</h3>
      <Row>
        <Col className="page-main flex-auto">
          <Form noValidate onSubmit={handleSubmit}>
            <Form.Group controlId="revision" className="mb-3">
              <Form.Label>
                {t('form.fields.revision.label', { keyPrefix: 'tag_modal' })}
              </Form.Label>
              <Form.Select onChange={handleSelectedRevision}>
                {revisions.map(({ create_at, reason, user_info }, index) => {
                  const date = dayjs(create_at * 1000)
                    .tz()
                    .format(t('long_date_with_time', { keyPrefix: 'dates' }));
                  return (
                    <option key={`${create_at}`} value={index}>
                      {`${date} - ${user_info.display_name} - ${
                        reason ||
                        (index === revisions.length - 1
                          ? t('default_first_reason')
                          : t('default_reason'))
                      }`}
                    </option>
                  );
                })}
              </Form.Select>
            </Form.Group>
            <Form.Group controlId="display_name" className="mb-3">
              <Form.Label>
                {t('form.fields.display_name.label', {
                  keyPrefix: 'tag_modal',
                })}
              </Form.Label>
              <Form.Control
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
              <Form.Label>
                {t('form.fields.slug_name.label', { keyPrefix: 'tag_modal' })}
              </Form.Label>
              <Form.Control
                value={formData.slugName.value}
                isInvalid={formData.slugName.isInvalid}
                disabled={role_id !== 2}
                onChange={handleSlugNameChange}
              />
              <Form.Text as="div">
                {t('form.fields.slug_name.desc', { keyPrefix: 'tag_modal' })}
              </Form.Text>
              <Form.Control.Feedback type="invalid">
                {formData.slugName.errorMsg}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group controlId="display_order" className="mb-3">
              <Form.Label>
                {t('form.fields.display_order.label', {
                  keyPrefix: 'tag_modal',
                })}
              </Form.Label>
              <Form.Control
                type="text"
                inputMode="numeric"
                value={formData.displayOrder.value}
                isInvalid={formData.displayOrder.isInvalid}
                disabled={role_id !== 2}
                onChange={handleDisplayOrderChange}
              />
              <Form.Text as="div">
                {t('form.fields.display_order.desc', {
                  keyPrefix: 'tag_modal',
                })}
              </Form.Text>
              <Form.Control.Feedback type="invalid">
                {formData.displayOrder.errorMsg}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group controlId="description" className="mt-4">
              <Form.Label>
                {t('form.fields.desc.label', { keyPrefix: 'tag_modal' })}
              </Form.Label>
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
            <Form.Group controlId="edit_summary" className="my-3">
              <Form.Label>
                {t('form.fields.edit_summary.label', {
                  keyPrefix: 'tag_modal',
                })}
              </Form.Label>
              <Form.Control
                type="text"
                defaultValue={formData.editSummary.value}
                isInvalid={formData.editSummary.isInvalid}
                onChange={handleEditSummaryChange}
                placeholder={t('form.fields.edit_summary.placeholder', {
                  keyPrefix: 'tag_modal',
                })}
              />
              <Form.Control.Feedback type="invalid">
                {formData.editSummary.errorMsg}
              </Form.Control.Feedback>
            </Form.Group>

            <div className="mt-3">
              <Button type="submit">{t('btn_save_edits')}</Button>
              <Button variant="link" className="ms-2" onClick={backPage}>
                {t('btn_cancel')}
              </Button>
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
