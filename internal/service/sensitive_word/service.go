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

package sensitive_word

import (
	"context"
	"strings"
	"sync"
	"unicode/utf8"

	"github.com/apache/answer/internal/base/pager"
	"github.com/apache/answer/internal/base/reason"
	"github.com/apache/answer/internal/base/translator"
	"github.com/apache/answer/internal/base/validator"
	"github.com/apache/answer/internal/entity"
	sensitivewordrepo "github.com/apache/answer/internal/repo/sensitiveword"
	"github.com/apache/answer/internal/schema"
	"github.com/apache/answer/internal/service/role"
	"github.com/cloudflare/ahocorasick"
	perrors "github.com/segmentfault/pacman/errors"
	"github.com/segmentfault/pacman/i18n"
)

// SensitiveWordService loads dictionary rows, builds a matcher, and validates UGC.
type SensitiveWordService struct {
	repo        *sensitivewordrepo.SensitiveWordRepo
	userRoleRel *role.UserRoleRelService
	mu          sync.RWMutex
	matcher     *ahocorasick.Matcher
	dictLoaded  bool
}

// NewSensitiveWordService constructs the service.
func NewSensitiveWordService(
	repo *sensitivewordrepo.SensitiveWordRepo,
	userRoleRel *role.UserRoleRelService,
) *SensitiveWordService {
	return &SensitiveWordService{
		repo:        repo,
		userRoleRel: userRoleRel,
	}
}

func (s *SensitiveWordService) reloadMatcher(ctx context.Context) error {
	raw, err := s.repo.ListEnabled(ctx)
	if err != nil {
		return err
	}
	seen := make(map[string]struct{}, len(raw))
	norm := make([]string, 0, len(raw))
	for _, w := range raw {
		n := NormalizeForMatch(w)
		if n == "" {
			continue
		}
		if _, ok := seen[n]; ok {
			continue
		}
		seen[n] = struct{}{}
		norm = append(norm, n)
	}
	var m *ahocorasick.Matcher
	if len(norm) > 0 {
		m = ahocorasick.NewStringMatcher(norm)
	}
	s.mu.Lock()
	s.matcher = m
	s.dictLoaded = true
	s.mu.Unlock()
	return nil
}

func (s *SensitiveWordService) matcherContains(text string) bool {
	s.mu.RLock()
	m := s.matcher
	s.mu.RUnlock()
	if m == nil || text == "" {
		return false
	}
	return m.Contains([]byte(text))
}

func (s *SensitiveWordService) ensureMatcher(ctx context.Context) error {
	s.mu.RLock()
	loaded := s.dictLoaded
	s.mu.RUnlock()
	if loaded {
		return nil
	}
	return s.reloadMatcher(ctx)
}

// ReloadFromDB refreshes the in-memory matcher (call after admin mutations).
func (s *SensitiveWordService) ReloadFromDB(ctx context.Context) error {
	return s.reloadMatcher(ctx)
}

func (s *SensitiveWordService) bypassForStaff(ctx context.Context, userID string) bool {
	if len(userID) == 0 {
		return false
	}
	rid, err := s.userRoleRel.GetUserRole(ctx, userID)
	if err != nil {
		return false
	}
	return rid == role.RoleAdminID || rid == role.RoleModeratorID
}

func (s *SensitiveWordService) formHit(lang i18n.Language, field string) error {
	msg := translator.Tr(lang, reason.ContentContainsSensitiveWord)
	return &FormError{
		Fields: []*validator.FormErrorField{
			{ErrorField: field, ErrorMsg: msg},
		},
	}
}

// ValidateQuestionText checks title, body markdown, HTML, and optional poll labels.
func (s *SensitiveWordService) ValidateQuestionText(ctx context.Context, lang i18n.Language, userID, title, markdown, html string, pollLabels []string) error {
	if s.bypassForStaff(ctx, userID) {
		return nil
	}
	if err := s.ensureMatcher(ctx); err != nil {
		return err
	}
	titleN := NormalizeForMatch(title)
	if titleN != "" && s.matcherContains(titleN) {
		return s.formHit(lang, "title")
	}
	body := NormalizeForMatch(markdown) + " " + NormalizeForMatch(StripHTMLToText(html))
	if s.matcherContains(body) {
		return s.formHit(lang, "content")
	}
	if len(pollLabels) > 0 {
		var b strings.Builder
		for _, l := range pollLabels {
			b.WriteString(NormalizeForMatch(l))
			b.WriteByte(' ')
		}
		if s.matcherContains(strings.TrimSpace(b.String())) {
			return s.formHit(lang, "content")
		}
	}
	return nil
}

// ValidateAnswerText checks answer markdown and HTML.
func (s *SensitiveWordService) ValidateAnswerText(ctx context.Context, lang i18n.Language, userID, markdown, html string) error {
	if s.bypassForStaff(ctx, userID) {
		return nil
	}
	if err := s.ensureMatcher(ctx); err != nil {
		return err
	}
	body := NormalizeForMatch(markdown) + " " + NormalizeForMatch(StripHTMLToText(html))
	if s.matcherContains(body) {
		return s.formHit(lang, "content")
	}
	return nil
}

// ValidateCommentText checks comment original and parsed HTML.
func (s *SensitiveWordService) ValidateCommentText(ctx context.Context, lang i18n.Language, userID, original, parsedHTML string) error {
	if s.bypassForStaff(ctx, userID) {
		return nil
	}
	if err := s.ensureMatcher(ctx); err != nil {
		return err
	}
	body := NormalizeForMatch(original) + " " + NormalizeForMatch(StripHTMLToText(parsedHTML))
	if s.matcherContains(body) {
		return s.formHit(lang, "original_text")
	}
	return nil
}

// AdminPage returns paginated dictionary rows.
func (s *SensitiveWordService) AdminPage(ctx context.Context, req *schema.SensitiveWordAdminPageReq) (*pager.PageModel, error) {
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 {
		req.PageSize = 20
	}
	rows, total, err := s.repo.GetPage(ctx, req.Page, req.PageSize)
	if err != nil {
		return nil, err
	}
	out := make([]*schema.SensitiveWordAdminItem, 0, len(rows))
	for _, r := range rows {
		out = append(out, &schema.SensitiveWordAdminItem{
			ID:        r.ID,
			Word:      r.Word,
			Status:    r.Status,
			CreatedAt: r.CreatedAt.Unix(),
			UpdatedAt: r.UpdatedAt.Unix(),
		})
	}
	return pager.NewPageModel(total, out), nil
}

// AdminAdd inserts a word and refreshes the matcher.
func (s *SensitiveWordService) AdminAdd(ctx context.Context, req *schema.SensitiveWordAdminAddReq) (*schema.SensitiveWordAdminAddResp, error) {
	word := strings.TrimSpace(req.Word)
	if word == "" {
		return nil, perrors.BadRequest(reason.RequestFormatError)
	}
	if utf8.RuneCountInString(word) > 191 {
		return nil, perrors.BadRequest(reason.RequestFormatError)
	}
	id, err := s.repo.Add(ctx, word, entity.SensitiveWordEnabled)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") ||
			strings.Contains(strings.ToLower(err.Error()), "unique") {
			return nil, perrors.BadRequest(reason.SensitiveWordDuplicate)
		}
		return nil, err
	}
	_ = s.ReloadFromDB(ctx)
	return &schema.SensitiveWordAdminAddResp{ID: id}, nil
}

// AdminSetStatus enables or disables a word.
func (s *SensitiveWordService) AdminSetStatus(ctx context.Context, req *schema.SensitiveWordAdminSetStatusReq) error {
	if req.Status != entity.SensitiveWordEnabled && req.Status != entity.SensitiveWordDisabled {
		return perrors.BadRequest(reason.StatusInvalid)
	}
	n, err := s.repo.UpdateStatus(ctx, req.ID, req.Status)
	if err != nil {
		return err
	}
	if n == 0 {
		return perrors.BadRequest(reason.ObjectNotFound)
	}
	return s.ReloadFromDB(ctx)
}

// AdminDelete removes a word.
func (s *SensitiveWordService) AdminDelete(ctx context.Context, req *schema.SensitiveWordAdminDeleteReq) error {
	n, err := s.repo.Delete(ctx, req.ID)
	if err != nil {
		return err
	}
	if n == 0 {
		return perrors.BadRequest(reason.ObjectNotFound)
	}
	return s.ReloadFromDB(ctx)
}
