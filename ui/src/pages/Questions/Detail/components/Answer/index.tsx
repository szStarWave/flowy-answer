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

import { memo, FC, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import classNames from 'classnames';

import {
  Actions,
  Operate,
  UserCard,
  Icon,
  Comment,
  htmlRender,
  ImgViewer,
  ContentToc,
} from '@/components';
import { scrollToElementTop, bgFadeOut } from '@/utils';
import { AnswerItem } from '@/common/interface';
import { acceptanceAnswer } from '@/services';
import { useRenderHtmlPlugin } from '@/utils/pluginKit';

interface Props {
  data: AnswerItem;
  /** router answer id */
  aid?: string;
  canAccept: boolean;
  questionTitle: string;
  isLogged: boolean;
  callback: (type: string) => void;
}
const Index: FC<Props> = ({
  aid,
  data,
  isLogged,
  questionTitle = '',
  callback,
  canAccept = false,
}) => {
  const { t } = useTranslation('translation', {
    keyPrefix: 'question_detail',
  });
  const [searchParams] = useSearchParams();
  const answerRef = useRef<HTMLDivElement>(null);
  const [tocRoot, setTocRoot] = useState<HTMLElement | null>(null);

  useRenderHtmlPlugin(answerRef.current?.querySelector('.fmt') as HTMLElement);

  const acceptAnswer = () => {
    acceptanceAnswer({
      question_id: data.question_id,
      answer_id: data.accepted === 2 ? '0' : data.id,
    }).then(() => {
      callback?.('');
    });
  };

  useEffect(() => {
    if (!answerRef?.current) {
      return;
    }

    htmlRender(answerRef.current.querySelector('.fmt'), {
      copySuccessText: t('copied', { keyPrefix: 'messages' }),
      copyText: t('copy', { keyPrefix: 'messages' }),
    });
  }, [answerRef.current]);

  useEffect(() => {
    if (aid === data.id) {
      setTimeout(() => {
        const element = answerRef.current;
        scrollToElementTop(element);
        if (!searchParams.get('commentId')) {
          bgFadeOut(answerRef.current);
        }
      }, 100);
    }
  }, [data.id]);

  if (!data?.id) {
    return null;
  }

  return (
    <div
      id={data.id}
      ref={answerRef}
      className="answer-item answer-item-post py-4 w-100">
      {data.status === 10 && (
        <Alert variant="danger" className="mb-4">
          {t('post_deleted', { keyPrefix: 'messages' })}
        </Alert>
      )}
      {data.status === 11 && (
        <Alert variant="secondary" className="mb-4">
          {t('post_pending', { keyPrefix: 'messages' })}
        </Alert>
      )}
      <div className="d-flex justify-content-between mb-3">
        <div style={{ minWidth: '196px' }}>
          <UserCard
            data={data?.user_info}
            time={Number(data.create_time)}
            updateTime={Number(data.update_time)}
            updateTimePrefix={t('edit')}
            isLogged={isLogged}
            timelinePath={`/posts/${data.question_id}/${data.id}/timeline`}
          />
        </div>

        {data?.accepted === 2 && (
          <span className="answer-accept-badge">
            <Icon name="check-circle-fill" />
            <span>{t('answers.btn_accepted')}</span>
          </span>
        )}
      </div>
      <ImgViewer>
        {Array.isArray(data?.content_outline) &&
          data.content_outline.length > 0 && (
            <ContentToc
              className="d-xl-none mb-3 w-100"
              headings={data.content_outline}
              contentRoot={tocRoot}
            />
          )}
        <div className="d-flex flex-column flex-xl-row gap-3 align-items-start post-body-with-toc">
          {Array.isArray(data?.content_outline) &&
            data.content_outline.length > 0 && (
              <ContentToc
                className="content-toc--sidebar d-none d-xl-block"
                headings={data.content_outline}
                contentRoot={tocRoot}
              />
            )}
          <article
            ref={setTocRoot}
            className="fmt text-break text-wrap flex-grow-1 min-w-0"
            dangerouslySetInnerHTML={{ __html: data?.html }}
          />
        </div>
      </ImgViewer>
      <div className="answer-actions-row d-flex align-items-center flex-wrap gap-2 my-4">
        <Actions
          source="answer"
          data={{
            id: data?.id,
            isHate: data?.vote_status === 'vote_down',
            isLike: data?.vote_status === 'vote_up',
            votesCount: data?.vote_count,
            hideCollect: true,
            collected: data?.collected,
            collectCount: 0,
            username: data?.user_info?.username,
          }}
        />

        {canAccept && (
          <button
            type="button"
            className={classNames(
              'answer-accept-btn',
              data.accepted === 2 && 'answer-accept-btn--active',
            )}
            onClick={acceptAnswer}>
            <Icon
              name={data.accepted === 2 ? 'check-circle-fill' : 'check-circle'}
            />
            <span>
              {data.accepted === 2
                ? t('answers.btn_accepted')
                : t('answers.btn_accept')}
            </span>
          </button>
        )}
      </div>

      <Comment
        objectId={data.id}
        mode="answer"
        commentId={searchParams.get('commentId')}>
        <Operate
          qid={data.question_id}
          aid={data.id}
          memberActions={data?.member_actions}
          type="answer"
          isAccepted={data.accepted === 2}
          title={questionTitle}
          callback={callback}
        />
      </Comment>
    </div>
  );
};

export default memo(Index);
