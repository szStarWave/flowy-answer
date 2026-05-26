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

import { useEffect, useState } from 'react';
import { Row, Col, Breadcrumb, Card } from 'react-bootstrap';
import {
  Link,
  useParams,
  useSearchParams,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Pagination } from '@/components';
import { loggedUserInfoStore, siteInfoStore, toastStore } from '@/stores';
import { scrollToElementTop, scrollToDocTop } from '@/utils';
import { usePageTags, usePageUsers, useSkeletonControl } from '@/hooks';
import type {
  ListResult,
  QuestionDetailRes,
  AnswerItem,
} from '@/common/interface';
import { questionDetail, getAnswers } from '@/services';

import {
  Question,
  Answer,
  AnswerHead,
  WriteAnswer,
  Alert,
  ContentLoader,
} from './components';

import './index.scss';

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('translation');
  const siteInfo = siteInfoStore((state) => state.siteInfo);
  const { qid = '', slugPermalink = '' } = useParams();
  /**
   * Note: Compatible with Permalink
   */
  let { aid = '' } = useParams();
  if (!aid && slugPermalink) {
    aid = slugPermalink;
  }

  const [urlSearch] = useSearchParams();
  const page = Number(urlSearch.get('page') || 0);
  const order = urlSearch.get('order') || '';
  const [question, setQuestion] = useState<QuestionDetailRes | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { isSkeletonShow } = useSkeletonControl(isLoading);
  const [answers, setAnswers] = useState<ListResult<AnswerItem>>({
    count: -1,
    list: [],
  });
  const { setUsers } = usePageUsers();
  const userInfo = loggedUserInfoStore((state) => state.user);
  const isAuthor = userInfo?.username === question?.user_info?.username;
  const isAdmin = userInfo?.role_id === 2;
  const isModerator = userInfo?.role_id === 3;
  const isLogged = Boolean(userInfo?.access_token);
  const loggedUserRank = userInfo?.rank;
  const location = useLocation();

  useEffect(() => {
    if (location.state?.isReview) {
      toastStore.getState().show({
        msg: t('review', { keyPrefix: 'toast' }),
        variant: 'warning',
      });

      // remove state isReview
      const newLocation = { ...location };
      delete newLocation.state;
      window.history.replaceState(null, '', newLocation.pathname);
    }
  }, [location.state]);

  const requestAnswers = async () => {
    const res = await getAnswers({
      order: order === 'updated' || order === 'created' ? order : 'default',
      question_id: qid,
      page: 1,
      page_size: 999,
    });

    if (res) {
      res.list = res.list?.filter((v) => {
        // delete answers only show to author and admin and has search params aid
        if (v.status === 10) {
          if (
            (v?.user_info?.username === userInfo?.username || isAdmin) &&
            aid === v.id
          ) {
            return v;
          }
          return null;
        }

        return v;
      });

      setAnswers({ ...res, count: res.list.length });
      if (page > 0 || order) {
        // scroll into view;
        const element = document.getElementById('answerHeader');
        scrollToElementTop(element);
      }

      res.list.forEach((item) => {
        setUsers([
          {
            displayName: item.user_info?.display_name,
            userName: item.user_info?.username,
          },
          {
            displayName: item?.update_user_info?.display_name,
            userName: item?.update_user_info?.username,
          },
        ]);
      });
    }
  };

  const getDetail = async () => {
    setIsLoading(true);
    try {
      const res = await questionDetail(qid);
      if (res) {
        setUsers([
          {
            id: res.user_info?.id,
            displayName: res.user_info?.display_name,
            userName: res.user_info?.username,
            avatar_url: res.user_info?.avatar,
          },
          {
            id: res?.update_user_info?.id,
            displayName: res?.update_user_info?.display_name,
            userName: res?.update_user_info?.username,
            avatar_url: res?.update_user_info?.avatar,
          },
          {
            id: res?.last_answered_user_info?.id,
            displayName: res?.last_answered_user_info?.display_name,
            userName: res?.last_answered_user_info?.username,
            avatar_url: res?.last_answered_user_info?.avatar,
          },
        ]);
        setQuestion(res);
      }
      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
    }
  };

  const initPage = (type: string) => {
    if (type === 'delete_question') {
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1000);
      return;
    }
    if (type === 'default') {
      scrollToDocTop();
      getDetail();
      return;
    }
    if (type === 'delete_answer') {
      getDetail();
    }
    requestAnswers();
  };

  const writeAnswerCallback = (obj: AnswerItem) => {
    setAnswers({
      count: answers.count + 1,
      list: [...answers.list, obj],
    });

    if (question) {
      setQuestion({
        ...question,
        answered: true,
        first_answer_id: question.first_answer_id
          ? question.first_answer_id
          : obj.id,
      });
    }
  };

  useEffect(() => {
    if (!qid) {
      return;
    }
    getDetail();
    requestAnswers();
  }, [qid]);

  useEffect(() => {
    if (page || order) {
      requestAnswers();
    }
  }, [page, order]);
  usePageTags({
    title: question?.title,
    description: question?.description,
    keywords: question?.tags.map((_) => _.slug_name).join(','),
  });

  return (
    <Row className="questionDetailPage community-article-page community-article-page--wide pt-4 mb-5">
      <Col xs={12} className="page-main min-w-0">
        {question?.operation?.level && <Alert data={question.operation} />}
        {!isSkeletonShow && question?.id && (
          <Breadcrumb className="question-detail-breadcrumb small mb-3">
            <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>
              {siteInfo.name}
            </Breadcrumb.Item>
            <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/questions' }}>
              {t('header.nav.question')}
            </Breadcrumb.Item>
            <Breadcrumb.Item active className="text-truncate">
              {question.title}
            </Breadcrumb.Item>
          </Breadcrumb>
        )}
        {isSkeletonShow ? (
          <ContentLoader />
        ) : question?.id ? (
          <Card className="question-detail-main border-0 shadow-sm mb-4 w-100">
            <Card.Body className="p-0">
              <Question
                data={question}
                initPage={initPage}
                hasAnswer={answers.count > 0}
                isLogged={isLogged}
                onPollUpdate={(poll) =>
                  setQuestion((q) => (q ? { ...q, poll } : q))
                }
              />
            </Card.Body>
          </Card>
        ) : null}
        {!isLoading && answers.count > 0 && (
          <>
            <AnswerHead count={answers.count} order={order} />
            <div className="article-replies-section">
              {answers?.list?.map((item) => {
                return (
                  <Answer
                    aid={aid}
                    key={item?.id}
                    data={item}
                    questionTitle={question?.title || ''}
                    canAccept={isAuthor || isAdmin || isModerator}
                    callback={initPage}
                    isLogged={isLogged}
                  />
                );
              })}
            </div>
          </>
        )}

        {!isLoading && Math.ceil(answers.count / 15) > 1 && (
          <div className="d-flex justify-content-center answer-item pt-4">
            <Pagination
              currentPage={Number(page || 1)}
              pageSize={15}
              totalSize={answers?.count || 0}
            />
          </div>
        )}

        {!isLoading &&
          Number(question?.status) !== 2 &&
          !question?.operation?.type && (
            <WriteAnswer
              data={{
                qid,
                answered: question?.answered,
                loggedUserRank,
                first_answer_id: question?.first_answer_id,
              }}
              callback={writeAnswerCallback}
            />
          )}
      </Col>
    </Row>
  );
};

export default Index;
