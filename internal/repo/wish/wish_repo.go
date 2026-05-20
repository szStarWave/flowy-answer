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

package wish

import (
	"context"
	"sync"
	"time"

	"github.com/apache/answer/internal/base/data"
	"github.com/apache/answer/internal/entity"
)

// WishRepo persists wishes and votes.
type WishRepo struct {
	data       *data.Data
	schemaOnce sync.Once
	schemaErr  error
}

// NewWishRepo constructs the repo.
func NewWishRepo(data *data.Data) *WishRepo {
	return &WishRepo{data: data}
}

// ListEnabled returns enabled wishes in a period ordered by sort_order desc, vote_count desc.
func (r *WishRepo) ListEnabled(ctx context.Context, periodID int64, page, pageSize int) (rows []*entity.Wish, total int64, err error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	db, err := r.session(ctx)
	if err != nil {
		return nil, 0, err
	}
	sess := db.Where("status = ? AND period_id = ?", entity.WishStatusEnabled, periodID)
	total, err = sess.Count(&entity.Wish{})
	if err != nil {
		return nil, 0, err
	}
	err = db.Where("status = ? AND period_id = ?", entity.WishStatusEnabled, periodID).
		Desc("sort_order", "vote_count", "id").
		Limit(pageSize, (page-1)*pageSize).
		Find(&rows)
	return rows, total, err
}

// GetByID returns a wish by id.
func (r *WishRepo) GetByID(ctx context.Context, id int64) (row *entity.Wish, exist bool, err error) {
	row = &entity.Wish{}
	db, err := r.session(ctx)
	if err != nil {
		return row, false, err
	}
	exist, err = db.ID(id).Get(row)
	return row, exist, err
}

// IncrViewCount increments view_count.
func (r *WishRepo) IncrViewCount(ctx context.Context, id int64) error {
	db, err := r.session(ctx)
	if err != nil {
		return err
	}
	_, err = db.Exec(
		"UPDATE wish SET view_count = view_count + 1 WHERE id = ?",
		id,
	)
	return err
}

// GetUserVotedWishIDInPeriod returns the wish id the user voted in the period, or 0 if none.
func (r *WishRepo) GetUserVotedWishIDInPeriod(ctx context.Context, periodID int64, userID string) (int64, error) {
	if userID == "" || periodID == 0 {
		return 0, nil
	}
	db, err := r.session(ctx)
	if err != nil {
		return 0, err
	}
	var vote entity.WishVote
	exist, err := db.Table("wish_vote").
		Join("INNER", "wish", "wish.id = wish_vote.wish_id").
		Where("wish.period_id = ? AND wish_vote.user_id = ?", periodID, userID).
		Get(&vote)
	if err != nil {
		return 0, err
	}
	if !exist {
		return 0, nil
	}
	return vote.WishID, nil
}

// HasVote returns whether user voted.
func (r *WishRepo) HasVote(ctx context.Context, wishID int64, userID string) (bool, error) {
	if userID == "" {
		return false, nil
	}
	db, err := r.session(ctx)
	if err != nil {
		return false, err
	}
	return db.Where("wish_id = ? AND user_id = ?", wishID, userID).Exist(&entity.WishVote{})
}

// ListVotedWishIDs returns wish ids the user has voted on.
func (r *WishRepo) ListVotedWishIDs(ctx context.Context, userID string, wishIDs []int64) (map[int64]bool, error) {
	out := make(map[int64]bool)
	if userID == "" || len(wishIDs) == 0 {
		return out, nil
	}
	var rows []*entity.WishVote
	db, err := r.session(ctx)
	if err != nil {
		return nil, err
	}
	err = db.Where("user_id = ?", userID).In("wish_id", wishIDs).Find(&rows)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		out[row.WishID] = true
	}
	return out, nil
}

// AddVote inserts vote and increments vote_count atomically.
func (r *WishRepo) AddVote(ctx context.Context, wishID int64, userID string) error {
	db, err := r.session(ctx)
	if err != nil {
		return err
	}
	session := db
	if err := session.Begin(); err != nil {
		return err
	}
	defer session.Close()
	vote := &entity.WishVote{WishID: wishID, UserID: userID}
	if _, err := session.Insert(vote); err != nil {
		_ = session.Rollback()
		return err
	}
	if _, err := session.Exec("UPDATE wish SET vote_count = vote_count + 1 WHERE id = ?", wishID); err != nil {
		_ = session.Rollback()
		return err
	}
	return session.Commit()
}

// RemoveVote deletes vote and decrements vote_count.
func (r *WishRepo) RemoveVote(ctx context.Context, wishID int64, userID string) error {
	db, err := r.session(ctx)
	if err != nil {
		return err
	}
	session := db
	if err := session.Begin(); err != nil {
		return err
	}
	defer session.Close()
	if _, err := session.Where("wish_id = ? AND user_id = ?", wishID, userID).Delete(&entity.WishVote{}); err != nil {
		_ = session.Rollback()
		return err
	}
	if _, err := session.Exec(
		"UPDATE wish SET vote_count = CASE WHEN vote_count > 0 THEN vote_count - 1 ELSE 0 END WHERE id = ?",
		wishID,
	); err != nil {
		_ = session.Rollback()
		return err
	}
	return session.Commit()
}

// AdminPage lists wishes for a period (or all when periodID is 0).
func (r *WishRepo) AdminPage(ctx context.Context, periodID int64, page, pageSize int) (rows []*entity.Wish, total int64, err error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	db, err := r.session(ctx)
	if err != nil {
		return nil, 0, err
	}
	sess := db
	if periodID > 0 {
		sess = sess.Where("period_id = ?", periodID)
	}
	total, err = sess.Count(&entity.Wish{})
	if err != nil {
		return nil, 0, err
	}
	sess = db
	if periodID > 0 {
		sess = sess.Where("period_id = ?", periodID)
	}
	err = sess.Desc("sort_order", "vote_count", "id").Limit(pageSize, (page-1)*pageSize).Find(&rows)
	return rows, total, err
}

// Add inserts a wish.
func (r *WishRepo) Add(ctx context.Context, row *entity.Wish) error {
	db, err := r.session(ctx)
	if err != nil {
		return err
	}
	_, err = db.Insert(row)
	return err
}

// Update updates editable columns.
func (r *WishRepo) Update(ctx context.Context, row *entity.Wish) error {
	db, err := r.session(ctx)
	if err != nil {
		return err
	}
	_, err = db.ID(row.ID).Cols(
		"title", "description", "discussion_count", "status", "sort_order", "updated_at",
	).Update(row)
	return err
}

// --- wish period ---

// GetPeriodByID returns a period.
func (r *WishRepo) GetPeriodByID(ctx context.Context, id int64) (row *entity.WishPeriod, exist bool, err error) {
	row = &entity.WishPeriod{}
	db, err := r.session(ctx)
	if err != nil {
		return row, false, err
	}
	exist, err = db.ID(id).Get(row)
	return row, exist, err
}

// GetCurrentPeriod returns the period marked is_current=1.
func (r *WishRepo) GetCurrentPeriod(ctx context.Context) (row *entity.WishPeriod, exist bool, err error) {
	row = &entity.WishPeriod{}
	db, err := r.session(ctx)
	if err != nil {
		return row, false, err
	}
	exist, err = db.Where("is_current = 1").Get(row)
	return row, exist, err
}

// ListOpenPeriods returns open periods for public listing.
func (r *WishRepo) ListOpenPeriods(ctx context.Context) ([]*entity.WishPeriod, error) {
	var rows []*entity.WishPeriod
	db, err := r.session(ctx)
	if err != nil {
		return nil, err
	}
	err = db.Where("status = ?", entity.WishPeriodStatusOpen).Desc("sort_order", "id").Find(&rows)
	return rows, err
}

// AdminListPeriods lists all periods.
func (r *WishRepo) AdminListPeriods(ctx context.Context) ([]*entity.WishPeriod, error) {
	var rows []*entity.WishPeriod
	db, err := r.session(ctx)
	if err != nil {
		return nil, err
	}
	err = db.Desc("sort_order", "id").Find(&rows)
	return rows, err
}

// AddPeriod inserts a period.
func (r *WishRepo) AddPeriod(ctx context.Context, row *entity.WishPeriod) error {
	db, err := r.session(ctx)
	if err != nil {
		return err
	}
	_, err = db.Insert(row)
	return err
}

// UpdatePeriod updates a period.
func (r *WishRepo) UpdatePeriod(ctx context.Context, row *entity.WishPeriod) error {
	db, err := r.session(ctx)
	if err != nil {
		return err
	}
	_, err = db.ID(row.ID).Cols(
		"title", "description", "status", "sort_order", "updated_at",
	).Update(row)
	return err
}

// DeletePeriod removes period and its wishes.
func (r *WishRepo) DeletePeriod(ctx context.Context, id int64) error {
	db, err := r.session(ctx)
	if err != nil {
		return err
	}
	session := db
	if err := session.Begin(); err != nil {
		return err
	}
	defer session.Close()
	var wishes []*entity.Wish
	if err := session.Where("period_id = ?", id).Find(&wishes); err != nil {
		_ = session.Rollback()
		return err
	}
	for _, w := range wishes {
		if _, err := session.Where("wish_id = ?", w.ID).Delete(&entity.WishVote{}); err != nil {
			_ = session.Rollback()
			return err
		}
	}
	if _, err := session.Where("period_id = ?", id).Delete(&entity.Wish{}); err != nil {
		_ = session.Rollback()
		return err
	}
	if _, err := session.ID(id).Delete(&entity.WishPeriod{}); err != nil {
		_ = session.Rollback()
		return err
	}
	return session.Commit()
}

// SetCurrentPeriod marks one period as current.
func (r *WishRepo) SetCurrentPeriod(ctx context.Context, id int64) error {
	db, err := r.session(ctx)
	if err != nil {
		return err
	}
	session := db
	if err := session.Begin(); err != nil {
		return err
	}
	defer session.Close()
	if _, err := session.Exec("UPDATE wish_period SET is_current = 0"); err != nil {
		_ = session.Rollback()
		return err
	}
	if _, err := session.ID(id).Cols("is_current", "updated_at").Update(&entity.WishPeriod{
		ID: id, IsCurrent: 1, UpdatedAt: time.Now(),
	}); err != nil {
		_ = session.Rollback()
		return err
	}
	return session.Commit()
}

// CountWishesByPeriod returns item count per period.
func (r *WishRepo) CountWishesByPeriod(ctx context.Context, periodID int64) (int64, error) {
	db, err := r.session(ctx)
	if err != nil {
		return 0, err
	}
	return db.Where("period_id = ?", periodID).Count(&entity.Wish{})
}

// Delete removes wish and votes.
func (r *WishRepo) Delete(ctx context.Context, id int64) error {
	db, err := r.session(ctx)
	if err != nil {
		return err
	}
	session := db
	if err := session.Begin(); err != nil {
		return err
	}
	defer session.Close()
	if _, err := session.Where("wish_id = ?", id).Delete(&entity.WishVote{}); err != nil {
		_ = session.Rollback()
		return err
	}
	if _, err := session.ID(id).Delete(&entity.Wish{}); err != nil {
		_ = session.Rollback()
		return err
	}
	return session.Commit()
}
