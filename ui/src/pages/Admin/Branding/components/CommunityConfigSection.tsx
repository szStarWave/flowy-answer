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
import { Button, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import type {
  BrandingCommunityNavItem,
  BrandingQuickAccessItem,
} from '@/common/interface';

type NavRowProps = {
  items: BrandingCommunityNavItem[];
  onChange: (items: BrandingCommunityNavItem[]) => void;
  addLabel: string;
  /** Top nav: only home + tag slugs (no custom path). */
  tagOnly?: boolean;
};

const emptyNav = (): BrandingCommunityNavItem => ({
  label: '',
  tag_slug: '',
  path: '',
  icon: '',
});

const NavRows: FC<NavRowProps> = ({ items, onChange, addLabel, tagOnly }) => {
  const rows = items?.length ? items : [emptyNav()];

  const updateRow = (
    index: number,
    patch: Partial<BrandingCommunityNavItem>,
  ) => {
    const next = rows.map((row, i) =>
      i === index ? { ...row, ...patch } : row,
    );
    onChange(next);
  };

  return (
    <>
      {rows.map((row, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <div className="row g-2 mb-2" key={`nav-${index}`}>
          <div className="col-md-3">
            <Form.Control
              placeholder="Label"
              value={row.label}
              onChange={(e) => updateRow(index, { label: e.target.value })}
            />
          </div>
          <div className={tagOnly ? 'col-md-5' : 'col-md-3'}>
            <Form.Control
              placeholder={
                tagOnly ? 'tag_slug (leave empty for home)' : 'tag_slug'
              }
              value={row.tag_slug}
              onChange={(e) => updateRow(index, { tag_slug: e.target.value })}
            />
          </div>
          {!tagOnly && (
            <div className="col-md-3">
              <Form.Control
                placeholder="path (/wishes)"
                value={row.path || ''}
                onChange={(e) => updateRow(index, { path: e.target.value })}
              />
            </div>
          )}
          <div className={tagOnly ? 'col-md-3' : 'col-md-2'}>
            <Form.Control
              placeholder="icon (bootstrap)"
              value={row.icon || ''}
              onChange={(e) => updateRow(index, { icon: e.target.value })}
            />
          </div>
          <div className="col-md-1 d-flex align-items-center">
            <Button
              variant="outline-danger"
              size="sm"
              type="button"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}>
              ×
            </Button>
          </div>
        </div>
      ))}
      <Button
        variant="outline-secondary"
        size="sm"
        type="button"
        className="mb-3"
        onClick={() => onChange([...rows, emptyNav()])}>
        {addLabel}
      </Button>
    </>
  );
};

type Props = {
  heroImage: string;
  heroLink: string;
  quickAccess: BrandingQuickAccessItem[];
  topNav: BrandingCommunityNavItem[];
  leftNavUser: BrandingCommunityNavItem[];
  leftNavCommunity: BrandingCommunityNavItem[];
  onHeroImageChange: (v: string) => void;
  onHeroLinkChange: (v: string) => void;
  onQuickAccessChange: (v: BrandingQuickAccessItem[]) => void;
  onTopNavChange: (v: BrandingCommunityNavItem[]) => void;
  onLeftNavUserChange: (v: BrandingCommunityNavItem[]) => void;
  onLeftNavCommunityChange: (v: BrandingCommunityNavItem[]) => void;
  onSave: () => void;
};

const CommunityConfigSection: FC<Props> = ({
  heroImage,
  heroLink,
  quickAccess,
  topNav,
  leftNavUser,
  leftNavCommunity,
  onHeroImageChange,
  onHeroLinkChange,
  onQuickAccessChange,
  onTopNavChange,
  onLeftNavUserChange,
  onLeftNavCommunityChange,
  onSave,
}) => {
  const { t } = useTranslation('translation', {
    keyPrefix: 'admin.branding.community',
  });

  const qaRows = quickAccess?.length
    ? quickAccess
    : [{ title: '', description: '', icon: '', tag_slug: '' }];

  const updateQuick = (
    index: number,
    patch: Partial<BrandingQuickAccessItem>,
  ) => {
    const next = qaRows.map((row, i) =>
      i === index ? { ...row, ...patch } : row,
    );
    onQuickAccessChange(next);
  };

  return (
    <div className="mt-5 pt-4 border-top">
      <h4 className="mb-3">{t('section_title')}</h4>
      <p className="text-secondary small">{t('section_hint')}</p>

      <Form.Group className="mb-3">
        <Form.Label>{t('hero_image')}</Form.Label>
        <Form.Control
          value={heroImage}
          onChange={(e) => onHeroImageChange(e.target.value)}
          placeholder="/uploads/branding/..."
        />
      </Form.Group>
      <Form.Group className="mb-4">
        <Form.Label>{t('hero_link')}</Form.Label>
        <Form.Control
          value={heroLink}
          onChange={(e) => onHeroLinkChange(e.target.value)}
          placeholder="/tags/..."
        />
      </Form.Group>

      <h6>{t('quick_access')}</h6>
      {qaRows.map((row, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <div className="border rounded p-3 mb-2" key={`qa-${index}`}>
          <div className="row g-2">
            <div className="col-md-3">
              <Form.Control
                placeholder={t('field_title')}
                value={row.title}
                onChange={(e) => updateQuick(index, { title: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <Form.Control
                placeholder={t('field_tag_slug')}
                value={row.tag_slug}
                onChange={(e) =>
                  updateQuick(index, { tag_slug: e.target.value })
                }
              />
            </div>
            <div className="col-md-2">
              <Form.Control
                placeholder={t('field_path')}
                value={row.path || ''}
                onChange={(e) => updateQuick(index, { path: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <Form.Control
                placeholder={t('field_icon')}
                value={row.icon || ''}
                onChange={(e) => updateQuick(index, { icon: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <Form.Control
                placeholder={t('field_description')}
                value={row.description}
                onChange={(e) =>
                  updateQuick(index, { description: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      ))}
      <Button
        variant="outline-secondary"
        size="sm"
        type="button"
        className="mb-4"
        onClick={() =>
          onQuickAccessChange([
            ...qaRows,
            { title: '', description: '', icon: '', tag_slug: '' },
          ])
        }>
        {t('add_quick_access')}
      </Button>

      <h6>{t('top_nav')}</h6>
      <p className="text-secondary small">{t('top_nav_hint')}</p>
      <NavRows
        items={topNav}
        onChange={onTopNavChange}
        addLabel={t('add_nav_item')}
        tagOnly
      />

      <h6>{t('left_nav_user')}</h6>
      <NavRows
        items={leftNavUser}
        onChange={onLeftNavUserChange}
        addLabel={t('add_nav_item')}
      />

      <h6>{t('left_nav_community')}</h6>
      <NavRows
        items={leftNavCommunity}
        onChange={onLeftNavCommunityChange}
        addLabel={t('add_nav_item')}
      />

      <Button variant="primary" type="button" onClick={onSave}>
        {t('save_community', { keyPrefix: 'btns' })}
      </Button>
    </div>
  );
};

export default memo(CommunityConfigSection);
