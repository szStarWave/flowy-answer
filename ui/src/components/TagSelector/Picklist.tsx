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

import { FC, useCallback, useEffect, useState } from 'react';
import { Dropdown, Form, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import classNames from 'classnames';

import type * as Type from '@/common/interface';
import Icon from '../Icon';
import { writeSettingStore } from '@/stores';
import { fetchAllTagsForPicker } from '@/services';

interface IProps {
  value?: Type.Tag[];
  onChange?: (tags: Type.Tag[]) => void;
  hiddenDescription?: boolean;
  maxTagLength?: number;
  isInvalid?: boolean;
  tagStyleMode?: 'default' | 'simple';
  formText?: string;
  errMsg?: string;
}

const TagSelectorPicklist: FC<IProps> = ({
  value = [],
  onChange,
  hiddenDescription = false,
  maxTagLength = 0,
  isInvalid = false,
  tagStyleMode = 'default',
  formText = '',
  errMsg = '',
}) => {
  const { t } = useTranslation('translation', { keyPrefix: 'tag_selector' });
  const [allTags, setAllTags] = useState<Type.Tag[]>([]);
  const [loadState, setLoadState] = useState<
    'idle' | 'loading' | 'error' | 'done'
  >('idle');
  const [showMenu, setShowMenu] = useState(false);
  const writeInfo = writeSettingStore((state) => state.write);

  const canAddTag =
    (maxTagLength > 0 && value.length < maxTagLength) || maxTagLength === 0;
  const atMax = maxTagLength > 0 && value.length >= maxTagLength;

  const isSelected = useCallback(
    (slug: string) =>
      value.some((v) => v.slug_name.toLowerCase() === slug.toLowerCase()),
    [value],
  );

  const handleTagHint = () => {
    if (!writeInfo || writeInfo.min_tags === undefined || !writeInfo.min_tags) {
      return t('hint_zero_tags');
    }
    if (writeInfo.min_tags === 1) {
      return t('hint');
    }
    return t('hint_more_than_one_tag', {
      min_tags_number: writeInfo.min_tags,
    });
  };

  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');
    fetchAllTagsForPicker()
      .then((list) => {
        if (!cancelled) {
          setAllTags(list);
          setLoadState('done');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadState('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRemove = (val: Type.Tag) => {
    if (onChange instanceof Function) {
      onChange(
        value.filter((v) => {
          if (v instanceof Object) {
            return v.slug_name.toLowerCase() !== val.slug_name.toLowerCase();
          }
          return v !== val;
        }),
      );
    }
  };

  const handleCheckboxChange = (tag: Type.Tag) => {
    if (!(onChange instanceof Function)) {
      return;
    }
    const checked = isSelected(tag.slug_name);
    if (!checked && !canAddTag) {
      return;
    }
    if (!checked) {
      onChange([
        ...value,
        {
          original_text: '',
          parsed_text: '',
          ...tag,
        },
      ]);
    } else {
      onChange(
        value.filter(
          (v) => v.slug_name.toLowerCase() !== tag.slug_name.toLowerCase(),
        ),
      );
    }
  };

  return (
    <div className="tag-selector-picklist position-relative w-100">
      <Dropdown
        className="w-100"
        show={showMenu}
        onToggle={(next) => setShowMenu(next)}
        autoClose="outside">
        <Dropdown.Toggle
          as="div"
          className={classNames(
            'form-control d-flex align-items-stretch w-100 shadow-none tag-selector-picklist__field',
            showMenu && 'tag-selector-picklist__field--open',
            isInvalid && 'is-invalid',
          )}
          id="tag-selector-picklist-toggle">
          <div className="d-flex flex-wrap flex-grow-1 align-items-center gap-1 me-2 min-w-0 py-1">
            {value?.map((item) => (
              <span
                key={item.slug_name}
                className={classNames(
                  'badge-tag rounded-1 flex-shrink-0',
                  tagStyleMode === 'default' &&
                    item.reserved &&
                    'badge-tag-reserved',
                  tagStyleMode === 'default' &&
                    item.recommend &&
                    'badge-tag-required',
                )}>
                {item.display_name}
                <span
                  className="ms-1 hover-hand"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(item);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRemove(item);
                    }
                  }}
                  role="button"
                  tabIndex={0}>
                  ×
                </span>
              </span>
            ))}
          </div>
          <div
            className="d-flex align-items-center flex-shrink-0 text-secondary tag-selector-picklist__affix"
            aria-hidden>
            {loadState === 'loading' ? (
              <Spinner
                animation="border"
                size="sm"
                className="tag-selector-picklist__spinner"
                aria-label={t('picklist_loading')}
              />
            ) : (
              <Icon
                className={classNames(
                  'tag-selector-picklist__chevron',
                  showMenu && 'tag-selector-picklist__chevron--open',
                )}
                name="chevron-down"
              />
            )}
          </div>
        </Dropdown.Toggle>
        <Dropdown.Menu className="tag-selector-picklist__menu w-100 p-0">
          {loadState === 'error' && (
            <div className="px-3 py-2 text-danger small">
              {t('picklist_load_error')}
            </div>
          )}
          {loadState === 'done' && allTags.length === 0 && (
            <div className="px-3 py-2 text-secondary small">
              {t('picklist_empty')}
            </div>
          )}
          {loadState === 'done' && allTags.length > 0 && (
            <>
              <h6 className="dropdown-header mb-0 py-2">
                {t('picklist_all_tags')}
              </h6>
              <div
                className="tag-selector-picklist__scroll"
                onClick={(e) => e.stopPropagation()}>
                {allTags.map((item) => {
                  const checked = isSelected(item.slug_name);
                  const disabled = !checked && atMax;
                  return (
                    <div
                      key={item.slug_name}
                      className="px-3 py-1 border-bottom border-light-subtle"
                      onClick={(e) => e.stopPropagation()}>
                      <Form.Check
                        type="checkbox"
                        id={`tag-picklist-${item.slug_name}`}
                        className="user-select-none"
                        label={item.display_name}
                        checked={checked}
                        disabled={disabled}
                        onChange={() => handleCheckboxChange(item)}
                      />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Dropdown.Menu>
      </Dropdown>

      {!hiddenDescription && (
        <Form.Text>{formText || handleTagHint()}</Form.Text>
      )}
      <Form.Control.Feedback type="invalid">{errMsg}</Form.Control.Feedback>
    </div>
  );
};

export default TagSelectorPicklist;
