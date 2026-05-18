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
	"errors"
	"strings"
	"unicode"

	"github.com/apache/answer/internal/base/validator"
	strip "github.com/grokify/html-strip-tags-go"
	"golang.org/x/text/unicode/norm"
)

// FormError carries field-level validation errors for HTTP form responses.
type FormError struct {
	Fields []*validator.FormErrorField
}

func (e *FormError) Error() string {
	if e == nil || len(e.Fields) == 0 {
		return "sensitive_word"
	}
	return e.Fields[0].ErrorMsg
}

// AsFormError unwraps a FormError from the error chain.
func AsFormError(err error) (fe *FormError, ok bool) {
	ok = errors.As(err, &fe)
	return
}

// NormalizeForMatch applies NFKC, strips common invisible characters, lowercases ASCII.
func NormalizeForMatch(s string) string {
	s = norm.NFKC.String(s)
	var b strings.Builder
	b.Grow(len(s))
	for _, r := range s {
		switch r {
		case '\u200b', '\u200c', '\u200d', '\ufeff':
			continue
		}
		if unicode.Is(unicode.Cf, r) {
			continue
		}
		b.WriteRune(r)
	}
	return strings.ToLower(b.String())
}

// StripHTMLToText removes tags for matching prose inside rendered HTML.
func StripHTMLToText(html string) string {
	return strings.TrimSpace(strip.StripTags(html))
}
