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
import { Card, ListGroupItem } from 'react-bootstrap';

interface Props {
  count?: number;
  /** Align skeleton with `QuestionList` view mode */
  variant?: 'card' | 'list';
}

const Index: FC<Props> = ({ count = 10, variant = 'list' }) => {
  const list = new Array(count).fill(0).map((v, i) => v + i);

  const body = (
    <>
      <div
        className="placeholder h5 align-top d-block"
        style={{ height: '21px', width: '35%' }}
      />

      <div
        className="placeholder w-75 h5 align-top"
        style={{ height: '24px' }}
      />

      <div
        className="placeholder w-100 d-block align-top mb-2"
        style={{ height: '21px' }}
      />
      <div
        className="placeholder w-100 d-block align-top mb-2"
        style={{ height: '21px' }}
      />

      <div
        className="placeholder w-50 align-top mb-12"
        style={{ height: '24px' }}
      />

      <div
        className="placeholder w-25 align-top d-block"
        style={{ height: '21px' }}
      />
    </>
  );

  if (variant === 'card') {
    return (
      <>
        {list.map((v) => (
          <Card
            key={v}
            className="question-list__card border-0 shadow-sm rounded-3 placeholder-glow">
            <Card.Body className="py-3 px-3 px-md-4">{body}</Card.Body>
          </Card>
        ))}
      </>
    );
  }

  return (
    <>
      {list.map((v) => (
        <ListGroupItem
          className="bg-transparent py-3 px-2 border-start-0 border-end-0 placeholder-glow"
          key={v}>
          {body}
        </ListGroupItem>
      ))}
    </>
  );
};

export default memo(Index);
