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

import { memo, useState, FC, useEffect } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { useTranslation, Trans } from 'react-i18next';
import { Link } from 'react-router-dom';

import classNames from 'classnames';

import { usePromptWithUnload } from '@/hooks';
import { useCaptchaPlugin } from '@/utils/pluginKit';
import { Editor, Modal, TextArea } from '@/components';
import { FormDataType, PostAnswerReq } from '@/common/interface';
import { postAnswer } from '@/services';
import { guard, handleFormError, SaveDraft, storageExpires } from '@/utils';
import { DRAFT_ANSWER_STORAGE_KEY } from '@/common/constants';
import { writeSettingStore, loggedUserInfoStore } from '@/stores';

interface Props {
  visible?: boolean;
  data: {
    /** question  id */
    qid: string;
    answered?: boolean;
    loggedUserRank: number;
    first_answer_id?: string;
  };
  callback?: (obj) => void;
}

const saveDraft = new SaveDraft({ type: 'answer' });

const Index: FC<Props> = ({ visible = false, data, callback }) => {
  const { t } = useTranslation('translation', {
    keyPrefix: 'question_detail.write_answer',
  });
  const displayName =
    loggedUserInfoStore((s) => s.user.display_name) ||
    loggedUserInfoStore((s) => s.user.username)?.[0] ||
    '?';
  const [formData, setFormData] = useState<FormDataType>({
    content: {
      value: '',
      isInvalid: false,
      errorMsg: '',
    },
  });
  const [showEditor, setShowEditor] = useState<boolean>(visible);
  const [focusType, setFocusType] = useState('');
  const [editorFocusState, setEditorFocusState] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [showTips, setShowTips] = useState(data.loggedUserRank < 100);
  const aCaptcha = useCaptchaPlugin('answer');
  const writeInfo = writeSettingStore((state) => state.write);
  const [editorCanSave, setEditorCanSave] = useState(false);

  usePromptWithUnload({
    when: Boolean(formData.content.value),
  });

  const removeDraft = () => {
    // immediately remove debounced save
    saveDraft.save.cancel();
    saveDraft.remove();
    setHasDraft(false);
  };

  useEffect(() => {
    const draft = storageExpires.get(DRAFT_ANSWER_STORAGE_KEY);
    if (draft?.questionId === data.qid && draft?.content) {
      setShowEditor(true);
      setFormData({
        content: {
          value: draft.content,
          isInvalid: false,
          errorMsg: '',
        },
      });
      setHasDraft(true);
    }
    setTimeout(() => {
      setEditorCanSave(true);
    }, 100);
  }, []);

  useEffect(() => {
    const draft = storageExpires.get(DRAFT_ANSWER_STORAGE_KEY);
    const { content } = formData;

    if (content.value) {
      // save Draft
      saveDraft.save({
        questionId: data?.qid,
        content: content.value,
      });

      setHasDraft(true);
    } else if (draft?.questionId === data.qid && !content.value) {
      removeDraft();
    }
  }, [formData.content.value]);

  const checkValidated = (): boolean => {
    let bol = true;
    const { content } = formData;

    if (!content.value || Array.from(content.value.trim()).length < 6) {
      bol = false;
      formData.content = {
        value: content.value,
        isInvalid: true,
        errorMsg: t('characters'),
      };
    } else {
      formData.content = {
        value: content.value,
        isInvalid: false,
        errorMsg: '',
      };
    }

    setFormData({
      ...formData,
    });
    return bol;
  };

  const resetForm = () => {
    setFormData({
      content: {
        value: '',
        isInvalid: false,
        errorMsg: '',
      },
    });
  };

  const deleteDraft = () => {
    const res = window.confirm(t('discard_confirm', { keyPrefix: 'draft' }));
    if (res) {
      removeDraft();
      resetForm();
    }
  };

  const submitAnswer = () => {
    const params: PostAnswerReq = {
      question_id: data?.qid,
      content: formData.content.value,
    };
    const imgCode = aCaptcha?.getCaptcha();
    if (imgCode?.verify) {
      params.captcha_code = imgCode.captcha_code;
      params.captcha_id = imgCode.captcha_id;
    }
    postAnswer(params)
      .then(async (res) => {
        await aCaptcha?.close();
        setShowEditor(false);
        setFormData({
          content: {
            value: '',
            isInvalid: false,
            errorMsg: '',
          },
        });
        removeDraft();
        callback?.(res.info);
      })
      .catch((ex) => {
        if (ex.isError) {
          aCaptcha?.handleCaptchaError(ex.list);
          const stateData = handleFormError(ex, formData);
          setFormData({ ...stateData });
        }
      });
  };

  const handleSubmit = () => {
    if (!guard.tryNormalLogged(true)) {
      return;
    }
    if (!checkValidated()) {
      return;
    }
    if (!aCaptcha) {
      submitAnswer();
      return;
    }
    aCaptcha.check(() => submitAnswer());
  };

  const clickBtn = () => {
    if (!guard.tryNormalLogged(true)) {
      return;
    }

    if (data?.answered && !showEditor) {
      Modal.confirm({
        title: t('confirm_title'),
        content: t('confirm_info'),
        confirmText: t('continue'),
        onConfirm: () => {
          setShowEditor(true);
        },
      });
      return;
    }

    if (!showEditor) {
      setShowEditor(true);
      return;
    }

    handleSubmit();
  };
  const handleFocusForTextArea = (evt) => {
    if (!guard.tryNormalLogged(true)) {
      evt.currentTarget.blur();
      return;
    }
    setFocusType('answer');
    setShowEditor(true);
    setEditorFocusState(true);
  };

  return (
    <Form noValidate className="article-write-reply w-100">
      {(!data.answered || showEditor) && (
        <>
          <Form.Control
            isInvalid={formData.content.isInvalid}
            className="d-none"
          />
          <div className="comment-compose">
            <div className="comment-compose__avatar" aria-hidden>
              {displayName.toString().charAt(0).toUpperCase()}
            </div>
            <div className="comment-compose__body">
              <div className="comment-compose__label">{t('title')}</div>
              {!showEditor && !data.answered && (
                <TextArea
                  className="w-100 comment-compose__preview"
                  rows={6}
                  autoFocus={false}
                  onFocus={handleFocusForTextArea}
                />
              )}
              {showEditor && (
                <>
                  <Editor
                    className={classNames(
                      'form-control p-0',
                      focusType === 'answer' && 'focus',
                      formData.content.isInvalid && 'is-invalid',
                    )}
                    value={formData.content.value}
                    autoFocus={editorFocusState}
                    onChange={(val) => {
                      if (editorCanSave) {
                        setFormData({
                          content: {
                            value: val,
                            isInvalid: false,
                            errorMsg: '',
                          },
                        });
                      }
                    }}
                    onFocus={() => {
                      setFocusType('answer');
                    }}
                    onBlur={() => {
                      setFocusType('');
                    }}
                  />

                  <Alert
                    variant="warning"
                    show={data.loggedUserRank < 100 && showTips}
                    onClose={() => setShowTips(false)}
                    dismissible
                    className="mt-3">
                    <p>{t('tips.header_1')}</p>
                    <ul>
                      <li>
                        <Trans
                          i18nKey="question_detail.write_answer.tips.li1_1"
                          components={{ strong: <strong /> }}
                        />
                      </li>
                      <li>{t('tips.li1_2')}</li>
                    </ul>
                    <p>
                      <Trans
                        i18nKey="question_detail.write_answer.tips.header_2"
                        components={{ strong: <strong /> }}
                      />
                    </p>
                    <ul className="mb-0">
                      <li>{t('tips.li2_1')}</li>
                    </ul>
                  </Alert>
                </>
              )}

              <Form.Control.Feedback type="invalid" className="d-block">
                {formData.content.errorMsg}
              </Form.Control.Feedback>

              <div className="comment-compose__actions">
                <Button onClick={clickBtn}>{t('btn_name')}</Button>
                {hasDraft && (
                  <Button variant="link" onClick={deleteDraft}>
                    {t('discard_draft', { keyPrefix: 'btns' })}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {data.answered && !showEditor ? (
        <div className="d-flex flex-wrap gap-2 mt-3">
          <Link
            to={`/posts/${data.qid}/${data.first_answer_id}/edit`}
            className="btn btn-primary">
            {t('edit_answer')}
          </Link>
          {!writeInfo.restrict_answer && (
            <Button onClick={clickBtn} variant="outline-primary">
              {t('add_another_answer')}
            </Button>
          )}
        </div>
      ) : null}
    </Form>
  );
};

export default memo(Index);
