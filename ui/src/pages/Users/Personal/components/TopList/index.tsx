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
import { Link } from 'react-router-dom';

import { pathFactory } from '@/router/pathFactory';
import { Counts } from '@/components';

interface Props {
  data: any[];
  type: 'answer' | 'question';
}
const Index: FC<Props> = ({ data, type }) => {
  return (
    <div className="feeds-list-panel p-3">
      <ol className="list-unstyled mb-0 feeds-list-panel__ol">
        {data?.map((item) => {
          return (
            <li key={type === 'answer' ? item.answer_id : item.question_id}>
              <Link
                className="feeds-list-title-sm link-dark text-truncate-1 d-inline-block w-100"
                to={
                  type === 'answer'
                    ? pathFactory.answerLanding({
                        questionId: item.question_id,
                        slugTitle: item.question_info?.url_title,
                        answerId: item.answer_id,
                      })
                    : pathFactory.questionLanding(
                        item.question_id,
                        item.url_title,
                      )
                }>
                {type === 'answer' ? item.question_info.title : item.title}
              </Link>

              <div className="mt-2">
                <Counts
                  data={{
                    votes: item.vote_count,
                    answers: type === 'question' ? (item.answer_count ?? 0) : 0,
                    views: 0,
                  }}
                  showViews={false}
                  showAnswers={type === 'question'}
                  showAccepted={type === 'answer' && item.accepted === 2}
                  isAccepted={
                    type === 'question'
                      ? Number(item.accepted_answer_id) > 0
                      : false
                  }
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default memo(Index);
