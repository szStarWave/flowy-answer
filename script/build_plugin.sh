#!/bin/bash
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

set -e
echo "begin prepare plugin imports"
plugin_file=./script/plugin_list
if [ ! -f "$plugin_file" ]; then
  echo "plugin_list is not exist"
  exit 0
fi

echo "plugin_list exist"
gen_file=./cmd/answer/plugin_imports_gen.go

cat > "$gen_file" <<'EOF'
package main

import (
EOF

while IFS= read -r repo || [ -n "$repo" ]; do
  repo=$(echo "$repo" | sed 's/\r$//' | xargs)
  if [ -z "$repo" ]; then
    continue
  fi
  case "$repo" in
    \#*)
      continue
      ;;
  esac

  module_ref="${repo%%=*}"
  module_path="${module_ref%@*}"
  module_ver="${module_ref#*@}"
  if [ "$module_path" = "$module_ref" ]; then
    module_ver=""
  fi

  if [ -n "$module_ver" ]; then
    echo "go get ${module_path}@${module_ver}"
    go get "${module_path}@${module_ver}"
  else
    echo "go get ${module_path}@latest"
    go get "${module_path}@latest"
  fi

  echo "	_ \"${module_path}\"" >> "$gen_file"
done < "$plugin_file"

cat >> "$gen_file" <<'EOF'
)
EOF

echo "plugin imports generated at ${gen_file}"