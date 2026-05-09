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

package poll

import (
	"context"

	"github.com/apache/answer/internal/base/data"
	"github.com/apache/answer/internal/base/reason"
	"github.com/apache/answer/internal/entity"
	"github.com/apache/answer/pkg/uid"
	"github.com/segmentfault/pacman/errors"
	"xorm.io/builder"
	"xorm.io/xorm"
)

// PollRepo persists poll metadata, options, and votes.
type PollRepo interface {
	WithTx(ctx context.Context, fn func(ctx context.Context, sess *xorm.Session) error) error

	InsertPoll(ctx context.Context, sess *xorm.Session, p *entity.QuestionPoll) error
	GetPoll(ctx context.Context, questionID string) (*entity.QuestionPoll, bool, error)
	UpdatePollCols(ctx context.Context, sess *xorm.Session, p *entity.QuestionPoll, cols []string) error

	InsertOption(ctx context.Context, sess *xorm.Session, o *entity.QuestionPollOption) error
	ListOptionsByQuestion(ctx context.Context, questionID string) ([]*entity.QuestionPollOption, error)
	GetOption(ctx context.Context, questionID, optionID string) (*entity.QuestionPollOption, bool, error)
	UpdateOptionCols(ctx context.Context, sess *xorm.Session, o *entity.QuestionPollOption, cols []string) error

	DeleteVotesByUser(ctx context.Context, sess *xorm.Session, questionID, userID string) error
	InsertVote(ctx context.Context, sess *xorm.Session, v *entity.QuestionPollVote) error
	ListVotesByUser(ctx context.Context, questionID, userID string) ([]*entity.QuestionPollVote, error)
	CountVotesGroupedByOption(ctx context.Context, questionID string) (map[string]int, error)
	CountDistinctVoters(ctx context.Context, questionID string) (int64, error)
	UserVoteCount(ctx context.Context, questionID, userID string) (int64, error)
}

type pollRepo struct {
	data *data.Data
}

// NewPollRepo constructs PollRepo.
func NewPollRepo(data *data.Data) PollRepo {
	return &pollRepo{data: data}
}

func (r *pollRepo) db(ctx context.Context) *xorm.Session {
	return r.data.DB.Context(ctx)
}

func (r *pollRepo) WithTx(ctx context.Context, fn func(ctx context.Context, sess *xorm.Session) error) error {
	_, err := r.data.DB.Transaction(func(sess *xorm.Session) (any, error) {
		return nil, fn(ctx, sess)
	})
	return err
}

func (r *pollRepo) InsertPoll(ctx context.Context, sess *xorm.Session, p *entity.QuestionPoll) error {
	p.QuestionID = uid.DeShortID(p.QuestionID)
	db := r.db(ctx)
	if sess != nil {
		db = sess
	}
	_, err := db.Insert(p)
	if err != nil {
		return errors.InternalServer(reason.DatabaseError).WithError(err).WithStack()
	}
	return nil
}

func (r *pollRepo) GetPoll(ctx context.Context, questionID string) (*entity.QuestionPoll, bool, error) {
	qid := uid.DeShortID(questionID)
	var p entity.QuestionPoll
	has, err := r.db(ctx).Where(builder.Eq{"question_id": qid}).Get(&p)
	if err != nil {
		return nil, false, errors.InternalServer(reason.DatabaseError).WithError(err).WithStack()
	}
	return &p, has, nil
}

func (r *pollRepo) UpdatePollCols(ctx context.Context, sess *xorm.Session, p *entity.QuestionPoll, cols []string) error {
	p.QuestionID = uid.DeShortID(p.QuestionID)
	db := r.db(ctx)
	if sess != nil {
		db = sess
	}
	_, err := db.ID(p.QuestionID).Cols(cols...).Update(p)
	if err != nil {
		return errors.InternalServer(reason.DatabaseError).WithError(err).WithStack()
	}
	return nil
}

func (r *pollRepo) InsertOption(ctx context.Context, sess *xorm.Session, o *entity.QuestionPollOption) error {
	o.QuestionID = uid.DeShortID(o.QuestionID)
	o.ID = uid.DeShortID(o.ID)
	db := r.db(ctx)
	if sess != nil {
		db = sess
	}
	_, err := db.Insert(o)
	if err != nil {
		return errors.InternalServer(reason.DatabaseError).WithError(err).WithStack()
	}
	return nil
}

func (r *pollRepo) ListOptionsByQuestion(ctx context.Context, questionID string) ([]*entity.QuestionPollOption, error) {
	qid := uid.DeShortID(questionID)
	list := make([]*entity.QuestionPollOption, 0)
	err := r.db(ctx).Where(builder.Eq{"question_id": qid}).OrderBy("sort_order ASC, id ASC").Find(&list)
	if err != nil {
		return nil, errors.InternalServer(reason.DatabaseError).WithError(err).WithStack()
	}
	return list, nil
}

func (r *pollRepo) GetOption(ctx context.Context, questionID, optionID string) (*entity.QuestionPollOption, bool, error) {
	qid := uid.DeShortID(questionID)
	oid := uid.DeShortID(optionID)
	var o entity.QuestionPollOption
	has, err := r.db(ctx).Where(builder.Eq{"question_id": qid, "id": oid}).Get(&o)
	if err != nil {
		return nil, false, errors.InternalServer(reason.DatabaseError).WithError(err).WithStack()
	}
	return &o, has, nil
}

func (r *pollRepo) UpdateOptionCols(ctx context.Context, sess *xorm.Session, o *entity.QuestionPollOption, cols []string) error {
	o.QuestionID = uid.DeShortID(o.QuestionID)
	o.ID = uid.DeShortID(o.ID)
	db := r.db(ctx)
	if sess != nil {
		db = sess
	}
	_, err := db.ID(o.ID).Cols(cols...).Update(o)
	if err != nil {
		return errors.InternalServer(reason.DatabaseError).WithError(err).WithStack()
	}
	return nil
}

func (r *pollRepo) DeleteVotesByUser(ctx context.Context, sess *xorm.Session, questionID, userID string) error {
	qid := uid.DeShortID(questionID)
	db := r.db(ctx)
	if sess != nil {
		db = sess
	}
	_, err := db.Where(builder.Eq{"question_id": qid, "user_id": userID}).Delete(&entity.QuestionPollVote{})
	if err != nil {
		return errors.InternalServer(reason.DatabaseError).WithError(err).WithStack()
	}
	return nil
}

func (r *pollRepo) InsertVote(ctx context.Context, sess *xorm.Session, v *entity.QuestionPollVote) error {
	v.QuestionID = uid.DeShortID(v.QuestionID)
	v.OptionID = uid.DeShortID(v.OptionID)
	v.ID = uid.DeShortID(v.ID)
	db := r.db(ctx)
	if sess != nil {
		db = sess
	}
	_, err := db.Insert(v)
	if err != nil {
		return errors.InternalServer(reason.DatabaseError).WithError(err).WithStack()
	}
	return nil
}

func (r *pollRepo) ListVotesByUser(ctx context.Context, questionID, userID string) ([]*entity.QuestionPollVote, error) {
	qid := uid.DeShortID(questionID)
	list := make([]*entity.QuestionPollVote, 0)
	err := r.db(ctx).Where(builder.Eq{"question_id": qid, "user_id": userID}).Find(&list)
	if err != nil {
		return nil, errors.InternalServer(reason.DatabaseError).WithError(err).WithStack()
	}
	return list, nil
}

func (r *pollRepo) CountVotesGroupedByOption(ctx context.Context, questionID string) (map[string]int, error) {
	qid := uid.DeShortID(questionID)
	type row struct {
		OptionID string `xorm:"option_id"`
		Cnt      int64  `xorm:"cnt"`
	}
	rows := make([]row, 0)
	err := r.db(ctx).SQL(
		"SELECT option_id, COUNT(1) AS cnt FROM "+entity.QuestionPollVote{}.TableName()+
			" WHERE question_id = ? GROUP BY option_id", qid).Find(&rows)
	if err != nil {
		return nil, errors.InternalServer(reason.DatabaseError).WithError(err).WithStack()
	}
	out := make(map[string]int, len(rows))
	for _, r0 := range rows {
		out[r0.OptionID] = int(r0.Cnt)
	}
	return out, nil
}

func (r *pollRepo) CountDistinctVoters(ctx context.Context, questionID string) (int64, error) {
	qid := uid.DeShortID(questionID)
	var row struct {
		Cnt int64 `xorm:"cnt"`
	}
	has, err := r.db(ctx).SQL(
		"SELECT COUNT(DISTINCT user_id) AS cnt FROM "+entity.QuestionPollVote{}.TableName()+
			" WHERE question_id = ?", qid).Get(&row)
	if err != nil {
		return 0, errors.InternalServer(reason.DatabaseError).WithError(err).WithStack()
	}
	if !has {
		return 0, nil
	}
	return row.Cnt, nil
}

func (r *pollRepo) UserVoteCount(ctx context.Context, questionID, userID string) (int64, error) {
	qid := uid.DeShortID(questionID)
	return r.db(ctx).Where(builder.Eq{"question_id": qid, "user_id": userID}).Count(&entity.QuestionPollVote{})
}
