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

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Form, Table, Pagination } from 'react-bootstrap';

import dayjs from 'dayjs';

import {
  useQuerySensitiveWords,
  addSensitiveWord,
  setSensitiveWordStatus,
  deleteSensitiveWord,
} from '@/services';
import { toastStore } from '@/stores';

const STATUS_ENABLED = 1;
const STATUS_DISABLED = 2;

const Index = () => {
  const { t } = useTranslation('translation', {
    keyPrefix: 'admin.sensitive_words',
  });
  const [page, setPage] = useState(1);
  const [newWord, setNewWord] = useState('');
  const { data, mutate, isLoading } = useQuerySensitiveWords(page);
  const list = data?.list ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const onAdd = async () => {
    const w = newWord.trim();
    if (!w) {
      return;
    }
    try {
      await addSensitiveWord(w);
      setNewWord('');
      await mutate();
      toastStore.getState().show({ msg: t('add_success'), variant: 'success' });
    } catch (ex: unknown) {
      const err = ex as { msg?: string };
      toastStore.getState().show({
        msg: err?.msg || 'Error',
        variant: 'danger',
      });
    }
  };

  const onToggle = async (id: number, current: number) => {
    const next = current === STATUS_ENABLED ? STATUS_DISABLED : STATUS_ENABLED;
    try {
      await setSensitiveWordStatus(id, next);
      await mutate();
    } catch (ex: unknown) {
      const err = ex as { msg?: string };
      toastStore.getState().show({
        msg: err?.msg || 'Error',
        variant: 'danger',
      });
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm(t('confirm_delete'))) {
      return;
    }
    try {
      await deleteSensitiveWord(id);
      await mutate();
    } catch (ex: unknown) {
      const err = ex as { msg?: string };
      toastStore.getState().show({
        msg: err?.msg || 'Error',
        variant: 'danger',
      });
    }
  };

  return (
    <div>
      <h3 className="mb-2">{t('title')}</h3>
      <p className="text-muted small mb-4">{t('description')}</p>

      <Form
        className="d-flex flex-wrap gap-2 align-items-end mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          onAdd();
        }}>
        <Form.Group className="flex-grow-1" style={{ minWidth: '220px' }}>
          <Form.Label>{t('word')}</Form.Label>
          <Form.Control
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder={t('add_placeholder')}
            maxLength={191}
          />
        </Form.Group>
        <Button type="submit" variant="primary" size="sm">
          {t('add')}
        </Button>
      </Form>

      <Table responsive="md">
        <thead className="c-table">
          <tr>
            <th>{t('word')}</th>
            <th style={{ width: '12%' }}>{t('status')}</th>
            <th style={{ width: '16%' }}>{t('created')}</th>
            <th style={{ width: '16%' }}>{t('updated')}</th>
            <th className="text-end" style={{ width: '22%' }}>
              {t('actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {!isLoading && list.length === 0 && (
            <tr>
              <td colSpan={5} className="text-muted">
                {t('empty')}
              </td>
            </tr>
          )}
          {list.map((row) => (
            <tr key={row.id}>
              <td>{row.word}</td>
              <td>
                {row.status === STATUS_ENABLED ? t('enabled') : t('disabled')}
              </td>
              <td>
                {dayjs.unix(row.created_at).tz().format('YYYY-MM-DD HH:mm')}
              </td>
              <td>
                {dayjs.unix(row.updated_at).tz().format('YYYY-MM-DD HH:mm')}
              </td>
              <td className="text-end">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="me-2"
                  onClick={() => onToggle(row.id, row.status)}>
                  {row.status === STATUS_ENABLED
                    ? t('toggle_disable')
                    : t('toggle_enable')}
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => onDelete(row.id)}>
                  {t('remove')}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {totalPages > 1 && (
        <Pagination className="mt-3">
          <Pagination.Prev
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          />
          <Pagination.Item active>{page}</Pagination.Item>
          <Pagination.Next
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        </Pagination>
      )}
    </div>
  );
};

export default Index;
