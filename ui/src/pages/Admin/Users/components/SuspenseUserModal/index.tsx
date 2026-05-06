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
import { Modal, Button, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { changeUserStatus } from '@/services';
import { SUSPENSE_USER_TIME } from '@/common/constants';
import { toastStore } from '@/stores';

type Variant = 'suspend' | 'mute';

const SuspenseUserModal = ({
  show,
  userId,
  variant = 'suspend',
  onClose,
  refreshUsers,
}: {
  show: boolean;
  userId: string;
  variant?: Variant;
  onClose: () => void;
  refreshUsers: () => void;
}) => {
  const { t } = useTranslation('translation', { keyPrefix: 'admin.users' });
  const [checkVal, setCheckVal] = useState('forever');

  const handleClose = () => {
    onClose();
    setCheckVal('forever');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const isMute = variant === 'mute';
    const payload = isMute
      ? {
          user_id: userId,
          status: 'muted',
          mute_duration: checkVal,
        }
      : {
          user_id: userId,
          status: 'suspended',
          suspend_duration: checkVal,
        };
    changeUserStatus(payload).then(() => {
      toastStore.getState().show({
        msg: t(isMute ? 'user_muted' : 'user_suspended', {
          keyPrefix: 'messages',
        }),
        variant: 'success',
      });
      refreshUsers?.();
      handleClose();
    });
  };

  const isMute = variant === 'mute';

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>
          {isMute ? t('mute_user.title') : t('suspend_user.title')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>{isMute ? t('mute_user.content') : t('suspend_user.content')}</p>
        <Form>
          <Form.Group controlId="delete_user" className="mb-3">
            <Form.Label>
              {isMute ? t('mute_user.label') : t('suspend_user.label')}
            </Form.Label>
            <Form.Select
              value={checkVal}
              onChange={(e) => setCheckVal(e.target.value)}>
              <option value="forever">
                {isMute ? t('mute_user.forever') : t('suspend_user.forever')}
              </option>
              {SUSPENSE_USER_TIME.map((item) => {
                return (
                  <option key={item.value} value={item.value}>
                    {item.time} {t(item.label, { keyPrefix: 'dates' })}
                  </option>
                );
              })}
            </Form.Select>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="link" onClick={handleClose}>
          {t('cancel', { keyPrefix: 'btns' })}
        </Button>
        <Button variant="danger" onClick={handleSubmit}>
          {isMute ? t('mute') : t('suspend', { keyPrefix: 'btns' })}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SuspenseUserModal;
