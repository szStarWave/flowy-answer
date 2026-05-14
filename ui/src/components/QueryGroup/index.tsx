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

import { FC, memo } from 'react';
import { ButtonGroup, Button, DropdownButton, Dropdown } from 'react-bootstrap';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import classNames from 'classnames';

import { REACT_BASE_PATH } from '@/router/alias';
import { floppyNavigation } from '@/utils';

import './index.scss';

interface Props {
  data;
  i18nKeyPrefix: string;
  currentSort: string;
  sortKey?: string;
  className?: string;
  pathname?: string;
  wrapClassName?: string;
}
const Index: FC<Props> = ({
  data = [],
  currentSort = '',
  sortKey = 'order',
  i18nKeyPrefix = '',
  className = '',
  pathname = '',
  wrapClassName = '',
}) => {
  const [searchParams, setUrlSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const { t } = useTranslation('translation', {
    keyPrefix: i18nKeyPrefix,
  });

  const handleParams = (order): string => {
    searchParams.delete('page');
    searchParams.set(sortKey, order);
    const searchStr = searchParams.toString();
    return `?${searchStr}`;
  };

  const handleClick = (e, type) => {
    const str = handleParams(type);
    if (floppyNavigation.shouldProcessLinkClick(e)) {
      e.preventDefault();
      if (pathname) {
        navigate(`${pathname}${str}`);
      } else {
        setUrlSearchParams(str);
      }
    }
  };

  return (
    <>
      <ButtonGroup
        size="sm"
        className={classNames(
          'query-group-toolbar query-group-toolbar--wrap md-show',
          wrapClassName,
        )}>
        {data.map((btn) => {
          const key = typeof btn === 'string' ? btn : btn.sort;
          const name = typeof btn === 'string' ? btn : btn.name;
          return (
            <Button
              key={key}
              variant="outline-secondary"
              active={currentSort === name}
              className={classNames('fit-content', className)}
              href={
                pathname
                  ? `${REACT_BASE_PATH}${pathname}${handleParams(key)}`
                  : handleParams(key)
              }
              onClick={(evt) => handleClick(evt, key)}>
              {t(name)}
            </Button>
          );
        })}
      </ButtonGroup>
      <DropdownButton
        size="sm"
        variant="outline-secondary"
        className={classNames(
          'query-group-toolbar-mobile md-hide',
          wrapClassName,
        )}
        title={t(currentSort)}>
        {data.map((btn) => {
          const key = typeof btn === 'string' ? btn : btn.sort;
          const name = typeof btn === 'string' ? btn : btn.name;
          return (
            <Dropdown.Item
              as="a"
              key={key}
              active={currentSort === name}
              className={classNames(className)}
              href={
                pathname
                  ? `${REACT_BASE_PATH}${pathname}${handleParams(key)}`
                  : handleParams(key)
              }
              onClick={(evt) => handleClick(evt, key)}>
              {t(name)}
            </Dropdown.Item>
          );
        })}
      </DropdownButton>
    </>
  );
};

export default memo(Index);
