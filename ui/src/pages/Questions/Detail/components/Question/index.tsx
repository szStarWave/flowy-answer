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

import { memo, FC, useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

import {
  Tag,
  Actions,
  Operate,
  BaseUserCard,
  Comment,
  FormatTime,
  htmlRender,
  ImgViewer,
  ContentToc,
  QuestionPoll,
} from '@/components';
import { useRenderHtmlPlugin } from '@/utils/pluginKit';
import { formatCount, guard } from '@/utils';
import { following } from '@/services';
import { pathFactory } from '@/router/pathFactory';

interface Props {
  data: any;
  hasAnswer: boolean;
  initPage: (type: string) => void;
  isLogged: boolean;
  onPollUpdate?: (poll: any) => void;
}

const Index: FC<Props> = ({
  data,
  initPage,
  hasAnswer,
  isLogged,
  onPollUpdate,
}) => {
  const { t } = useTranslation('translation', {
    keyPrefix: 'question_detail',
  });
  const { t: tQuestion } = useTranslation('translation', {
    keyPrefix: 'question',
  });
  const [searchParams] = useSearchParams();
  const [followed, setFollowed] = useState(data?.is_followed);
  const articleRef = useRef<HTMLDivElement | null>(null);
  const [tocRoot, setTocRoot] = useState<HTMLElement | null>(null);

  useRenderHtmlPlugin(articleRef.current);

  const handleFollow = (e) => {
    e.preventDefault();
    if (!guard.tryNormalLogged(true)) {
      return;
    }
    following({
      object_id: data?.id,
      is_cancel: followed,
    }).then((res) => {
      setFollowed(res.is_followed);
    });
  };

  useEffect(() => {
    if (data) {
      setFollowed(data?.is_followed);
    }
  }, [data]);

  useEffect(() => {
    const el = articleRef.current;
    if (!el) {
      return;
    }

    htmlRender(el, {
      copySuccessText: t('copied', { keyPrefix: 'messages' }),
      copyText: t('copy', { keyPrefix: 'messages' }),
    });
  }, [data?.html, t]);

  if (!data?.id) {
    return null;
  }

  return (
    <>
      <div className="article-question-header">
        <h1 className="h3 mb-2 text-wrap text-break pb-1">
          <span className="d-inline align-middle">
            <Link
              className="link-dark align-middle"
              reloadDocument
              to={pathFactory.questionLanding(data.id, data.url_title)}>
              {data.title}
              {data.status === 2
                ? ` [${t('closed', { keyPrefix: 'question' })}]`
                : ''}
            </Link>
            {data.quality === 2 ? (
              <Badge
                bg="info"
                className="ms-2 align-middle fs-6 fw-normal text-nowrap">
                {tQuestion('featured_badge')}
              </Badge>
            ) : null}
            {data.post_type === 'poll' ? (
              <Badge
                bg="secondary"
                className="ms-2 align-middle fs-6 fw-normal text-nowrap">
                {t('poll.badge')}
              </Badge>
            ) : null}
          </span>
        </h1>

        <div className="d-flex flex-wrap align-items-center small mb-4 text-secondary border-bottom pb-3">
          <BaseUserCard data={data.user_info} className="me-3" />

          {isLogged ? (
            <>
              <Link to={`/posts/${data.id}/timeline`}>
                <FormatTime
                  time={data.create_time}
                  preFix={t('created')}
                  className="me-3 link-secondary"
                />
              </Link>

              <Link to={`/posts/${data.id}/timeline`}>
                <FormatTime
                  time={data.edit_time}
                  preFix={t('Edited')}
                  className="me-3 link-secondary"
                />
              </Link>
            </>
          ) : (
            <>
              <FormatTime
                time={data.create_time}
                preFix={t('created')}
                className="me-3 link-secondary"
              />

              <FormatTime
                time={data.edit_time}
                preFix={t('Edited')}
                className="me-3 link-secondary"
              />
            </>
          )}

          {data?.view_count > 0 && (
            <div className="me-3">
              {t('Views')} {formatCount(data.view_count)}
            </div>
          )}
          <OverlayTrigger
            placement="bottom"
            overlay={<Tooltip id="followTooltip">{t('follow_tip')}</Tooltip>}>
            <Button
              variant="link"
              size="sm"
              className="p-0 btn-no-border"
              onClick={(e) => handleFollow(e)}>
              {t(followed ? 'Following' : 'Follow')}
            </Button>
          </OverlayTrigger>
        </div>
      </div>

      <div className="article-question-body">
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
              ref={(el: HTMLDivElement | null) => {
                articleRef.current = el;
                setTocRoot(el);
              }}
              className="fmt text-break text-wrap last-p mb-4 flex-grow-1 min-w-0"
              dangerouslySetInnerHTML={{ __html: data?.html }}
            />
          </div>
        </ImgViewer>

        {data.post_type === 'poll' && data.poll ? (
          <QuestionPoll
            questionId={data.id}
            poll={data.poll}
            onPollUpdate={onPollUpdate}
          />
        ) : null}

        <div className="m-n1">
          {data?.tags?.map((item: any) => {
            return <Tag className="m-1" key={item.slug_name} data={item} />;
          })}
        </div>

        <Actions
          className="mt-4"
          source="question"
          data={{
            id: data?.id,
            isHate: data?.vote_status === 'vote_down',
            isLike: data?.vote_status === 'vote_up',
            votesCount: data?.vote_count,
            collected: data?.collected,
            collectCount: data?.collection_count,
            username: data.user_info?.username,
          }}
        />

        <div className="mt-4">
          <Comment
            objectId={data?.id}
            mode="question"
            commentId={searchParams.get('commentId')}>
            <Operate
              qid={data?.id}
              type="question"
              memberActions={data?.member_actions}
              title={data.title}
              hasAnswer={hasAnswer}
              isAccepted={Boolean(data?.accepted_answer_id)}
              callback={initPage}
            />
          </Comment>
        </div>
      </div>
    </>
  );
};

export default memo(Index);
