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
import { Container, Col } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { usePageTags } from '@/hooks';
import { WelcomeTitle } from '@/components';

import SendEmail from './components/sendEmail';

const Index: FC = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'change_email' });
  usePageTags({
    title: t('change_email', { keyPrefix: 'page_title' }),
  });
  return (
    <Container className="auth-page">
      <WelcomeTitle />
      <div className="auth-panel">
        <div className="auth-card">
          <Col className="mx-auto px-0" md={12}>
            <SendEmail />
          </Col>
        </div>
      </div>
    </Container>
  );
};

export default memo(Index);
