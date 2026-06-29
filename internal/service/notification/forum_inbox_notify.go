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

package notification

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/apache/answer/internal/base/constant"
	"github.com/apache/answer/internal/base/translator"
	"github.com/apache/answer/internal/schema"
	"github.com/apache/answer/pkg/display"
	"github.com/apache/answer/pkg/token"
	"github.com/segmentfault/pacman/i18n"
	"github.com/segmentfault/pacman/log"
)

func (ns *ExternalNotificationService) tryForumInboxNewAnswer(ctx context.Context, msg *schema.ExternalNotificationMsg) {
	if ns.forumInboxClient == nil || !ns.forumInboxClient.Enabled() || msg.NewAnswerTemplateRawData == nil {
		return
	}
	if ns.checkUserStatusBeforeNotification(ctx, msg.ReceiverUserID) {
		log.Warnf("forum inbox: skip new-answer push, receiver inactive user_id=%s", msg.ReceiverUserID)
		return
	}
	userInfo, exist, err := ns.userRepo.GetByUserID(ctx, msg.ReceiverUserID)
	if err != nil || !exist || userInfo == nil {
		if err != nil {
			log.Errorf("forum inbox: load receiver for new-answer push: %v", err)
		}
		return
	}
	if strings.TrimSpace(userInfo.EMail) == "" {
		log.Warnf("forum inbox: skip new-answer push, empty email user_id=%s", msg.ReceiverUserID)
		return
	}
	ctx = ns.ctxWithUserLanguage(ctx, msg.ReceiverLang, userInfo.Language)
	title, body, err := ns.emailService.NewAnswerTemplate(ctx, msg.NewAnswerTemplateRawData)
	if err != nil {
		log.Errorf("forum inbox new answer template: %v", err)
		return
	}
	link := ns.buildAnswerLinkURL(ctx, msg.NewAnswerTemplateRawData.QuestionID,
		msg.NewAnswerTemplateRawData.QuestionTitle, msg.NewAnswerTemplateRawData.AnswerID)
	id := fmt.Sprintf("forum-answer-%s-to-%s", msg.NewAnswerTemplateRawData.AnswerID, msg.ReceiverUserID)
	if err := ns.forumInboxClient.Send(ctx, userInfo.EMail, id, title, body, link, time.Now()); err != nil {
		log.Errorf("forum inbox: new-answer push failed forum_message_id=%s: %v", id, err)
		return
	}
	log.Infof("forum inbox: new-answer pushed forum_message_id=%s receiver_user_id=%s", id, msg.ReceiverUserID)
}

func (ns *ExternalNotificationService) tryForumInboxNewComment(ctx context.Context, msg *schema.ExternalNotificationMsg) {
	if ns.forumInboxClient == nil || !ns.forumInboxClient.Enabled() || msg.NewCommentTemplateRawData == nil {
		return
	}
	if ns.checkUserStatusBeforeNotification(ctx, msg.ReceiverUserID) {
		log.Warnf("forum inbox: skip new-comment push, receiver inactive user_id=%s", msg.ReceiverUserID)
		return
	}
	userInfo, exist, err := ns.userRepo.GetByUserID(ctx, msg.ReceiverUserID)
	if err != nil || !exist || userInfo == nil {
		if err != nil {
			log.Errorf("forum inbox: load receiver for new-comment push: %v", err)
		}
		return
	}
	if strings.TrimSpace(userInfo.EMail) == "" {
		log.Warnf("forum inbox: skip new-comment push, empty email user_id=%s", msg.ReceiverUserID)
		return
	}
	ctx = ns.ctxWithUserLanguage(ctx, msg.ReceiverLang, userInfo.Language)
	title, body, err := ns.emailService.NewCommentTemplate(ctx, msg.NewCommentTemplateRawData)
	if err != nil {
		log.Errorf("forum inbox new comment template: %v", err)
		return
	}
	raw := msg.NewCommentTemplateRawData
	link := ns.buildCommentLinkURL(ctx, raw.QuestionID, raw.QuestionTitle, raw.AnswerID, raw.CommentID)
	id := fmt.Sprintf("forum-comment-%s-to-%s", raw.CommentID, msg.ReceiverUserID)
	if err := ns.forumInboxClient.Send(ctx, userInfo.EMail, id, title, body, link, time.Now()); err != nil {
		log.Errorf("forum inbox: new-comment push failed forum_message_id=%s: %v", id, err)
		return
	}
	log.Infof("forum inbox: new-comment pushed forum_message_id=%s receiver_user_id=%s", id, msg.ReceiverUserID)
}

func (ns *ExternalNotificationService) tryForumInboxBroadcastNewQuestion(ctx context.Context, msg *schema.ExternalNotificationMsg) {
	if ns.forumInboxClient == nil || !ns.forumInboxClient.Enabled() || msg.NewQuestionTemplateRawData == nil {
		return
	}
	tagSet := ns.forumInboxClient.BroadcastTagNames()
	if !questionMatchesForumBroadcastTag(msg.NewQuestionTemplateRawData, tagSet) {
		raw := msg.NewQuestionTemplateRawData
		log.Infof("forum inbox: broadcast skipped (no configured tag on question) question_id=%s tag_slugs=%v tag_display=%v",
			raw.QuestionID, raw.Tags, raw.TagDisplayNames)
		return
	}
	log.Infof("forum inbox: broadcast matched tags, question_id=%s", msg.NewQuestionTemplateRawData.QuestionID)

	if interfaceInfo, _ := ns.siteInfoService.GetSiteInterface(ctx); interfaceInfo != nil {
		ctx = context.WithValue(ctx, constant.AcceptLanguageContextKey, i18n.Language(interfaceInfo.Language))
	}

	raw := &schema.NewQuestionTemplateRawData{
		QuestionAuthorUserID: msg.NewQuestionTemplateRawData.QuestionAuthorUserID,
		QuestionTitle:        msg.NewQuestionTemplateRawData.QuestionTitle,
		QuestionID:           msg.NewQuestionTemplateRawData.QuestionID,
		UnsubscribeCode:      token.GenerateToken(),
		Tags:                 append([]string(nil), msg.NewQuestionTemplateRawData.Tags...),
		TagDisplayNames:      append([]string(nil), msg.NewQuestionTemplateRawData.TagDisplayNames...),
		TagIDs:               append([]string(nil), msg.NewQuestionTemplateRawData.TagIDs...),
	}
	title, body, err := ns.emailService.NewQuestionTemplate(ctx, raw)
	if err != nil {
		log.Errorf("forum inbox broadcast new question template: %v", err)
		return
	}
	link := ns.buildQuestionLinkURL(ctx, raw.QuestionID, raw.QuestionTitle)
	const pageSize = 200
	page := 1
	authorID := msg.NewQuestionTemplateRawData.QuestionAuthorUserID
	var sentOK, sendErr int
	for {
		users, total, err := ns.userRepo.ListAvailableUsersWithEmailPage(ctx, page, pageSize)
		if err != nil {
			log.Errorf("forum inbox broadcast list users: %v", err)
			return
		}
		for _, u := range users {
			if u == nil || u.ID == authorID {
				continue
			}
			if strings.TrimSpace(u.EMail) == "" {
				continue
			}
			id := fmt.Sprintf("forum-question-%s-inbox-%s", raw.QuestionID, u.ID)
			if err := ns.forumInboxClient.Send(ctx, u.EMail, id, title, body, link, time.Now()); err != nil {
				sendErr++
				log.Errorf("forum inbox: broadcast push failed forum_message_id=%s: %v", id, err)
			} else {
				sentOK++
			}
			time.Sleep(2 * time.Millisecond)
		}
		if int64(page*pageSize) >= total {
			break
		}
		page++
	}
	log.Infof("forum inbox: broadcast finished question_id=%s delivered_ok=%d errors=%d", raw.QuestionID, sentOK, sendErr)
}

func (ns *ExternalNotificationService) tryForumInboxFirstPostReward(ctx context.Context, msg *schema.ExternalNotificationMsg) {
	if ns.forumInboxClient == nil || !ns.forumInboxClient.FirstPostRewardEnabled() || msg.NewQuestionTemplateRawData == nil {
		return
	}
	authorID := msg.NewQuestionTemplateRawData.QuestionAuthorUserID
	if authorID == "" {
		return
	}
	if ns.checkUserStatusBeforeNotification(ctx, authorID) {
		log.Warnf("forum first-post reward: skip, inactive author user_id=%s", authorID)
		return
	}
	publishedCount, err := ns.questionRepo.GetUserPublishedQuestionCount(ctx, authorID)
	if err != nil {
		log.Errorf("forum first-post reward: count published questions user_id=%s: %v", authorID, err)
		return
	}
	if publishedCount != 1 {
		return
	}
	userInfo, exist, err := ns.userRepo.GetByUserID(ctx, authorID)
	if err != nil || !exist || userInfo == nil {
		if err != nil {
			log.Errorf("forum first-post reward: load author user_id=%s: %v", authorID, err)
		}
		return
	}
	email := strings.TrimSpace(userInfo.EMail)
	if email == "" {
		log.Warnf("forum first-post reward: skip, empty email user_id=%s", authorID)
		return
	}
	result, err := ns.forumInboxClient.RequestFirstPostReward(ctx, email)
	if err != nil {
		log.Errorf("forum first-post reward: request failed user_id=%s question_id=%s: %v",
			authorID, msg.NewQuestionTemplateRawData.QuestionID, err)
		return
	}
	if result == nil {
		return
	}
	log.Infof("forum first-post reward: ok user_id=%s question_id=%s granted=%d balance=%d duplicate=%v",
		authorID, msg.NewQuestionTemplateRawData.QuestionID, result.GrantedPoints, result.Balance, result.Duplicate)
}

func questionMatchesForumBroadcastTag(raw *schema.NewQuestionTemplateRawData, tagSet map[string]struct{}) bool {
	if raw == nil || len(tagSet) == 0 {
		return false
	}
	for i, slug := range raw.Tags {
		if tagLabelInSet(slug, tagSet) {
			return true
		}
		if i < len(raw.TagDisplayNames) && tagLabelInSet(raw.TagDisplayNames[i], tagSet) {
			return true
		}
	}
	return false
}

func tagLabelInSet(label string, tagSet map[string]struct{}) bool {
	label = strings.TrimSpace(label)
	if label == "" {
		return false
	}
	if _, ok := tagSet[label]; ok {
		return true
	}
	for k := range tagSet {
		if strings.EqualFold(k, label) {
			return true
		}
	}
	return false
}

func (ns *ExternalNotificationService) ctxWithUserLanguage(ctx context.Context, receiverLang, userLanguage string) context.Context {
	lang := receiverLang
	if len(lang) == 0 || lang == translator.DefaultLangOption {
		lang = userLanguage
	}
	if len(lang) > 0 {
		return context.WithValue(ctx, constant.AcceptLanguageContextKey, i18n.Language(lang))
	}
	return ctx
}

func (ns *ExternalNotificationService) buildQuestionLinkURL(ctx context.Context, questionID, title string) string {
	if ns.siteInfoService == nil {
		return ""
	}
	siteInfo, err := ns.siteInfoService.GetSiteGeneral(ctx)
	if err != nil || siteInfo == nil {
		if err != nil {
			log.Errorf("forum inbox question link: %v", err)
		}
		return ""
	}
	seoInfo, err := ns.siteInfoService.GetSiteSeo(ctx)
	if err != nil || seoInfo == nil {
		if err != nil {
			log.Errorf("forum inbox question link: %v", err)
		}
		return ""
	}
	return display.QuestionURL(seoInfo.Permalink, siteInfo.SiteUrl, questionID, title)
}

func (ns *ExternalNotificationService) buildAnswerLinkURL(ctx context.Context, questionID, title, answerID string) string {
	if ns.siteInfoService == nil {
		return ""
	}
	siteInfo, err := ns.siteInfoService.GetSiteGeneral(ctx)
	if err != nil || siteInfo == nil {
		return ""
	}
	seoInfo, err := ns.siteInfoService.GetSiteSeo(ctx)
	if err != nil || seoInfo == nil {
		return ""
	}
	return display.AnswerURL(seoInfo.Permalink, siteInfo.SiteUrl, questionID, title, answerID)
}

func (ns *ExternalNotificationService) buildCommentLinkURL(ctx context.Context, questionID, title, answerID, commentID string) string {
	if ns.siteInfoService == nil {
		return ""
	}
	siteInfo, err := ns.siteInfoService.GetSiteGeneral(ctx)
	if err != nil || siteInfo == nil {
		return ""
	}
	seoInfo, err := ns.siteInfoService.GetSiteSeo(ctx)
	if err != nil || seoInfo == nil {
		return ""
	}
	return display.CommentURL(seoInfo.Permalink, siteInfo.SiteUrl, questionID, title, answerID, commentID)
}
