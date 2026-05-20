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

import { FC, memo } from 'react';
import { Link } from 'react-router-dom';

import { brandingStore } from '@/stores';
import { floppyNavigation } from '@/utils';

import './index.scss';

const HeroBanner: FC = () => {
  const heroImage = brandingStore((s) => s.branding.hero_image);
  const heroLink = brandingStore((s) => s.branding.hero_link);

  if (!heroImage) {
    return null;
  }

  const img = (
    <img
      src={heroImage}
      alt=""
      className="community-hero-banner__image"
      loading="lazy"
    />
  );

  return (
    <div className="community-hero-banner mb-4">
      {heroLink ? (
        <Link
          to={heroLink}
          className="community-hero-banner__link d-block"
          onClick={floppyNavigation.handleRouteLinkClick}>
          {img}
        </Link>
      ) : (
        img
      )}
    </div>
  );
};

export default memo(HeroBanner);
