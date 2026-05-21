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

package ui

import (
	"strings"
)

// RenderIndexHTML returns the SPA shell with asset URLs rewritten for subpath/CDN deploys.
func RenderIndexHTML(basePath, cdnPrefix string) (string, error) {
	file, err := Build.ReadFile("build/index.html")
	if err != nil {
		return "", err
	}
	return RenderIndexHTMLContent(string(file), basePath, cdnPrefix), nil
}

// RenderIndexHTMLContent rewrites asset URLs in an index.html body.
func RenderIndexHTMLContent(html, basePath, cdnPrefix string) string {
	// CDN first so subpath prefix does not break absolute static URLs.
	html = ApplyCDNPrefix(html, cdnPrefix)
	html = PrefixAssetPaths(html, basePath)
	return html
}

// PrefixAssetPaths prepends basePath to root-absolute static and manifest URLs.
func PrefixAssetPaths(html, basePath string) string {
	if basePath == "" {
		return html
	}
	bp := strings.TrimSuffix(basePath, "/")
	replacements := []struct{ from, to string }{
		{`href="/static/`, `href="` + bp + `/static/`},
		{`src="/static/`, `src="` + bp + `/static/`},
		{`href="/manifest.json"`, `href="` + bp + `/manifest.json"`},
	}
	for _, r := range replacements {
		html = strings.ReplaceAll(html, r.from, r.to)
	}
	return html
}

// ApplyCDNPrefix rewrites /static to a CDN origin when configured.
func ApplyCDNPrefix(html, cdnPrefix string) string {
	if cdnPrefix == "" {
		return html
	}
	cp := strings.TrimSuffix(cdnPrefix, "/")
	return strings.ReplaceAll(html, "/static", cp+"/static")
}
