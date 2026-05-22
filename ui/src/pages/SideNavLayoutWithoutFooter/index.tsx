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
import { Outlet } from 'react-router-dom';

import classnames from 'classnames';

import { SideNav } from '@/components';
import { useStaffSideNav } from '@/hooks';

import '@/common/sideNavLayout.scss';

const Index: FC = () => {
  const showSideNav = useStaffSideNav();

  return (
    <div
      className={classnames(
        'community-ui community-ui--shell d-flex flex-fill',
        !showSideNav && 'community-ui--no-sidebar',
      )}>
      {showSideNav ? (
        <aside
          className="position-sticky px-3 border-end py-4 d-none d-xl-block"
          id="pcSideNav">
          <SideNav />
        </aside>
      ) : null}
      <div className="community-ui__main flex-fill w-100 min-w-0 d-flex flex-column overflow-x-hidden">
        <div className="community-ui__content w-100 flex-grow-1 px-0 px-md-4">
          <div className="answer-container main-mx-with w-100 d-flex flex-column flex-1">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(Index);
