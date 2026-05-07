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

package forum_inbox

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/segmentfault/pacman/log"
)

var (
	loggedForumInboxEnabled  sync.Once
	loggedForumInboxDisabled sync.Once
)

const (
	maxTitleRunes          = 512
	maxBodyBytes           = 60000
	maxLinkRunes           = 2048
	maxForumMessageIDBytes = 512
)

// Client calls the main application HTTP ingest API (see forum-inbox-integration.md).
type Client struct {
	httpClient *http.Client
	ingestURL  string
	secret     string
	channel    string

	broadcastTagNames map[string]struct{}
}

type ingestRequest struct {
	Email          string `json:"email"`
	Channel        string `json:"channel,omitempty"`
	ForumMessageID string `json:"forumMessageId,omitempty"`
	Title          string `json:"title"`
	Body           string `json:"body"`
	LinkURL        string `json:"linkUrl,omitempty"`
	OccurredAt     string `json:"occurredAt"`
}

type ingestResponse struct {
	Code     int             `json:"code"`
	Msg      string          `json:"msg"`
	ErrorKey string          `json:"errorKey"`
	Data     json.RawMessage `json:"data"`
}

// NewClient builds a client from package Settings (see settings.go).
// If Settings.APIBaseURL or Settings.IngestSecret is empty, returns a disabled client (Enabled() == false).
func NewClient() *Client {
	ingestURL := strings.TrimSpace(Settings.APIBaseURL)
	secret := strings.TrimSpace(Settings.IngestSecret)
	if ingestURL == "" || secret == "" {
		loggedForumInboxDisabled.Do(func() {
			log.Infof("forum inbox: outbound delivery disabled (set APIBaseURL and IngestSecret in internal/service/forum_inbox/settings.go)")
		})
		return &Client{}
	}

	ch := strings.TrimSpace(Settings.UserChannel)

	tagSet := make(map[string]struct{})
	for _, t := range Settings.BroadcastTagNames {
		t = strings.TrimSpace(t)
		if t != "" {
			tagSet[t] = struct{}{}
		}
	}

	c := &Client{
		httpClient: &http.Client{
			Timeout: 20 * time.Second,
		},
		ingestURL:         ingestURL,
		secret:            secret,
		channel:           ch,
		broadcastTagNames: tagSet,
	}
	loggedForumInboxEnabled.Do(func() {
		host := "(invalid URL)"
		if u, err := url.Parse(ingestURL); err == nil && u.Host != "" {
			host = u.Host
		}
		log.Infof("forum inbox: outbound delivery enabled, host=%s", host)
	})
	return c
}

// Enabled is true when outbound forum inbox integration is configured.
func (c *Client) Enabled() bool {
	return c != nil && c.ingestURL != "" && c.secret != ""
}

// BroadcastTagNames returns the configured tag display/slug names that trigger site-wide inbox delivery.
func (c *Client) BroadcastTagNames() map[string]struct{} {
	if c == nil {
		return nil
	}
	return c.broadcastTagNames
}

// Send posts one message to the main site ingest API.
func (c *Client) Send(ctx context.Context, email, forumMessageID, title, body, linkURL string, occurredAt time.Time) error {
	if !c.Enabled() {
		return nil
	}
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return nil
	}
	title = truncateRunes(title, maxTitleRunes)
	body = truncateUTF8(body, maxBodyBytes)
	linkURL = truncateRunes(linkURL, maxLinkRunes)
	forumMessageID = truncateUTF8(forumMessageID, maxForumMessageIDBytes)

	reqBody := ingestRequest{
		Email:          email,
		ForumMessageID: forumMessageID,
		Title:          title,
		Body:           body,
		LinkURL:        linkURL,
		OccurredAt:     occurredAt.UTC().Format(time.RFC3339Nano),
	}
	if c.channel != "" {
		reqBody.Channel = c.channel
	}
	payload, err := json.Marshal(reqBody)
	if err != nil {
		return err
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.ingestURL, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.secret)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		log.Errorf("forum inbox: HTTP request failed: %v", err)
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	respBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	ctype := strings.TrimSpace(resp.Header.Get("Content-Type"))

	var wrapped ingestResponse
	if err := json.Unmarshal(respBytes, &wrapped); err != nil {
		if resp.StatusCode != http.StatusOK {
			log.Warnf("forum inbox: non-JSON response http=%d content-type=%q body_prefix=%q %s",
				resp.StatusCode, ctype, bodyPrefixForLog(respBytes, 120), ingestFailureHint(resp.StatusCode))
			return fmt.Errorf("forum inbox: HTTP %d (response not JSON, likely wrong URL or gateway): %w",
				resp.StatusCode, err)
		}
		log.Warnf("forum inbox: HTTP %d but response body is not expected JSON (len=%d): %v",
			resp.StatusCode, len(respBytes), err)
		return fmt.Errorf("forum inbox: unexpected response body: %w", err)
	}
	if wrapped.Code != 200 {
		if resp.StatusCode == http.StatusNotFound {
			log.Warnf("forum inbox: user not found on main site (email suffix …%s)",
				emailSuffixForLog(email))
		} else {
			log.Warnf("forum inbox: ingest failed code=%d errorKey=%s msg=%s http=%d",
				wrapped.Code, wrapped.ErrorKey, wrapped.Msg, resp.StatusCode)
		}
		return fmt.Errorf("forum inbox: code=%d errorKey=%s", wrapped.Code, wrapped.ErrorKey)
	}
	log.Debugf("forum inbox: delivered forumMessageId=%s", forumMessageID)
	return nil
}

func bodyPrefixForLog(b []byte, max int) string {
	s := string(b)
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.ReplaceAll(s, "\r", "")
	if len(s) > max {
		return s[:max] + "…"
	}
	return s
}

func ingestFailureHint(status int) string {
	switch status {
	case http.StatusMethodNotAllowed:
		return "hint=405 通常表示该 URL 不接受 POST，请核对 APIBaseURL 是否包含主站文档中的路径段 /api/v1/integration/forum/inbox/messages（或你们网关上的等价完整路径）"
	case http.StatusNotFound:
		return "hint=404 请核对路径是否与主站路由一致"
	case http.StatusUnauthorized:
		return "hint=401 请核对 IngestSecret 是否与主站 forum.ingest_secret 一致"
	default:
		return ""
	}
}

func emailSuffixForLog(email string) string {
	if len(email) < 8 {
		return email
	}
	return email[len(email)-8:]
}

func truncateRunes(s string, max int) string {
	r := []rune(s)
	if len(r) <= max {
		return s
	}
	return string(r[:max])
}

func truncateUTF8(s string, maxBytes int) string {
	if len(s) <= maxBytes {
		return s
	}
	s = s[:maxBytes]
	for len(s) > 0 && !utf8.ValidString(s) {
		_, sz := utf8.DecodeLastRuneInString(s)
		if sz <= 0 {
			break
		}
		s = s[:len(s)-sz]
	}
	return s
}
