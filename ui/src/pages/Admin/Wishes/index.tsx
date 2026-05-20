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

import { FC, memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import type { WishItem, WishPeriod } from '@/common/interface';
import { useToast } from '@/hooks';
import {
  addAdminWish,
  addAdminWishPeriod,
  deleteAdminWish,
  deleteAdminWishPeriod,
  getAdminWishPage,
  getAdminWishPeriods,
  setCurrentAdminWishPeriod,
  updateAdminWish,
  updateAdminWishPeriod,
} from '@/services/admin/wishes';

import './index.scss';

const PERIOD_OPEN = 2;
const PERIOD_DRAFT = 1;
const PERIOD_CLOSED = 3;

const AdminWishes: FC = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'admin.wishes' });
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [periods, setPeriods] = useState<WishPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number>(0);
  const [items, setItems] = useState<WishItem[]>([]);

  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [periodTitle, setPeriodTitle] = useState('');
  const [periodDesc, setPeriodDesc] = useState('');

  const [itemTitle, setItemTitle] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemSort, setItemSort] = useState(0);

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.id === selectedPeriodId),
    [periods, selectedPeriodId],
  );

  const workflowStep = useMemo(() => {
    if (!selectedPeriodId) {
      return 1;
    }
    if (!items.length) {
      return 2;
    }
    if (selectedPeriod?.status !== PERIOD_OPEN || !selectedPeriod?.is_current) {
      return 3;
    }
    return 4;
  }, [items.length, selectedPeriod, selectedPeriodId]);

  const loadPeriods = useCallback(
    async (keepSelection = true) => {
      try {
        const res = await getAdminWishPeriods();
        const list = res?.list || [];
        setPeriods(list);
        if (!keepSelection || !selectedPeriodId) {
          const current = list.find((p) => p.is_current) || list[0];
          if (current) {
            setSelectedPeriodId(current.id);
          }
        } else if (!list.some((p) => p.id === selectedPeriodId)) {
          setSelectedPeriodId(list[0]?.id || 0);
        }
      } catch (err: any) {
        toast.onShow({
          msg: err?.msg || t('load_failed'),
          variant: 'danger',
        });
      }
    },
    [selectedPeriodId, t, toast],
  );

  const loadItems = useCallback(
    async (periodId: number) => {
      if (!periodId) {
        setItems([]);
        return;
      }
      try {
        const res = await getAdminWishPage({
          period_id: periodId,
          page: 1,
          page_size: 200,
        });
        setItems(res?.list || []);
      } catch (err: any) {
        toast.onShow({
          msg: err?.msg || t('load_failed'),
          variant: 'danger',
        });
      }
    },
    [t, toast],
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadPeriods(false);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      loadItems(selectedPeriodId);
    }
  }, [selectedPeriodId, loadItems]);

  const periodStatusLabel = (status: number) => {
    if (status === PERIOD_OPEN) {
      return t('period_status_open');
    }
    if (status === PERIOD_CLOSED) {
      return t('period_status_closed');
    }
    return t('period_status_draft');
  };

  const periodStatusVariant = (status: number) => {
    if (status === PERIOD_OPEN) {
      return 'success';
    }
    if (status === PERIOD_CLOSED) {
      return 'secondary';
    }
    return 'warning';
  };

  const handleCreatePeriod = async () => {
    if (!periodTitle.trim()) {
      return;
    }
    setSaving(true);
    try {
      const title = periodTitle.trim();
      await addAdminWishPeriod({
        title,
        description: periodDesc.trim(),
        status: PERIOD_DRAFT,
      });
      setShowPeriodModal(false);
      setPeriodTitle('');
      setPeriodDesc('');
      toast.onShow({ msg: t('period_added'), variant: 'success' });
      const res = await getAdminWishPeriods();
      const list = res?.list || [];
      setPeriods(list);
      const created =
        list.find((p) => p.title === title) || list[list.length - 1];
      if (created) {
        setSelectedPeriodId(created.id);
      }
    } catch (err: any) {
      toast.onShow({
        msg: err?.msg || t('save_failed'),
        variant: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSetCurrent = async () => {
    if (!selectedPeriodId) {
      return;
    }
    setSaving(true);
    try {
      await setCurrentAdminWishPeriod({ id: selectedPeriodId });
      toast.onShow({ msg: t('period_set_current'), variant: 'success' });
      await loadPeriods();
    } catch (err: any) {
      toast.onShow({
        msg: err?.msg || t('save_failed'),
        variant: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublishPeriod = async () => {
    if (!selectedPeriod) {
      return;
    }
    setSaving(true);
    try {
      await updateAdminWishPeriod({
        id: selectedPeriod.id,
        title: selectedPeriod.title,
        description: selectedPeriod.description || '',
        status: PERIOD_OPEN,
        sort_order: selectedPeriod.sort_order,
      });
      toast.onShow({ msg: t('period_published'), variant: 'success' });
      await loadPeriods();
    } catch (err: any) {
      toast.onShow({
        msg: err?.msg || t('save_failed'),
        variant: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClosePeriod = async () => {
    if (!selectedPeriod) {
      return;
    }
    setSaving(true);
    try {
      await updateAdminWishPeriod({
        id: selectedPeriod.id,
        title: selectedPeriod.title,
        description: selectedPeriod.description || '',
        status: PERIOD_CLOSED,
        sort_order: selectedPeriod.sort_order,
      });
      toast.onShow({ msg: t('period_closed'), variant: 'success' });
      await loadPeriods();
    } catch (err: any) {
      toast.onShow({
        msg: err?.msg || t('save_failed'),
        variant: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePeriod = async () => {
    if (!selectedPeriodId || !window.confirm(t('period_delete_confirm'))) {
      return;
    }
    setSaving(true);
    try {
      await deleteAdminWishPeriod({ id: selectedPeriodId });
      toast.onShow({ msg: t('period_deleted'), variant: 'success' });
      setSelectedPeriodId(0);
      await loadPeriods(false);
    } catch (err: any) {
      toast.onShow({
        msg: err?.msg || t('save_failed'),
        variant: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (!selectedPeriodId || !itemTitle.trim()) {
      return;
    }
    setSaving(true);
    try {
      await addAdminWish({
        period_id: selectedPeriodId,
        title: itemTitle.trim(),
        description: itemDesc.trim(),
        sort_order: itemSort,
      });
      setItemTitle('');
      setItemDesc('');
      setItemSort(0);
      toast.onShow({ msg: t('added'), variant: 'success' });
      await loadItems(selectedPeriodId);
      await loadPeriods();
    } catch (err: any) {
      toast.onShow({
        msg: err?.msg || t('save_failed'),
        variant: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleItem = async (item: WishItem) => {
    const status = (item.status ?? 1) === 1 ? 2 : 1;
    try {
      await updateAdminWish({
        id: item.id,
        title: item.title,
        description: item.description || '',
        discussion_count: item.discussion_count,
        status,
        sort_order: item.sort_order ?? 0,
      });
      await loadItems(selectedPeriodId);
    } catch (err: any) {
      toast.onShow({
        msg: err?.msg || t('save_failed'),
        variant: 'danger',
      });
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!window.confirm(t('item_delete_confirm'))) {
      return;
    }
    try {
      await deleteAdminWish({ id });
      toast.onShow({ msg: t('deleted'), variant: 'success' });
      await loadItems(selectedPeriodId);
      await loadPeriods();
    } catch (err: any) {
      toast.onShow({
        msg: err?.msg || t('save_failed'),
        variant: 'danger',
      });
    }
  };

  const handlePublishAndSetCurrent = async () => {
    if (!selectedPeriod) {
      return;
    }
    setSaving(true);
    try {
      if (selectedPeriod.status !== PERIOD_OPEN) {
        await updateAdminWishPeriod({
          id: selectedPeriod.id,
          title: selectedPeriod.title,
          description: selectedPeriod.description || '',
          status: PERIOD_OPEN,
          sort_order: selectedPeriod.sort_order,
        });
      }
      await setCurrentAdminWishPeriod({ id: selectedPeriod.id });
      toast.onShow({ msg: t('period_live'), variant: 'success' });
      await loadPeriods();
    } catch (err: any) {
      toast.onShow({
        msg: err?.msg || t('save_failed'),
        variant: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-wishes-page text-center py-5">
        <Spinner animation="border" variant="secondary" />
      </div>
    );
  }

  return (
    <div className="admin-wishes-page">
      <h3 className="mb-1">{t('page_title')}</h3>
      <p className="text-secondary small mb-3">{t('page_hint')}</p>

      <div className="admin-wishes-workflow">
        {[1, 2, 3].map((step) => (
          <div
            key={step}
            className={`admin-wishes-workflow__step${workflowStep >= step ? ' active' : ''}`}>
            <span className="admin-wishes-workflow__num">{step}</span>
            {t(`workflow_step_${step}` as const)}
          </div>
        ))}
      </div>

      <Row className="g-4">
        <Col lg={4}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">{t('periods_title')}</h5>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowPeriodModal(true)}>
              + {t('add_period')}
            </Button>
          </div>

          {periods.length === 0 ? (
            <p className="text-secondary small">{t('no_periods_hint')}</p>
          ) : (
            <div className="admin-wishes-period-list">
              {periods.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`admin-wishes-period-item${selectedPeriodId === p.id ? ' selected' : ''}`}
                  onClick={() => setSelectedPeriodId(p.id)}>
                  <div className="fw-semibold mb-1">{p.title}</div>
                  <div className="d-flex flex-wrap gap-1 align-items-center">
                    <Badge bg={periodStatusVariant(p.status)}>
                      {periodStatusLabel(p.status)}
                    </Badge>
                    {p.is_current ? (
                      <Badge bg="primary">{t('current_badge')}</Badge>
                    ) : null}
                    <span className="small text-secondary">
                      {p.item_count ?? 0} {t('items_count')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Col>

        <Col lg={8}>
          {!selectedPeriod ? (
            <div className="text-secondary py-5 text-center">
              {t('select_period_hint')}
            </div>
          ) : (
            <>
              <div className="admin-wishes-period-header">
                <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
                  <div>
                    <h4 className="mb-1">{selectedPeriod.title}</h4>
                    {selectedPeriod.description ? (
                      <p className="text-secondary small mb-0">
                        {selectedPeriod.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="d-flex flex-wrap gap-1 align-items-start">
                    <Badge bg={periodStatusVariant(selectedPeriod.status)}>
                      {periodStatusLabel(selectedPeriod.status)}
                    </Badge>
                    {selectedPeriod.is_current ? (
                      <Badge bg="primary">{t('current_badge')}</Badge>
                    ) : null}
                  </div>
                </div>

                <div className="d-flex flex-wrap gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={saving || !items.length}
                    onClick={handlePublishAndSetCurrent}>
                    {t('publish_and_set_current')}
                  </Button>
                  {selectedPeriod.status !== PERIOD_OPEN && (
                    <Button
                      size="sm"
                      variant="outline-success"
                      disabled={saving}
                      onClick={handlePublishPeriod}>
                      {t('publish_period')}
                    </Button>
                  )}
                  {!selectedPeriod.is_current && (
                    <Button
                      size="sm"
                      variant="outline-primary"
                      disabled={saving}
                      onClick={handleSetCurrent}>
                      {t('set_current')}
                    </Button>
                  )}
                  {selectedPeriod.status === PERIOD_OPEN && (
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      disabled={saving}
                      onClick={handleClosePeriod}>
                      {t('close_period')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline-danger"
                    disabled={saving}
                    onClick={handleDeletePeriod}>
                    {t('delete_period')}
                  </Button>
                </div>
              </div>

              <h5 className="mb-3">{t('add_item_title')}</h5>
              <div className="admin-wishes-add-item">
                <Row className="g-2">
                  <Col md={5}>
                    <Form.Control
                      placeholder={t('field_title')}
                      value={itemTitle}
                      onChange={(e) => setItemTitle(e.target.value)}
                    />
                  </Col>
                  <Col md={4}>
                    <Form.Control
                      placeholder={t('field_description')}
                      value={itemDesc}
                      onChange={(e) => setItemDesc(e.target.value)}
                    />
                  </Col>
                  <Col md={1}>
                    <Form.Control
                      type="number"
                      title={t('sort_order')}
                      value={itemSort}
                      onChange={(e) => setItemSort(Number(e.target.value) || 0)}
                    />
                  </Col>
                  <Col md={2}>
                    <Button
                      className="w-100"
                      variant="primary"
                      disabled={saving || !itemTitle.trim()}
                      onClick={handleAddItem}>
                      {t('add')}
                    </Button>
                  </Col>
                </Row>
                <Form.Text muted>{t('sort_order_hint')}</Form.Text>
              </div>

              {items.length === 0 ? (
                <p className="text-secondary small">{t('no_items_hint')}</p>
              ) : (
                items.map((item, index) => (
                  <div key={item.id} className="admin-wishes-item-row">
                    <div className="admin-wishes-item-row__sort">
                      #{item.sort_order ?? index + 1}
                    </div>
                    <div className="admin-wishes-item-row__body">
                      <div className="admin-wishes-item-row__title">
                        {item.title}
                      </div>
                      {item.description ? (
                        <div className="admin-wishes-item-row__meta">
                          {item.description}
                        </div>
                      ) : null}
                      <div className="admin-wishes-item-row__meta">
                        {t('votes')}: {item.vote_count ?? 0}
                      </div>
                    </div>
                    <div className="d-flex flex-column gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant={
                          (item.status ?? 1) === 1
                            ? 'outline-success'
                            : 'outline-secondary'
                        }
                        onClick={() => handleToggleItem(item)}>
                        {(item.status ?? 1) === 1
                          ? t('enabled')
                          : t('disabled')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => handleDeleteItem(item.id)}>
                        {t('delete_item')}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </Col>
      </Row>

      <Modal
        show={showPeriodModal}
        onHide={() => setShowPeriodModal(false)}
        centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('add_period')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>{t('field_title')}</Form.Label>
            <Form.Control
              autoFocus
              value={periodTitle}
              onChange={(e) => setPeriodTitle(e.target.value)}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>{t('field_description')}</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={periodDesc}
              onChange={(e) => setPeriodDesc(e.target.value)}
            />
          </Form.Group>
          <Form.Text muted className="d-block mt-2">
            {t('new_period_hint')}
          </Form.Text>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPeriodModal(false)}>
            {t('cancel', { keyPrefix: 'btns' })}
          </Button>
          <Button
            variant="primary"
            disabled={saving || !periodTitle.trim()}
            onClick={handleCreatePeriod}>
            {t('add_period')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default memo(AdminWishes);
