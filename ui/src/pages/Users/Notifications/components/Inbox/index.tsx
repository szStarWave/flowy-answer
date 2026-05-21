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

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import classNames from 'classnames';
import isEmpty from 'lodash/isEmpty';

import { FormatTime, Empty, Avatar } from '@/components';

const Inbox = ({ data, handleReadNotification }) => {
  const { t } = useTranslation('translation', { keyPrefix: 'notifications' });
  if (!data) {
    return null;
  }
  if (isEmpty(data)) {
    return <Empty />;
  }
  return (
    <ul className="community-notifications-list">
      {data.map((item) => {
        const { comment, question, answer } =
          item?.object_info?.object_map || {};
        let url = '';
        switch (item.object_info.object_type) {
          case 'question':
            url = `/questions/${item.object_info.object_id}`;
            break;
          case 'answer':
            url = `/questions/${question}/${item.object_info.object_id}`;
            break;
          case 'comment':
            url = `/questions/${question}/${answer}?commentId=${comment}`;
            break;
          default:
            url = '';
        }
        const showUser = item.user_info && item.user_info.status !== 'deleted';
        return (
          <li
            key={item.id}
            className={classNames('community-notifications-item', {
              'is-unread': !item.is_read,
            })}>
            <span
              className="community-notifications-item__indicator"
              aria-hidden
            />
            {showUser ? (
              <Link
                to={`/users/${item.user_info.username}`}
                className="community-notifications-item__avatar">
                <Avatar
                  size="40px"
                  avatar={item.user_info.avatar}
                  searchStr="s=80"
                  alt={item.user_info.display_name}
                />
              </Link>
            ) : null}
            <div className="community-notifications-item__body">
              <div className="community-notifications-item__text">
                {showUser ? (
                  <Link to={`/users/${item.user_info.username}`}>
                    {item.user_info.display_name}
                  </Link>
                ) : (
                  <span>{item.user_info?.display_name || t('someone')}</span>
                )}{' '}
                {item.notification_action}{' '}
                <Link to={url} onClick={() => handleReadNotification(item.id)}>
                  {item.object_info.title}
                </Link>
              </div>
              <div className="community-notifications-item__time">
                <FormatTime time={item.update_time} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default Inbox;
