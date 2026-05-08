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
	"strings"
	"testing"

	"github.com/apache/answer/pkg/converter"
)

func TestContentHeadingsFromRenderedHTML_Basic(t *testing.T) {
	html := `<div><h2 id="sec-a">Section <em>A</em></h2><p>x</p><h3 id="sub">Sub</h3></div>`
	out := ContentHeadingsFromRenderedHTML(html)
	if len(out) != 2 {
		t.Fatalf("got %d: %#v", len(out), out)
	}
	if out[0].ID != "sec-a" || out[0].Level != 2 || !strings.Contains(out[0].Text, "Section") || !strings.Contains(out[0].Text, "A") {
		t.Fatalf("first: %#v", out[0])
	}
	if out[1].ID != "sub" || out[1].Level != 3 || out[1].Text != "Sub" {
		t.Fatalf("second: %#v", out[1])
	}
}

func TestContentHeadingsFromRenderedHTML_SkipsWithoutID(t *testing.T) {
	out := ContentHeadingsFromRenderedHTML(`<h2>No id</h2><h2 id="ok">Ok</h2>`)
	if len(out) != 1 || out[0].ID != "ok" {
		t.Fatalf("got %#v", out)
	}
}

func TestContentHeadingsFromPost_FallbackToHTML(t *testing.T) {
	md := "not markdown headings but body has html later"
	html := `<article><h1 id="top">Title</h1></article>`
	out := ContentHeadingsFromPost(md, html)
	if len(out) != 1 || out[0].ID != "top" || out[0].Level != 1 {
		t.Fatalf("got %#v", out)
	}
}

func TestContentHeadingsFromPost_PrefersMarkdown(t *testing.T) {
	md := "# One\n\n## Two\n"
	html, outlines, err := converter.RenderPostMarkdownForAPI(md)
	if err != nil {
		t.Fatal(err)
	}
	out := ContentHeadingsFromPost(md, html)
	if len(out) != len(outlines) {
		t.Fatalf("markdown path: got %d want %d", len(out), len(outlines))
	}
	for i := range outlines {
		if out[i].ID != outlines[i].ID || out[i].Level != outlines[i].Level {
			t.Fatalf("idx %d: %#v vs %#v", i, out[i], outlines[i])
		}
	}
}
