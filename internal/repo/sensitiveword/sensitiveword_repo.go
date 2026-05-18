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

package sensitiveword

import (
	"context"
	"strings"

	"github.com/apache/answer/internal/base/data"
	"github.com/apache/answer/internal/entity"
)

// SensitiveWordRepo persists sensitive word rows.
type SensitiveWordRepo struct {
	data *data.Data
}

// NewSensitiveWordRepo new repo
func NewSensitiveWordRepo(data *data.Data) *SensitiveWordRepo {
	return &SensitiveWordRepo{data: data}
}

// ListEnabled returns normalized words that are active for matching.
func (r *SensitiveWordRepo) ListEnabled(ctx context.Context) (words []string, err error) {
	var rows []*entity.SensitiveWord
	err = r.data.DB.Context(ctx).
		Where("status = ?", entity.SensitiveWordEnabled).
		OrderBy("id ASC").
		Find(&rows)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		w := strings.TrimSpace(row.Word)
		if w != "" {
			words = append(words, w)
		}
	}
	return words, nil
}

// Add inserts a word; duplicate unique `word` returns error from driver.
func (r *SensitiveWordRepo) Add(ctx context.Context, word string, status int) (id int64, err error) {
	row := &entity.SensitiveWord{
		Word:   word,
		Status: status,
	}
	_, err = r.data.DB.Context(ctx).Insert(row)
	if err != nil {
		return 0, err
	}
	return row.ID, nil
}

// UpdateStatus sets enabled/disabled.
func (r *SensitiveWordRepo) UpdateStatus(ctx context.Context, id int64, status int) (affected int64, err error) {
	return r.data.DB.Context(ctx).ID(id).Cols("status", "updated_at").Update(&entity.SensitiveWord{Status: status})
}

// Delete removes a row by id.
func (r *SensitiveWordRepo) Delete(ctx context.Context, id int64) (affected int64, err error) {
	return r.data.DB.Context(ctx).ID(id).Delete(&entity.SensitiveWord{})
}

// GetPage lists rows for admin UI.
func (r *SensitiveWordRepo) GetPage(ctx context.Context, page, pageSize int) (rows []*entity.SensitiveWord, total int64, err error) {
	total, err = r.data.DB.Context(ctx).Count(&entity.SensitiveWord{})
	if err != nil {
		return nil, 0, err
	}
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize
	err = r.data.DB.Context(ctx).
		OrderBy("id DESC").
		Limit(pageSize, offset).
		Find(&rows)
	return rows, total, err
}
