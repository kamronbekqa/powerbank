import { useEffect } from 'react';

const BASE_URL = 'https://voltmaxhub.uz';
const SITE_NAME = 'VOLTMAXHUB';
const DEFAULT_DESC = 'VOLTMAXHUB — Avtonom energiya: generatorlar va quyosh panellari. O\'zbekistondagi eng zamonaviy portativ quyosh generatorlari va quvvat stansiyalari.';

export default function usePageMeta({ title, description }) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Avtonom energiya: generatorlar va quyosh panellari`;
    const desc = description || DEFAULT_DESC;

    document.title = fullTitle;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = desc;

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = BASE_URL;

    updateMeta('property', 'og:title', fullTitle);
    updateMeta('property', 'og:description', desc);
    updateMeta('property', 'og:type', 'website');
    updateMeta('property', 'og:url', BASE_URL);
    updateMeta('property', 'og:site_name', SITE_NAME);
    updateMeta('property', 'og:image', `${BASE_URL}/favicon.svg`);
    updateMeta('property', 'og:locale', 'uz_UZ');

    updateMeta('name', 'twitter:card', 'summary_large_image');
    updateMeta('name', 'twitter:title', fullTitle);
    updateMeta('name', 'twitter:description', desc);
    updateMeta('name', 'twitter:image', `${BASE_URL}/favicon.svg`);
  }, [title, description]);
}

function updateMeta(attr, key, content) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}
