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

package controller

import (
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/apache/answer/internal/base/middleware"
	"github.com/apache/answer/internal/service/content"
	"github.com/apache/answer/internal/service/eventqueue"
	"github.com/apache/answer/plugin"

	"github.com/apache/answer/internal/base/constant"
	"github.com/apache/answer/internal/base/handler"
	templaterender "github.com/apache/answer/internal/controller/template_render"
	"github.com/apache/answer/internal/entity"
	"github.com/apache/answer/internal/schema"
	"github.com/apache/answer/internal/service/siteinfo_common"
	"github.com/apache/answer/pkg/checker"
	"github.com/apache/answer/pkg/converter"
	"github.com/apache/answer/pkg/htmltext"
	"github.com/apache/answer/pkg/obj"
	"github.com/apache/answer/pkg/uid"
	"github.com/apache/answer/ui"
	"github.com/gin-gonic/gin"
	"github.com/segmentfault/pacman/log"
)

var SiteUrl = ""

type TemplateController struct {
	scriptPath               []string
	cssPaths                 []string
	templateRenderController *templaterender.TemplateRenderController
	siteInfoService          siteinfo_common.SiteInfoCommonService
	eventQueueService        eventqueue.Service
	userService              *content.UserService
	questionService          *content.QuestionService
}

// NewTemplateController new controller
func NewTemplateController(
	templateRenderController *templaterender.TemplateRenderController,
	siteInfoService siteinfo_common.SiteInfoCommonService,
	eventQueueService eventqueue.Service,
	userService *content.UserService,
	questionService *content.QuestionService,
) *TemplateController {
	script, cssPaths := GetStyle()
	return &TemplateController{
		scriptPath:               script,
		cssPaths:                 cssPaths,
		templateRenderController: templateRenderController,
		siteInfoService:          siteInfoService,
		eventQueueService:        eventQueueService,
		userService:              userService,
		questionService:          questionService,
	}
}
func GetStyle() (script []string, cssPaths []string) {
	file, err := ui.Build.ReadFile("build/index.html")
	if err != nil {
		log.Error("ui build/index.html is missing; template pages will have no styles: ", err)
		return
	}
	scriptRegexp := regexp.MustCompile(`<script defer="defer" src="([^"]*)"></script>`)
	scriptData := scriptRegexp.FindAllStringSubmatch(string(file), -1)
	for _, s := range scriptData {
		if len(s) == 2 {
			script = append(script, s[1])
		}
	}

	cssRegexp := regexp.MustCompile(`<link href="([^"]+)" rel="stylesheet">`)
	for _, m := range cssRegexp.FindAllStringSubmatch(string(file), -1) {
		if len(m) == 2 {
			cssPaths = append(cssPaths, m[1])
		}
	}
	return
}

func siteBasePath(siteInfo *schema.TemplateSiteInfoResp) string {
	if siteInfo == nil || siteInfo.General.SiteUrl == "" {
		return ""
	}
	parsed, err := url.Parse(siteInfo.General.SiteUrl)
	if err != nil {
		return ""
	}
	return strings.TrimSuffix(parsed.Path, "/")
}

func cdnStaticPrefix() string {
	prefix := ""
	_ = plugin.CallCDN(func(fn plugin.CDN) error {
		prefix = fn.GetStaticPrefix()
		return nil
	})
	if prefix != "" && strings.HasSuffix(prefix, "/") {
		prefix = strings.TrimSuffix(prefix, "/")
	}
	return prefix
}

func prefixAssetPath(basePath, assetPath string) string {
	if assetPath == "" {
		return assetPath
	}
	if strings.HasPrefix(assetPath, "http://") || strings.HasPrefix(assetPath, "https://") {
		return assetPath
	}
	bp := strings.TrimSuffix(basePath, "/")
	if bp == "" {
		return assetPath
	}
	if strings.HasPrefix(assetPath, "/") {
		return bp + assetPath
	}
	return bp + "/" + assetPath
}

func writeSPAIndexHTML(ctx *gin.Context, basePath, cdnPrefix string) {
	html, err := ui.RenderIndexHTML(basePath, cdnPrefix)
	if err != nil {
		log.Error(err)
		ctx.Status(http.StatusNotFound)
		return
	}
	ctx.Header("content-type", "text/html;charset=utf-8")
	ctx.Header("Cache-Control", "no-cache, no-store, must-revalidate")
	ctx.Header("Pragma", "no-cache")
	ctx.Header("X-Frame-Options", "DENY")
	ctx.String(http.StatusOK, html)
}

// serveEmbeddedUIIndex serves the React SPA shell for community UI routes.
func (tc *TemplateController) serveEmbeddedUIIndex(ctx *gin.Context) {
	siteInfo := tc.SiteInfo(ctx)
	writeSPAIndexHTML(ctx, siteBasePath(siteInfo), cdnStaticPrefix())
}

func (tc *TemplateController) SiteInfo(ctx *gin.Context) *schema.TemplateSiteInfoResp {
	var err error
	resp := &schema.TemplateSiteInfoResp{}
	resp.General, err = tc.siteInfoService.GetSiteGeneral(ctx)
	if err != nil {
		log.Error(err)
	}
	SiteUrl = resp.General.SiteUrl
	resp.Interface, err = tc.siteInfoService.GetSiteInterface(ctx)
	if err != nil {
		log.Error(err)
	}

	resp.Branding, err = tc.siteInfoService.GetSiteBranding(ctx)
	if err != nil {
		log.Error(err)
	}

	resp.SiteSeo, err = tc.siteInfoService.GetSiteSeo(ctx)
	if err != nil {
		log.Error(err)
	}

	resp.CustomCssHtml, err = tc.siteInfoService.GetSiteCustomCssHTML(ctx)
	if err != nil {
		log.Error(err)
	}
	resp.Year = fmt.Sprintf("%d", time.Now().Year())
	return resp
}

// Index serves the React community home (SPA).
func (tc *TemplateController) Index(ctx *gin.Context) {
	tc.serveEmbeddedUIIndex(ctx)
}

func (tc *TemplateController) QuestionList(ctx *gin.Context) {
	tc.serveEmbeddedUIIndex(ctx)
}

func (tc *TemplateController) QuestionInfoRedirect(ctx *gin.Context, siteInfo *schema.TemplateSiteInfoResp, correctTitle bool) (jump bool, url string) {
	questionID := ctx.Param("id")
	title := ctx.Param("title")
	answerID := uid.DeShortID(title)
	titleIsAnswerID := false
	needChangeShortID := false

	objectType, err := obj.GetObjectTypeStrByObjectID(answerID)
	if err == nil && objectType == constant.AnswerObjectType {
		titleIsAnswerID = true
	}

	siteSeo, err := tc.siteInfoService.GetSiteSeo(ctx)
	if err != nil {
		return false, ""
	}
	isShortID := uid.IsShortID(questionID)
	if siteSeo.IsShortLink() {
		if !isShortID {
			questionID = uid.EnShortID(questionID)
			needChangeShortID = true
		}
		if titleIsAnswerID {
			answerID = uid.EnShortID(answerID)
		}
	} else {
		if isShortID {
			needChangeShortID = true
			questionID = uid.DeShortID(questionID)
		}
		if titleIsAnswerID {
			answerID = uid.DeShortID(answerID)
		}
	}

	if _, err := tc.templateRenderController.AnswerDetail(ctx, answerID); err != nil {
		answerID = ""
		titleIsAnswerID = false
	}

	url = fmt.Sprintf("%s/questions/%s", siteInfo.General.SiteUrl, questionID)
	if siteInfo.SiteSeo.Permalink == constant.PermalinkQuestionID || siteInfo.SiteSeo.Permalink == constant.PermalinkQuestionIDByShortID {
		if len(ctx.Request.URL.Query()) > 0 {
			url = fmt.Sprintf("%s?%s", url, ctx.Request.URL.RawQuery)
		}
		if needChangeShortID {
			return true, url
		}
		// not have title
		if titleIsAnswerID || len(title) == 0 {
			return false, ""
		}

		return true, url
	} else {
		detail, err := tc.templateRenderController.QuestionDetail(ctx, questionID)
		if err != nil {
			tc.Page404(ctx)
			return
		}
		url = fmt.Sprintf("%s/%s", url, htmltext.UrlTitle(detail.Title))
		if titleIsAnswerID {
			url = fmt.Sprintf("%s/%s", url, answerID)
		}

		if len(ctx.Request.URL.Query()) > 0 {
			url = fmt.Sprintf("%s?%s", url, ctx.Request.URL.RawQuery)
		}
		// have title
		if len(title) > 0 && !titleIsAnswerID && correctTitle {
			if needChangeShortID {
				return true, url
			}
			return false, ""
		}
		return true, url
	}
}

// QuestionInfo question and answers info
func (tc *TemplateController) QuestionInfo(ctx *gin.Context) {
	id := ctx.Param("id")
	title := ctx.Param("title")
	answerid := ctx.Param("answerid")
	shareUsername := ctx.Query("share")
	if checker.IsQuestionsIgnorePath(id) {
		// if id == "ask" {
		file, err := ui.Build.ReadFile("build/index.html")
		if err != nil {
			log.Error(err)
			tc.Page404(ctx)
			return
		}
		ctx.Header("content-type", "text/html;charset=utf-8")
		ctx.String(http.StatusOK, string(file))
		return
	}

	correctTitle := false

	detail, err := tc.templateRenderController.QuestionDetail(ctx, id)
	if err != nil {
		tc.Page404(ctx)
		return
	}
	if len(shareUsername) > 0 {
		userInfo, err := tc.userService.GetOtherUserInfoByUsername(
			ctx, &schema.GetOtherUserInfoByUsernameReq{Username: shareUsername})
		if err == nil {
			tc.eventQueueService.Send(ctx, schema.NewEvent(constant.EventUserShare, userInfo.ID).
				QID(id, detail.UserID).AID(answerid, ""))
		}
	}
	encodeTitle := htmltext.UrlTitle(detail.Title)
	if encodeTitle == title {
		correctTitle = true
	}

	siteInfo := tc.SiteInfo(ctx)
	jump, jumpurl := tc.QuestionInfoRedirect(ctx, siteInfo, correctTitle)
	if jump {
		ctx.Redirect(http.StatusFound, jumpurl)
		return
	}

	// answers
	answerReq := &schema.AnswerListReq{
		QuestionID: id,
		Order:      "",
		Page:       1,
		PageSize:   999,
		UserID:     "",
	}
	answers, answerCount, err := tc.templateRenderController.AnswerList(ctx, answerReq)
	if err != nil {
		tc.Page404(ctx)
		return
	}

	// comments
	objectIDs := []string{uid.DeShortID(id)}
	for _, answer := range answers {
		answerID := uid.DeShortID(answer.ID)
		objectIDs = append(objectIDs, answerID)
	}
	comments, err := tc.templateRenderController.CommentList(ctx, objectIDs)
	if err != nil {
		tc.Page404(ctx)
		return
	}

	UrlUseTitle := siteInfo.SiteSeo.Permalink == constant.PermalinkQuestionIDAndTitle ||
		siteInfo.SiteSeo.Permalink == constant.PermalinkQuestionIDAndTitleByShortID

	// related question
	userID := middleware.GetLoginUserIDFromContext(ctx)
	relatedQuestion, _, _ := tc.questionService.SimilarQuestion(ctx, id, userID)

	siteInfo.Canonical = fmt.Sprintf("%s/questions/%s/%s", siteInfo.General.SiteUrl, id, encodeTitle)
	if siteInfo.SiteSeo.Permalink == constant.PermalinkQuestionID || siteInfo.SiteSeo.Permalink == constant.PermalinkQuestionIDByShortID {
		siteInfo.Canonical = fmt.Sprintf("%s/questions/%s", siteInfo.General.SiteUrl, id)
	}
	jsonLD := &schema.QAPageJsonLD{}
	jsonLD.Context = "https://schema.org"
	jsonLD.Type = "QAPage"
	jsonLD.MainEntity.Type = "Question"
	jsonLD.MainEntity.Name = detail.Title
	jsonLD.MainEntity.Text = detail.HTML
	jsonLD.MainEntity.AnswerCount = int(answerCount)
	jsonLD.MainEntity.UpvoteCount = detail.VoteCount
	jsonLD.MainEntity.DateCreated = time.Unix(detail.CreateTime, 0)
	jsonLD.MainEntity.Author.Type = "Person"
	jsonLD.MainEntity.Author.Name = detail.UserInfo.DisplayName
	jsonLD.MainEntity.Author.URL = fmt.Sprintf("%s/users/%s", siteInfo.General.SiteUrl, detail.UserInfo.Username)
	answerList := make([]*schema.SuggestedAnswerItem, 0)
	for _, answer := range answers {
		if answer.Accepted == schema.AnswerAcceptedEnable {
			acceptedAnswerItem := &schema.AcceptedAnswerItem{}
			acceptedAnswerItem.Type = "Answer"
			acceptedAnswerItem.Text = answer.HTML
			acceptedAnswerItem.DateCreated = time.Unix(answer.CreateTime, 0)
			acceptedAnswerItem.UpvoteCount = answer.VoteCount
			acceptedAnswerItem.URL = fmt.Sprintf("%s/%s", siteInfo.Canonical, answer.ID)
			acceptedAnswerItem.Author.Type = "Person"
			acceptedAnswerItem.Author.Name = answer.UserInfo.DisplayName
			acceptedAnswerItem.Author.URL = fmt.Sprintf("%s/users/%s", siteInfo.General.SiteUrl, answer.UserInfo.Username)
			jsonLD.MainEntity.AcceptedAnswer = acceptedAnswerItem
		} else {
			item := &schema.SuggestedAnswerItem{}
			item.Type = "Answer"
			item.Text = answer.HTML
			item.DateCreated = time.Unix(answer.CreateTime, 0)
			item.UpvoteCount = answer.VoteCount
			item.URL = fmt.Sprintf("%s/%s", siteInfo.Canonical, answer.ID)
			item.Author.Type = "Person"
			item.Author.Name = answer.UserInfo.DisplayName
			item.Author.URL = fmt.Sprintf("%s/users/%s", siteInfo.General.SiteUrl, answer.UserInfo.Username)
			answerList = append(answerList, item)
		}
	}
	jsonLD.MainEntity.SuggestedAnswer = answerList
	jsonLDStr, err := json.Marshal(jsonLD)
	if err == nil {
		siteInfo.JsonLD = `<script data-react-helmet="true" type="application/ld+json">` + string(jsonLDStr) + ` </script>`
	}

	siteInfo.Description = htmltext.FetchExcerpt(detail.HTML, "...", 240)
	tags := make([]string, 0)
	for _, tag := range detail.Tags {
		tags = append(tags, tag.DisplayName)
	}
	siteInfo.Keywords = strings.ReplaceAll(strings.Trim(fmt.Sprint(tags), "[]"), " ", ",")
	siteInfo.Title = fmt.Sprintf("%s - %s", detail.Title, siteInfo.General.Name)
	tc.html(ctx, http.StatusOK, "question-detail.html", siteInfo, gin.H{
		"id":              id,
		"answerid":        answerid,
		"detail":          detail,
		"answers":         answers,
		"comments":        comments,
		"noindex":         detail.Show == entity.QuestionHide,
		"useTitle":        UrlUseTitle,
		"relatedQuestion": relatedQuestion,
	})
}

// TagList serves the React tags page (SPA).
func (tc *TemplateController) TagList(ctx *gin.Context) {
	tc.serveEmbeddedUIIndex(ctx)
}

// TagInfo serves the React tag feed (SPA).
func (tc *TemplateController) TagInfo(ctx *gin.Context) {
	tc.serveEmbeddedUIIndex(ctx)
}

// UserInfo user info
func (tc *TemplateController) UserInfo(ctx *gin.Context) {
	username := ctx.Param("username")
	if username == "" {
		tc.Page404(ctx)
		return
	}

	exist := checker.IsUsersIgnorePath(username)
	if exist {
		tc.serveEmbeddedUIIndex(ctx)
		return
	}
	req := &schema.GetOtherUserInfoByUsernameReq{}
	req.Username = username
	userinfo, err := tc.templateRenderController.UserInfo(ctx, req)
	if err != nil {
		tc.Page404(ctx)
		return
	}

	questionList, answerList, err := tc.questionService.SearchUserTopList(ctx, req.Username, "")
	if err != nil {
		tc.Page404(ctx)
		return
	}

	siteInfo := tc.SiteInfo(ctx)
	siteInfo.Canonical = fmt.Sprintf("%s/users/%s", siteInfo.General.SiteUrl, username)
	siteInfo.Title = fmt.Sprintf("%s - %s", username, siteInfo.General.Name)
	tc.html(ctx, http.StatusOK, "homepage.html", siteInfo, gin.H{
		"userinfo":     userinfo,
		"bio":          template.HTML(userinfo.BioHTML),
		"topQuestions": questionList,
		"topAnswers":   answerList,
	})
}

func (tc *TemplateController) Page404(ctx *gin.Context) {
	tc.html(ctx, http.StatusNotFound, "404.html", tc.SiteInfo(ctx), gin.H{})
}

func (tc *TemplateController) html(ctx *gin.Context, code int, tpl string, siteInfo *schema.TemplateSiteInfoResp, data gin.H) {
	basePath := siteBasePath(siteInfo)
	cdnPrefix := cdnStaticPrefix()

	scriptPath := make([]string, len(tc.scriptPath))
	for i, path := range tc.scriptPath {
		p := prefixAssetPath(basePath, path)
		if cdnPrefix != "" {
			p = strings.ReplaceAll(p, "/static", cdnPrefix+"/static")
		}
		scriptPath[i] = p
	}

	cssPaths := make([]string, 0, len(tc.cssPaths))
	for _, path := range tc.cssPaths {
		p := prefixAssetPath(basePath, path)
		if cdnPrefix != "" {
			p = strings.ReplaceAll(p, "/static", cdnPrefix+"/static")
		}
		cssPaths = append(cssPaths, p)
	}

	data["siteinfo"] = siteInfo
	data["baseURL"] = basePath
	data["scriptPath"] = scriptPath
	data["cssPaths"] = cssPaths
	data["keywords"] = siteInfo.Keywords
	if siteInfo.Description == "" {
		siteInfo.Description = siteInfo.General.Description
	}
	data["title"] = siteInfo.Title
	if siteInfo.Title == "" {
		data["title"] = siteInfo.General.Name
	}
	data["description"] = siteInfo.Description
	data["language"] = handler.GetLangByCtx(ctx)
	data["timezone"] = siteInfo.Interface.TimeZone
	language := strings.ReplaceAll(siteInfo.Interface.Language, "_", "-")
	data["lang"] = language
	data["HeadCode"] = siteInfo.CustomCssHtml.CustomHead
	data["HeaderCode"] = siteInfo.CustomCssHtml.CustomHeader
	data["FooterCode"] = siteInfo.CustomCssHtml.CustomFooter
	data["Version"] = constant.Version
	data["Revision"] = constant.Revision
	_, ok := data["path"]
	if !ok {
		data["path"] = ""
	}
	ctx.Header("X-Frame-Options", "DENY")
	ctx.HTML(code, tpl, data)
}

func (tc *TemplateController) OpenSearch(ctx *gin.Context) {
	if tc.checkPrivateMode(ctx) {
		tc.Page404(ctx)
		return
	}
	tc.templateRenderController.OpenSearch(ctx)
}

func (tc *TemplateController) Sitemap(ctx *gin.Context) {
	if tc.checkPrivateMode(ctx) {
		tc.Page404(ctx)
		return
	}
	tc.templateRenderController.Sitemap(ctx)
}

func (tc *TemplateController) SitemapPage(ctx *gin.Context) {
	if tc.checkPrivateMode(ctx) {
		tc.Page404(ctx)
		return
	}
	page := 0
	pageParam := ctx.Param("page")
	pageRegexp := regexp.MustCompile(`question-(.*).xml`)
	pageStr := pageRegexp.FindStringSubmatch(pageParam)
	if len(pageStr) != 2 {
		tc.Page404(ctx)
		return
	}
	page = converter.StringToInt(pageStr[1])
	if page == 0 {
		tc.Page404(ctx)
		return
	}
	err := tc.templateRenderController.SitemapPage(ctx, page)
	if err != nil {
		tc.Page404(ctx)
		return
	}
}

func (tc *TemplateController) checkPrivateMode(ctx *gin.Context) bool {
	resp, err := tc.siteInfoService.GetSiteSecurity(ctx)
	if err != nil {
		log.Error(err)
		return false
	}
	if resp.LoginRequired {
		return true
	}
	return false
}
