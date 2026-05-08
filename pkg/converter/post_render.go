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

package converter

import (
	"bytes"
	"strings"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	goldmarkHTML "github.com/yuin/goldmark/renderer/html"
	"github.com/yuin/goldmark/text"
)

// PostRendererVersion identifies the markdown dialect and sanitizer generation used for API clients.
// Bump when goldmark extensions, heading id rules, or bluemonday policy change materially.
const PostRendererVersion = "gfm_goldmark_v3"

// MaxHeadingOutlines caps TOC size to bound work for pathological documents.
const MaxHeadingOutlines = 200

// HeadingOutline is a single heading entry for in-page navigation (TOC). IDs match rendered HTML anchors.
type HeadingOutline struct {
	ID    string `json:"id"`
	Level int    `json:"level"`
	Text  string `json:"text"`
}

func newPostGoldmark() goldmark.Markdown {
	return goldmark.New(
		goldmark.WithExtensions(&fenceDiagramExtension{}, &DangerousHTMLFilterExtension{}, extension.GFM, extension.Footnote),
		goldmark.WithParserOptions(
			parser.WithAutoHeadingID(),
		),
		goldmark.WithRendererOptions(
			goldmarkHTML.WithHardWraps(),
		),
	)
}

// MayHaveMarkdownHeadings is a cheap pre-check to skip goldmark parsing when building list responses.
// It intentionally ignores setext-style headings; those are rare and still get correct (empty) TOC.
// ATX headings may be indented with up to three spaces; every line is checked.
func MayHaveMarkdownHeadings(s string) bool {
	if s == "" {
		return false
	}
	for len(s) > 0 {
		line, rest, found := strings.Cut(s, "\n")
		trimmed := strings.TrimLeft(line, " \t")
		if len(trimmed) > 0 && trimmed[0] == '#' {
			return true
		}
		if !found {
			break
		}
		s = rest
	}
	return false
}

// MarkdownHeadingOutlines extracts heading metadata from markdown using the same parser options as HTML rendering.
func MarkdownHeadingOutlines(source string) []HeadingOutline {
	src := []byte(source)
	md := newPostGoldmark()
	doc := md.Parser().Parse(text.NewReader(src))
	return extractHeadingOutlines(doc, src)
}

// RenderPostMarkdownForAPI converts markdown to sanitized HTML and returns heading outlines in one parse pass.
func RenderPostMarkdownForAPI(source string) (html string, outlines []HeadingOutline, err error) {
	src := []byte(source)
	md := newPostGoldmark()
	doc := md.Parser().Parse(text.NewReader(src))
	outlines = extractHeadingOutlines(doc, src)
	var buf bytes.Buffer
	if err = md.Renderer().Render(&buf, src, doc); err != nil {
		return "", nil, err
	}
	html = sanitizePostHTML(strings.TrimSpace(buf.String()))
	return html, outlines, nil
}

func extractHeadingOutlines(doc ast.Node, source []byte) []HeadingOutline {
	out := make([]HeadingOutline, 0, 8)
	_ = ast.Walk(doc, func(n ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}
		h, ok := n.(*ast.Heading)
		if !ok {
			return ast.WalkContinue, nil
		}
		idVal, hasID := h.AttributeString("id")
		if !hasID {
			return ast.WalkContinue, nil
		}
		id := headingIDString(idVal)
		if id == "" {
			return ast.WalkContinue, nil
		}
		text := strings.TrimSpace(string(h.Text(source)))
		if text == "" {
			return ast.WalkContinue, nil
		}
		out = append(out, HeadingOutline{
			ID:    id,
			Level: h.Level,
			Text:  text,
		})
		if len(out) >= MaxHeadingOutlines {
			return ast.WalkStop, nil
		}
		return ast.WalkContinue, nil
	})
	return out
}

func headingIDString(v interface{}) string {
	switch x := v.(type) {
	case string:
		return strings.TrimSpace(x)
	case []byte:
		return strings.TrimSpace(string(x))
	default:
		return ""
	}
}

func markdownToHTMLFromSource(source []byte) (string, error) {
	md := newPostGoldmark()
	var buf bytes.Buffer
	if err := md.Convert(source, &buf); err != nil {
		return "", err
	}
	return sanitizePostHTML(strings.TrimSpace(buf.String())), nil
}
