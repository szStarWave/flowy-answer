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
	"strings"
	"sync"

	"github.com/segmentfault/pacman/log"
)

var (
	loggedFirstPostRewardEnabled  sync.Once
	loggedFirstPostRewardDisabled sync.Once
)

type firstPostRewardRequest struct {
	Email   string `json:"email"`
	Channel string `json:"channel,omitempty"`
}

type FirstPostRewardResult struct {
	GrantedPoints int64 `json:"grantedPoints"`
	Balance       int64 `json:"balance"`
	Duplicate     bool  `json:"duplicate"`
}

type firstPostRewardResponse struct {
	Code     int                    `json:"code"`
	Msg      string                 `json:"msg"`
	ErrorKey string                 `json:"errorKey"`
	Data     *FirstPostRewardResult `json:"data"`
}

// FirstPostRewardEnabled is true when the outbound first-post reward API is configured.
func (c *Client) FirstPostRewardEnabled() bool {
	return c != nil && c.httpClient != nil && c.firstPostRewardURL != ""
}

// RequestFirstPostReward notifies the main application to grant first-post credit (see API.md).
// No Authorization header is required by the integration API.
func (c *Client) RequestFirstPostReward(ctx context.Context, email string) (*FirstPostRewardResult, error) {
	if !c.FirstPostRewardEnabled() {
		return nil, nil
	}
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return nil, nil
	}

	reqBody := firstPostRewardRequest{Email: email}
	if c.channel != "" {
		reqBody.Channel = c.channel
	}
	payload, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.firstPostRewardURL, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		log.Errorf("forum first-post reward: HTTP request failed: %v", err)
		return nil, err
	}
	if resp == nil || resp.Body == nil {
		return nil, fmt.Errorf("forum first-post reward: empty HTTP response")
	}
	defer func() { _ = resp.Body.Close() }()

	respBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	var wrapped firstPostRewardResponse
	if err := json.Unmarshal(respBytes, &wrapped); err != nil {
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("forum first-post reward: HTTP %d (response not JSON): %w", resp.StatusCode, err)
		}
		return nil, fmt.Errorf("forum first-post reward: unexpected response body: %w", err)
	}
	if wrapped.Code != 200 {
		if resp.StatusCode == http.StatusNotFound {
			log.Warnf("forum first-post reward: user not found on main site (email suffix …%s)", emailSuffixForLog(email))
		} else if resp.StatusCode == http.StatusServiceUnavailable {
			log.Infof("forum first-post reward: disabled on main site errorKey=%s", wrapped.ErrorKey)
		} else {
			log.Warnf("forum first-post reward: failed code=%d errorKey=%s msg=%s http=%d",
				wrapped.Code, wrapped.ErrorKey, wrapped.Msg, resp.StatusCode)
		}
		return nil, fmt.Errorf("forum first-post reward: code=%d errorKey=%s", wrapped.Code, wrapped.ErrorKey)
	}
	return wrapped.Data, nil
}

func logFirstPostRewardEnabled(rewardURL string) {
	loggedFirstPostRewardEnabled.Do(func() {
		log.Infof("forum first-post reward: outbound enabled, url=%s", rewardURL)
	})
}

func logFirstPostRewardDisabled() {
	loggedFirstPostRewardDisabled.Do(func() {
		log.Infof("forum first-post reward: outbound disabled (set FirstPostRewardAPIURL in internal/service/forum_inbox/settings.go)")
	})
}
