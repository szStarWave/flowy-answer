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

package schema

import (
	"strconv"
	"strings"

	"github.com/apache/answer/pkg/converter"
	"golang.org/x/net/html"
)

// ContentHeading describes one markdown heading for in-page TOC; id matches the rendered HTML fragment.
type ContentHeading struct {
	ID    string `json:"id"`
	Level int    `json:"level"`
	Text  string `json:"text"`
}

// ContentHeadingsFromMarkdownSource extracts TOC metadata using the same rules as server-side HTML rendering.
func ContentHeadingsFromMarkdownSource(md string) []ContentHeading {
	if !converter.MayHaveMarkdownHeadings(md) {
		return nil
	}
	raw := converter.MarkdownHeadingOutlines(md)
	if len(raw) == 0 {
		return nil
	}
	out := make([]ContentHeading, len(raw))
	for i := range raw {
		out[i] = ContentHeading{
			ID:    raw[i].ID,
			Level: raw[i].Level,
			Text:  raw[i].Text,
		}
	}
	return out
}

// ContentHeadingsFromPost builds TOC from markdown when possible, otherwise from stored HTML (e.g. MDX or raw heading tags).
func ContentHeadingsFromPost(md, renderedHTML string) []ContentHeading {
	out := ContentHeadingsFromMarkdownSource(md)
	if len(out) > 0 {
		return out
	}
	return ContentHeadingsFromRenderedHTML(renderedHTML)
}

// ContentHeadingsFromRenderedHTML extracts h1–h6 with id from sanitized post HTML, in document order.
func ContentHeadingsFromRenderedHTML(renderedHTML string) []ContentHeading {
	s := strings.TrimSpace(renderedHTML)
	if s == "" {
		return nil
	}
	doc, err := html.Parse(strings.NewReader(s))
	if err != nil || doc == nil {
		return nil
	}
	out := make([]ContentHeading, 0, 8)
	var walk func(*html.Node) bool
	walk = func(n *html.Node) bool {
		if n == nil {
			return true
		}
		if n.Type == html.ElementNode && len(n.Data) == 2 && n.Data[0] == 'h' {
			level, err := strconv.Atoi(n.Data[1:])
			if err == nil && level >= 1 && level <= 6 {
				if id := headingElementID(n); id != "" {
					if text := strings.TrimSpace(headingSubtreeText(n)); text != "" {
						out = append(out, ContentHeading{ID: id, Level: level, Text: text})
						if len(out) >= converter.MaxHeadingOutlines {
							return false
						}
					}
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			if !walk(c) {
				return false
			}
		}
		return true
	}
	_ = walk(doc)
	if len(out) == 0 {
		return nil
	}
	return out
}

func headingElementID(n *html.Node) string {
	for _, a := range n.Attr {
		if a.Key == "id" {
			return strings.TrimSpace(a.Val)
		}
	}
	return ""
}

func headingSubtreeText(n *html.Node) string {
	var b strings.Builder
	var textWalk func(*html.Node)
	textWalk = func(nn *html.Node) {
		switch nn.Type {
		case html.TextNode:
			b.WriteString(nn.Data)
		case html.ElementNode:
			if nn.Data == "script" || nn.Data == "style" {
				return
			}
			for c := nn.FirstChild; c != nil; c = c.NextSibling {
				textWalk(c)
			}
		}
	}
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		textWalk(c)
	}
	return b.String()
}
